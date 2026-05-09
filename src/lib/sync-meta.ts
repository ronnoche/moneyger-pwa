/**
 * Persistent sync metadata. Survives reloads, unlike the in-memory sync status
 * pill. Keyed per Google account so switching users doesn't show stale data.
 */

const LAST_SYNCED_PREFIX = 'moneyger:last-synced-at:';
const LAST_ERROR_PREFIX = 'moneyger:last-sync-error:';

const SESSION_STORAGE_KEY = 'moneyger:google-session';

function readOwnerKey(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      sub?: string | null;
      email?: string | null;
    } | null;
    if (!parsed) return null;
    return parsed.sub ?? parsed.email ?? null;
  } catch {
    return null;
  }
}

export function getLastSyncedAt(): string | null {
  const owner = readOwnerKey();
  if (!owner) return null;
  try {
    return localStorage.getItem(`${LAST_SYNCED_PREFIX}${owner}`);
  } catch {
    return null;
  }
}

export function setLastSyncedAt(iso: string): void {
  const owner = readOwnerKey();
  if (!owner) return;
  try {
    localStorage.setItem(`${LAST_SYNCED_PREFIX}${owner}`, iso);
  } catch {
    /* non-fatal */
  }
}

export function getLastSyncError(): string | null {
  const owner = readOwnerKey();
  if (!owner) return null;
  try {
    return localStorage.getItem(`${LAST_ERROR_PREFIX}${owner}`);
  } catch {
    return null;
  }
}

export function setLastSyncError(message: string | null): void {
  const owner = readOwnerKey();
  if (!owner) return;
  try {
    if (message == null) {
      localStorage.removeItem(`${LAST_ERROR_PREFIX}${owner}`);
    } else {
      localStorage.setItem(`${LAST_ERROR_PREFIX}${owner}`, message);
    }
  } catch {
    /* non-fatal */
  }
}

export function clearSyncMetaForOwner(ownerKey: string): void {
  try {
    localStorage.removeItem(`${LAST_SYNCED_PREFIX}${ownerKey}`);
    localStorage.removeItem(`${LAST_ERROR_PREFIX}${ownerKey}`);
  } catch {
    /* non-fatal */
  }
}
