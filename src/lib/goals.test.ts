import { describe, it, expect } from 'vitest';
import type { Category, GoalCadence } from '@/db/schema';
import {
  goalStatus,
  neededThisMonth,
  normalizeGoal,
  type NormalizedGoal,
} from './goals';

function cat(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    groupId: 'g-1',
    name: 'Test',
    type: 'expense',
    goalType: 'none',
    goalAmount: 0,
    goalDueDate: null,
    goalRecurring: null,
    goalStartMonth: null,
    sortOrder: 0,
    isArchived: false,
    ...overrides,
  };
}

function goal(overrides: Partial<NormalizedGoal>): NormalizedGoal {
  return {
    cadence: 'monthly',
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
    expect(n).toMatchObject({ cadence: 'monthly', amount: 500, recurring: true });
  });

  it('maps legacy target_balance to cadence none', () => {
    const n = normalizeGoal(cat({ goalType: 'target_balance', goalAmount: 10000 }));
    expect(n).toMatchObject({ cadence: 'none', amount: 10000 });
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

  it('legacy target_balance 10000 with 6000 available returns 4000', () => {
    const g = goal({ cadence: 'none', amount: 10000 });
    expect(neededThisMonth(g, 6000, 0, june)).toBe(4000);
  });

  it('legacy target_balance returns 0 when funded', () => {
    const g = goal({ cadence: 'none', amount: 1000 });
    expect(neededThisMonth(g, 1500, 0, june)).toBe(0);
  });

  it('monthly_funding 500 with 0 available returns 500', () => {
    const g = goal({ cadence: 'monthly', amount: 500, recurring: true });
    expect(neededThisMonth(g, 0, 0, june)).toBe(500);
  });

  it('monthly 500 with 300 available returns 200', () => {
    const g = goal({ cadence: 'monthly', amount: 500 });
    expect(neededThisMonth(g, 300, 0, june)).toBe(200);
  });

  it('monthly 500 with 500 available returns 0 (funded)', () => {
    const g = goal({ cadence: 'monthly', amount: 500 });
    expect(neededThisMonth(g, 500, 500, june)).toBe(0);
  });

  it('weekly 100 in a 5-week month with 0 available returns 500', () => {
    // May 2026: weeks starting Mon fall on Apr 27, May 4, 11, 18, 25 = 5 weeks
    const may = new Date(2026, 4, 1);
    const g = goal({ cadence: 'weekly', amount: 100 });
    expect(neededThisMonth(g, 0, 0, may)).toBe(500);
  });

  it('weekly 100 in a 4-week month with 200 available returns 200', () => {
    // Feb 2027: starts Mon Feb 1, non-leap, 28 days = 4 Monday-start weeks
    const feb = new Date(2027, 1, 1);
    const g = goal({ cadence: 'weekly', amount: 100 });
    expect(neededThisMonth(g, 200, 0, feb)).toBe(200);
  });

  it('yearly recurring 1200 with 0 available and 0 budgeted returns 100', () => {
    const g = goal({ cadence: 'yearly', amount: 1200, recurring: true });
    expect(neededThisMonth(g, 0, 0, june)).toBe(100);
  });

  it('yearly recurring returns 0 when already budgeted enough this month', () => {
    const g = goal({ cadence: 'yearly', amount: 1200, recurring: true });
    expect(neededThisMonth(g, 0, 100, june)).toBe(0);
  });

  it('yearly non-recurring with due in viewed month returns amount minus available', () => {
    const dec = new Date(2026, 11, 1);
    const g = goal({
      cadence: 'yearly',
      amount: 1200,
      recurring: false,
      dueDate: new Date(2026, 11, 31),
    });
    expect(neededThisMonth(g, 0, 0, dec)).toBe(1200);
  });

  it('custom 5000 due 5 months out with 1000 available returns 800', () => {
    // Jun viewed, due Oct = differenceInCalendarMonths = 4, +1 = 5
    const g = goal({
      cadence: 'custom',
      amount: 5000,
      dueDate: new Date(2026, 9, 1),
    });
    expect(neededThisMonth(g, 1000, 0, june)).toBe(800);
  });

  it('custom 12000 due 7 months out with 5000 available returns 1000', () => {
    const g = goal({
      cadence: 'custom',
      amount: 12000,
      dueDate: new Date(2026, 11, 1),
    });
    expect(neededThisMonth(g, 5000, 0, june)).toBe(1000);
  });

  it('custom with null dueDate acts like target_balance', () => {
    const g = goal({ cadence: 'custom', amount: 1000, dueDate: null });
    expect(neededThisMonth(g, 400, 0, june)).toBe(600);
    expect(neededThisMonth(g, 1500, 0, june)).toBe(0);
  });
});

describe('goalStatus', () => {
  const june = new Date(2026, 5, 1);

  function makeGoal(
    cadence: GoalCadence,
    amount: number,
    extras: Partial<NormalizedGoal> = {},
  ): NormalizedGoal {
    return goal({ cadence, amount, ...extras });
  }

  it('returns none when goal is null', () => {
    expect(goalStatus(null, 0, 0, june)).toBe('none');
  });

  it('target_balance exactly funded returns funded', () => {
    expect(goalStatus(makeGoal('none', 1000), 1000, 0, june)).toBe('funded');
  });

  it('target_balance exceeded returns overfunded', () => {
    expect(goalStatus(makeGoal('none', 1000), 1500, 0, june)).toBe('overfunded');
  });

  it('target_balance short returns underfunded', () => {
    expect(goalStatus(makeGoal('none', 1000), 500, 0, june)).toBe('underfunded');
  });

  it('monthly fully funded returns on_track', () => {
    expect(goalStatus(makeGoal('monthly', 500), 500, 500, june)).toBe('on_track');
  });

  it('monthly short returns underfunded', () => {
    expect(goalStatus(makeGoal('monthly', 500), 100, 100, june)).toBe(
      'underfunded',
    );
  });
});
