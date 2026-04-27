import {
  differenceInCalendarMonths,
  eachWeekOfInterval,
  endOfMonth,
  format,
  getMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { Category, GoalBehavior, GoalCadence } from '@/db/schema';

export interface NormalizedGoal {
  cadence: GoalCadence;
  behavior: GoalBehavior;
  amount: number | null;
  dueDate: Date | null;
  recurring: boolean;
  startMonth: Date | null;
}

export type GoalStatus =
  | 'none'
  | 'snoozed'
  | 'on_track'
  | 'underfunded'
  | 'funded'
  | 'overfunded';

export function normalizeGoal(category: Category): NormalizedGoal | null {
  if (category.goalType === 'none') return null;
  if (category.goalAmount === null || category.goalAmount <= 0) return null;

  const amount = category.goalAmount;
  const startMonth = category.goalStartMonth
    ? parseISO(category.goalStartMonth)
    : null;

  const cadence =
    category.goalType === 'monthly_funding'
      ? 'monthly'
      : category.goalType === 'target_by_date'
        ? 'custom'
        : category.goalType;

  const behavior = category.goalBehavior ?? deriveBehavior(category.goalType);
  if (!behavior) return null;

  const recurring =
    category.goalType === 'weekly' || category.goalType === 'monthly'
      ? true
      : category.goalType === 'yearly'
        ? (category.goalRecurring ?? true)
        : category.goalType === 'custom'
          ? (category.goalRecurring ?? false)
          : category.goalType === 'monthly_funding';

  if (behavior === 'have_a_balance_of' && cadence !== 'custom') return null;
  if (behavior === 'have_a_balance_of' && recurring) return null;

  return {
    cadence,
    behavior,
    amount,
    dueDate: category.goalDueDate ? parseISO(category.goalDueDate) : null,
    recurring,
    startMonth,
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

  if (goal.cadence === 'none') {
    if (currentAvailable >= amount) return 0;
    return round2(amount - currentAvailable);
  }

  if (goal.behavior === 'set_aside_another') {
    if (goal.cadence === 'weekly') return round2(weeksInMonth(viewedMonth) * amount);
    if (goal.cadence === 'yearly') return round2(amount / 12);
    return round2(amount);
  }

  if (goal.behavior === 'refill_up_to') {
    if (goal.cadence === 'yearly') {
      const remainingYear = Math.max(1, 12 - getMonth(viewedMonth));
      return round2(Math.max(0, (amount - currentAvailable) / remainingYear));
    }
    return round2(Math.max(0, amount - currentAvailable));
  }

  if (goal.behavior === 'fill_up_to') {
    return round2(Math.max(0, amount - currentAvailable));
  }

  if (goal.behavior === 'have_a_balance_of') {
    const monthsRemaining = goal.dueDate
      ? Math.max(1, differenceInCalendarMonths(goal.dueDate, viewedMonth) + 1)
      : 1;
    return round2(Math.max(0, (amount - currentAvailable) / monthsRemaining));
  }

  const remainder = Math.max(0, amount - currentAvailable);
  const carry = Math.max(0, remainder - budgetedThisMonth);
  return round2(carry);
}

export function goalStatus(
  goal: NormalizedGoal | null,
  currentAvailable: number,
  budgetedThisMonth: number,
  viewedMonth: Date,
  snoozedUntil?: string | null,
): GoalStatus {
  if (snoozedUntil && snoozedUntil >= format(viewedMonth, 'yyyy-MM')) {
    return 'snoozed';
  }
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

function deriveBehavior(goalType: GoalCadence): GoalBehavior | null {
  if (
    goalType === 'monthly_funding' ||
    goalType === 'weekly' ||
    goalType === 'monthly' ||
    goalType === 'yearly'
  ) {
    return 'set_aside_another';
  }
  if (goalType === 'target_balance') return 'refill_up_to';
  if (goalType === 'target_by_date' || goalType === 'custom') return 'fill_up_to';
  return null;
}
