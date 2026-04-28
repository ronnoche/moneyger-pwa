import { db } from '@/db/db';
import { resolveUserSheetId, clearSheetIdMemCache } from '@/lib/sheet-resolver';
import {
  deleteRowById,
  listRows,
  SheetMissingError,
  upsertRow,
} from '@/lib/google-sheets-api';
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
  /** Set when the linked Google Sheet is missing or inaccessible (e.g. deleted). */
  code?: 'sheet_missing';
}

const SHEET_MISSING_USER_MESSAGE =
  'Your Moneyger Google Sheet was not found or is inaccessible. Click Re-sync to create a new one and restore all your data.';

export function isSheetMissingSyncError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('requested entity was not found') ||
    m.includes('invalid spreadsheet id') ||
    m.includes('no spreadsheet') ||
    m.includes('spreadsheet not found') ||
    m.includes('file not found') ||
    m.includes('permission_denied') ||
    m.includes('insufficient permission')
  );
}

type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'success'; syncedAt: string }
  | { state: 'error'; error: string; code?: 'sheet_missing' };

const SESSION_STORAGE_KEY = 'moneyger:google-session';
const listeners = new Set<(status: SyncStatus) => void>();

function readSession(): { accessToken: string; sub: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      accessToken?: string;
      sub?: string | null;
      email?: string | null;
    } | null;
    if (!parsed?.accessToken) return null;
    return {
      accessToken: parsed.accessToken,
      sub: parsed.sub ?? parsed.email ?? 'unknown',
    };
  } catch {
    return null;
  }
}
let pendingSyncCount = 0;
let currentStatus: SyncStatus = { state: 'idle' };

function setSyncStatus(status: SyncStatus): void {
  currentStatus = status;
  for (const listener of listeners) listener(status);
}

function onSyncStart(): void {
  pendingSyncCount += 1;
  setSyncStatus({ state: 'syncing' });
}

