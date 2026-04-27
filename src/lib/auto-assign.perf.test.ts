import { describe, it, expect } from 'vitest';
import type { Category, Transaction, Transfer } from '@/db/schema';
import { AVAILABLE_TO_BUDGET } from './budget-math';
import { runPreset } from './auto-assign';
import type { PresetInput } from './auto-assign/types';

function buildFixture(): PresetInput {
  const categories: Category[] = [];
  for (let i = 0; i < 500; i++) {
    const goalRotate = i % 4;
    categories.push({
      id: `cat-${i}`,
      groupId: `g-${i % 10}`,
      name: `Cat ${i}`,
      type: 'expense',
      goalType:
        goalRotate === 0
          ? 'monthly'
          : goalRotate === 1
            ? 'weekly'
            : goalRotate === 2
              ? 'custom'
              : 'none',
      goalBehavior: goalRotate === 3 ? null : 'set_aside_another',
      goalAmount: goalRotate === 3 ? 0 : 100 + i,
      goalDueDate: goalRotate === 2 ? '2026-12-01' : null,
      goalRecurring: null,
      goalStartMonth: null,
      snoozedUntil: null,
      linkedAccountId: null,
      sortOrder: i,
      isArchived: false,
    });
  }

  const transactions: Transaction[] = [];
  const transfers: Transfer[] = [];
  for (let i = 0; i < 5000; i++) {
    const catId = `cat-${i % 500}`;
    const month = (i % 6) + 1;
    const day = (i % 27) + 1;
    const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    transactions.push({
      id: `t-${i}`,
      date: dateStr,
      outflow: i % 5 === 0 ? 0 : 10 + (i % 50),
      inflow: i % 5 === 0 ? 100 : 0,
      categoryId: i % 10 === 0 ? AVAILABLE_TO_BUDGET : catId,
      accountId: 'acct-1',
      memo: '',
      status: 'cleared',
      reconciledAt: null,
      reconcileEventId: null,
      createdAt: `${dateStr}T00:00:00.000Z`,
      updatedAt: `${dateStr}T00:00:00.000Z`,
      syncedAt: null,
    });

    if (i % 2 === 0) {
      transfers.push({
        id: `x-${i}`,
        date: dateStr,
        amount: 10 + (i % 40),
        fromCategoryId: AVAILABLE_TO_BUDGET,
        toCategoryId: catId,
        memo: '',
        createdAt: `${dateStr}T00:00:00.000Z`,
        updatedAt: `${dateStr}T00:00:00.000Z`,
        syncedAt: null,
      });
    }
  }

  return {
    categories,
    viewedMonth: new Date(2026, 6, 1),
    transactions,
    transfers,
    availableToBudget: 100000,
  };
}

describe('auto-assign performance', () => {
  const input = buildFixture();

  for (const id of [
    'underfunded',
    'assigned_last_month',
    'spent_last_month',
    'average_assigned',
    'average_spent',
    'reduce_overfunding',
    'reset_available',
    'reset_assigned',
  ]) {
    it(`${id} runs under 50ms on 500 cats / 5000 txns`, () => {
      // Warm-up run to stabilize timing
      runPreset(id, input);
      const start = performance.now();
      runPreset(id, input);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  }
});
