const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

export async function findMoneygerSpreadsheetId(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(
    "name='Moneyger App Budget' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime)');
  const url = `${DRIVE_FILES_URL}?q=${q}&fields=${fields}&orderBy=modifiedTime+desc&pageSize=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(
      `Drive API error ${res.status}: ${(err as { error?: { message?: string } }).error?.message ?? 'unknown'}`,
    );
  }
  const data = (await res.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}
