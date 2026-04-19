import {
  differenceInCalendarMonths,
  eachWeekOfInterval,
  endOfMonth,
  getMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { Category, GoalCadence } from '@/db/schema';

export interface NormalizedGoal {
  cadence: GoalCadence;
  amount: number | null;
  dueDate: Date | null;
  recurring: boolean;
  startMonth: Date | null;
}

export type GoalStatus =
  | 'none'
  | 'on_track'
  | 'underfunded'
  | 'funded'
  | 'overfunded';

const LEGACY_TARGET_BALANCE: GoalCadence = 'none';

export function normalizeGoal(category: Category): NormalizedGoal | null {
  if (category.goalType === 'none') return null;
  if (category.goalAmount === null || category.goalAmount <= 0) return null;

  const amount = category.goalAmount;
  const startMonth = category.goalStartMonth
    ? parseISO(category.goalStartMonth)
    : null;

  switch (category.goalType) {
    case 'monthly_funding':
      return {
        cadence: 'monthly',
        amount,
        dueDate: null,
        recurring: true,
        startMonth,
      };

    case 'target_balance':
      return {
        cadence: LEGACY_TARGET_BALANCE,
        amount,
        dueDate: null,
        recurring: false,
        startMonth,
      };

    case 'target_by_date':
      return {
        cadence: 'custom',
        amount,
        dueDate: category.goalDueDate ? parseISO(category.goalDueDate) : null,
        recurring: false,
        startMonth,
      };

    case 'weekly':
    case 'monthly':
      return {
        cadence: category.goalType,
        amount,
        dueDate: null,
        recurring: true,
        startMonth,
      };

    case 'yearly':
      return {
        cadence: 'yearly',
        amount,
        dueDate: category.goalDueDate ? parseISO(category.goalDueDate) : null,
        recurring: category.goalRecurring ?? true,
        startMonth,
      };

    case 'custom':
      return {
        cadence: 'custom',
        amount,
        dueDate: category.goalDueDate ? parseISO(category.goalDueDate) : null,
        recurring: category.goalRecurring ?? false,
        startMonth,
      };

    default:
      return null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function weeksInMonth(month: Date): number {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).length;
}

export function neededThisMonth(
  goal: NormalizedGoal,
  currentAvailable: number,
  budgetedThisMonth: number,
  viewedMonth: Date,
): number {
  if (goal.amount === null) return 0;
  const amount = goal.amount;

  switch (goal.cadence) {
    case 'none': {
      if (currentAvailable >= amount) return 0;
      return round2(amount - currentAvailable);
    }

    case 'weekly': {
      const weeks = weeksInMonth(viewedMonth);
      const target = weeks * amount;
      return Math.max(0, round2(target - currentAvailable));
    }

    case 'monthly':
    case 'monthly_funding': {
      return Math.max(0, round2(amount - currentAvailable));
    }

    case 'yearly': {
      if (goal.recurring) {
        const perMonth = amount / 12;
        const cap = Math.max(0, amount - currentAvailable);
        const remainder = Math.max(0, perMonth - budgetedThisMonth);
        return round2(Math.min(remainder, cap));
      }
      if (goal.dueDate && getMonth(goal.dueDate) === getMonth(viewedMonth)) {
        return Math.max(0, round2(amount - currentAvailable));
      }
      return Math.max(0, round2(amount - currentAvailable));
    }

    case 'custom': {
      if (!goal.dueDate) {
        if (currentAvailable >= amount) return 0;
        return round2(amount - currentAvailable);
      }
      const monthsRemaining = Math.max(
        1,
        differenceInCalendarMonths(goal.dueDate, viewedMonth) + 1,
      );
      const remaining = Math.max(0, amount - currentAvailable);
      return round2(remaining / monthsRemaining);
    }

    default:
      return 0;
  }
}

export function goalStatus(
  goal: NormalizedGoal | null,
  currentAvailable: number,
  budgetedThisMonth: number,
  viewedMonth: Date,
): GoalStatus {
  if (!goal) return 'none';
  if (goal.amount === null) return 'none';

  if (goal.cadence === 'none') {
    if (currentAvailable < goal.amount) return 'underfunded';
    if (currentAvailable === goal.amount) return 'funded';
    return 'overfunded';
  }

  const needed = neededThisMonth(
    goal,
    currentAvailable,
    budgetedThisMonth,
    viewedMonth,
  );
  return needed === 0 ? 'on_track' : 'underfunded';
}
