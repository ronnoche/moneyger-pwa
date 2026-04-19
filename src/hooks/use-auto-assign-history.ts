import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { AutoAssignHistoryEntry } from '@/db/schema';

export function useAutoAssignHistory(
  limit = 20,
): AutoAssignHistoryEntry[] | undefined {
  return useLiveQuery(
    () => db.autoAssignHistory.orderBy('appliedAt').reverse().limit(limit).toArray(),
    [limit],
  );
}
