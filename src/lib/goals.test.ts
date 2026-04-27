import { describe, it, expect } from 'vitest';
import type { Category, GoalCadence, GoalBehavior } from '@/db/schema';
import { goalStatus, neededThisMonth, normalizeGoal, type NormalizedGoal } from './goals';

function cat(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    groupId: 'g-1',
    name: 'Test',
    type: 'expense',
    goalType: 'none',
    goalBehavior: null,
    goalAmount: 0,
    goalDueDate: null,
    goalRecurring: null,
    goalStartMonth: null,
    snoozedUntil: null,
    linkedAccountId: null,
    sortOrder: 0,
    isArchived: false,
    ...overrides,
  };
}

function goal(overrides: Partial<NormalizedGoal>): NormalizedGoal {
  return {
    cadence: 'monthly',
    behavior: 'set_aside_another',
    amount: 0,
    dueDate: null,
    recurring: false,
    startMonth: null,
    ...overrides,
  };
}

describe('normalizeGoal', () => {
  it('returns null for goalType none', () => {
    expect(normalizeGoal(cat({ goalType: 'none' }))).toBeNull();
  });

  it('returns null when goalAmount is zero', () => {
    expect(normalizeGoal(cat({ goalType: 'monthly', goalAmount: 0 }))).toBeNull();
  });

  it('maps legacy monthly_funding to monthly recurring', () => {
    const n = normalizeGoal(cat({ goalType: 'monthly_funding', goalAmount: 500 }));
    expect(n).toMatchObject({
      cadence: 'monthly',
      behavior: 'set_aside_another',
      amount: 500,
      recurring: true,
    });
  });

  it('maps legacy target_balance to refill behavior', () => {
    const n = normalizeGoal(cat({ goalType: 'target_balance', goalAmount: 10000 }));
    expect(n).toMatchObject({
      cadence: 'target_balance',
      behavior: 'refill_up_to',
      amount: 10000,
    });
  });

  it('maps legacy target_by_date to custom with dueDate', () => {
    const n = normalizeGoal(
      cat({
        goalType: 'target_by_date',
        goalAmount: 12000,
        goalDueDate: '2026-12-01',
      }),
    );
    expect(n?.cadence).toBe('custom');
    expect(n?.behavior).toBe('fill_up_to');
    expect(n?.amount).toBe(12000);
    expect(n?.dueDate?.getFullYear()).toBe(2026);
    expect(n?.dueDate?.getMonth()).toBe(11);
  });

  it('passes through new cadence yearly with recurring default true', () => {
    const n = normalizeGoal(
      cat({ goalType: 'yearly', goalAmount: 1200, goalRecurring: null }),
    );
    expect(n?.cadence).toBe('yearly');
    expect(n?.recurring).toBe(true);
  });

  it('respects explicit non-recurring yearly', () => {
    const n = normalizeGoal(
      cat({ goalType: 'yearly', goalAmount: 1200, goalRecurring: false }),
    );
    expect(n?.recurring).toBe(false);
  });
});

describe('neededThisMonth', () => {
  const june = new Date(2026, 5, 1);

  it('refill_up_to returns target minus available', () => {
    const g = goal({
      cadence: 'none',
      behavior: 'refill_up_to',
      amount: 10000,
    });
    expect(neededThisMonth(g, 6000, 0, june)).toBe(4000);
  });

  it('set_aside_another monthly ignores current available', () => {
    const g = goal({
      cadence: 'monthly',
      behavior: 'set_aside_another',
      amount: 500,
    });
    expect(neededThisMonth(g, 300, 0, june)).toBe(500);
  });

  it('set_aside_another weekly multiplies by weeks in month', () => {
    const may = new Date(2026, 4, 1);
    const g = goal({
      cadence: 'weekly',
      behavior: 'set_aside_another',
      amount: 100,
    });
    expect(neededThisMonth(g, 200, 0, may)).toBe(500);
  });

  it('refill_up_to monthly returns zero when funded', () => {
    const g = goal({
      cadence: 'monthly',
      behavior: 'refill_up_to',
      amount: 1000,
    });
    expect(neededThisMonth(g, 1500, 0, june)).toBe(0);
  });

  it('set_aside_another yearly returns one-twelfth', () => {
    const g = goal({
      cadence: 'yearly',
      behavior: 'set_aside_another',
      amount: 1200,
      recurring: true,
    });
    expect(neededThisMonth(g, 0, 0, june)).toBe(100);
  });

  it('refill_up_to yearly prorates over remaining months', () => {
    const g = goal({
      cadence: 'yearly',
      behavior: 'refill_up_to',
      amount: 1200,
      recurring: true,
    });
    expect(neededThisMonth(g, 0, 0, june)).toBeCloseTo(1200 / 7, 2);
  });

  it('have_a_balance_of custom divides by months to due date', () => {
    const g = goal({
      cadence: 'custom',
      behavior: 'have_a_balance_of',
      amount: 5000,
      recurring: false,
      dueDate: new Date(2026, 9, 1),
    });
    expect(neededThisMonth(g, 1000, 0, june)).toBe(800);
  });

  it('fill_up_to custom returns target minus available', () => {
    const g = goal({
      cadence: 'custom',
      behavior: 'fill_up_to',
      amount: 1200,
      dueDate: null,
    });
    expect(neededThisMonth(g, 500, 0, june)).toBe(700);
  });
});

describe('goalStatus', () => {
  const june = new Date(2026, 5, 1);

  function makeGoal(
    cadence: GoalCadence,
    behavior: GoalBehavior,
    amount: number,
    extras: Partial<NormalizedGoal> = {},
  ): NormalizedGoal {
    return goal({ cadence, behavior, amount, ...extras });
  }

  it('returns none when goal is null', () => {
    expect(goalStatus(null, 0, 0, june)).toBe('none');
  });

  it('target_balance exactly funded returns funded', () => {
    expect(goalStatus(makeGoal('none', 'refill_up_to', 1000), 1000, 0, june)).toBe(
      'funded',
    );
  });

  it('target_balance exceeded returns overfunded', () => {
    expect(
      goalStatus(makeGoal('none', 'refill_up_to', 1000), 1500, 0, june),
    ).toBe('overfunded');
  });

  it('target_balance short returns underfunded', () => {
    expect(
      goalStatus(makeGoal('none', 'refill_up_to', 1000), 500, 0, june),
    ).toBe('underfunded');
  });

  it('monthly fully funded returns on_track', () => {
    expect(
      goalStatus(makeGoal('monthly', 'refill_up_to', 500), 500, 500, june),
    ).toBe('on_track');
  });

  it('monthly short returns underfunded', () => {
    expect(
      goalStatus(makeGoal('monthly', 'refill_up_to', 500), 100, 100, june),
    ).toBe('underfunded');
  });

  it('returns snoozed when month is snoozed', () => {
    expect(
      goalStatus(
        makeGoal('monthly', 'set_aside_another', 500),
        0,
        0,
        june,
        '2026-06',
      ),
    ).toBe('snoozed');
  });
});
