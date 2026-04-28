const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event.body) throw new Error('Request body is empty');
  const parsed = JSON.parse(event.body);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid request body');
  return parsed;
}

function readBearer(event) {
  const header =
    event.headers?.authorization ?? event.headers?.Authorization ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function verifyAccessToken(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const info = await res.json();
  if (!info.email) return null;
  // Reject only when Google explicitly marks the email as unverified.
  if (info.email_verified === false) return null;
  return { email: String(info.email).toLowerCase(), sub: info.sub ?? null };
}

function buildAllowlist(raw) {
  if (!raw) return null;
  const list = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? new Set(list) : null;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.APPS_SCRIPT_SECRET;
    if (!appsScriptUrl || !appsScriptSecret) {
      throw new Error('Missing APPS_SCRIPT_URL or APPS_SCRIPT_SECRET in server env');
    }

    const accessToken = readBearer(event);
    if (!accessToken) {
      return response(401, { ok: false, error: 'Missing bearer token' });
    }

    const identity = await verifyAccessToken(accessToken);
    if (!identity) {
      return response(401, { ok: false, error: 'Invalid or expired access token' });
    }

    const allowlist = buildAllowlist(process.env.GOOGLE_ALLOWED_EMAILS);
    if (allowlist && !allowlist.has(identity.email)) {
      return response(403, { ok: false, error: 'Email not allowed' });
    }

    const body = parseBody(event);
    const { operation, entityType, payload } = body;
    if (!operation || !entityType) {
      return response(400, { ok: false, error: 'Missing operation or entityType' });
    }

    const upstream = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: appsScriptSecret,
        operation,
        entityType,
        payload,
        actor: { email: identity.email, sub: identity.sub },
      }),
    });

    const raw = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return response(upstream.status, {
        ok: false,
        error: raw?.error || 'Apps Script request failed',
      });
    }

    return response(200, raw?.ok === false ? raw : { ok: true, ...raw });
  } catch (error) {
    return response(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected server error',
    });
  }
}
