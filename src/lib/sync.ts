import { db, newId, nowISO } from '@/db/db';
import { supabase } from '@/lib/supabase';
import { setLastSyncedAt, setLastSyncError } from '@/lib/sync-meta';
import type {
  Account,
  AccountCategory,
  AccountSubtype,
  Category,
  CategoryType,
  GoalBehavior,
  GoalCadence,
  Group,
  NetWorthEntry,
  OutboxEntry,
  Transaction,
  Transfer,
  TxnStatus,
} from '@/db/schema';

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncListOperation = 'list';
export type SyncEntityType =
  | 'transactions'
  | 'transfers'
  | 'accounts'
  | 'categories'
  | 'groups'
  | 'netWorthEntries';

export interface SyncResult {
  ok: boolean;
  error?: string;
  code?: 'sheet_missing';
}

// Kept for backward compat — UI components may reference these; never emitted by Supabase transport.
export type SyncStatusCode = 'sheet_missing' | 'sheet_renamed';

export function isSheetMissingSyncError(_message: string): boolean {
  return false;
}

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing'; pendingCount?: number }
  | { state: 'success'; syncedAt: string }
  | { state: 'error'; error: string; code?: SyncStatusCode };

const listeners = new Set<(status: SyncStatus) => void>();

let activeSyncOps = 0;
let currentStatus: SyncStatus = { state: 'idle' };

function setSyncStatus(status: SyncStatus): void {
  currentStatus = status;
  for (const listener of listeners) listener(status);
}

function onSyncStart(): void {
  activeSyncOps += 1;
  setSyncStatus({ state: 'syncing' });
}

function onSyncFinish(result: SyncResult): void {
  activeSyncOps = Math.max(0, activeSyncOps - 1);
  if (activeSyncOps > 0) return;
  if (result.ok) {
    const syncedAt = new Date().toISOString();
    setLastSyncedAt(syncedAt);
    setLastSyncError(null);
    setSyncStatus({ state: 'success', syncedAt });
    return;
  }
  setLastSyncError(result.error ?? 'Unknown sync error');
  setSyncStatus({
    state: 'error',
    error: result.error ?? 'Unknown sync error',
    ...(result.code ? { code: result.code } : {}),
  });
}

export function getCurrentSyncStatus(): SyncStatus {
  return currentStatus;
}

let onlineListenerInstalled = false;
export function installOnlineSyncListener(): void {
  if (onlineListenerInstalled) return;
  if (typeof window === 'undefined') return;
  onlineListenerInstalled = true;
  window.addEventListener('online', () => {
    void drainOutbox();
  });
}

export function subscribeSyncStatus(
  listener: (status: SyncStatus) => void,
): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

