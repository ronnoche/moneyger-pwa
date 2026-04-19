import { useMemo } from 'react';
import type { Category } from '@/db/schema';
import { useTransactions, useTransfers } from '@/db/hooks';
import {
  categoryAvailable,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { neededThisMonth, normalizeGoal } from '@/lib/goals';

export function useNeededThisMonth(
  category: Category | null | undefined,
  viewedMonth: Date,
): number {
  const transactions = useTransactions();
  const transfers = useTransfers();

  return useMemo(() => {
    if (!category || !transactions || !transfers) return 0;
    const goal = normalizeGoal(category);
    if (!goal) return 0;
    const available = categoryAvailable(category.id, transactions, transfers);
    const budgeted = categoryBudgetedForMonth(category.id, viewedMonth, transfers);
    return neededThisMonth(goal, available, budgeted, viewedMonth);
  }, [category, transactions, transfers, viewedMonth]);
}
