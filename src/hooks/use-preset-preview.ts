import { useMemo } from 'react';
import { useCategories, useTransactions, useTransfers } from '@/db/hooks';
import { availableToBudget } from '@/lib/budget-math';
import { runPreset } from '@/lib/auto-assign';
import type { PresetInput, PresetResult } from '@/lib/auto-assign';

const EMPTY: PresetResult = {
  moves: [],
  totalAmount: 0,
  cappedByATB: false,
};

export function usePresetPreview(
  presetId: string,
  viewedMonth: Date,
  scopedCategoryIds?: string[],
): PresetResult {
  const categories = useCategories();
  const transactions = useTransactions();
  const transfers = useTransfers();

  return useMemo(() => {
    if (!categories || !transactions || !transfers || !presetId) return EMPTY;
    const input: PresetInput = {
      categories,
      viewedMonth,
      transactions,
      transfers,
      availableToBudget: availableToBudget(transactions, transfers),
      scopedCategoryIds,
    };
    try {
      return runPreset(presetId, input);
    } catch {
      return EMPTY;
    }
  }, [presetId, viewedMonth, scopedCategoryIds, categories, transactions, transfers]);
}
