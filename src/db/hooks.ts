import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type {
  Account,
  Category,
  Group,
  NetWorthEntry,
  Transaction,
  Transfer,
} from './schema';

export function useGroups(): Group[] | undefined {
  return useLiveQuery(() =>
    db.groups
      .filter((g) => !g.isArchived)
      .sortBy('sortOrder'),
  );
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(() =>
    db.categories
      .filter((c) => !c.isArchived)
      .sortBy('sortOrder'),
  );
}

export function useCategoriesByGroup(
  groupId: string,
): Category[] | undefined {
  return useLiveQuery(
    () =>
      db.categories
        .where('groupId')
        .equals(groupId)
        .filter((c) => !c.isArchived)
        .sortBy('sortOrder'),
    [groupId],
  );
}

export function useAccounts(): Account[] | undefined {
  return useLiveQuery(() =>
    db.accounts
      .filter((a) => !a.isArchived)
      .toArray(),
  );
}

export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray());
}

export function useTransfers(): Transfer[] | undefined {
  return useLiveQuery(() => db.transfers.orderBy('date').reverse().toArray());
}

export function useNetWorthEntries(): NetWorthEntry[] | undefined {
  return useLiveQuery(() =>
    db.netWorthEntries.orderBy('date').reverse().toArray(),
  );
}

export function useIsEmpty(): boolean | undefined {
  return useLiveQuery(async () => {
    const [g, c, a] = await Promise.all([
      db.groups.count(),
      db.categories.count(),
      db.accounts.count(),
    ]);
    return g === 0 && c === 0 && a === 0;
  });
}
