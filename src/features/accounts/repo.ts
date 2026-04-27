import { db, newId, nowISO } from '@/db/db';
import type {
  Account,
  AccountCategory,
  AccountSubtype,
  Category,
  Group,
  Transaction,
} from '@/db/schema';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';
import { syncInBackground } from '@/lib/sync';

export interface AccountInput {
  name: string;
  accountCategory?: AccountCategory;
  subtype?: AccountSubtype;
  onBudget?: boolean;
  /**
   * @deprecated Use accountCategory/subtype instead.
   */
  isCreditCard?: boolean;
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
  const isCredit =
    input.accountCategory === 'credit' ||
    input.subtype === 'credit_card' ||
    input.subtype === 'line_of_credit' ||
    !!input.isCreditCard;
  const accountCategory = input.accountCategory ?? (isCredit ? 'credit' : 'cash');
  const subtype = input.subtype ?? (isCredit ? 'credit_card' : 'checking');
  const onBudget = input.onBudget ?? (accountCategory === 'cash' || accountCategory === 'credit');

  const account: Account = {
    id: newId(),
    name: input.name.trim(),
    accountCategory,
    subtype,
    onBudget,
    lastReconciledAt: null,
    isCreditCard: isCredit,
    isArchived: false,
  };
  const balance = round2(input.openingBalance);
  let seedTxn: Transaction | null = null;
  let paymentGroup: Group | null = null;
  let paymentCategory: Category | null = null;

  await db.transaction('rw', db.accounts, db.transactions, db.groups, db.categories, async () => {
    await db.accounts.add(account);

    if (account.accountCategory === 'credit') {
      paymentGroup =
        (await db.groups.filter((group) => group.name === 'Credit Card Payments').first()) ??
        null;
      if (!paymentGroup) {
        const groups = await db.groups.toArray();
        const maxSort = groups.reduce((max, group) => Math.max(max, group.sortOrder), -1);
        paymentGroup = {
          id: newId(),
          name: 'Credit Card Payments',
          sortOrder: maxSort + 1,
          isArchived: false,
        };
        await db.groups.add(paymentGroup);
      }

      const existingInGroup = await db.categories
        .where('groupId')
        .equals(paymentGroup.id)
        .toArray();
      const maxSort = existingInGroup.reduce(
        (max, category) => Math.max(max, category.sortOrder),
        -1,
      );
      paymentCategory = {
        id: newId(),
        groupId: paymentGroup.id,
        name: `Credit Card Payment: ${account.name}`,
        type: 'expense',
        goalType: 'none',
        goalBehavior: null,
        goalAmount: 0,
        goalDueDate: null,
        goalRecurring: null,
        goalStartMonth: null,
        snoozedUntil: null,
        linkedAccountId: account.id,
        sortOrder: maxSort + 1,
        isArchived: false,
      };
      await db.categories.add(paymentCategory);
    }

    if (balance !== 0) {
      const now = nowISO();
      const openingCategoryId =
        account.accountCategory === 'cash'
          ? AVAILABLE_TO_BUDGET
          : account.accountCategory === 'credit'
            ? (paymentCategory?.id ?? AVAILABLE_TO_BUDGET)
            : 'off_budget';
      seedTxn = {
        id: newId(),
        date: now.slice(0, 10),
        outflow: balance < 0 ? -balance : 0,
        inflow: balance > 0 ? balance : 0,
        categoryId: openingCategoryId,
        accountId: account.id,
        memo: 'Opening balance',
        status: 'cleared',
        reconciledAt: null,
        reconcileEventId: null,
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
      };
      await db.transactions.add(seedTxn);
    }
  });

  syncInBackground('create', 'accounts', account);
  if (paymentGroup) {
    syncInBackground('create', 'groups', paymentGroup);
  }
  if (paymentCategory) {
    syncInBackground('create', 'categories', paymentCategory);
  }
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
