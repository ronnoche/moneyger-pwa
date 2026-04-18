import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_TO_BUDGET,
  accountPendingBalance,
  accountSettledBalance,
  availableToBudget,
  categoryActivityForMonth,
  categoryAvailable,
  categoryBudgetedForMonth,
  goalProgress,
} from '@/lib/budget-math';
import type { Transaction, Transfer } from '@/db/schema';

const ACCOUNT_ID = 'acct-checking';
const GROCERIES = 'cat-groceries';

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2026-04-15',
    outflow: 0,
    inflow: 0,
    categoryId: AVAILABLE_TO_BUDGET,
    accountId: ACCOUNT_ID,
    memo: '',
    status: 'cleared',
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-15T00:00:00.000Z',
    syncedAt: null,
    ...overrides,
  };
}

function tfr(overrides: Partial<Transfer>): Transfer {
  return {
    id: crypto.randomUUID(),
    date: '2026-04-01',
    amount: 0,
    fromCategoryId: AVAILABLE_TO_BUDGET,
    toCategoryId: GROCERIES,
    memo: '',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    syncedAt: null,
    ...overrides,
  };
}

describe('budget-math', () => {
  it('income to ATB increases available to budget', () => {
    const txns = [txn({ inflow: 5000, categoryId: AVAILABLE_TO_BUDGET })];
    expect(availableToBudget(txns, [])).toBe(5000);
  });

  it('transfer from ATB to category shifts balances', () => {
    const txns = [txn({ inflow: 5000, categoryId: AVAILABLE_TO_BUDGET })];
    const tfrs = [
      tfr({
        amount: 450,
        fromCategoryId: AVAILABLE_TO_BUDGET,
        toCategoryId: GROCERIES,
      }),
    ];
    expect(categoryAvailable(GROCERIES, txns, tfrs)).toBe(450);
    expect(availableToBudget(txns, tfrs)).toBe(4550);
  });

  it('spending reduces category available and reports activity', () => {
    const txns = [
      txn({ inflow: 5000, categoryId: AVAILABLE_TO_BUDGET }),
      txn({
        outflow: 120,
        categoryId: GROCERIES,
        date: '2026-04-10',
      }),
    ];
    const tfrs = [
      tfr({
        amount: 450,
        fromCategoryId: AVAILABLE_TO_BUDGET,
        toCategoryId: GROCERIES,
      }),
    ];
    expect(categoryAvailable(GROCERIES, txns, tfrs)).toBe(330);
    expect(
      categoryActivityForMonth(GROCERIES, new Date('2026-04-15'), txns),
    ).toBe(120);
  });

  it('pending transactions are excluded from settled balance', () => {
    const txns = [
      txn({ inflow: 1000, status: 'cleared' }),
      txn({ outflow: 100, status: 'pending' }),
    ];
    expect(accountSettledBalance(ACCOUNT_ID, txns)).toBe(1000);
    expect(accountPendingBalance(ACCOUNT_ID, txns)).toBe(-100);
  });

  it('activity for a previous month ignores current-month transactions', () => {
    const txns = [
      txn({ outflow: 50, categoryId: GROCERIES, date: '2026-03-20' }),
      txn({ outflow: 200, categoryId: GROCERIES, date: '2026-04-05' }),
    ];
    expect(
      categoryActivityForMonth(GROCERIES, new Date('2026-03-15'), txns),
    ).toBe(50);
    expect(
      categoryActivityForMonth(GROCERIES, new Date('2026-04-15'), txns),
    ).toBe(200);
  });

  it('budgeted this month reflects transfers in the same month only', () => {
    const tfrs = [
      tfr({ amount: 100, date: '2026-03-15' }),
      tfr({ amount: 250, date: '2026-04-02' }),
      tfr({ amount: 50, date: '2026-04-20', fromCategoryId: GROCERIES, toCategoryId: AVAILABLE_TO_BUDGET }),
    ];
    expect(
      categoryBudgetedForMonth(GROCERIES, new Date('2026-04-10'), tfrs),
    ).toBe(200);
  });

  it('goalProgress returns correct shape for each goalType', () => {
    const today = new Date('2026-04-15');

    expect(
      goalProgress(
        { goalType: 'none', goalAmount: 0, goalDueDate: null },
        0,
        0,
        today,
      ),
    ).toBeNull();

    const monthly = goalProgress(
      { goalType: 'monthly_funding', goalAmount: 400, goalDueDate: null },
      0,
      100,
      today,
    );
    expect(monthly).not.toBeNull();
    expect(monthly!.pct).toBeCloseTo(0.25);
    expect(monthly!.needed).toBe(300);
    expect(monthly!.perMonth).toBe(400);

    const balance = goalProgress(
      { goalType: 'target_balance', goalAmount: 1000, goalDueDate: null },
      250,
      0,
      today,
    );
    expect(balance!.pct).toBeCloseTo(0.25);
    expect(balance!.needed).toBe(750);
    expect(balance!.perMonth).toBeNull();

    const byDate = goalProgress(
      {
        goalType: 'target_by_date',
        goalAmount: 1200,
        goalDueDate: '2026-10-15',
      },
      200,
      0,
      today,
    );
    // Apr to Oct inclusive = 7 months, needed 1000 / 7 ≈ 142.86
    expect(byDate!.needed).toBe(1000);
    expect(byDate!.perMonth).toBeCloseTo(1000 / 7, 2);
    expect(byDate!.pct).toBeCloseTo(200 / 1200);
  });
});