function normalizeForSupabase(
  entityType: SyncEntityType,
  raw: Record<string, unknown>,
): object {
  switch (entityType) {
    case 'transactions': {
      const t = raw as Partial<Transaction>;
      return {
        id: String(t.id ?? ''),
        date: String(t.date ?? ''),
        outflow: Number(t.outflow ?? 0),
        inflow: Number(t.inflow ?? 0),
        categoryId: String(t.categoryId ?? ''),
        accountId: String(t.accountId ?? ''),
        memo: String(t.memo ?? ''),
        status: String(t.status ?? 'cleared'),
        reconciledAt: t.reconciledAt == null ? null : String(t.reconciledAt),
        reconcileEventId:
          t.reconcileEventId == null ? null : String(t.reconcileEventId),
        createdAt: String(t.createdAt ?? ''),
        updatedAt: String(t.updatedAt ?? ''),
        syncedAt: t.syncedAt == null ? null : String(t.syncedAt),
      };
    }
    case 'transfers': {
      const t = raw as Partial<Transfer>;
      return {
        id: String(t.id ?? ''),
        date: String(t.date ?? ''),
        amount: Number(t.amount ?? 0),
        fromCategoryId: String(t.fromCategoryId ?? ''),
        toCategoryId: String(t.toCategoryId ?? ''),
        memo: String(t.memo ?? ''),
        createdAt: String(t.createdAt ?? ''),
        updatedAt: String(t.updatedAt ?? ''),
        syncedAt: t.syncedAt == null ? null : String(t.syncedAt),
      };
    }
    case 'accounts': {
      const a = raw as Partial<Account>;
      return {
        id: String(a.id ?? ''),
        name: String(a.name ?? ''),
        accountCategory: String(a.accountCategory ?? 'cash'),
        subtype: String(a.subtype ?? 'checking'),
        onBudget: Boolean(a.onBudget ?? true),
        lastReconciledAt:
          a.lastReconciledAt == null ? null : String(a.lastReconciledAt),
        isCreditCard: Boolean(a.isCreditCard),
        isArchived: Boolean(a.isArchived),
      };
    }
    case 'categories': {
      const c = raw as Partial<Category>;
      return {
        id: String(c.id ?? ''),
        groupId: String(c.groupId ?? ''),
        name: String(c.name ?? ''),
        type: String(c.type ?? 'expense'),
        goalType: String(c.goalType ?? 'none'),
        goalBehavior: c.goalBehavior == null ? null : String(c.goalBehavior),
        goalAmount: Number(c.goalAmount ?? 0),
        goalDueDate: c.goalDueDate == null ? null : String(c.goalDueDate),
        goalRecurring: c.goalRecurring == null ? null : Boolean(c.goalRecurring),
        goalStartMonth: c.goalStartMonth == null ? null : String(c.goalStartMonth),
        snoozedUntil: c.snoozedUntil == null ? null : String(c.snoozedUntil),
        linkedAccountId:
          c.linkedAccountId == null ? null : String(c.linkedAccountId),
        sortOrder: Number(c.sortOrder ?? 0),
        isArchived: Boolean(c.isArchived),
      };
    }
    case 'groups': {
      const g = raw as Partial<Group>;
      return {
        id: String(g.id ?? ''),
        name: String(g.name ?? ''),
        sortOrder: Number(g.sortOrder ?? 0),
        isArchived: Boolean(g.isArchived),
      };
    }
    case 'netWorthEntries': {
      const n = raw as Partial<NetWorthEntry>;
      return {
        id: String(n.id ?? ''),
        date: String(n.date ?? ''),
        amount: Number(n.amount ?? 0),
        category: String(n.category ?? ''),
        type: n.type === 'debt' ? 'debt' : 'asset',
        notes: String(n.notes ?? ''),
      };
    }
    default: {
      const _exhaustive: never = entityType;
      return _exhaustive;
    }
  }
}

const GOAL_CADENCES: GoalCadence[] = [
  'none',
  'monthly_funding',
  'target_balance',
  'target_by_date',
  'weekly',
  'monthly',
  'yearly',
  'custom',
];

const GOAL_BEHAVIORS: GoalBehavior[] = [
  'set_aside_another',
  'refill_up_to',
  'fill_up_to',
  'have_a_balance_of',
];

const ACCOUNT_CATEGORIES: AccountCategory[] = [
  'cash',
  'credit',
  'loan',
  'tracking',
];

function coerceRow(row: unknown): Record<string, unknown> | null {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return row as Record<string, unknown>;
  }
  return null;
}

function parseTxnStatus(v: unknown): TxnStatus {
  if (v === 'pending' || v === 'reconciled' || v === 'cleared') return v;
  return 'cleared';
}

function parseAccountCategory(v: unknown): AccountCategory {
  if (typeof v === 'string' && ACCOUNT_CATEGORIES.includes(v as AccountCategory)) {
    return v as AccountCategory;
  }
  return 'cash';
}

function parseAccountSubtype(v: unknown, fallback: AccountSubtype): AccountSubtype {
  if (typeof v === 'string' && v.length > 0) return v as AccountSubtype;
  return fallback;
}

function parseGoalCadence(v: unknown): GoalCadence {
  if (typeof v === 'string' && GOAL_CADENCES.includes(v as GoalCadence)) {
    return v as GoalCadence;
  }
  return 'none';
}

function parseGoalBehavior(v: unknown): GoalBehavior | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && GOAL_BEHAVIORS.includes(v as GoalBehavior)) {
    return v as GoalBehavior;
  }
  return null;
}

function parseCategoryType(v: unknown): CategoryType {
  return v === 'sinking_fund' ? 'sinking_fund' : 'expense';
}

function parseNetWorthType(v: unknown): 'asset' | 'debt' {
  return v === 'debt' ? 'debt' : 'asset';
}

