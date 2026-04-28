const REGISTRY_URL = '/.netlify/functions/registry';

export type RegistryUser = {
  google_sub: string;
  email: string;
  user_sheet_id: string | null;
  registered_at: string;
  last_seen_at: string;
  status: string;
};

export type LookupResult =
  | { ok: true; found: false }
  | { ok: true; found: true; user: RegistryUser }
  | { ok: false; error: string };

export async function lookupUser(accessToken: string): Promise<LookupResult> {
  const res = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: 'lookupUser' }),
  });
  return res.json() as Promise<LookupResult>;
}

export async function upsertUser(
  accessToken: string,
  userSheetId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const extra: Record<string, unknown> = {};
  if (userSheetId) extra.user_sheet_id = userSheetId;
  const res = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: 'upsertUser', ...extra }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string }>;
}

export async function updateUserSheetId(
  accessToken: string,
  userSheetId: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: 'updateUserSheetId', user_sheet_id: userSheetId }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string }>;
}
