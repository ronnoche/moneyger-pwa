const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const ALLOWED_ACTIONS = new Set(['lookupUser', 'upsertUser', 'updateUserSheetId']);

function response(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(payload),
  };
}

function readBearer(event) {
  const header = event.headers?.authorization ?? event.headers?.Authorization ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function verifyToken(token) {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const info = await res.json();
  if (!info.sub || !info.email) return null;
  if (info.email_verified === false) return null;
  return { sub: String(info.sub), email: String(info.email).toLowerCase() };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return response(405, { ok: false, error: 'Method not allowed' });

  const token = readBearer(event);
  if (!token) return response(401, { ok: false, error: 'Missing authorization token' });

  let userInfo;
  try {
    userInfo = await verifyToken(token);
  } catch {
    return response(401, { ok: false, error: 'Token verification failed' });
  }
  if (!userInfo) return response(401, { ok: false, error: 'Invalid or expired token' });

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return response(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { action, ...rest } = body ?? {};
  if (!ALLOWED_ACTIONS.has(action)) return response(400, { ok: false, error: `Invalid action: ${action}` });

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!appsScriptUrl || !secret) return response(500, { ok: false, error: 'Registry not configured' });

  // Merge rest (e.g. user_sheet_id for updateUserSheetId) but force sub/email from verified token
  const payload = { secret, action, google_sub: userInfo.sub, email: userInfo.email };
  if (action === 'updateUserSheetId' && typeof rest.user_sheet_id === 'string') {
    payload.user_sheet_id = rest.user_sheet_id;
  }
  if (action === 'upsertUser' && typeof rest.user_sheet_id === 'string') {
    payload.user_sheet_id = rest.user_sheet_id;
  }

  try {
    const scriptRes = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await scriptRes.json().catch(() => ({ ok: false, error: 'Invalid response from registry' }));
    return response(200, result);
  } catch (err) {
    return response(502, { ok: false, error: err instanceof Error ? err.message : 'Registry unreachable' });
  }
}
