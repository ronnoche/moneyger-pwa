import { addHours, isAfter, parseISO } from 'date-fns';
import { db, newId, nowISO } from '@/db/db';
import type { ReconcileEvent, Transaction } from '@/db/schema';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ReconcilePreview {
  accountId: string;
  clearedBalance: number;
  enteredBalance: number;
  gap: number;
  pending: Transaction[];
}

export async function getAccountClearedBalance(accountId: string): Promise<number> {
  const txns = await db.transactions.where('accountId').equals(accountId).toArray();
  return round2(
    txns
      .filter((txn) => txn.status !== 'pending')
      .reduce((total, txn) => total + txn.inflow - txn.outflow, 0),
  );
}

export async function startReconcile(
  accountId: string,
  enteredBalance: number,
): Promise<ReconcilePreview> {
  const txns = await db.transactions.where('accountId').equals(accountId).toArray();
  const clearedBalance = round2(
    txns
      .filter((txn) => txn.status !== 'pending')
      .reduce((total, txn) => total + txn.inflow - txn.outflow, 0),
  );
  return {
    accountId,
    clearedBalance,
    enteredBalance: round2(enteredBalance),
    gap: round2(enteredBalance - clearedBalance),
    pending: txns.filter((txn) => txn.status === 'pending'),
  };
}

export async function commitReconcile(
  accountId: string,
  enteredBalance: number,
): Promise<ReconcileEvent> {
  const preview = await startReconcile(accountId, enteredBalance);
  const now = nowISO();
  const event: ReconcileEvent = {
    id: newId(),
    accountId,
    reconciledAt: now,
    adjustmentTxnId: null,
    revertedAt: null,
  };

  await db.transaction(
    'rw',
    db.transactions,
    db.reconcileEvents,
    db.accounts,
    async () => {
      const cleared = await db.transactions
        .where('accountId')
        .equals(accountId)
        .filter((txn) => txn.status === 'cleared')
        .toArray();

      if (preview.gap !== 0) {
        const acct = await db.accounts.get(accountId);
        const adjustmentCategory =
          acct?.accountCategory === 'tracking' ? 'off_budget' : AVAILABLE_TO_BUDGET;
        const adjustment: Transaction = {
          id: newId(),
          date: now.slice(0, 10),
          outflow: preview.gap < 0 ? Math.abs(preview.gap) : 0,
          inflow: preview.gap > 0 ? preview.gap : 0,
          categoryId: adjustmentCategory,
          accountId,
          memo: 'Reconciliation Balance Adjustment',
          status: 'cleared',
          reconciledAt: null,
          reconcileEventId: null,
          createdAt: now,
          updatedAt: now,
          syncedAt: null,
        };
        await db.transactions.add(adjustment);
        event.adjustmentTxnId = adjustment.id;
        cleared.push(adjustment);
      }

      for (const txn of cleared) {
        await db.transactions.update(txn.id, {
          status: 'reconciled',
          reconciledAt: now,
          reconcileEventId: event.id,
          updatedAt: now,
        });
      }

      await db.accounts.update(accountId, { lastReconciledAt: now });
      await db.reconcileEvents.add(event);
    },
  );

  return event;
}

export async function getUndoableReconcileEvent(
  accountId: string,
): Promise<ReconcileEvent | null> {
  const events = await db.reconcileEvents.where('accountId').equals(accountId).reverse().toArray();
  const recent = events.find((event) => event.revertedAt === null);
  if (!recent) return null;
  const expiresAt = addHours(parseISO(recent.reconciledAt), 24);
  if (isAfter(new Date(), expiresAt)) return null;
  return recent;
}

export async function undoReconcile(eventId: string): Promise<boolean> {
  const event = await db.reconcileEvents.get(eventId);
  if (!event || event.revertedAt) return false;
  const expiresAt = addHours(parseISO(event.reconciledAt), 24);
  if (isAfter(new Date(), expiresAt)) return false;
  const now = nowISO();
  await db.transaction('rw', db.transactions, db.reconcileEvents, async () => {
    const reconciled = await db.transactions
      .where('reconcileEventId')
      .equals(event.id)
      .toArray();
    for (const txn of reconciled) {
      await db.transactions.update(txn.id, {
        status: 'cleared',
        reconciledAt: null,
        reconcileEventId: null,
        updatedAt: now,
      });
    }
    if (event.adjustmentTxnId) {
      await db.transactions.delete(event.adjustmentTxnId);
    }
    await db.reconcileEvents.update(event.id, { revertedAt: now });
  });
  return true;
}
