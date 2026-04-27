const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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

function decodeJwtPayload(idToken) {
  try {
    const payloadBase64 = idToken.split('.')[1];
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function parseBody(event) {
  if (!event.body) throw new Error('Request body is empty');
  const parsed = JSON.parse(event.body);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid request body');
  return parsed;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = parseBody(event);
    const code = body.code;
    const redirectUri = body.redirectUri;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!code || typeof code !== 'string') {
      return response(400, { ok: false, error: 'Missing authorization code' });
    }
    if (!redirectUri || typeof redirectUri !== 'string') {
      return response(400, { ok: false, error: 'Missing redirect URI' });
    }
    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in server env',
      );
    }

    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return response(400, {
        ok: false,
        error: tokenPayload.error_description || tokenPayload.error || 'Token exchange failed',
      });
    }

    const profile = decodeJwtPayload(tokenPayload.id_token || '');
    return response(200, {
      ok: true,
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? null,
      expiresAt: Date.now() + Number(tokenPayload.expires_in || 0) * 1000,
      scope: tokenPayload.scope || '',
      tokenType: tokenPayload.token_type || 'Bearer',
      profile: {
        email: profile?.email ?? null,
        name: profile?.name ?? null,
        picture: profile?.picture ?? null,
        sub: profile?.sub ?? null,
      },
    });
  } catch (error) {
    return response(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected server error',
    });
  }
}
