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
    const refreshToken = body.refreshToken;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return response(400, { ok: false, error: 'Missing refresh token' });
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
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return response(400, {
        ok: false,
        error: tokenPayload.error_description || tokenPayload.error || 'Token refresh failed',
      });
    }

    return response(200, {
      ok: true,
      accessToken: tokenPayload.access_token,
      expiresAt: Date.now() + Number(tokenPayload.expires_in || 0) * 1000,
      scope: tokenPayload.scope || '',
      tokenType: tokenPayload.token_type || 'Bearer',
    });
  } catch (error) {
    return response(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected server error',
    });
  }
}
