import { useState } from 'react';
import { useParams, Navigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { TransactionForm } from './form';
import {
  deleteTransaction,
  updateTransaction,
} from '@/features/transactions/repo';
import { toRepoInput } from '@/features/transactions/schema';
import type { TransactionFormValues } from '@/features/transactions/schema';
import { SkeletonRows } from '@/components/ui/skeleton';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';

export default function TransactionEdit() {
  const { id } = useParams<{ id: string }>();
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [pendingValues, setPendingValues] = useState<TransactionFormValues | null>(null);
  const txn = useLiveQuery(
    () => (id ? db.transactions.get(id) : undefined),
    [id],
  );

  if (!id) return <Navigate to="/transactions" replace />;
  if (txn === undefined) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <SkeletonRows count={5} />
      </div>
    );
  }
  if (txn === null) return <Navigate to="/transactions" replace />;

  const amount = txn.outflow > 0 ? txn.outflow : txn.inflow;
  const direction: TransactionFormValues['direction'] =
    txn.outflow > 0 ? 'outflow' : 'inflow';

  return (
    <>
      <TransactionForm
        title="Edit transaction"
        submitLabel="Save"
        defaultValues={{
          date: txn.date,
          direction,
          amount: amount ? String(amount) : '',
          categoryId: txn.categoryId,
          accountId: txn.accountId,
          memo: txn.memo,
          status: txn.status,
        }}
        onSubmit={async (values) => {
          if (txn.status === 'reconciled') {
            setPendingValues(values);
            setConfirmUnlock(true);
            return;
          }
          await updateTransaction(id, toRepoInput(values));
        }}
        onDelete={async () => {
          await deleteTransaction(id);
        }}
      />
      <ConfirmSheet
        open={confirmUnlock}
        onOpenChange={setConfirmUnlock}
        title="Edit reconciled transaction?"
        description="Saving changes will unlock this transaction and move it back to Cleared status."
        confirmLabel="Unlock and save"
        onConfirm={async () => {
          if (!pendingValues) return;
          await updateTransaction(id, {
            ...toRepoInput(pendingValues),
            status: 'cleared',
          });
          setPendingValues(null);
        }}
      />
    </>
  );
}
