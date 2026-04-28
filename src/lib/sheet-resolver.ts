import { lookupUser, upsertUser, updateUserSheetId } from '@/lib/registry-client';
import { findMoneygerSpreadsheetId } from '@/lib/google-drive-api';
import {
  createMoneygerSpreadsheet,
  ensureTabsAndHeaders,
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

export async function resolveUserSheetId(accessToken: string, googleSub: string): Promise<string> {
  // Hot path: in-memory cache avoids re-verification on every sync call within the session.
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

  function resolve(id: string): string {
    setCached(googleSub, id);
    memCache = { sub: googleSub, sheetId: id };
    return id;
  }

  const lookup = await lookupUser(accessToken);
  if (lookup.ok && lookup.found && lookup.user.user_sheet_id) {
    const registryId = lookup.user.user_sheet_id;
    const exists = await spreadsheetExists(accessToken, registryId);
    if (exists) {
      await ensureTabsAndHeaders(accessToken, registryId);
      void upsertUser(accessToken, registryId);
      return resolve(registryId);
    }
  }

  const driveId = await findMoneygerSpreadsheetId(accessToken);
  if (driveId) {
    await ensureTabsAndHeaders(accessToken, driveId);
    await updateUserSheetId(accessToken, driveId);
    void upsertUser(accessToken, driveId);
    return resolve(driveId);
  }

  const newId = await createMoneygerSpreadsheet(accessToken);
  await updateUserSheetId(accessToken, newId);
  void upsertUser(accessToken, newId);
  return resolve(newId);
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
