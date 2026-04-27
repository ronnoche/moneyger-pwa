import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Category, Transaction, Transfer } from '@/db/schema';
import { AVAILABLE_TO_BUDGET } from './budget-math';
import {
  averageAssigned,
  averageSpent,
  assignedLastMonth,
  capByATB,
  resetAssigned,
  resetAvailable,
  reduceOverfunding,
  spentLastMonth,
  underfunded,
} from './auto-assign/presets';
import type { PresetInput } from './auto-assign/types';
import { applyPreset, revertAutoAssign } from './auto-assign';
import { MoneygerDB } from '@/db/db';

const GROCERIES = 'cat-groc';
const RENT = 'cat-rent';
const FUN = 'cat-fun';
const ACCT = 'acct-1';

function cat(id: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    groupId: 'g-1',
    name: id,
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

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2026-04-15',
    outflow: 0,
    inflow: 0,
    categoryId: AVAILABLE_TO_BUDGET,
    accountId: ACCT,
    memo: '',
    status: 'cleared',
    reconciledAt: null,
    reconcileEventId: null,
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-15T00:00:00.000Z',
    syncedAt: null,
    ...overrides,
  };
}

function tfr(overrides: Partial<Transfer> = {}): Transfer {
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

function makeInput(overrides: Partial<PresetInput> = {}): PresetInput {
  return {
    categories: [],
    viewedMonth: new Date(2026, 3, 1),
    transactions: [],
    transfers: [],
    availableToBudget: 10_000,
    ...overrides,
  };
}

describe('capByATB', () => {
  it('returns as-is when total within ATB', () => {
    const moves = [
      { categoryId: 'a', amount: 100 },
      { categoryId: 'b', amount: 200 },
    ];
    const res = capByATB(moves, 500, new Map());
    expect(res.capped).toBe(false);
    expect(res.moves).toHaveLength(2);
  });

  it('truncates lowest-priority first when ATB short', () => {
    const moves = [
      { categoryId: 'a', amount: 300 },
      { categoryId: 'b', amount: 300 },
    ];
    const priority = new Map([
      ['a', 0],
      ['b', 3],
    ]);
    const res = capByATB(moves, 400, priority);
    expect(res.capped).toBe(true);
    const a = res.moves.find((m) => m.categoryId === 'a');
    const b = res.moves.find((m) => m.categoryId === 'b');
    expect(a?.amount).toBe(300);
    expect(b?.amount).toBe(100);
  });

  it('drops lowest-priority entirely if zero remaining', () => {
    const moves = [
      { categoryId: 'a', amount: 500 },
      { categoryId: 'b', amount: 500 },
    ];
    const res = capByATB(moves, 500, new Map([['a', 0], ['b', 3]]));
    expect(res.capped).toBe(true);
    expect(res.moves.find((m) => m.categoryId === 'b')).toBeUndefined();
  });
});

describe('underfunded preset', () => {
  it('returns empty when no goals set', () => {
    const result = underfunded(
      makeInput({ categories: [cat(GROCERIES), cat(RENT)] }),
    );
    expect(result.moves).toHaveLength(0);
  });

  it('with one underfunded monthly goal of 500 and ATB 1000 returns 500 move', () => {
    const result = underfunded(
      makeInput({
        categories: [cat(GROCERIES, { goalType: 'monthly', goalAmount: 500 })],
        availableToBudget: 1000,
      }),
    );
    expect(result.moves).toEqual([
      expect.objectContaining({ categoryId: GROCERIES, amount: 500 }),
    ]);
    expect(result.totalAmount).toBe(500);
    expect(result.cappedByATB).toBe(false);
  });

  it('caps by ATB and flags cappedByATB when total needed exceeds ATB', () => {
    const result = underfunded(
      makeInput({
        categories: [
          cat(GROCERIES, {
            goalType: 'monthly',
            goalBehavior: 'refill_up_to',
            goalAmount: 500,
          }),
          cat(RENT, {
            goalType: 'weekly',
            goalBehavior: 'set_aside_another',
            goalAmount: 200,
          }),
          cat(FUN, {
            goalType: 'custom',
            goalBehavior: 'fill_up_to',
            goalAmount: 1000,
            goalDueDate: '2027-12-01',
          }),
        ],
        availableToBudget: 600,
      }),
    );
    expect(result.cappedByATB).toBe(true);
    expect(result.totalAmount).toBeLessThanOrEqual(600);
    expect(result.moves.length).toBeGreaterThan(0);
  });

  it('skips categories already funded for the month', () => {
    const tfrs = [
      tfr({
        amount: 500,
        toCategoryId: GROCERIES,
        date: '2026-04-05',
      }),
    ];
    const result = underfunded(
      makeInput({
        categories: [
          cat(GROCERIES, {
            goalType: 'monthly',
            goalBehavior: 'refill_up_to',
            goalAmount: 500,
          }),
        ],
        transfers: tfrs,
      }),
    );
    expect(result.moves).toHaveLength(0);
  });

  it('skips snoozed categories for viewed month', () => {
    const result = underfunded(
      makeInput({
        categories: [
          cat(GROCERIES, {
            goalType: 'monthly',
            goalAmount: 500,
            snoozedUntil: '2026-04',
          }),
        ],
      }),
    );
    expect(result.moves).toHaveLength(0);
  });
});

describe('assignedLastMonth preset', () => {
  it('returns empty when no prior month transfers', () => {
    const result = assignedLastMonth(
      makeInput({ categories: [cat(GROCERIES)] }),
    );
    expect(result.moves).toHaveLength(0);
  });

  it('when prior month had 500 to Groceries, returns 500 move', () => {
    const tfrs = [tfr({ amount: 500, date: '2026-03-10', toCategoryId: GROCERIES })];
    const result = assignedLastMonth(
      makeInput({ categories: [cat(GROCERIES)], transfers: tfrs }),
    );
    expect(result.moves).toEqual([
      expect.objectContaining({ categoryId: GROCERIES, amount: 500 }),
    ]);
  });

  it('subtracts already-assigned-this-month', () => {
    const tfrs = [
      tfr({ amount: 500, date: '2026-03-10', toCategoryId: GROCERIES }),
      tfr({ amount: 200, date: '2026-04-02', toCategoryId: GROCERIES }),
    ];
    const result = assignedLastMonth(
      makeInput({ categories: [cat(GROCERIES)], transfers: tfrs }),
    );
    const m = result.moves.find((x) => x.categoryId === GROCERIES);
    expect(m?.amount).toBe(300);
  });
});

describe('spentLastMonth preset', () => {
  it('returns empty when prior month had no activity', () => {
    const result = spentLastMonth(
      makeInput({ categories: [cat(GROCERIES)] }),
    );
    expect(result.moves).toHaveLength(0);
  });

  it('produces a move equal to prior month outflow', () => {
    const txns = [
      txn({ outflow: 250, categoryId: GROCERIES, date: '2026-03-15' }),
    ];
    const result = spentLastMonth(
      makeInput({ categories: [cat(GROCERIES)], transactions: txns }),
    );
    const m = result.moves.find((x) => x.categoryId === GROCERIES);
    expect(m?.amount).toBe(250);
  });
});

describe('averageAssigned preset', () => {
  it('skips categories with <3 months history', () => {
    const tfrs = [tfr({ amount: 100, date: '2026-03-01', toCategoryId: GROCERIES })];
    const result = averageAssigned(
      makeInput({ categories: [cat(GROCERIES)], transfers: tfrs }),
    );
    expect(result.moves).toHaveLength(0);
  });

  it('returns 500 move when prior 3 months were 400/500/600', () => {
    const tfrs = [
      tfr({ amount: 400, date: '2026-01-05', toCategoryId: GROCERIES }),
      tfr({ amount: 500, date: '2026-02-05', toCategoryId: GROCERIES }),
      tfr({ amount: 600, date: '2026-03-05', toCategoryId: GROCERIES }),
    ];
    const result = averageAssigned(
      makeInput({ categories: [cat(GROCERIES)], transfers: tfrs }),
    );
    const m = result.moves.find((x) => x.categoryId === GROCERIES);
    expect(m?.amount).toBe(500);
  });
});

describe('averageSpent preset', () => {
  it('averages absolute activity over 3 months', () => {
    const txns = [
      txn({ outflow: 300, categoryId: GROCERIES, date: '2026-01-05' }),
      txn({ outflow: 600, categoryId: GROCERIES, date: '2026-02-05' }),
      txn({ outflow: 300, categoryId: GROCERIES, date: '2026-03-05' }),
    ];
    // Need any transfer to establish history start
    const tfrs = [tfr({ amount: 1, date: '2026-01-01', toCategoryId: GROCERIES })];
    const result = averageSpent(
      makeInput({ categories: [cat(GROCERIES)], transactions: txns, transfers: tfrs }),
    );
    const m = result.moves.find((x) => x.categoryId === GROCERIES);
    expect(m?.amount).toBe(400);
  });
});

describe('resetAvailable preset', () => {
  it('zeros positive Availables and ignores negatives', () => {
    const txns = [
      txn({ inflow: 1000, categoryId: AVAILABLE_TO_BUDGET }),
      txn({ outflow: 50, categoryId: RENT, date: '2026-04-10' }),
    ];
    const tfrs = [
      tfr({ amount: 300, toCategoryId: GROCERIES }),
      tfr({ amount: 20, toCategoryId: RENT }),
    ];
    const result = resetAvailable(
      makeInput({
        categories: [cat(GROCERIES), cat(RENT)],
        transactions: txns,
        transfers: tfrs,
      }),
    );
    const g = result.moves.find((m) => m.categoryId === GROCERIES);
    expect(g?.amount).toBe(-300);
    expect(result.moves.find((m) => m.categoryId === RENT)).toBeUndefined();
  });
});

describe('resetAssigned preset', () => {
  it('reverses every this-month transfer', () => {
    const tfrs = [
      tfr({ amount: 200, date: '2026-04-02', toCategoryId: GROCERIES }),
      tfr({ amount: 50, date: '2026-04-10', fromCategoryId: GROCERIES, toCategoryId: AVAILABLE_TO_BUDGET }),
      tfr({ amount: 500, date: '2026-03-05', toCategoryId: GROCERIES }),
    ];
    const result = resetAssigned(
      makeInput({ categories: [cat(GROCERIES)], transfers: tfrs }),
    );
    const g = result.moves.find((m) => m.categoryId === GROCERIES);
    // Net this month: +200 - 50 = 150. Reverse = -150
    expect(g?.amount).toBe(-150);
  });
});

describe('reduceOverfunding preset', () => {
  it('returns excess available back to ATB', () => {
    const txns = [txn({ inflow: 1000, categoryId: AVAILABLE_TO_BUDGET })];
    const tfrs = [
      tfr({ amount: 700, toCategoryId: GROCERIES }),
      tfr({ amount: 100, fromCategoryId: GROCERIES, toCategoryId: AVAILABLE_TO_BUDGET }),
    ];
    const result = reduceOverfunding(
      makeInput({
        categories: [
          cat(GROCERIES, {
            goalType: 'monthly',
            goalAmount: 500,
            goalBehavior: 'refill_up_to',
          }),
        ],
        transactions: txns,
        transfers: tfrs,
      }),
    );
    expect(result.moves).toEqual([
      expect.objectContaining({ categoryId: GROCERIES, amount: -100 }),
    ]);
  });
});

describe('applyPreset + revertAutoAssign (integration)', () => {
  let db: MoneygerDB;

  beforeEach(async () => {
    if (db) db.close();
    const fresh = new MoneygerDB();
    await fresh.delete();
    db = new MoneygerDB();
    await db.open();
  });

  it('applyPreset creates expected transfers and writes history entry', async () => {
    const input = makeInput({
      categories: [cat(GROCERIES, { goalType: 'monthly', goalAmount: 500 })],
      availableToBudget: 1000,
    });

    const entry = await applyPreset('underfunded', input, db);
    expect(entry.moveCount).toBe(1);
    expect(entry.totalAmount).toBe(500);
    expect(entry.transferIds).toHaveLength(1);
    expect(entry.scope).toBe('all');

    const stored = await db.autoAssignHistory.get(entry.id);
    expect(stored).toBeTruthy();

    const transfers = await db.transfers.toArray();
    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromCategoryId).toBe(AVAILABLE_TO_BUDGET);
    expect(transfers[0].toCategoryId).toBe(GROCERIES);
    expect(transfers[0].amount).toBe(500);
  });

  it('revertAutoAssign creates equal-and-opposite transfers and marks revertedAt', async () => {
    const input = makeInput({
      categories: [cat(GROCERIES, { goalType: 'monthly', goalAmount: 500 })],
      availableToBudget: 1000,
    });

    const entry = await applyPreset('underfunded', input, db);
    await revertAutoAssign(entry.id, db);

    const transfers = await db.transfers.toArray();
    expect(transfers).toHaveLength(2);

    const forward = transfers.find((t) => t.memo.startsWith('[auto-assign'));
    const reverse = transfers.find((t) => t.memo.startsWith('[revert'));
    expect(forward).toBeTruthy();
    expect(reverse).toBeTruthy();
    expect(reverse?.fromCategoryId).toBe(forward?.toCategoryId);
    expect(reverse?.toCategoryId).toBe(forward?.fromCategoryId);
    expect(reverse?.amount).toBe(forward?.amount);

    const updated = await db.autoAssignHistory.get(entry.id);
    expect(updated?.revertedAt).toBeTruthy();
  });

  it('apply + revert is net-zero for Budgeted this month', async () => {
    const input = makeInput({
      categories: [
        cat(GROCERIES, { goalType: 'monthly', goalAmount: 500 }),
        cat(RENT, { goalType: 'monthly', goalAmount: 1000 }),
      ],
      availableToBudget: 2000,
    });

    const entry = await applyPreset('underfunded', input, db);
    await revertAutoAssign(entry.id, db);

    const transfers = await db.transfers.toArray();
    const net = (cid: string) =>
      transfers
        .filter((t) => t.toCategoryId === cid)
        .reduce((a, t) => a + t.amount, 0) -
      transfers
        .filter((t) => t.fromCategoryId === cid)
        .reduce((a, t) => a + t.amount, 0);

    expect(net(GROCERIES)).toBe(0);
    expect(net(RENT)).toBe(0);
  });

  it('records scope=selected when scopedCategoryIds provided', async () => {
    const input = makeInput({
      categories: [
        cat(GROCERIES, { goalType: 'monthly', goalAmount: 500 }),
        cat(RENT, { goalType: 'monthly', goalAmount: 1000 }),
      ],
      availableToBudget: 2000,
      scopedCategoryIds: [GROCERIES],
    });

    const entry = await applyPreset('underfunded', input, db);
    expect(entry.scope).toBe('selected');
    expect(entry.scopedCategoryIds).toEqual([GROCERIES]);
    expect(entry.moveCount).toBe(1);
  });
});
