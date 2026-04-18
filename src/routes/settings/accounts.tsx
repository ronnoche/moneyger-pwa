import { useState } from 'react';
import { useAccounts } from '@/db/hooks';
import { archiveAccount, createAccount } from '@/features/accounts/repo';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { SwipeRow } from '@/components/swipe-row';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

export default function SettingsAccounts() {
  const accounts = useAccounts();
  const [name, setName] = useState('');
  const [isCreditCard, setIsCreditCard] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await createAccount({ name: trimmed, isCreditCard });
    setName('');
    setIsCreditCard(false);
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
        <Button type="submit" className="w-full" disabled={!name.trim()}>
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
              <SwipeRow onDelete={() => archiveAccount(acct.id)}>
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
