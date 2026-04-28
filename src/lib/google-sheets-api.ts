import type { SyncEntityType } from './sync';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetMissingError extends Error {
  readonly spreadsheetId: string;

  constructor(spreadsheetId: string) {
    super(`Spreadsheet ${spreadsheetId} not found or inaccessible`);
    this.name = 'SheetMissingError';
    this.spreadsheetId = spreadsheetId;
  }
}

export const ENTITY_TAB_NAMES: Record<SyncEntityType, string> = {
  transactions: 'Transactions',
  transfers: 'Transfers',
  accounts: 'Accounts',
  categories: 'Categories',
  groups: 'Groups',
  netWorthEntries: 'NetWorthEntries',
};

export const ENTITY_TAB_HEADERS: Record<SyncEntityType, string[]> = {
  transactions: [
    'id',
    'date',
    'outflow',
    'inflow',
    'categoryId',
    'accountId',
    'memo',
    'status',
    'reconciledAt',
    'reconcileEventId',
    'createdAt',
    'updatedAt',
    'syncedAt',
  ],
  transfers: [
    'id',
    'date',
    'amount',
    'fromCategoryId',
    'toCategoryId',
    'memo',
    'createdAt',
    'updatedAt',
    'syncedAt',
  ],
  accounts: [
    'id',
    'name',
    'accountCategory',
    'subtype',
    'onBudget',
    'lastReconciledAt',
    'isCreditCard',
    'isArchived',
  ],
  categories: [
    'id',
    'groupId',
    'name',
    'type',
    'goalType',
    'goalBehavior',
    'goalAmount',
    'goalDueDate',
    'goalRecurring',
    'goalStartMonth',
    'snoozedUntil',
    'linkedAccountId',
    'sortOrder',
    'isArchived',
  ],
  groups: ['id', 'name', 'sortOrder', 'isArchived'],
  netWorthEntries: ['id', 'date', 'amount', 'category', 'type', 'notes'],
};

function spreadsheetIdFromUrl(url: string): string {
  const m = url.match(/spreadsheets\/([^/?]+)/);
  return m?.[1] ?? 'unknown';
}

// Convert column index (0-based) to letter(s): 0→A, 25→Z, 26→AA
function columnLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

async function sheetsRequest<T>(
  accessToken: string,
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const idHint = spreadsheetIdFromUrl(url);

  if (res.status === 404) {
    throw new SheetMissingError(idHint);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const msg =
      (err as { error?: { message?: string } }).error?.message ?? `Sheets API error ${res.status}`;
    const low = msg.toLowerCase();
    if (
      res.status === 403 &&
      (low.includes('not found') || low.includes('permission') || low.includes('forbidden'))
    ) {
      throw new SheetMissingError(idHint);
    }
    throw new Error(msg);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export async function spreadsheetExists(
  accessToken: string,
  spreadsheetId: string,
): Promise<boolean> {
  try {
    await sheetsRequest(
      accessToken,
      `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId`,
      { method: 'GET' },
    );
    return true;
  } catch (err) {
    if (err instanceof SheetMissingError) return false;
    throw err;
  }
}

export async function createMoneygerSpreadsheet(accessToken: string): Promise<string> {
  const body = {
    properties: { title: 'Moneyger App Budget' },
    sheets: Object.values(ENTITY_TAB_NAMES).map((title) => ({ properties: { title } })),
  };
  const result = await sheetsRequest<{ spreadsheetId: string }>(
    accessToken,
    SHEETS_BASE,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  const spreadsheetId = result.spreadsheetId;
  await ensureTabsAndHeaders(accessToken, spreadsheetId);
  return spreadsheetId;
}

export async function ensureTabsAndHeaders(
  accessToken: string,
  spreadsheetId: string,
): Promise<void> {
  const meta = await sheetsRequest<{
    sheets: Array<{ properties: { title: string; sheetId: number } }>;
  }>(
    accessToken,
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`,
    { method: 'GET' },
  );
  const existingTabs = new Map(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));

  const requests: unknown[] = [];
  for (const tabName of Object.values(ENTITY_TAB_NAMES)) {
    if (!existingTabs.has(tabName)) {
      requests.push({ addSheet: { properties: { title: tabName } } });
    }
  }
  if (requests.length) {
    await sheetsRequest(
      accessToken,
      `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      },
    );
  }

  const data = (Object.entries(ENTITY_TAB_HEADERS) as [SyncEntityType, string[]][]).map(
    ([entityType, headers]) => ({
      range: `${ENTITY_TAB_NAMES[entityType]}!A1`,
      values: [headers],
    }),
  );
  await sheetsRequest(
    accessToken,
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    },
  );
}

