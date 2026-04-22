import { useState } from 'react';
import { useAccounts } from '@/db/hooks';
import {
  AccountHasTransactionsError,
  archiveAccount,
  createAccount,
} from '@/features/accounts/repo';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { MoneyInput } from '@/components/money-input';
import { SwipeRow } from '@/components/swipe-row';
import { PageHeader } from '@/components/layout/page-header';
import { parseMoneyInput } from '@/lib/format';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/cn';

export default function SettingsAccounts() {
  const accounts = useAccounts();
  const [name, setName] = useState('');
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [balance, setBalance] = useState('');

  const balanceLabel = isCreditCard ? 'Current balance owed' : 'Current balance';
  const balanceHelp = isCreditCard
    ? 'How much you currently owe on this card. Enter 0 if paid off.'
    : 'How much is in this account right now. Enter 0 if empty.';

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (balance.trim() === '') {
      toast.error('Enter the current balance.');
      return;
    }
    const parsed = parseMoneyInput(balance);
    if (!Number.isFinite(parsed)) {
      toast.error('Invalid balance.');
      return;
    }
    const openingBalance = isCreditCard ? -Math.abs(parsed) : parsed;
    await createAccount({ name: trimmed, isCreditCard, openingBalance });
    setName('');
    setIsCreditCard(false);
    setBalance('');
  }

  async function handleDelete(id: string) {
    try {
      await archiveAccount(id);
    } catch (err) {
      if (err instanceof AccountHasTransactionsError) {
        toast.error(
          'Delete this account’s transactions first, then delete the account.',
          `${err.count} transaction${err.count === 1 ? '' : 's'} still linked.`,
        );
        return;
      }
      throw err;
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Accounts" backTo="/settings" />

      <form onSubmit={handleAdd} className="mb-6 space-y-3">
        <Field label="New account" htmlFor="acct-name">
          <input
            id="acct-name"
            className={inputClass}
            placeholder="Checking"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 rounded accent-brand-600"
            checked={isCreditCard}
            onChange={(e) => setIsCreditCard(e.target.checked)}
          />
          Credit card
        </label>
        <Field label={balanceLabel} htmlFor="acct-balance" hint={balanceHelp}>
          <MoneyInput
            id="acct-balance"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Button
          type="submit"
          className="w-full"
          disabled={!name.trim() || balance.trim() === ''}
        >
          Add account
        </Button>
      </form>

      {accounts === undefined ? (
        <p className="text-sm text-ink-500">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-ink-500">No accounts yet.</p>
      ) : (
        <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
          {accounts.map((acct) => (
            <li key={acct.id}>
              <SwipeRow onDelete={() => handleDelete(acct.id)}>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{acct.name}</span>
                  <span
                    className={cn(
                      'text-xs',
                      acct.isCreditCard
                        ? 'text-danger-600'
                        : 'text-ink-500',
                    )}
                  >
                    {acct.isCreditCard ? 'Credit card' : 'Cash'}
                  </span>
                </div>
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
