import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { startOfMonth } from 'date-fns';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spring } from '@/styles/motion';
import {
  useCategories,
  useGroups,
  useTransactions,
  useTransfers,
} from '@/db/hooks';
import {
  categoryAvailable,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { goalStatus, normalizeGoal } from '@/lib/goals';
import { Sheet } from '@/components/ui/sheet';
import { MonthNav } from '@/components/month-nav';
import { Button } from '@/components/ui/button';
import { MonthSummary } from '@/components/dashboard/month-summary';
import { CategoryRow } from '@/components/dashboard/category-row';
import { SkeletonRows } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ReadyToAssignPill } from '@/components/budget/ready-to-assign-pill';
import {
  FilterChips,
  type BudgetFilterId,
} from '@/components/budget/filter-chips';
import { BudgetToolbar } from '@/components/budget/budget-toolbar';
import { BulkActionsBar } from '@/components/budget/bulk-actions-bar';
import { CategoryTable } from '@/components/budget/category-table';
import { BudgetInspector } from '@/components/budget/budget-inspector';
import { CategoryInspector } from '@/components/budget/category-inspector';
import { useBudgetViewMode } from '@/hooks/use-budget-view-mode';
import { useLargeScreen } from '@/hooks/use-large-screen';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

export default function Dashboard() {
  const navigate = useNavigate();
  const groups = useGroups();
  const categories = useCategories();
  const txns = useTransactions();
  const tfrs = useTransfers();
  const reduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [filter, setFilter] = useState<BudgetFilterId>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useBudgetViewMode();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const toggleSelected = (id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const toggleGroupSelected = (ids: string[], next: boolean) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      for (const id of ids) {
        if (next) copy.add(id);
        else copy.delete(id);
      }
      return copy;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const isLg = useLargeScreen();

  const loading = !groups || !categories || !txns || !tfrs;

  const filterMatches = useMemo(() => {
    if (!categories || !txns || !tfrs) return new Set<string>();
    const ids = new Set<string>();
    const q = search.trim().toLowerCase();
    for (const cat of categories) {
      if (cat.isArchived) continue;
      if (q && !cat.name.toLowerCase().includes(q)) continue;
      const avail = categoryAvailable(cat.id, txns, tfrs);
      const budgeted = categoryBudgetedForMonth(cat.id, viewMonth, tfrs);
      const goal = normalizeGoal(cat);
      const status = goalStatus(goal, avail, budgeted, viewMonth);

      let pass: boolean;
      switch (filter) {
        case 'underfunded':
          pass = status === 'underfunded';
          break;
        case 'overfunded':
          pass = status === 'overfunded';
          break;
        case 'money_available':
          pass = avail > 0.005;
          break;
        default:
          pass = true;
      }
      if (pass) ids.add(cat.id);
    }
    return ids;
  }, [categories, txns, tfrs, viewMonth, filter, search]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-4">
        <SkeletonRows count={6} />
      </div>
    );
  }

  const selected = categories.find((c) => c.id === selectedId) ?? null;
  const filterActive = filter !== 'all' || search.trim().length > 0;

  return (
    <div className="lg:flex lg:items-start">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-4 lg:max-w-4xl lg:flex-1 lg:py-6 lg:pr-6">
      <MonthNav month={viewMonth} onChange={setViewMonth} />

      <div className="flex justify-center">
        <ReadyToAssignPill viewedMonth={viewMonth} />
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <BudgetToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateGroup={() => navigate('/settings/groups')}
      />

      <div className="lg:hidden">
        <MonthSummary month={viewMonth} txns={txns} tfrs={tfrs} />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          kind="envelopes"
          title="No groups yet"
          description="Bundle related bucket lists together. Monthly Bills, Savings, Fun Money."
          action={
            <Link to="/settings/groups">
              <Button size="sm">Create a group</Button>
            </Link>
          }
        />
      ) : (
        <>
          {viewMode === 'list' && (
            <div className="hidden lg:block">
              <CategoryTable
                groups={groups}
                categories={categories}
                txns={txns}
                tfrs={tfrs}
                viewMonth={viewMonth}
                filterMatches={filterMatches}
                filterActive={filterActive}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
                onToggleGroup={toggleGroupSelected}
                onOpenDetail={(id) => setSelectedId(id)}
              />
            </div>
          )}

          <ul
            className={cn(
              'space-y-4',
              viewMode === 'list' && 'lg:hidden',
            )}
          >
            {groups.map((group) => {
            const inGroup = categories
              .filter((c) => c.groupId === group.id && !c.isArchived)
              .filter((c) => filterMatches.has(c.id));

            if (filterActive && inGroup.length === 0) {
              return null;
            }

            return (
              <li key={group.id}>
                <div className="mb-2 flex items-end justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                    {group.name}
                  </h2>
                  <div className="hidden items-end gap-0 lg:flex">
                    <span className="w-24 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                      Budgeted
                    </span>
                    <span className="w-24 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                      Activity
                    </span>
                    <span className="w-28 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                      Available
                    </span>
                  </div>
                </div>
                {inGroup.length === 0 ? (
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-xs text-[color:var(--color-fg-muted)]">
                    {filterActive
                      ? 'No bucket lists match this filter.'
                      : 'No bucket lists in this bucket yet.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-[color:var(--color-border)] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                    <AnimatePresence initial={false}>
                      {inGroup.map((cat) => (
                        <motion.li
                          key={cat.id}
                          layout={!reduced}
                          initial={reduced ? false : { opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0, transition: spring.snappy }}
                          exit={
                            reduced
                              ? { opacity: 0 }
                              : {
                                  opacity: 0,
                                  x: -80,
                                  transition: { duration: 0.18 },
                                }
                          }
                        >
                          <CategoryRow
                            cat={cat}
                            txns={txns}
                            tfrs={tfrs}
                            viewMonth={viewMonth}
                            onOpen={() => setSelectedId(cat.id)}
                            onEdit={() => {
                              setSelectedId(null);
                              navigate('/settings/categories');
                            }}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        </>
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        viewedMonth={viewMonth}
        onClear={clearSelection}
        onApplied={clearSelection}
      />

      <FloatingAdd />

      <Sheet
        open={!isLg && selected !== null}
        onOpenChange={(v) => !v && setSelectedId(null)}
        title={selected?.name ?? ''}
      >
        {selected && (
          <CategoryInspector
            cat={selected}
            txns={txns}
            tfrs={tfrs}
            viewMonth={viewMonth}
            onClose={() => setSelectedId(null)}
          />
        )}
      </Sheet>
      </div>
      <BudgetInspector
        categories={categories}
        txns={txns}
        tfrs={tfrs}
        viewMonth={viewMonth}
        selectedId={selectedId}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onCloseInspector={() => setSelectedId(null)}
      />
    </div>
  );
}

function FloatingAdd() {
  const navigate = useNavigate();
  return (
    <motion.button
      type="button"
      onClick={() => {
        haptics.light();
        navigate('/transactions/new');
      }}
      aria-label="New transaction"
      whileTap={{ scale: 0.94 }}
      transition={spring.snappy}
      style={{
        boxShadow: 'var(--shadow-fab)',
      }}
      className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-brand-600)] text-white active:bg-[color:var(--color-brand-700)] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <Plus size={26} strokeWidth={1.75} />
    </motion.button>
  );
}
