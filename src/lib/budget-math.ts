import {
  differenceInCalendarMonths,
  endOfMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { Account, Category, Transaction, Transfer } from '@/db/schema';

/** IDs of accounts excluded from Ready to Assign math (transactions on these accounts do not affect `available_to_budget`). */
export function excludedFromReadyToAssignAccountIds(
  accounts?: Pick<Account, 'id' | 'accountCategory'>[],
): Set<string> {
  return new Set(
    (accounts ?? [])
      .filter((a) => a.accountCategory === 'tracking')
      .map((a) => a.id),
  );
}

export const AVAILABLE_TO_BUDGET = 'available_to_budget' as const;

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export function categoryAvailable(
  categoryId: string,
  txns: Transaction[],
  tfrs: Transfer[],
): number {
  const inflowsIn = sum(
    txns.filter((t) => t.categoryId === categoryId).map((t) => t.inflow),
  );
  const outflowsOut = sum(
    txns.filter((t) => t.categoryId === categoryId).map((t) => t.outflow),
  );
  const tfrsIn = sum(
    tfrs.filter((t) => t.toCategoryId === categoryId).map((t) => t.amount),
  );
  const tfrsOut = sum(
    tfrs.filter((t) => t.fromCategoryId === categoryId).map((t) => t.amount),
  );
  return inflowsIn - outflowsOut + tfrsIn - tfrsOut;
}

export function categoryActivityForMonth(
  categoryId: string,
  month: Date,
  txns: Transaction[],
): number {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const inMonth = txns.filter((t) => {
    const d = parseISO(t.date);
    return t.categoryId === categoryId && d >= start && d <= end;
  });
  return sum(inMonth.map((t) => t.outflow)) - sum(inMonth.map((t) => t.inflow));
}

export function categoryBudgetedForMonth(
  categoryId: string,
  month: Date,
  tfrs: Transfer[],
): number {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const inMonth = tfrs.filter((t) => {
    const d = parseISO(t.date);
    return d >= start && d <= end;
  });
  const into = sum(
    inMonth.filter((t) => t.toCategoryId === categoryId).map((t) => t.amount),
  );
  const outOf = sum(
    inMonth.filter((t) => t.fromCategoryId === categoryId).map((t) => t.amount),
  );
  return into - outOf;
}

export function availableToBudget(
  txns: Transaction[],
  tfrs: Transfer[],
  accounts?: Pick<Account, 'id' | 'accountCategory'>[],
): number {
  const id = AVAILABLE_TO_BUDGET;
  const skipAccountIds = excludedFromReadyToAssignAccountIds(accounts);
  const inAtb = (t: Transaction) =>
    t.categoryId === id && !skipAccountIds.has(t.accountId);
  const inflows = sum(txns.filter(inAtb).map((t) => t.inflow));
  const outflows = sum(txns.filter(inAtb).map((t) => t.outflow));
  const tfrIn = sum(
    tfrs.filter((t) => t.toCategoryId === id).map((t) => t.amount),
  );
  const tfrOut = sum(
    tfrs.filter((t) => t.fromCategoryId === id).map((t) => t.amount),
  );
  return inflows - outflows + tfrIn - tfrOut;
}

export function accountSettledBalance(
  accountId: string,
  txns: Transaction[],
): number {
  const settled = txns.filter(
    (t) => t.accountId === accountId && t.status !== 'pending',
  );
  return sum(settled.map((t) => t.inflow)) - sum(settled.map((t) => t.outflow));
}

export function accountPendingBalance(
  accountId: string,
  txns: Transaction[],
): number {
  const pending = txns.filter(
    (t) => t.accountId === accountId && t.status === 'pending',
  );
  return sum(pending.map((t) => t.inflow)) - sum(pending.map((t) => t.outflow));
}

export type GoalProgress = {
  pct: number;
  target: number;
  needed: number;
  perMonth: number | null;
};

export function goalProgress(
  cat: Pick<Category, 'goalType' | 'goalAmount' | 'goalDueDate'>,
  availableNow: number,
  budgetedThisMonth: number,
  today: Date,
): GoalProgress | null {
  switch (cat.goalType) {
    case 'none':
      return null;

    case 'monthly_funding': {
      const target = cat.goalAmount;
      const pct = target > 0 ? budgetedThisMonth / target : 0;
      return {
        pct: clamp01(pct),
        target,
        needed: Math.max(0, target - budgetedThisMonth),
        perMonth: target,
      };
    }

    case 'target_balance': {
      const target = cat.goalAmount;
      const pct = target > 0 ? availableNow / target : 0;
      return {
        pct: clamp01(pct),
        target,
        needed: Math.max(0, target - availableNow),
        perMonth: null,
      };
    }

    case 'target_by_date': {
      const target = cat.goalAmount;
      const due = cat.goalDueDate ? parseISO(cat.goalDueDate) : null;
      const monthsRemaining = due
        ? Math.max(1, differenceInCalendarMonths(due, today) + 1)
        : 1;
      const remaining = Math.max(0, target - availableNow);
      const perMonth = remaining / monthsRemaining;
      const pct = target > 0 ? availableNow / target : 0;
      return {
        pct: clamp01(pct),
        target,
        needed: remaining,
        perMonth,
      };
    }

    default:
      return null;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