function parseTransaction(raw: Record<string, unknown>): Transaction | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const now = new Date().toISOString();
  return {
    id,
    date: String(raw.date ?? ''),
    outflow: Number(raw.outflow ?? 0),
    inflow: Number(raw.inflow ?? 0),
    categoryId: String(raw.categoryId ?? ''),
    accountId: String(raw.accountId ?? ''),
    memo: String(raw.memo ?? ''),
    status: parseTxnStatus(raw.status),
    reconciledAt:
      raw.reconciledAt == null || raw.reconciledAt === ''
        ? null
        : String(raw.reconciledAt),
    reconcileEventId:
      raw.reconcileEventId == null || raw.reconcileEventId === ''
        ? null
        : String(raw.reconcileEventId),
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? now),
    syncedAt:
      raw.syncedAt == null || raw.syncedAt === '' ? null : String(raw.syncedAt),
  };
}

function parseTransfer(raw: Record<string, unknown>): Transfer | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const now = new Date().toISOString();
  return {
    id,
    date: String(raw.date ?? ''),
    amount: Number(raw.amount ?? 0),
    fromCategoryId: String(raw.fromCategoryId ?? ''),
    toCategoryId: String(raw.toCategoryId ?? ''),
    memo: String(raw.memo ?? ''),
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? now),
    syncedAt:
      raw.syncedAt == null || raw.syncedAt === '' ? null : String(raw.syncedAt),
  };
}

function parseAccount(raw: Record<string, unknown>): Account | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const accountCategory = parseAccountCategory(raw.accountCategory);
  const fallbackSubtype: AccountSubtype =
    accountCategory === 'credit' ? 'credit_card' : 'checking';
  const subtype = parseAccountSubtype(raw.subtype, fallbackSubtype);
  const isCreditCard =
    raw.isCreditCard != null
      ? Boolean(raw.isCreditCard)
      : accountCategory === 'credit' && subtype === 'credit_card';
  return {
    id,
    name: String(raw.name ?? ''),
    accountCategory,
    subtype,
    onBudget: raw.onBudget == null ? true : Boolean(raw.onBudget),
    lastReconciledAt:
      raw.lastReconciledAt == null || raw.lastReconciledAt === ''
        ? null
        : String(raw.lastReconciledAt),
    isCreditCard,
    isArchived: Boolean(raw.isArchived),
  };
}

function parseCategory(raw: Record<string, unknown>): Category | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  return {
    id,
    groupId: String(raw.groupId ?? ''),
    name: String(raw.name ?? ''),
    type: parseCategoryType(raw.type),
    goalType: parseGoalCadence(raw.goalType),
    goalBehavior: parseGoalBehavior(raw.goalBehavior),
    goalAmount: Number(raw.goalAmount ?? 0),
    goalDueDate:
      raw.goalDueDate == null || raw.goalDueDate === ''
        ? null
        : String(raw.goalDueDate),
    goalRecurring:
      raw.goalRecurring == null ? null : Boolean(raw.goalRecurring),
    goalStartMonth:
      raw.goalStartMonth == null || raw.goalStartMonth === ''
        ? null
        : String(raw.goalStartMonth),
    snoozedUntil:
      raw.snoozedUntil == null || raw.snoozedUntil === ''
        ? null
        : String(raw.snoozedUntil),
    linkedAccountId:
      raw.linkedAccountId == null || raw.linkedAccountId === ''
        ? null
        : String(raw.linkedAccountId),
    sortOrder: Number(raw.sortOrder ?? 0),
    isArchived: Boolean(raw.isArchived),
  };
}

function parseGroup(raw: Record<string, unknown>): Group | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? ''),
    sortOrder: Number(raw.sortOrder ?? 0),
    isArchived: Boolean(raw.isArchived),
  };
}

function parseNetWorthEntry(raw: Record<string, unknown>): NetWorthEntry | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  return {
    id,
    date: String(raw.date ?? ''),
    amount: Number(raw.amount ?? 0),
    category: String(raw.category ?? ''),
    type: parseNetWorthType(raw.type),
    notes: String(raw.notes ?? ''),
  };
}

