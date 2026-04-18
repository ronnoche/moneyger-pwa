import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Plus, Filter, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spring } from '@/styles/motion';
import {
  addDays,
  endOfMonth,
  endOfYear,
  parseISO,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import {
  useAccounts,
  useCategories,
  useTransactions,
} from '@/db/hooks';
import {
  createTransaction,
  deleteTransaction,
} from '@/features/transactions/repo';
import { PageHeader } from '@/components/layout/page-header';
import { SwipeRow } from '@/components/swipe-row';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SkeletonRows } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import { haptics } from '@/lib/haptics';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { MonthSpentCard } from '@/components/transactions/month-spent-card';
import { TransactionFilterSheet } from '@/components/transactions/transaction-filter-sheet';
import {
  emptyFilterValue,
  type TransactionFilterValue,
} from '@/components/transactions/transaction-filter-types';
import { ActiveFilterChips } from '@/components/transactions/active-filter-chips';
import type { Transaction } from '@/db/schema';

export default function TransactionsList() {
  const txns = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const reduced = useReducedMotion();
  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const initialCategory = params.get('category') ?? '';
  const [filters, setFilters] = useState<TransactionFilterValue>({
    ...emptyFilterValue,
    categoryId: initialCategory,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), 250);

  const filtered = useMemo(() => {
    if (!txns) return undefined;
    const range = resolveDateRange(filters);
    return txns.filter((t) => {
      if (filters.accountId && t.accountId !== filters.accountId) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (range) {
        const d = parseISO(t.date);
        if (d < range.from || d > range.to) return false;
      }
      if (debouncedSearch) {
        const hay = searchHaystack(t, accounts, categories);
        if (!hay.includes(debouncedSearch)) return false;
      }
      return true;
    });
  }, [txns, filters, debouncedSearch, accounts, categories]);

  const monthSums = useMemo(() => {
    if (!filtered) return { outflow: 0, inflow: 0 };
    const today = new Date();
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    let outflow = 0;
    let inflow = 0;
    for (const t of filtered) {
      const d = parseISO(t.date);
      if (d < from || d > to) continue;
      outflow += t.outflow;
      inflow += t.inflow;
    }
    return { outflow, inflow };
  }, [filtered]);

  const chips = useMemo(
    () => buildActiveChips(filters, accounts ?? [], categories ?? [], setFilters),
    [filters, accounts, categories],
  );

  const grouped = useMemo(() => groupByDate(filtered ?? []), [filtered]);
  const loading = filtered === undefined;

  const handleDelete = useCallback(async (t: Transaction) => {
    try {
      await deleteTransaction(t.id);
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
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-4 space-y-3 lg:max-w-3xl lg:py-6">
      <PageHeader
        title="Transactions"
        action={
          <Link
            to="/transactions/new"
            className="flex h-9 items-center gap-1 rounded-lg bg-[color:var(--color-brand-600)] px-3 text-sm font-semibold text-white active:bg-[color:var(--color-brand-700)]"
          >
            <Plus size={16} strokeWidth={1.75} />
            <span>New</span>
          </Link>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-fg-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payee, memo, amount"
            className="h-10 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-9 pr-3 text-sm focus:border-[color:var(--color-brand-600)] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label="Filter transactions"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
            chips.length > 0
              ? 'border-[color:var(--color-brand-600)] text-[color:var(--color-brand-700)] bg-[color:var(--color-positive-bg)]'
              : 'border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] bg-[color:var(--color-surface)]',
          )}
        >
          <Filter size={16} strokeWidth={1.75} />
        </button>
      </div>

      {chips.length > 0 && (
        <ActiveFilterChips
          chips={chips}
          onClearAll={() => setFilters(emptyFilterValue)}
        />
      )}

      <MonthSpentCard
        label="This month"
        outflow={monthSums.outflow}
        inflow={monthSums.inflow}
      />

      {loading ? (
        <SkeletonRows count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          kind={chips.length || debouncedSearch ? 'search' : 'receipt'}
          title={
            chips.length || debouncedSearch
              ? 'No matches'
              : 'No transactions yet'
          }
          description={
            chips.length || debouncedSearch
              ? 'Try clearing filters or adjusting your search.'
              : 'Record your first transaction to see it here.'
          }
          action={
            chips.length || debouncedSearch ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilters(emptyFilterValue);
                  setSearch('');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Link to="/transactions/new">
                <Button size="sm">New transaction</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, list]) => (
            <div key={date}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {formatDateHeader(date)}
              </h2>
              <ul className="divide-y divide-[color:var(--color-border)] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                <AnimatePresence initial={false}>
                {list.map((t) => (
                  <motion.li
                    key={t.id}
                    layout={!reduced}
                    initial={reduced ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0, transition: spring.snappy }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: -80, transition: { duration: 0.18 } }}
                  >
                    <SwipeRow onDelete={() => handleDelete(t)}>
                      <Link
                        to={`/transactions/${t.id}/edit`}
                        className="flex items-center gap-3 px-4 py-3 lg:min-h-14 lg:py-3.5"
                      >
                        <div className="min-w-0 flex-1 lg:flex-none lg:basis-60">
                          <div className="truncate text-sm text-[color:var(--color-fg)]">
                            {labelFor(t, categories)}
                          </div>
                          <div className="truncate text-xs text-[color:var(--color-fg-muted)] lg:hidden">
                            {accountName(t.accountId, accounts) || '-'}
                            {t.memo && <span> · {t.memo}</span>}
                            {t.status === 'pending' && (
                              <span className="ml-1 rounded bg-[color:var(--color-warning-bg)] px-1 text-[10px] text-[color:var(--color-warning)]">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hidden min-w-0 flex-1 text-xs text-[color:var(--color-fg-muted)] lg:block">
                          <span className="truncate">
                            {t.memo || (
                              <span className="text-[color:var(--color-fg-subtle)]">
                                No memo
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="hidden w-32 truncate text-xs text-[color:var(--color-fg-muted)] lg:block">
                          {accountName(t.accountId, accounts) || '-'}
                        </div>
                        <div className="hidden w-16 text-xs text-[color:var(--color-fg-muted)] lg:block">
                          {t.status === 'pending' ? (
                            <span className="rounded bg-[color:var(--color-warning-bg)] px-1 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--color-warning)]">
                              Pending
                            </span>
                          ) : t.status === 'reconciled' ? (
                            <span className="rounded bg-[color:var(--color-positive-bg)] px-1 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--color-positive)]">
                              Rec.
                            </span>
                          ) : null}
                        </div>
                        <div className="ml-3 shrink-0 text-sm tabular-nums">
                          {t.inflow > 0 ? (
                            <span className="text-[color:var(--color-positive)]">
                              +
                              <AmountDisplay
                                value={t.inflow}
                                tone="positive"
                                size="sm"
                                className="inline"
                              />
                            </span>
                          ) : (
                            <span className="text-[color:var(--color-fg)]">
                              -
                              <AmountDisplay
                                value={t.outflow}
                                tone="neutral"
                                size="sm"
                                className="inline"
                              />
                            </span>
                          )}
                        </div>
                      </Link>
                    </SwipeRow>
                  </motion.li>
                ))}
                </AnimatePresence>
              </ul>
            </div>
          ))}
        </div>
      )}

      <TransactionFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={filters}
        onChange={setFilters}
      />
    </div>
  );
}

