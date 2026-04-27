import { useMemo, useState } from 'react';
import { useAccounts } from '@/db/hooks';
import {
  AccountHasTransactionsError,
  archiveAccount,
  createAccount,
} from '@/features/accounts/repo';
import type { AccountCategory, AccountSubtype } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { MoneyInput } from '@/components/money-input';
import { SwipeRow } from '@/components/swipe-row';
import { PageHeader } from '@/components/layout/page-header';
import { parseMoneyInput } from '@/lib/format';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/cn';

const DRAFT_KEY = 'moneyger:settings-account-draft';

const SUBTYPES: Record<AccountCategory, AccountSubtype[]> = {
  cash: ['checking', 'savings', 'cash'],
  credit: ['credit_card', 'line_of_credit'],
  loan: [
    'mortgage',
    'auto_loan',
    'student_loan',
    'personal_loan',
    'medical_debt',
    'other_debt',
  ],
  tracking: ['asset', 'liability'],
};

function defaultSubtype(category: AccountCategory): AccountSubtype {
  return SUBTYPES[category][0];
}

function labelSubtype(value: AccountSubtype): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function SettingsAccounts() {
  const initialDraft = readDraft();
  const accounts = useAccounts();
  const [name, setName] = useState(initialDraft.name);
  const [accountCategory, setAccountCategory] = useState<AccountCategory>(
    initialDraft.accountCategory,
  );
  const [subtype, setSubtype] = useState<AccountSubtype>(initialDraft.subtype);
  const [balance, setBalance] = useState(initialDraft.balance);

  const duplicate = useMemo(() => {
    const next = name.trim().toLowerCase();
    if (!next || !accounts) return false;
    return accounts.some(
      (account) =>
        account.name.trim().toLowerCase() === next && account.subtype === subtype,
    );
  }, [accounts, name, subtype]);

  const parsedBalance = parseMoneyInput(balance || '0');
  const warning = useMemo(() => {
    if (!Number.isFinite(parsedBalance)) return null;
    if (accountCategory === 'cash' && parsedBalance < 0) {
      return 'Negative cash balance is allowed but unusual.';
    }
    if (accountCategory === 'credit' && parsedBalance > 0) {
      return 'Positive credit balance is allowed but unusual.';
    }
    if (accountCategory === 'loan' && parsedBalance > 0) {
      return 'Positive loan balance is allowed but unusual.';
    }
    return null;
  }, [accountCategory, parsedBalance]);

  const balanceLabel =
    accountCategory === 'credit' || accountCategory === 'loan'
      ? 'Current balance owed'
      : 'Current balance';
  const balanceHelp =
    accountCategory === 'tracking'
      ? 'Enter the account value used for net worth tracking.'
      : accountCategory === 'credit'
        ? 'Debt balances are usually negative. Positive values are allowed.'
        : accountCategory === 'loan'
          ? 'Debt balances are usually negative. Positive values are allowed.'
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
    await createAccount({
      name: trimmed,
      accountCategory,
      subtype,
      openingBalance: parsed,
    });
    setName('');
    setAccountCategory('cash');
    setSubtype('checking');
    setBalance('');
    sessionStorage.removeItem(DRAFT_KEY);
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
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              writeDraft({ name: next, accountCategory, subtype, balance });
            }}
            autoComplete="off"
          />
        </Field>
        <Field label="Account category" htmlFor="acct-category">
          <select
            id="acct-category"
            className={inputClass}
            value={accountCategory}
            onChange={(e) => {
              const next = e.target.value as AccountCategory;
              setAccountCategory(next);
              const nextSubtype = defaultSubtype(next);
              setSubtype(nextSubtype);
              writeDraft({
                name,
                accountCategory: next,
                subtype: nextSubtype,
                balance,
              });
            }}
          >
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
            <option value="loan">Loan</option>
            <option value="tracking">Tracking</option>
          </select>
        </Field>
        <Field label="Subtype" htmlFor="acct-subtype">
          <select
            id="acct-subtype"
            className={inputClass}
            value={subtype}
            onChange={(e) => {
              const next = e.target.value as AccountSubtype;
              setSubtype(next);
              writeDraft({ name, accountCategory, subtype: next, balance });
            }}
          >
            {SUBTYPES[accountCategory].map((item) => (
              <option key={item} value={item}>
                {labelSubtype(item)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={balanceLabel} htmlFor="acct-balance" hint={balanceHelp}>
          <MoneyInput
            id="acct-balance"
            value={balance}
            onChange={(e) => {
              const next = e.target.value;
              setBalance(next);
              writeDraft({ name, accountCategory, subtype, balance: next });
            }}
            placeholder="0.00"
          />
        </Field>
        {warning && (
          <p className="rounded-lg bg-[color:var(--color-warning-bg)] px-3 py-2 text-xs text-[color:var(--color-warning)]">
            {warning}
          </p>
        )}
        {duplicate && (
          <p className="rounded-lg bg-[color:var(--color-warning-bg)] px-3 py-2 text-xs text-[color:var(--color-warning)]">
            Duplicate name and subtype detected. You can still save.
          </p>
        )}
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
                      acct.accountCategory === 'credit'
                        ? 'text-danger-600'
                        : 'text-ink-500',
                    )}
                  >
                    {labelSubtype(acct.subtype)}
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

function readDraft(): {
  name: string;
  accountCategory: AccountCategory;
  subtype: AccountSubtype;
  balance: string;
} {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return {
        name: '',
        accountCategory: 'cash',
        subtype: 'checking',
        balance: '',
      };
    }
    const parsed = JSON.parse(raw) as {
      name?: string;
      accountCategory?: AccountCategory;
      subtype?: AccountSubtype;
      balance?: string;
    };
    const category = parsed.accountCategory ?? 'cash';
    return {
      name: parsed.name ?? '',
      accountCategory: category,
      subtype: parsed.subtype ?? defaultSubtype(category),
      balance: parsed.balance ?? '',
    };
  } catch {
    return {
      name: '',
      accountCategory: 'cash',
      subtype: 'checking',
      balance: '',
    };
  }
}

function writeDraft(payload: {
  name: string;
  accountCategory: AccountCategory;
  subtype: AccountSubtype;
  balance: string;
}): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}