function parseRow(entityType: SyncEntityType, r: Record<string, unknown>): unknown | null {
  switch (entityType) {
    case 'transactions':
      return parseTransaction(r);
    case 'transfers':
      return parseTransfer(r);
    case 'accounts':
      return parseAccount(r);
    case 'categories':
      return parseCategory(r);
    case 'groups':
      return parseGroup(r);
    case 'netWorthEntries':
      return parseNetWorthEntry(r);
    default: {
      const _e: never = entityType;
      throw new Error(`Unexpected entity: ${String(_e)}`);
    }
  }
}

function parseRows(entityType: SyncEntityType, rows: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const row of rows) {
    const r = coerceRow(row);
    if (!r) continue;
    const parsed = parseRow(entityType, r);
    if (parsed) out.push(parsed);
  }
  return out;
}

export async function syncToSheet(
  operation: SyncOperation,
  entityType: SyncEntityType,
  payload: object,
): Promise<SyncResult> {
  onSyncStart();
  try {
    let result: SyncResult;

    if (operation === 'delete') {
      const id = (payload as { id?: string }).id;
      if (!id) {
        result = { ok: false, error: 'Missing id for delete operation' };
      } else {
        const { error } = await supabase.from(entityType).delete().eq('id', id);
        result = error ? { ok: false, error: error.message } : { ok: true };
      }
    } else {
      const p = payload as Record<string, unknown>;
      const id = typeof p.id === 'string' ? p.id : null;
      let normalized: object = payload;
      if (id) {
        const row = await readEntityRow(entityType, id);
        if (row) normalized = normalizeForSupabase(entityType, row);
      }
      const { error } = await supabase
        .from(entityType)
        .upsert(normalized, { onConflict: 'id' });
      result = error ? { ok: false, error: error.message } : { ok: true };
    }

    onSyncFinish(result);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    const result: SyncResult = { ok: false, error: msg };
    onSyncFinish(result);
    return result;
  }
}

export function syncInBackground(
  operation: SyncOperation,
  entityType: SyncEntityType,
  payload: object,
): void {
  const id = (payload as { id?: unknown }).id;
  if (typeof id !== 'string' || !id) return;
  void enqueueOutbox(operation, entityType, id).then(() => {
    void drainOutbox();
  });
}

export async function enqueueOutbox(
  operation: SyncOperation,
  entityType: SyncEntityType,
  entityId: string,
): Promise<void> {
  const entry: OutboxEntry = {
    id: newId(),
    entityType,
    entityId,
    operation,
    createdAt: nowISO(),
    attempts: 0,
    lastError: null,
    lastAttemptAt: null,
  };
  await db.outbox.add(entry);
}

export async function getPendingSyncCount(): Promise<number> {
  return db.outbox.count();
}

let drainInFlight: Promise<SyncResult> | null = null;

export function drainOutbox(): Promise<SyncResult> {
  if (drainInFlight) return drainInFlight;
  drainInFlight = runDrain().finally(() => {
    drainInFlight = null;
  });
  return drainInFlight;
}

async function runDrain(): Promise<SyncResult> {
  const entries = await db.outbox.orderBy('createdAt').toArray();
  if (entries.length === 0) return { ok: true };

  onSyncStart();
  let lastResult: SyncResult = { ok: true };
  try {
    for (const entry of entries) {
      const result = await syncOneEntry(entry);
      if (result.ok) {
        await db.outbox.delete(entry.id);
        continue;
      }
      await db.outbox.update(entry.id, {
        attempts: entry.attempts + 1,
        lastError: result.error ?? 'Unknown sync error',
        lastAttemptAt: nowISO(),
      });
      lastResult = result;
      break;
    }
  } finally {
    onSyncFinish(lastResult);
  }
  return lastResult;
}

async function syncOneEntry(entry: OutboxEntry): Promise<SyncResult> {
  try {
    if (entry.operation === 'delete') {
      const { error } = await supabase
        .from(entry.entityType)
        .delete()
        .eq('id', entry.entityId);
      return error ? { ok: false, error: error.message } : { ok: true };
    }

    // Re-read latest local state; if row is gone (deleted before sync), drop silently.
    const row = await readEntityRow(entry.entityType, entry.entityId);
    if (!row) return { ok: true };
    const normalized = normalizeForSupabase(entry.entityType, row);
    const { error } = await supabase
      .from(entry.entityType)
      .upsert(normalized, { onConflict: 'id' });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Sync failed' };
  }
}

