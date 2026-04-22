import { Link, useNavigate } from 'react-router';
import { Archive, ChevronRight, CreditCard, Landmark } from 'lucide-react';
import { useAccounts, useTransactions } from '@/db/hooks';
import {
  accountPendingBalance,
  accountSettledBalance,
} from '@/lib/budget-math';
import { PageHeader } from '@/components/layout/page-header';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SkeletonRows } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SwipeRow } from '@/components/swipe-row';
import { Button } from '@/components/ui/button';
import {
  AccountHasTransactionsError,
  archiveAccount,
} from '@/features/accounts/repo';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/cn';

export default function AccountsList() {
  const accounts = useAccounts();
  const txns = useTransactions();
  const navigate = useNavigate();

  const loading = accounts === undefined || txns === undefined;

  const netCash =
    accounts && txns
      ? accounts.reduce((acc, a) => acc + accountSettledBalance(a.id, txns), 0)
      : 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader
        title="Accounts"
        backTo="/more"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings/accounts')}
          >
            Manage
          </Button>
        }
      />

      <div className="mb-3 flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Net cash
        </span>
        <AmountDisplay value={netCash} tone="auto" size="lg" animate />
      </div>

      {loading ? (
        <SkeletonRows count={3} />
      ) : accounts.length === 0 ? (
        <EmptyState
          kind="coin-purse"
          title="No accounts yet"
          description="Add a cash or credit card account from Settings to start tracking balances."
          action={
            <Button onClick={() => navigate('/settings/accounts')}>
              Add account
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((acct) => {
            const settled = accountSettledBalance(acct.id, txns);
            const pending = accountPendingBalance(acct.id, txns);
            const Icon = acct.isCreditCard ? CreditCard : Landmark;
            return (
              <li key={acct.id}>
                <SwipeRow
                  rightActions={[
                    {
                      label: 'Archive',
                      icon: Archive,
                      tone: 'neutral',
                      onInvoke: async () => {
                        try {
                          await archiveAccount(acct.id);
                          toast.success(`${acct.name} archived`);
                        } catch (err) {
                          if (err instanceof AccountHasTransactionsError) {
                            toast.error(
                              'Delete this account’s transactions first, then archive.',
                              `${err.count} transaction${err.count === 1 ? '' : 's'} still linked.`,
                            );
                            return;
                          }
                          throw err;
                        }
                      },
                    },
                  ]}
                >
                  <Link
                    to={`/accounts/${acct.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border bg-[color:var(--color-surface)] px-4 py-3 active:bg-[color:var(--color-surface-2)]',
                      acct.isCreditCard
                        ? 'border-l-2 border-l-[color:var(--color-danger-500)]/40 border-y-[color:var(--color-border)] border-r-[color:var(--color-border)]'
                        : 'border-[color:var(--color-border)]',
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-surface-2)]">
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className="text-[color:var(--color-fg-muted)]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {acct.name}
                        </span>
                        <TypeBadge isCredit={acct.isCreditCard} />
                      </div>
                      {pending !== 0 && (
                        <div className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
                          <span className="font-mono tabular-nums">
                            Pending {formatSigned(pending)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <AmountDisplay
                        value={settled}
                        tone={settled < 0 ? 'negative' : 'neutral'}
                        size="md"
                      />
                    </div>
                    <ChevronRight
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-[color:var(--color-fg-muted)]"
                    />
                  </Link>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TypeBadge({ isCredit }: { isCredit: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wider',
        isCredit
          ? 'bg-[color:var(--color-danger-500)]/10 text-[color:var(--color-danger-600)]'
          : 'bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)]',
      )}
    >
      {isCredit ? 'Credit' : 'Cash'}
    </span>
  );
}

function formatSigned(n: number): string {
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${abs}`;
}
