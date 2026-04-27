import { db, newId } from '@/db/db';
import type { Group } from '@/db/schema';
import { syncInBackground } from '@/lib/sync';

export async function createGroup(input: { name: string }): Promise<Group> {
  const existing = await db.groups.toArray();
  const maxSort = existing.reduce((m, g) => Math.max(m, g.sortOrder), -1);
  const group: Group = {
    id: newId(),
    name: input.name.trim(),
    sortOrder: maxSort + 1,
    isArchived: false,
  };
  await db.groups.add(group);
  syncInBackground('create', 'groups', group);
  return group;
}

export async function renameGroup(id: string, name: string): Promise<void> {
  const nextName = name.trim();
  await db.groups.update(id, { name: nextName });
  syncInBackground('update', 'groups', { id, name: nextName });
}

export async function archiveGroup(id: string): Promise<void> {
  let archivedCategoryIds: string[] = [];
  await db.transaction('rw', db.groups, db.categories, async () => {
    await db.groups.update(id, { isArchived: true });
    const cats = await db.categories.where('groupId').equals(id).toArray();
    archivedCategoryIds = cats.map((c) => c.id);
    await Promise.all(
      cats.map((c) => db.categories.update(c.id, { isArchived: true })),
    );
  });
  syncInBackground('update', 'groups', { id, isArchived: true });
  for (const categoryId of archivedCategoryIds) {
    syncInBackground('update', 'categories', { id: categoryId, isArchived: true });
  }
}

export async function reorderGroups(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.groups, async () => {
    await Promise.all(
      orderedIds.map((id, i) => db.groups.update(id, { sortOrder: i })),
    );
  });
  for (const [index, id] of orderedIds.entries()) {
    syncInBackground('update', 'groups', { id, sortOrder: index });
  }
}
