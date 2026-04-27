import { db, newId, nowISO } from '@/db/db';
import type { Transaction } from '@/db/schema';
import { syncInBackground } from '@/lib/sync';

const LAST_ACCOUNT_KEY = 'moneyger:last-account';

export interface TransactionInput {
  date: string;
  outflow: number;
  inflow: number;
  categoryId: string;
  accountId: string;
  memo: string;
  status: Transaction['status'];
}

export async function createTransaction(
  input: TransactionInput,
): Promise<Transaction> {
  const now = nowISO();
  const txn: Transaction = {
    id: newId(),
    date: input.date,
    outflow: round2(input.outflow),
    inflow: round2(input.inflow),
    categoryId: input.categoryId,
    accountId: input.accountId,
    memo: input.memo,
    status: input.status,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };
  await db.transactions.add(txn);
  syncInBackground('create', 'transactions', txn);
  rememberAccount(input.accountId);
  return txn;
}

export async function updateTransaction(
  id: string,
  patch: Partial<TransactionInput>,
): Promise<void> {
  const next: Partial<Transaction> = { ...patch, updatedAt: nowISO() };
  if (patch.outflow !== undefined) next.outflow = round2(patch.outflow);
  if (patch.inflow !== undefined) next.inflow = round2(patch.inflow);
  await db.transactions.update(id, next);
  syncInBackground('update', 'transactions', { id, ...next });
  if (patch.accountId) rememberAccount(patch.accountId);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
  syncInBackground('delete', 'transactions', { id });
}

export function getLastUsedAccountId(): string | null {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function rememberAccount(id: string): void {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, id);
  } catch {
    // non-fatal
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