function onSyncFinish(result: SyncResult): void {
  pendingSyncCount = Math.max(0, pendingSyncCount - 1);
  if (pendingSyncCount > 0) return;
  if (result.ok) {
    setSyncStatus({ state: 'success', syncedAt: new Date().toISOString() });
    return;
  }
  setSyncStatus({
    state: 'error',
    error: result.error ?? 'Unknown sync error',
    ...(result.code ? { code: result.code } : {}),
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

/** Shapes rows to the Google Sheet column contract (Apps Script HEADERS). */
function normalizeForSheet(
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

function parseTransactionFromSheet(raw: Record<string, unknown>): Transaction | null {
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

function parseTransferFromSheet(raw: Record<string, unknown>): Transfer | null {
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

function parseAccountFromSheet(raw: Record<string, unknown>): Account | null {
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

function parseCategoryFromSheet(raw: Record<string, unknown>): Category | null {
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

function parseGroupFromSheet(raw: Record<string, unknown>): Group | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? ''),
    sortOrder: Number(raw.sortOrder ?? 0),
    isArchived: Boolean(raw.isArchived),
  };
}

function parseNetWorthEntryFromSheet(
  raw: Record<string, unknown>,
): NetWorthEntry | null {
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

function parseSheetRow(
  entityType: SyncEntityType,
  r: Record<string, unknown>,
): unknown | null {
  switch (entityType) {
    case 'transactions':
      return parseTransactionFromSheet(r);
    case 'transfers':
      return parseTransferFromSheet(r);
    case 'accounts':
      return parseAccountFromSheet(r);
    case 'categories':
      return parseCategoryFromSheet(r);
    case 'groups':
      return parseGroupFromSheet(r);
    case 'netWorthEntries':
      return parseNetWorthEntryFromSheet(r);
    default: {
      const _e: never = entityType;
      throw new Error(`Unexpected entity: ${String(_e)}`);
    }
  }
}

function parseRowsForEntity(
  entityType: SyncEntityType,
  rows: unknown[],
): unknown[] {
  const out: unknown[] = [];
  for (const row of rows) {
    const r = coerceRow(row);
    if (!r) continue;
    const parsed = parseSheetRow(entityType, r);
    if (parsed) out.push(parsed);
  }
  return out;
}

type SheetRequestBody = {
  operation: SyncOperation | SyncListOperation;
  entityType: SyncEntityType;
  payload: object;
};

type SheetRequestResult = SyncResult & { rows?: unknown[] };

async function performSheetRequest(body: SheetRequestBody): Promise<SheetRequestResult> {
  const session = readSession();
  if (!session) {
    return { ok: false, error: 'Not signed in. Sign in with Google to sync.' };
  }

  try {
    const sheetId = await resolveUserSheetId(session.accessToken, session.sub);

    if (body.operation === 'list') {
      const rows = await listRows(session.accessToken, sheetId, body.entityType);
      return { ok: true, rows };
    }

    if (body.operation === 'delete') {
      const p = body.payload as Record<string, unknown>;
      const id = typeof p.id === 'string' ? p.id : '';
      if (!id) return { ok: false, error: 'Missing id for delete operation' };
      await deleteRowById(session.accessToken, sheetId, body.entityType, id);
      return { ok: true };
    }

    await upsertRow(session.accessToken, sheetId, body.entityType, body.payload);
    return { ok: true };
  } catch (err) {
    if (err instanceof SheetMissingError) {
      clearSheetIdMemCache();
      return { ok: false, error: SHEET_MISSING_USER_MESSAGE, code: 'sheet_missing' };
    }
    const msg = err instanceof Error ? err.message : 'Sync failed';
    if (isSheetMissingSyncError(msg) || msg.includes('404')) {
      clearSheetIdMemCache();
      return { ok: false, error: SHEET_MISSING_USER_MESSAGE, code: 'sheet_missing' };
    }
    return { ok: false, error: msg };
  }
}

async function resolveSheetPayload(
  operation: SyncOperation,
  entityType: SyncEntityType,
  payload: object,
): Promise<object | null> {
  const p = payload as Record<string, unknown>;
  const id = typeof p.id === 'string' ? p.id : null;

  if (operation === 'delete') {
    if (!id) return null;
    return { id };
  }

  switch (entityType) {
    case 'transactions': {
      if (operation === 'update' && id) {
        const row = await db.transactions.get(id);
        if (!row) return null;
        return normalizeForSheet(entityType, {
          ...row,
          ...p,
        } as Record<string, unknown>);
      }
      if (operation === 'create' && id) {
        const row = await db.transactions.get(id);
        if (row) return normalizeForSheet(entityType, row as unknown as Record<string, unknown>);
      }
      return normalizeForSheet(entityType, p);
    }
    case 'transfers': {
      if (operation === 'update' && id) {
        const row = await db.transfers.get(id);
        if (!row) return null;
        return normalizeForSheet(entityType, {
          ...row,
          ...p,
        } as Record<string, unknown>);
      }
      if (operation === 'create' && id) {
        const row = await db.transfers.get(id);
        if (row) return normalizeForSheet(entityType, row as unknown as Record<string, unknown>);
      }
      return normalizeForSheet(entityType, p);
    }
    case 'accounts': {
      if (operation === 'update' && id) {
        const row = await db.accounts.get(id);
        if (!row) return null;
        return normalizeForSheet(entityType, {
          ...row,
          ...p,
        } as Record<string, unknown>);
      }
      if (operation === 'create' && id) {
        const row = await db.accounts.get(id);
        if (row) return normalizeForSheet(entityType, row as unknown as Record<string, unknown>);
      }
      return normalizeForSheet(entityType, p);
    }
    case 'categories': {
      if (operation === 'update' && id) {
        const row = await db.categories.get(id);
        if (!row) return null;
        return normalizeForSheet(entityType, {
          ...row,
          ...p,
        } as Record<string, unknown>);
      }
      if (operation === 'create' && id) {
        const row = await db.categories.get(id);
        if (row) return normalizeForSheet(entityType, row as unknown as Record<string, unknown>);
      }
      return normalizeForSheet(entityType, p);
    }
    case 'groups': {
      if (operation === 'update' && id) {
        const row = await db.groups.get(id);
        if (!row) return null;
        return normalizeForSheet(entityType, {
          ...row,
          ...p,
        } as Record<string, unknown>);
      }
      if (operation === 'create' && id) {
        const row = await db.groups.get(id);
        if (row) return normalizeForSheet(entityType, row as unknown as Record<string, unknown>);
      }
      return normalizeForSheet(entityType, p);
    }
    case 'netWorthEntries': {
      if (operation === 'update' && id) {
        const row = await db.netWorthEntries.get(id);
        if (!row) return null;
        return normalizeForSheet(entityType, {
          ...row,
          ...p,
        } as Record<string, unknown>);
      }
      if (operation === 'create' && id) {
        const row = await db.netWorthEntries.get(id);
        if (row) return normalizeForSheet(entityType, row as unknown as Record<string, unknown>);
      }
      return normalizeForSheet(entityType, p);
    }
    default: {
      const _exhaustive: never = entityType;
      return _exhaustive;
    }
  }
}

export async function syncToSheet(
  operation: SyncOperation,
  entityType: SyncEntityType,
  payload: object,
): Promise<SyncResult> {
  const session = readSession();
  if (!session) {
    return { ok: false, error: 'Not signed in. Sign in with Google to sync.' };
  }

  onSyncStart();
  try {
    const sheetPayload = await resolveSheetPayload(operation, entityType, payload);
    if (!sheetPayload) {
      const err: SyncResult = {
        ok: false,
        error: 'Sync skipped: missing row or id for this operation.',
      };
      onSyncFinish(err);
      return err;
    }

    const req = await performSheetRequest({
      operation,
      entityType,
      payload: sheetPayload,
    });
    const { rows: _omit, ...result } = req;
    onSyncFinish(result);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network request failed';
    const result: SyncResult =
      isSheetMissingSyncError(msg) || msg.includes('404')
        ? { ok: false, error: SHEET_MISSING_USER_MESSAGE, code: 'sheet_missing' }
        : { ok: false, error: msg };
    onSyncFinish(result);
    return result;
  }
}

export function syncInBackground(
  operation: SyncOperation,
  entityType: SyncEntityType,
  payload: object,
): void {
  void syncToSheet(operation, entityType, payload).then((result) => {
    if (!result.ok) {
      console.error('[Moneyger Sync Error]', {
        operation,
        entityType,
        error: result.error ?? 'Unknown sync error',
      });
    }
  });
}

export async function fullSync(): Promise<SyncResult> {
  const entityData: Record<SyncEntityType, object[]> = {
    transactions: await db.transactions.toArray(),
    transfers: await db.transfers.toArray(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    groups: await db.groups.toArray(),
    netWorthEntries: await db.netWorthEntries.toArray(),
  };

  // Process entity types sequentially (referential integrity order) but fire
  // all rows within each type in parallel to stay within the 30s function timeout.
  for (const entityType of [
    'groups',
    'categories',
    'accounts',
    'transactions',
    'transfers',
    'netWorthEntries',
  ] as const) {
    const rows = entityData[entityType];
    if (rows.length === 0) continue;

    const results = await Promise.all(
      rows.map((row) => {
        const normalized = normalizeForSheet(
          entityType,
          row as Record<string, unknown>,
        );
        return syncToSheet('create', entityType, normalized);
      }),
    );

    const failed = results.find((r) => !r.ok);
    if (failed) return failed;
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

/** Replace local Dexie data with all rows from the user's Google Sheet tabs. */
export async function pullFullFromSheet(): Promise<SyncResult> {
  const session = readSession();
  if (!session) {
    return { ok: false, error: 'Not signed in. Sign in with Google to sync.' };
  }

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
      const listRes = await performSheetRequest({
        operation: 'list',
        entityType,
        payload: {},
      });
      if (!listRes.ok) {
        onSyncFinish(listRes);
        return listRes;
      }
      const parsed = parseRowsForEntity(entityType, listRes.rows ?? []);
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
      ],
      async () => {
        await Promise.all([
          db.groups.clear(),
          db.categories.clear(),
          db.accounts.clear(),
          db.transactions.clear(),
          db.transfers.clear(),
          db.netWorthEntries.clear(),
        ]);
        if (buckets.groups.length) await db.groups.bulkPut(buckets.groups);
        if (buckets.categories.length) {
          await db.categories.bulkPut(buckets.categories);
        }
        if (buckets.accounts.length) await db.accounts.bulkPut(buckets.accounts);
        if (buckets.transactions.length) {
          await db.transactions.bulkPut(buckets.transactions);
        }
        if (buckets.transfers.length) await db.transfers.bulkPut(buckets.transfers);
        if (buckets.netWorthEntries.length) {
          await db.netWorthEntries.bulkPut(buckets.netWorthEntries);
        }
      },
    );

    const ok: SyncResult = { ok: true };
    onSyncFinish(ok);
    return ok;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Pull failed';
    const result: SyncResult =
      isSheetMissingSyncError(msg) || msg.includes('404')
        ? { ok: false, error: SHEET_MISSING_USER_MESSAGE, code: 'sheet_missing' }
        : { ok: false, error: msg };
    onSyncFinish(result);
    return result;
  }
}
