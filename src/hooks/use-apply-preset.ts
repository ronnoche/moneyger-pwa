import { useCallback } from 'react';
import { db } from '@/db/db';
import { useCategories, useTransactions, useTransfers } from '@/db/hooks';
import { availableToBudget } from '@/lib/budget-math';
import { applyPreset } from '@/lib/auto-assign';
import type { AutoAssignHistoryEntry } from '@/db/schema';

export function useApplyPreset(viewedMonth: Date) {
  const categories = useCategories();
  const transactions = useTransactions();
  const transfers = useTransfers();

  return useCallback(
    async (
      presetId: string,
      scopedCategoryIds?: string[],
    ): Promise<AutoAssignHistoryEntry> => {
      if (!categories || !transactions || !transfers) {
        throw new Error('Data not loaded yet');
      }
      return applyPreset(
        presetId,
        {
          categories,
          viewedMonth,
          transactions,
          transfers,
          availableToBudget: availableToBudget(transactions, transfers),
          scopedCategoryIds,
        },
        db,
      );
    },
    [categories, transactions, transfers, viewedMonth],
  );
}
