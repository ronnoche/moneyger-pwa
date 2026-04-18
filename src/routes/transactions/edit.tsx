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

export default function TransactionEdit() {
  const { id } = useParams<{ id: string }>();
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
        await updateTransaction(id, toRepoInput(values));
      }}
      onDelete={async () => {
        await deleteTransaction(id);
      }}
    />
  );
}
