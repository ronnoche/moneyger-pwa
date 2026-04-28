import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { MoneygerDB } from '@/db/db';
import type { Account, Category, Group, Transaction } from '@/db/schema';
import {
  commitReconcile,
  getAccountClearedBalance,
  getUndoableReconcileEvent,
  undoReconcile,
} from './reconcile';
import { AVAILABLE_TO_BUDGET } from './budget-math';

let testDb: MoneygerDB;

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acct-1',
    name: 'Checking',
    accountCategory: 'cash',
    subtype: 'checking',
    onBudget: true,
    lastReconciledAt: null,
    isCreditCard: false,
    isArchived: false,
    ...overrides,
  };
}

function atbCategory(): Category {
  return {
    id: AVAILABLE_TO_BUDGET,
    groupId: 'g-atb',
    name: 'Available to Budget',
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
  };
}

function group(): Group {
  return { id: 'g-atb', name: 'System', sortOrder: 0, isArchived: false };
}

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2026-04-10',
    outflow: 0,
    inflow: 0,
    categoryId: AVAILABLE_TO_BUDGET,
    accountId: 'acct-1',
    memo: '',
    status: 'cleared',
    reconciledAt: null,
    reconcileEventId: null,
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
    syncedAt: null,
    ...overrides,
  };
}

describe('reconcile', () => {
  beforeEach(async () => {
    if (testDb) testDb.close();
    const fresh = new MoneygerDB();
    await fresh.delete();
    testDb = new MoneygerDB();
    await testDb.open();
    await testDb.groups.add(group());
    await testDb.categories.add(atbCategory());
    await testDb.accounts.add(account());
  });

  it('matching balance reconciles all cleared transactions', async () => {
    await testDb.transactions.bulkAdd([
      txn({ id: 't1', inflow: 1000 }),
      txn({ id: 't2', outflow: 200 }),
    ]);
    const event = await commitReconcile('acct-1', 800);
    expect(event.adjustmentTxnId).toBeNull();
    const settled = await getAccountClearedBalance('acct-1');
    expect(settled).toBe(800);
    const all = await testDb.transactions.toArray();
    expect(all.every((item) => item.status === 'reconciled')).toBe(true);
  });

  it('mismatch creates one adjustment transaction', async () => {
    await testDb.transactions.add(txn({ id: 't1', inflow: 1000 }));
    const event = await commitReconcile('acct-1', 900);
    expect(event.adjustmentTxnId).toBeTruthy();
    const adjustment = await testDb.transactions.get(event.adjustmentTxnId!);
    expect(adjustment?.memo).toBe('Reconciliation Balance Adjustment');
    expect(adjustment?.status).toBe('reconciled');
    expect(adjustment?.categoryId).toBe(AVAILABLE_TO_BUDGET);
  });

  it('tracking account adjustment uses off-budget category', async () => {
    await testDb.accounts.put(
      account({
        id: 'acct-tracking',
        name: 'Car',
        accountCategory: 'tracking',
        subtype: 'asset',
        onBudget: false,
      }),
    );
    await testDb.transactions.add(
      txn({ id: 't-track', accountId: 'acct-tracking', inflow: 1000 }),
    );
    const event = await commitReconcile('acct-tracking', 900);
    expect(event.adjustmentTxnId).toBeTruthy();
    const adjustment = await testDb.transactions.get(event.adjustmentTxnId!);
    expect(adjustment?.categoryId).toBe('off_budget');
  });

  it('undo within 24 hours reverts reconcile and removes adjustment', async () => {
    await testDb.transactions.add(txn({ id: 't1', inflow: 1000 }));
    const event = await commitReconcile('acct-1', 900);
    const undoable = await getUndoableReconcileEvent('acct-1');
    expect(undoable?.id).toBe(event.id);
    const ok = await undoReconcile(event.id);
    expect(ok).toBe(true);
    const all = await testDb.transactions.toArray();
    expect(all.some((item) => item.id === event.adjustmentTxnId)).toBe(false);
    expect(all.every((item) => item.status === 'cleared')).toBe(true);
  });

  it('editing reconciled transaction drops lock to cleared', async () => {
    const reconciled = txn({
      id: 't-lock',
      inflow: 10,
      status: 'reconciled',
      reconciledAt: '2026-04-10T00:00:00.000Z',
      reconcileEventId: 'event-1',
    });
    await testDb.transactions.add(reconciled);
    await testDb.transactions.update('t-lock', {
      memo: 'edited',
      status: 'cleared',
      reconciledAt: null,
      reconcileEventId: null,
    });
    const next = await testDb.transactions.get('t-lock');
    expect(next?.status).toBe('cleared');
    expect(next?.reconciledAt).toBeNull();
    expect(next?.reconcileEventId).toBeNull();
  });
});
