import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { CreditCard, Landmark } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { addDays, endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { useHotkeys } from 'react-hotkeys-hook';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spring } from '@/styles/motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useCategories, useTransactions } from '@/db/hooks';
import {
  accountPendingBalance,
  accountSettledBalance,
  AVAILABLE_TO_BUDGET,
} from '@/lib/budget-math';
import { PageHeader } from '@/components/layout/page-header';
import { SwipeRow } from '@/components/swipe-row';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SkeletonRows } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  RegisterFilters,
  type RegisterDateRange,
  type RegisterStatus,
} from '@/components/accounts/register-filters';
import { TransactionInlineEditor } from '@/components/transactions/transaction-inline-editor';
import { formatMoney } from '@/lib/format';
import {
  createTransaction,
  deleteTransaction,
} from '@/features/transactions/repo';
import { toast } from '@/lib/toast';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import type { Transaction } from '@/db/schema';
import { ReconcileModal } from '@/components/reconcile/reconcile-modal';
import { getUndoableReconcileEvent, undoReconcile } from '@/lib/reconcile';

const AccountSparkline = lazy(() =>
  import('@/components/accounts/account-sparkline').then((m) => ({
    default: m.AccountSparkline,
  })),
);

export default function AccountRegister() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useLiveQuery(
    () => (id ? db.accounts.get(id) : undefined),
    [id],
  );
  const allTxns = useTransactions();
  const categories = useCategories();

  const [range, setRange] = useState<RegisterDateRange>('all');
  const [status, setStatus] = useState<RegisterStatus>('all');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const reduced = useReducedMotion();
  const undoableReconcile = useLiveQuery(
    () => (id ? getUndoableReconcileEvent(id) : Promise.resolve(null)),
    [id, allTxns],
  );

  const rowsWithBalance = useMemo(() => {
    if (!allTxns || !id) return undefined;
    const mine = allTxns.filter((t) => t.accountId === id);
    const oldestFirst = [...mine].sort((a, b) =>
      a.date === b.date
        ? a.createdAt.localeCompare(b.createdAt)
        : a.date.localeCompare(b.date),
    );
    let running = 0;
    const withBalance = oldestFirst.map((t) => {
      const delta = t.inflow - t.outflow;
      running += delta;
      return { txn: t, balance: running };
    });
    return withBalance.reverse();
  }, [allTxns, id]);

  const filtered = useMemo(() => {
    if (!rowsWithBalance) return undefined;
    const now = new Date();
    const bounds =
      range === 'this-month'
        ? { from: startOfMonth(now), to: endOfMonth(now) }
        : range === 'last-30-days'
          ? { from: addDays(now, -30), to: now }
          : null;
    return rowsWithBalance.filter(({ txn }) => {
      if (bounds) {
        const d = parseISO(txn.date);
        if (d < bounds.from || d > bounds.to) return false;
      }
      if (status !== 'all' && txn.status !== status) return false;
      return true;
    });
  }, [rowsWithBalance, range, status]);

  const selectedTxn = useMemo(
    () => allTxns?.find((t) => t.id === selectedTxnId) ?? null,
    [allTxns, selectedTxnId],
  );

  const hotkeyOpts = { enableOnFormTags: false, preventDefault: true } as const;

  useHotkeys(
    'j',
    () => {
      if (!filtered || filtered.length === 0) return;
      const ids = filtered.map((r) => r.txn.id);
      const i = selectedTxnId ? ids.indexOf(selectedTxnId) : -1;
      const next = ids[Math.min(ids.length - 1, i + 1)] ?? ids[0];
      setSelectedTxnId(next);
    },
    hotkeyOpts,
    [filtered, selectedTxnId],
  );

  useHotkeys(
    'k',
    () => {
      if (!filtered || filtered.length === 0) return;
      const ids = filtered.map((r) => r.txn.id);
      const i = selectedTxnId ? ids.indexOf(selectedTxnId) : ids.length;
      const prev = ids[Math.max(0, i - 1)] ?? ids[0];
      setSelectedTxnId(prev);
    },
    hotkeyOpts,
    [filtered, selectedTxnId],
  );

  useHotkeys(
    'escape',
    () => {
      if (selectedTxnId) setSelectedTxnId(null);
    },
    hotkeyOpts,
    [selectedTxnId],
  );

  useHotkeys(
    'e',
    () => {
      if (!selectedTxnId) return;
      navigate(`/transactions/${selectedTxnId}/edit`);
    },
    hotkeyOpts,
    [selectedTxnId, navigate],
  );

  const handleDelete = useCallback(
    async (t: Transaction) => {
      try {
        await deleteTransaction(t.id);
        if (selectedTxnId === t.id) setSelectedTxnId(null);
        haptics.confirm();
        toast.withUndo('Transaction deleted', {
          label: 'Undo',
          onUndo: async () => {
            await createTransaction({
              date: t.date,
              outflow: t.outflow,
              inflow: t.inflow,
              categoryId: t.categoryId,
              accountId: t.accountId,
              memo: t.memo,
              status: t.status,
            });
          },
        });
      } catch (err) {
        console.error(err);
        haptics.error();
        toast.error('Delete failed');
      }
    },
    [selectedTxnId],
  );

  useHotkeys(
    'delete, backspace',
    () => {
      if (!selectedTxnId) return;
      const t = filtered?.find((r) => r.txn.id === selectedTxnId)?.txn;
      if (!t) return;
      void handleDelete(t);
    },
    hotkeyOpts,
    [selectedTxnId, filtered, handleDelete],
  );

  if (!id) return <Navigate to="/accounts" replace />;

  const loading = account === undefined || allTxns === undefined;

  if (!loading && account === null) {
    return <Navigate to="/accounts" replace />;
  }

  const settled =
    account && allTxns ? accountSettledBalance(account.id, allTxns) : 0;
  const pending =
    account && allTxns ? accountPendingBalance(account.id, allTxns) : 0;

  return (
    <div className="mx-auto w-full px-4 py-4 lg:max-w-6xl">
      <PageHeader
        title={account?.name ?? 'Account'}
        backTo="/accounts"
        action={
          <div className="flex items-center gap-2">
            {(account?.accountCategory === 'cash' ||
              account?.accountCategory === 'credit') && (
              <button
                type="button"
                onClick={() => setReconcileOpen(true)}
                className="flex h-9 items-center gap-1 rounded-lg border border-[color:var(--color-border)] px-3 text-sm font-semibold text-[color:var(--color-fg)] active:bg-[color:var(--color-surface-2)]"
              >
                Reconcile
              </button>
            )}
            <Link
              to={`/transactions/new?account=${id}`}
              className="flex h-9 items-center gap-1 rounded-lg bg-[color:var(--color-brand-600)] px-3 text-sm font-semibold text-white active:bg-[color:var(--color-brand-700)]"
            >
              <span>Add</span>
            </Link>
          </div>
        }
      />

      {loading || !account ? (
        <SkeletonRows count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="sticky top-0 z-10 -mx-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/95 px-4 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-bg)]/80 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-0">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-surface-2)]">
                      {account.accountCategory === 'credit' ? (
                        <CreditCard
                          size={14}
                          strokeWidth={1.75}
                          className="text-[color:var(--color-fg-muted)]"
                        />
                      ) : (
                        <Landmark
                          size={14}
                          strokeWidth={1.75}
                          className="text-[color:var(--color-fg-muted)]"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                      {account.accountCategory === 'credit'
                        ? 'Credit'
                        : account.accountCategory === 'loan'
                          ? 'Loan'
                          : account.accountCategory === 'tracking'
                            ? 'Tracking'
                            : 'Cash'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <AmountDisplay
                      value={settled}
                      tone={settled < 0 ? 'negative' : 'neutral'}
                      size="lg"
                      animate
                    />
                  </div>
                  {pending !== 0 && (
                    <div className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
                      Pending{' '}
                      <span className="font-mono tabular-nums">
                        {pending > 0
                          ? `+${formatMoney(pending)}`
                          : `-${formatMoney(-pending)}`}
                      </span>
                    </div>
                  )}
                </div>
                <Suspense fallback={<div className="h-12 w-24" />}>
                  <AccountSparkline
                    accountId={account.id}
                    txns={allTxns}
                    days={7}
                  />
                </Suspense>
              </div>

              <RegisterFilters
                range={range}
                onRangeChange={setRange}
                status={status}
                onStatusChange={setStatus}
              />
              {undoableReconcile && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-[color:var(--color-brand-700)] hover:underline"
                    onClick={async () => {
                      const ok = await undoReconcile(undoableReconcile.id);
                      if (ok) toast.success('Reconcile undone.');
                      else toast.error('Undo window has expired.');
                    }}
                  >
                    Undo reconcile
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3">
              {filtered === undefined ? (
                <SkeletonRows count={4} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  kind={rowsWithBalance?.length ? 'search' : 'receipt'}
                  title={
                    rowsWithBalance?.length
                      ? 'No matches'
                      : 'No transactions yet'
                  }
                  description={
                    rowsWithBalance?.length
                      ? 'Try adjusting your filters.'
                      : 'Record your first transaction on this account.'
                  }
                  action={
                    rowsWithBalance?.length ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setRange('all');
                          setStatus('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Link to={`/transactions/new?account=${id}`}>
                        <Button size="sm">New transaction</Button>
                      </Link>
                    )
                  }
                />
              ) : (
                <ul className="divide-y divide-[color:var(--color-border)] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                  <AnimatePresence initial={false}>
                    {filtered.map(({ txn, balance }) => {
                      const label =
                        account.accountCategory === 'loan' ||
                        account.accountCategory === 'tracking'
                          ? '—'
                          : categoryLabel(txn, categories);
                      const selected = selectedTxnId === txn.id;
                      return (
                        <motion.li
                          key={txn.id}
                          layout={!reduced}
                          initial={reduced ? false : { opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0, transition: spring.snappy }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -80, transition: { duration: 0.18 } }}
                        >
                          <SwipeRow onDelete={() => handleDelete(txn)}>
                            <RegisterRow
                              txn={txn}
                              balance={balance}
                              label={label}
                              selected={selected}
                              onSelect={() => setSelectedTxnId(txn.id)}
                            />
                          </SwipeRow>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              {selectedTxn ? (
                <TransactionInlineEditor
                  key={selectedTxn.id}
                  txn={selectedTxn}
                  onDone={() => setSelectedTxnId(null)}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-center text-sm text-[color:var(--color-fg-muted)]">
                  Select a transaction to edit
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      {account && (
        <ReconcileModal
          open={reconcileOpen}
          onOpenChange={setReconcileOpen}
          accountId={account.id}
          clearedBalance={settled}
        />
      )}
    </div>
  );
}

interface RegisterRowProps {
  txn: Transaction;
  balance: number;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function RegisterRow({ txn, balance, label, selected, onSelect }: RegisterRowProps) {
  return (
    <>
      {/* Desktop: button that selects for inline edit */}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'hidden w-full items-center justify-between gap-3 px-4 py-3 text-left lg:flex',
          selected && 'bg-[color:var(--color-brand-600)]/5',
        )}
      >
        <RowBody txn={txn} balance={balance} label={label} />
      </button>
      {/* Mobile/tablet: link to edit page */}
      <Link
        to={`/transactions/${txn.id}/edit`}
        className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden"
      >
        <RowBody txn={txn} balance={balance} label={label} />
      </Link>
    </>
  );
}

function RowBody({
  txn,
  balance,
  label,
}: {
  txn: Transaction;
  balance: number;
  label: string;
}) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-[color:var(--color-fg)]">
          {label}
        </div>
        <div className="truncate text-xs text-[color:var(--color-fg-muted)]">
          {formatShortDate(txn.date)}
          {txn.memo && <span> · {txn.memo}</span>}
          {txn.status !== 'cleared' && <StatusPill status={txn.status} />}
        </div>
      </div>
      <div className="text-right">
        {txn.inflow > 0 ? (
          <AmountDisplay
            value={txn.inflow}
            tone="positive"
            size="sm"
            aria-label={`Inflow ${formatMoney(txn.inflow)}`}
          />
        ) : (
          <AmountDisplay
            value={-txn.outflow}
            tone="neutral"
            size="sm"
            aria-label={`Outflow ${formatMoney(txn.outflow)}`}
          />
        )}
        <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[color:var(--color-fg-subtle)]">
          {formatMoney(balance)}
        </div>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: Transaction['status'] }) {
  const tone =
    status === 'pending'
      ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]'
      : 'bg-[color:var(--color-positive-bg)] text-[color:var(--color-positive)]';
  const label = status === 'pending' ? 'Pending' : 'Reconciled';
  return (
    <span
      className={cn(
        'ml-1 inline-flex h-4 items-center rounded px-1 text-[10px] font-semibold uppercase tracking-wider',
        tone,
      )}
    >
      {label}
    </span>
  );
}

function categoryLabel(
  t: Transaction,
  categories: ReturnType<typeof useCategories>,
): string {
  if (t.categoryId === AVAILABLE_TO_BUDGET) return 'Available to Budget';
  if (t.categoryId === 'off_budget') return 'Off-budget balance';
  return categories?.find((c) => c.id === t.categoryId)?.name ?? 'Unknown';
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