export async function listRows(
  accessToken: string,
  spreadsheetId: string,
  entityType: SyncEntityType,
): Promise<Record<string, unknown>[]> {
  const tabName = ENTITY_TAB_NAMES[entityType];
  const rangePath = encodeURIComponent(`${tabName}`);
  const result = await sheetsRequest<{ values?: string[][] }>(
    accessToken,
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${rangePath}`,
    { method: 'GET' },
  );
  const values = result.values ?? [];
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h));
  return values.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? null;
    });
    return obj;
  });
}

export async function upsertRow(
  accessToken: string,
  spreadsheetId: string,
  entityType: SyncEntityType,
  row: object,
): Promise<void> {
  const headers = ENTITY_TAB_HEADERS[entityType];
  const tabName = ENTITY_TAB_NAMES[entityType];
  const rowObj = row as Record<string, unknown>;
  const id = typeof rowObj.id === 'string' ? rowObj.id : '';
  const values = [
    headers.map((h) => {
      const v = rowObj[h];
      if (v == null) return '';
      if (typeof v === 'boolean') return String(v);
      return String(v);
    }),
  ];

  const colAResult = await sheetsRequest<{ values?: string[][] }>(
    accessToken,
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${tabName}!A:A`)}`,
    { method: 'GET' },
  );
  const colA = (colAResult.values ?? []).flat().map((c) => String(c));
  const rowIndex = id ? colA.indexOf(id) : -1;

  const lastCol = columnLetter(headers.length - 1);
  const encId = encodeURIComponent(spreadsheetId);

  if (rowIndex > 0) {
    const sheetRow = rowIndex + 1;
    const range = encodeURIComponent(`${tabName}!A${sheetRow}:${lastCol}${sheetRow}`);
    await sheetsRequest(
      accessToken,
      `${SHEETS_BASE}/${encId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      },
    );
  } else {
    const range = encodeURIComponent(`${tabName}!A:${lastCol}`);
    await sheetsRequest(
      accessToken,
      `${SHEETS_BASE}/${encId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      },
    );
  }
}

export async function deleteRowById(
  accessToken: string,
  spreadsheetId: string,
  entityType: SyncEntityType,
  id: string,
): Promise<void> {
  const tabName = ENTITY_TAB_NAMES[entityType];
  const encId = encodeURIComponent(spreadsheetId);

  const colAResult = await sheetsRequest<{ values?: string[][] }>(
    accessToken,
    `${SHEETS_BASE}/${encId}/values/${encodeURIComponent(`${tabName}!A:A`)}`,
    { method: 'GET' },
  );
  const colA = (colAResult.values ?? []).flat().map((c) => String(c));
  const rowIndex = colA.indexOf(id);
  if (rowIndex <= 0) return;

  const meta = await sheetsRequest<{
    sheets: Array<{ properties: { title: string; sheetId: number } }>;
  }>(
    accessToken,
    `${SHEETS_BASE}/${encId}?fields=sheets.properties`,
    { method: 'GET' },
  );
  const sheet = meta.sheets.find((s) => s.properties.title === tabName);
  if (!sheet) return;

  await sheetsRequest(accessToken, `${SHEETS_BASE}/${encId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });
}
