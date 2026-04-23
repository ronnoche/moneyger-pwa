import { google } from 'googleapis';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

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

function parseRequestBody(rawBody) {
  if (!rawBody) {
    throw new Error('Request body is empty');
  }
  const parsed = JSON.parse(rawBody);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Request body is invalid');
  }
  return parsed;
}

async function verifyGoogleIdToken(idToken, expectedAudience) {
  const url = new URL('https://oauth2.googleapis.com/tokeninfo');
  url.searchParams.set('id_token', idToken);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Google token validation failed');
  }

  const payload = await res.json();
  if (payload.aud !== expectedAudience) {
    throw new Error('Google token audience mismatch');
  }
  if (payload.email_verified !== 'true') {
    throw new Error('Google account email is not verified');
  }

  return payload;
}

function buildRows(email, backup) {
  const syncedAt = new Date().toISOString();
  const entities = [
    ['groups', backup.data.groups],
    ['categories', backup.data.categories],
    ['accounts', backup.data.accounts],
    ['transactions', backup.data.transactions],
    ['transfers', backup.data.transfers],
    ['netWorthEntries', backup.data.netWorthEntries],
  ];

  const rows = [];
  for (const [entityType, items] of entities) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      rows.push([
        syncedAt,
        email,
        backup.version,
        backup.exportedAt,
        entityType,
        item?.id ?? '',
        JSON.stringify(item),
      ]);
    }
  }

  if (rows.length === 0) {
    rows.push([
      syncedAt,
      email,
      backup.version,
      backup.exportedAt,
      'empty_backup',
      '',
      '{}',
    ]);
  }

  return rows;
}

async function appendRowsToSheet(rows) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetName = process.env.GOOGLE_SHEETS_TAB || 'Records';

  if (!spreadsheetId || !serviceEmail || !privateKey) {
    throw new Error('Google Sheets server environment is not configured');
  }

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: [SHEETS_SCOPE],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(event.body);
    const idToken = body.idToken;
    const backup = body.backup;
    const expectedAudience = process.env.GOOGLE_CLIENT_ID;

    if (!idToken || typeof idToken !== 'string') {
      return response(400, { error: 'Missing Google idToken' });
    }
    if (!expectedAudience) {
      throw new Error('GOOGLE_CLIENT_ID is missing on server');
    }
    if (!backup || typeof backup !== 'object') {
      return response(400, { error: 'Missing backup payload' });
    }

    const tokenPayload = await verifyGoogleIdToken(idToken, expectedAudience);
    const allowed = process.env.GOOGLE_ALLOWED_EMAILS;
    if (allowed) {
      const allowedEmails = new Set(
        allowed
          .split(',')
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean),
      );
      if (!allowedEmails.has(String(tokenPayload.email).toLowerCase())) {
        return response(403, { error: 'Google account is not allowed' });
      }
    }

    const rows = buildRows(tokenPayload.email, backup);
    await appendRowsToSheet(rows);

    return response(200, {
      ok: true,
      syncedRows: rows.length,
      user: tokenPayload.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return response(500, { error: message });
  }
}
