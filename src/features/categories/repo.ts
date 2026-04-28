import { db, newId } from '@/db/db';
import type { Category, CategoryType, GoalBehavior, GoalType } from '@/db/schema';
import { syncInBackground } from '@/lib/sync';

export interface CategoryInput {
  groupId: string;
  name: string;
  type: CategoryType;
  goalType: GoalType;
  goalBehavior?: GoalBehavior | null;
  goalAmount: number;
  goalDueDate: string | null;
  goalRecurring?: boolean | null;
  goalStartMonth?: string | null;
  snoozedUntil?: string | null;
  linkedAccountId?: string | null;
}

export class CategoryHasTransactionsError extends Error {
  readonly count: number;

  constructor(count: number) {
    super(`Category has ${count} transaction(s) and requires re-homing.`);
    this.name = 'CategoryHasTransactionsError';
    this.count = count;
  }
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const inGroup = await db.categories
    .where('groupId')
    .equals(input.groupId)
    .toArray();
  const maxSort = inGroup.reduce((m, c) => Math.max(m, c.sortOrder), -1);

  const category: Category = {
    id: newId(),
    groupId: input.groupId,
    name: input.name.trim(),
    type: input.type,
    goalType: input.goalType,
    goalBehavior: input.goalBehavior ?? null,
    goalAmount: input.goalAmount,
    goalDueDate: input.goalDueDate,
    goalRecurring: input.goalRecurring ?? null,
    goalStartMonth: input.goalStartMonth ?? null,
    snoozedUntil: input.snoozedUntil ?? null,
    linkedAccountId: input.linkedAccountId ?? null,
    sortOrder: maxSort + 1,
    isArchived: false,
  };
  await db.categories.add(category);
  syncInBackground('create', 'categories', category);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  await db.categories.update(id, patch);
  syncInBackground('update', 'categories', { id, ...patch });
}

export async function archiveCategory(id: string): Promise<void> {
  const count = await db.transactions.where('categoryId').equals(id).count();
  if (count > 0) {
    throw new CategoryHasTransactionsError(count);
  }
  await db.categories.update(id, { isArchived: true });
  syncInBackground('update', 'categories', { id, isArchived: true });
}

export async function rehomeCategoryTransactions(
  fromCategoryId: string,
  toCategoryId: string,
): Promise<number> {
  if (fromCategoryId === toCategoryId) return 0;
  let moved = 0;
  const syncAfter: { id: string; categoryId: string; updatedAt: string }[] = [];
  await db
    .transaction('rw', db.transactions, async () => {
      const txns = await db.transactions.where('categoryId').equals(fromCategoryId).toArray();
      for (const txn of txns) {
        const updatedAt = new Date().toISOString();
        await db.transactions.update(txn.id, {
          categoryId: toCategoryId,
          updatedAt,
        });
        syncAfter.push({
          id: txn.id,
          categoryId: toCategoryId,
          updatedAt,
        });
        moved += 1;
      }
    });
  for (const patch of syncAfter) {
    syncInBackground('update', 'transactions', patch);
  }
  return moved;
}