function resolveDateRange(
  filters: TransactionFilterValue,
): { from: Date; to: Date } | null {
  const now = new Date();
  switch (filters.dateRange) {
    case 'all':
      return null;
    case 'this-month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last-30-days':
      return { from: addDays(now, -30), to: now };
    case 'this-year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'custom': {
      if (!filters.from && !filters.to) return null;
      const from = filters.from ? parseISO(filters.from) : new Date(0);
      const to = filters.to ? parseISO(filters.to) : new Date(8640000000000000);
      return { from, to };
    }
  }
}

function buildActiveChips(
  f: TransactionFilterValue,
  accounts: { id: string; name: string }[],
  categories: { id: string; name: string }[],
  setFilters: (next: TransactionFilterValue) => void,
) {
  const chips: { id: string; label: string; onRemove: () => void }[] = [];
  if (f.accountId) {
    const a = accounts.find((x) => x.id === f.accountId);
    chips.push({
      id: 'account',
      label: `Account: ${a?.name ?? 'Unknown'}`,
      onRemove: () => setFilters({ ...f, accountId: '' }),
    });
  }
  if (f.categoryId) {
    const label =
      f.categoryId === AVAILABLE_TO_BUDGET
        ? 'Available to Budget'
        : (categories.find((c) => c.id === f.categoryId)?.name ?? 'Unknown');
    chips.push({
      id: 'category',
      label: `Category: ${label}`,
      onRemove: () => setFilters({ ...f, categoryId: '' }),
    });
  }
  if (f.dateRange && f.dateRange !== 'all') {
    const label =
      f.dateRange === 'custom'
        ? `${f.from || '...'} - ${f.to || '...'}`
        : f.dateRange === 'this-month'
          ? 'This month'
          : f.dateRange === 'last-30-days'
            ? 'Last 30 days'
            : 'This year';
    chips.push({
      id: 'date',
      label,
      onRemove: () =>
        setFilters({ ...f, dateRange: 'all', from: '', to: '' }),
    });
  }
  return chips;
}

function searchHaystack(
  t: Transaction,
  accounts: ReturnType<typeof useAccounts>,
  categories: ReturnType<typeof useCategories>,
): string {
  const acct = accounts?.find((a) => a.id === t.accountId)?.name ?? '';
  const cat =
    t.categoryId === AVAILABLE_TO_BUDGET
      ? 'available to budget'
      : (categories?.find((c) => c.id === t.categoryId)?.name ?? '');
  const amount = (t.inflow > 0 ? t.inflow : t.outflow).toFixed(2);
  return `${acct} ${cat} ${t.memo} ${amount}`.toLowerCase();
}

function groupByDate(txns: Transaction[]): Array<[string, Transaction[]]> {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const list = map.get(t.date) ?? [];
    list.push(t);
    map.set(t.date, list);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function formatDateHeader(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function labelFor(
  t: Transaction,
  categories: ReturnType<typeof useCategories>,
): string {
  if (t.categoryId === AVAILABLE_TO_BUDGET) return 'Available to Budget';
  const cat = categories?.find((c) => c.id === t.categoryId);
  return cat?.name ?? 'Unknown category';
}

function accountName(
  accountId: string,
  accounts: ReturnType<typeof useAccounts>,
): string | null {
  return accounts?.find((a) => a.id === accountId)?.name ?? null;
}
