import { db } from '@/db/db';
import type { Account, Category, Group, NetWorthEntry, Transaction, Transfer } from '@/db/schema';

export type SyncOperation = 'create' | 'update' | 'delete';
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
}

type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'success'; syncedAt: string }
  | { state: 'error'; error: string };

const SYNC_PROXY_URL = '/.netlify/functions/sheets-sync';
const SESSION_STORAGE_KEY = 'moneyger:google-session';
const listeners = new Set<(status: SyncStatus) => void>();

function readAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: string } | null;
    return parsed?.accessToken ?? null;
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
        goalAmount: Number(c.goalAmount ?? 0),
        goalDueDate: c.goalDueDate == null ? null : String(c.goalDueDate),
        goalRecurring:
          c.goalRecurring === undefined || c.goalRecurring === null
            ? null
            : Boolean(c.goalRecurring),
        goalStartMonth:
          c.goalStartMonth == null ? null : String(c.goalStartMonth),
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
  const accessToken = readAccessToken();
  if (!accessToken) {
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

    const response = await fetch(SYNC_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        operation,
        entityType,
        payload: sheetPayload,
      }),
    });
    const raw = (await response.json().catch(() => ({}))) as SyncResult;
    const result: SyncResult = response.ok
      ? raw
      : { ok: false, error: raw.error ?? `Sync failed (${response.status})` };
    onSyncFinish(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      ok: false,
      error: error instanceof Error ? error.message : 'Network request failed',
    };
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

  for (const entityType of [
    'transactions',
    'transfers',
    'accounts',
    'categories',
    'groups',
    'netWorthEntries',
  ] as const) {
    for (const row of entityData[entityType]) {
      const normalized = normalizeForSheet(
        entityType,
        row as Record<string, unknown>,
      );
      const result = await syncToSheet('create', entityType, normalized);
      if (!result.ok) return result;
    }
  }
  return { ok: true };
}
