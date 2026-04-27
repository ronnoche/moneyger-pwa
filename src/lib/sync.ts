import { db } from '@/db/db';

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

export async function syncToSheet(
  operation: SyncOperation,
  entityType: string,
  payload: object,
): Promise<SyncResult> {
  const accessToken = readAccessToken();
  if (!accessToken) {
    return { ok: false, error: 'Not signed in. Sign in with Google to sync.' };
  }

  onSyncStart();
  try {
    const response = await fetch(SYNC_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ operation, entityType, payload }),
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
      const result = await syncToSheet('create', entityType, row);
      if (!result.ok) return result;
    }
  }
  return { ok: true };
}

