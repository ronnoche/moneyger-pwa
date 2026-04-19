import { useCallback } from 'react';
import { db } from '@/db/db';
import { revertAutoAssign } from '@/lib/auto-assign';

export function useRevertAutoAssign() {
  return useCallback(async (historyEntryId: string): Promise<void> => {
    await revertAutoAssign(historyEntryId, db);
  }, []);
}
