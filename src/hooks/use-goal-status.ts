import { useMemo } from 'react';
import type { Category } from '@/db/schema';
import { useTransactions, useTransfers } from '@/db/hooks';
import {
  categoryAvailable,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import {
  goalStatus,
  normalizeGoal,
  type GoalStatus,
} from '@/lib/goals';

export function useGoalStatus(
  category: Category | null | undefined,
  viewedMonth: Date,
): GoalStatus {
  const transactions = useTransactions();
  const transfers = useTransfers();

  return useMemo(() => {
    if (!category || !transactions || !transfers) return 'none';
    const goal = normalizeGoal(category);
    if (!goal) return 'none';
    const available = categoryAvailable(category.id, transactions, transfers);
    const budgeted = categoryBudgetedForMonth(category.id, viewedMonth, transfers);
    return goalStatus(goal, available, budgeted, viewedMonth);
  }, [category, transactions, transfers, viewedMonth]);
}
