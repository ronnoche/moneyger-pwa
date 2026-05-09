import { lookupUser, upsertUser, updateUserSheetId } from '@/lib/registry-client';
import { findMoneygerSpreadsheetId } from '@/lib/google-drive-api';
import {
  createMoneygerSpreadsheet,
  ensureTabsAndHeaders,
  getSpreadsheetTitle,
  MONEYGER_SHEET_TITLE,
  spreadsheetExists,
} from '@/lib/google-sheets-api';

const CACHE_PREFIX = 'moneyger:sheet-id:';

// In-memory cache so repeated sync calls within the same session never re-verify.
// Cleared when a SheetMissingError is detected so the next call re-resolves.
let memCache: { sub: string; sheetId: string } | null = null;

export function clearSheetIdMemCache(): void {
  memCache = null;
}

function getCached(sub: string): string | null {
  try {
    return localStorage.getItem(`${CACHE_PREFIX}${sub}`);
  } catch {
    return null;
  }
}

function setCached(sub: string, sheetId: string): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${sub}`, sheetId);
  } catch {
    /* non-fatal */
  }
}

function clearCached(sub: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${sub}`);
  } catch {
    /* non-fatal */
  }
}

/**
 * Lightweight resolver used by the per-mutation sync path. Returns just the id;
 * does NOT verify the title (we don't want a network round-trip on every
 * mutation). Title verification happens once per session via
 * {@link connectUserSheet}.
 */
export async function resolveUserSheetId(
  accessToken: string,
  googleSub: string,
): Promise<string> {
  if (memCache?.sub === googleSub) return memCache.sheetId;

  const cached = getCached(googleSub);
  if (cached) {
    const exists = await spreadsheetExists(accessToken, cached);
    if (exists) {
      memCache = { sub: googleSub, sheetId: cached };
      return cached;
    }
    clearCached(googleSub);
  }

  const lookup = await lookupUser(accessToken);
  if (lookup.ok && lookup.found && lookup.user.user_sheet_id) {
    const registryId = lookup.user.user_sheet_id;
    const exists = await spreadsheetExists(accessToken, registryId);
    if (exists) {
      await ensureTabsAndHeaders(accessToken, registryId);
      void upsertUser(accessToken, registryId);
      setCached(googleSub, registryId);
      memCache = { sub: googleSub, sheetId: registryId };
      return registryId;
    }
  }

  // Fall back to Drive search by exact title — only a sheet still named
  // "Moneyger App Budget" is adopted. A renamed sheet will not match here, so
  // we'll create a new one (treated as a new user, per spec).
  const driveId = await findMoneygerSpreadsheetId(accessToken);
  if (driveId) {
    await ensureTabsAndHeaders(accessToken, driveId);
    await updateUserSheetId(accessToken, driveId);
    void upsertUser(accessToken, driveId);
    setCached(googleSub, driveId);
    memCache = { sub: googleSub, sheetId: driveId };
    return driveId;
  }

  const newId = await createMoneygerSpreadsheet(accessToken);
  await updateUserSheetId(accessToken, newId);
  void upsertUser(accessToken, newId);
  setCached(googleSub, newId);
  memCache = { sub: googleSub, sheetId: newId };
  return newId;
}

export type SheetConnectStatus =
  /** Found and verified an existing Moneyger sheet for this account. */
  | 'returning'
  /** No sheet existed; created a fresh one (new user). */
  | 'created'
  /** Old sheet was renamed/missing; created a fresh one (treated as new). */
  | 'recreated';

export interface SheetConnectResult {
  sheetId: string;
  status: SheetConnectStatus;
  /** Set when the previous sheet was renamed (status = 'recreated' for that reason). */
  renameDetected: boolean;
}

/**
 * Authoritative login-time resolver. Returns the sheet id along with whether
 * the user is returning, brand new, or had their sheet renamed/deleted (in
 * which case we treat them as new, per spec). Verifies title every time.
 */
export async function connectUserSheet(
  accessToken: string,
  googleSub: string,
): Promise<SheetConnectResult> {
  // 1. Cache hit: verify title still matches.
  const cached = getCached(googleSub);
  if (cached) {
    const title = await getSpreadsheetTitle(accessToken, cached);
    if (title === MONEYGER_SHEET_TITLE) {
      memCache = { sub: googleSub, sheetId: cached };
      return { sheetId: cached, status: 'returning', renameDetected: false };
    }
    if (title != null && title !== MONEYGER_SHEET_TITLE) {
      // Renamed → void the link and create a fresh sheet.
      clearCached(googleSub);
      memCache = null;
      const newId = await createMoneygerSpreadsheet(accessToken);
      await updateUserSheetId(accessToken, newId);
      void upsertUser(accessToken, newId);
      setCached(googleSub, newId);
      memCache = { sub: googleSub, sheetId: newId };
      return { sheetId: newId, status: 'recreated', renameDetected: true };
    }
    // Title null = sheet missing/inaccessible — fall through to registry / drive.
    clearCached(googleSub);
    memCache = null;
  }

  // 2. Registry lookup.
  const lookup = await lookupUser(accessToken);
  if (lookup.ok && lookup.found && lookup.user.user_sheet_id) {
    const registryId = lookup.user.user_sheet_id;
    const title = await getSpreadsheetTitle(accessToken, registryId);
    if (title === MONEYGER_SHEET_TITLE) {
      await ensureTabsAndHeaders(accessToken, registryId);
      void upsertUser(accessToken, registryId);
      setCached(googleSub, registryId);
      memCache = { sub: googleSub, sheetId: registryId };
      return { sheetId: registryId, status: 'returning', renameDetected: false };
    }
    if (title != null && title !== MONEYGER_SHEET_TITLE) {
      // Renamed → treat as new.
      const newId = await createMoneygerSpreadsheet(accessToken);
      await updateUserSheetId(accessToken, newId);
      void upsertUser(accessToken, newId);
      setCached(googleSub, newId);
      memCache = { sub: googleSub, sheetId: newId };
      return { sheetId: newId, status: 'recreated', renameDetected: true };
    }
    // Title null — sheet was deleted. Fall through to Drive search.
  }

  // 3. Drive search (matches by exact title only).
  const driveId = await findMoneygerSpreadsheetId(accessToken);
  if (driveId) {
    await ensureTabsAndHeaders(accessToken, driveId);
    await updateUserSheetId(accessToken, driveId);
    void upsertUser(accessToken, driveId);
    setCached(googleSub, driveId);
    memCache = { sub: googleSub, sheetId: driveId };
    return { sheetId: driveId, status: 'returning', renameDetected: false };
  }

  // 4. No sheet anywhere — create one.
  const newId = await createMoneygerSpreadsheet(accessToken);
  await updateUserSheetId(accessToken, newId);
  void upsertUser(accessToken, newId);
  setCached(googleSub, newId);
  memCache = { sub: googleSub, sheetId: newId };
  return { sheetId: newId, status: 'created', renameDetected: false };
}

export async function recreateUserSheet(accessToken: string, googleSub: string): Promise<string> {
  clearCached(googleSub);
  memCache = null;
  const newId = await createMoneygerSpreadsheet(accessToken);
  await updateUserSheetId(accessToken, newId);
  void upsertUser(accessToken, newId);
  setCached(googleSub, newId);
  memCache = { sub: googleSub, sheetId: newId };
  return newId;
}
