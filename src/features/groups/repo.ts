import { db, newId } from '@/db/db';
import type { Group } from '@/db/schema';

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
  return group;
}

export async function renameGroup(id: string, name: string): Promise<void> {
  await db.groups.update(id, { name: name.trim() });
}

export async function archiveGroup(id: string): Promise<void> {
  await db.transaction('rw', db.groups, db.categories, async () => {
    await db.groups.update(id, { isArchived: true });
    const cats = await db.categories.where('groupId').equals(id).toArray();
    await Promise.all(
      cats.map((c) => db.categories.update(c.id, { isArchived: true })),
    );
  });
}

export async function reorderGroups(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.groups, async () => {
    await Promise.all(
      orderedIds.map((id, i) => db.groups.update(id, { sortOrder: i })),
    );
  });
}
