import { db, newId } from '@/db/db';
import type { Category, CategoryType, GoalType } from '@/db/schema';

export interface CategoryInput {
  groupId: string;
  name: string;
  type: CategoryType;
  goalType: GoalType;
  goalAmount: number;
  goalDueDate: string | null;
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
    goalAmount: input.goalAmount,
    goalDueDate: input.goalDueDate,
    sortOrder: maxSort + 1,
    isArchived: false,
  };
  await db.categories.add(category);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  await db.categories.update(id, patch);
}

export async function archiveCategory(id: string): Promise<void> {
  await db.categories.update(id, { isArchived: true });
}
