import { db } from '@/db/db';
import type {
  Account,
  Category,
  Group,
  NetWorthEntry,
  Transaction,
  Transfer,
} from '@/db/schema';

export interface BackupFile {
  version: 1;
  exportedAt: string;
  data: {
    groups: Group[];
    categories: Category[];
    accounts: Account[];
    transactions: Transaction[];
    transfers: Transfer[];
    netWorthEntries: NetWorthEntry[];
  };
}

export async function exportBackup(): Promise<BackupFile> {
  const [groups, categories, accounts, transactions, transfers, netWorthEntries] =
    await Promise.all([
      db.groups.toArray(),
      db.categories.toArray(),
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.transfers.toArray(),
      db.netWorthEntries.toArray(),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      groups,
      categories,
      accounts,
      transactions,
      transfers,
      netWorthEntries,
    },
  };
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moneyger-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importBackup(
  file: File,
  mode: 'replace' | 'merge',
): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  const backup = coerceBackup(parsed);

  await db.transaction(
    'rw',
    [
      db.groups,
      db.categories,
      db.accounts,
      db.transactions,
      db.transfers,
      db.netWorthEntries,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.groups.clear(),
          db.categories.clear(),
          db.accounts.clear(),
          db.transactions.clear(),
          db.transfers.clear(),
          db.netWorthEntries.clear(),
        ]);
      }
      await db.groups.bulkPut(backup.data.groups);
      await db.categories.bulkPut(backup.data.categories);
      await db.accounts.bulkPut(backup.data.accounts);
      await db.transactions.bulkPut(backup.data.transactions);
      await db.transfers.bulkPut(backup.data.transfers);
      await db.netWorthEntries.bulkPut(backup.data.netWorthEntries);
    },
  );
}

export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.groups,
      db.categories,
      db.accounts,
      db.transactions,
      db.transfers,
      db.netWorthEntries,
      db.syncLogs,
    ],
    async () => {
      await Promise.all([
        db.groups.clear(),
        db.categories.clear(),
        db.accounts.clear(),
        db.transactions.clear(),
        db.transfers.clear(),
        db.netWorthEntries.clear(),
        db.syncLogs.clear(),
      ]);
    },
  );
}

function coerceBackup(raw: unknown): BackupFile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file is not a valid JSON object');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error('Unsupported backup version');
  }
  const data = obj.data as BackupFile['data'] | undefined;
  if (!data || typeof data !== 'object') {
    throw new Error('Backup file is missing a data section');
  }
  for (const key of [
    'groups',
    'categories',
    'accounts',
    'transactions',
    'transfers',
    'netWorthEntries',
  ] as const) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Backup file is missing or invalid: ${key}`);
    }
  }
  return obj as unknown as BackupFile;
}
