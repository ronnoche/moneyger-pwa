import { db, newId, nowISO } from '@/db/db';
import type { Account, Transaction } from '@/db/schema';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';
import { syncInBackground } from '@/lib/sync';

export interface AccountInput {
  name: string;
  isCreditCard: boolean;
  openingBalance: number;
}

export class AccountHasTransactionsError extends Error {
  readonly count: number;

  constructor(count: number) {
    super(`Account has ${count} transaction(s) and cannot be deleted.`);
    this.name = 'AccountHasTransactionsError';
    this.count = count;
  }
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const account: Account = {
    id: newId(),
    name: input.name.trim(),
    isCreditCard: input.isCreditCard,
    isArchived: false,
  };
  const balance = round2(input.openingBalance);
  let seedTxn: Transaction | null = null;

  await db.transaction('rw', db.accounts, db.transactions, async () => {
    await db.accounts.add(account);
    if (balance !== 0) {
      const now = nowISO();
      seedTxn = {
        id: newId(),
        date: now.slice(0, 10),
        outflow: balance < 0 ? -balance : 0,
        inflow: balance > 0 ? balance : 0,
        categoryId: AVAILABLE_TO_BUDGET,
        accountId: account.id,
        memo: 'Opening balance',
        status: 'cleared',
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
      };
      await db.transactions.add(seedTxn);
    }
  });

  syncInBackground('create', 'accounts', account);
  if (seedTxn) {
    syncInBackground('create', 'transactions', seedTxn);
  }
  return account;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function updateAccount(
  id: string,
  patch: Partial<Omit<Account, 'id'>>,
): Promise<void> {
  await db.accounts.update(id, patch);
  syncInBackground('update', 'accounts', { id, ...patch });
}

export async function accountTransactionCount(id: string): Promise<number> {
  return db.transactions.where('accountId').equals(id).count();
}

export async function archiveAccount(id: string): Promise<void> {
  const count = await accountTransactionCount(id);
  if (count > 0) throw new AccountHasTransactionsError(count);
  await db.accounts.update(id, { isArchived: true });
  syncInBackground('update', 'accounts', { id, isArchived: true });
}