async function readEntityRow(
  entityType: SyncEntityType,
  id: string,
): Promise<Record<string, unknown> | null> {
  switch (entityType) {
    case 'transactions':
      return ((await db.transactions.get(id)) as unknown as Record<string, unknown>) ?? null;
    case 'transfers':
      return ((await db.transfers.get(id)) as unknown as Record<string, unknown>) ?? null;
    case 'accounts':
      return ((await db.accounts.get(id)) as unknown as Record<string, unknown>) ?? null;
    case 'categories':
      return ((await db.categories.get(id)) as unknown as Record<string, unknown>) ?? null;
    case 'groups':
      return ((await db.groups.get(id)) as unknown as Record<string, unknown>) ?? null;
    case 'netWorthEntries':
      return ((await db.netWorthEntries.get(id)) as unknown as Record<string, unknown>) ?? null;
    default: {
      const _e: never = entityType;
      throw new Error(`Unexpected entity: ${String(_e)}`);
    }
  }
}

export async function fullSync(): Promise<SyncResult> {
  const ENTITY_ORDER = [
    'groups',
    'categories',
    'accounts',
    'transactions',
    'transfers',
    'netWorthEntries',
  ] as const;

  for (const entityType of ENTITY_ORDER) {
    const rows = await db[entityType].toArray();
    if (rows.length === 0) continue;
    const normalized = rows.map((row) =>
      normalizeForSupabase(entityType, row as unknown as Record<string, unknown>),
    );
    const { error } = await supabase
      .from(entityType)
      .upsert(normalized, { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

const PULL_ENTITY_ORDER: SyncEntityType[] = [
  'groups',
  'categories',
  'accounts',
  'transactions',
  'transfers',
  'netWorthEntries',
];

export async function pullFullFromSheet(): Promise<SyncResult> {
  onSyncStart();
  try {
    const buckets: {
      groups: Group[];
      categories: Category[];
      accounts: Account[];
      transactions: Transaction[];
      transfers: Transfer[];
      netWorthEntries: NetWorthEntry[];
    } = {
      groups: [],
      categories: [],
      accounts: [],
      transactions: [],
      transfers: [],
      netWorthEntries: [],
    };

    for (const entityType of PULL_ENTITY_ORDER) {
      const { data, error } = await supabase.from(entityType).select('*');
      if (error) {
        const result: SyncResult = { ok: false, error: error.message };
        onSyncFinish(result);
        return result;
      }
      const parsed = parseRows(entityType, data ?? []);
      switch (entityType) {
        case 'groups':
          buckets.groups = parsed as Group[];
          break;
        case 'categories':
          buckets.categories = parsed as Category[];
          break;
        case 'accounts':
          buckets.accounts = parsed as Account[];
          break;
        case 'transactions':
          buckets.transactions = parsed as Transaction[];
          break;
        case 'transfers':
          buckets.transfers = parsed as Transfer[];
          break;
        case 'netWorthEntries':
          buckets.netWorthEntries = parsed as NetWorthEntry[];
          break;
        default: {
          const _e: never = entityType;
          throw new Error(`Unexpected entity: ${String(_e)}`);
        }
      }
    }

    await db.transaction(
      'rw',
      [
        db.groups,
        db.categories,
        db.accounts,
        db.transactions,
        db.transfers,
        db.netWorthEntries,
        db.outbox,
      ],
      async () => {
        await Promise.all([
          db.groups.clear(),
          db.categories.clear(),
          db.accounts.clear(),
          db.transactions.clear(),
          db.transfers.clear(),
          db.netWorthEntries.clear(),
          db.outbox.clear(),
        ]);
        if (buckets.groups.length) await db.groups.bulkPut(buckets.groups);
        if (buckets.categories.length) await db.categories.bulkPut(buckets.categories);
        if (buckets.accounts.length) await db.accounts.bulkPut(buckets.accounts);
        if (buckets.transactions.length) await db.transactions.bulkPut(buckets.transactions);
        if (buckets.transfers.length) await db.transfers.bulkPut(buckets.transfers);
        if (buckets.netWorthEntries.length) await db.netWorthEntries.bulkPut(buckets.netWorthEntries);
      },
    );

    const ok: SyncResult = { ok: true };
    onSyncFinish(ok);
    return ok;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Pull failed';
    const result: SyncResult = { ok: false, error: msg };
    onSyncFinish(result);
    return result;
  }
}
