import { useSearchParams } from 'react-router';
import { TransactionForm } from './form';
import { createTransaction, getLastUsedAccountId } from '@/features/transactions/repo';
import { toRepoInput } from '@/features/transactions/schema';
import { todayISO } from '@/lib/dates';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';

export default function TransactionNew() {
  const [params] = useSearchParams();
  const direction: 'outflow' | 'inflow' =
    params.get('direction') === 'inflow' ? 'inflow' : 'outflow';
  const categoryParam = params.get('category');
  const categoryId =
    categoryParam === 'atb' ? AVAILABLE_TO_BUDGET : (categoryParam ?? '');
  const accountParam = params.get('account');

  return (
    <TransactionForm
      title="New transaction"
      submitLabel="Save"
      defaultValues={{
        date: todayISO(),
        direction,
        amount: '',
        categoryId,
        accountId: accountParam ?? getLastUsedAccountId() ?? '',
        memo: '',
        status: 'cleared',
      }}
      onSubmit={async (values) => {
        await createTransaction(toRepoInput(values));
      }}
    />
  );
}
