import { db, newId } from '@/db/db';
import type { NetWorthEntry } from '@/db/schema';

export interface NetWorthInput {
  date: string;
  amount: number;
  category: string;
  type: NetWorthEntry['type'];
  notes: string;
}

export async function createNetWorthEntry(
  input: NetWorthInput,
): Promise<NetWorthEntry> {
  const entry: NetWorthEntry = {
    id: newId(),
    date: input.date,
    amount: Math.round(input.amount * 100) / 100,
    category: input.category.trim(),
    type: input.type,
    notes: input.notes.trim(),
  };
  await db.netWorthEntries.add(entry);
  return entry;
}

export async function deleteNetWorthEntry(id: string): Promise<void> {
  await db.netWorthEntries.delete(id);
}
