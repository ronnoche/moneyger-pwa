import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AmountDisplay } from '@/components/ui/amount-display';
import { AutoAssignPanel } from '@/components/budget/auto-assign-panel';
import { CategoryInspector } from '@/components/budget/category-inspector';
import {
  categoryActivityForMonth,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { duration } from '@/styles/motion';
import type { Category, Transaction, Transfer } from '@/db/schema';

interface Props {
  categories: Category[];
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
  selectedId: string | null;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onCloseInspector: () => void;
}

type Mode = 'single' | 'multi' | 'none';

export function BudgetInspector({
  categories,
  txns,
  tfrs,
  viewMonth,
  selectedId,
  selectedIds,
  onClearSelection,
  onCloseInspector,
}: Props) {
  const reduced = useReducedMotion();
  const selectedCat = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId],
  );

  const mode: Mode = selectedIds.size > 0
    ? 'multi'
    : selectedCat
      ? 'single'
      : 'none';

  return (
    <aside
      aria-label="Inspector"
      className="safe-pr sticky top-0 hidden h-dvh w-80 shrink-0 border-l border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 lg:block xl:w-[360px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: duration.base }}
          className="h-full overflow-y-auto"
        >
          {mode === 'single' && selectedCat ? (
            <CategoryInspector
              cat={selectedCat}
              txns={txns}
              tfrs={tfrs}
              viewMonth={viewMonth}
              onClose={onCloseInspector}
              embedded
            />
          ) : mode === 'multi' ? (
            <MultiPanel
              count={selectedIds.size}
              ids={Array.from(selectedIds)}
              viewMonth={viewMonth}
              onClear={onClearSelection}
            />
          ) : (
            <DefaultPanel
              categories={categories}
              txns={txns}
              tfrs={tfrs}
              viewMonth={viewMonth}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

function DefaultPanel({
  categories,
  txns,
  tfrs,
  viewMonth,
}: {
  categories: Category[];
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
}) {
  const totals = useMemo(() => {
    let budgeted = 0;
    let activity = 0;
    for (const c of categories) {
      if (c.isArchived) continue;
      budgeted += categoryBudgetedForMonth(c.id, viewMonth, tfrs);
      activity += categoryActivityForMonth(c.id, viewMonth, txns);
    }
    const leftOver = 0; // placeholder; combined roll-forward lives in ATB math already
    return { leftOver, budgeted, activity };
  }, [categories, txns, tfrs, viewMonth]);

  return (
    <div className="space-y-4">
      <AutoAssignPanel viewedMonth={viewMonth} heading="Auto-Assign" />
      <section className="space-y-2">
        <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Available in {formatMonth(viewMonth)}
        </h3>
        <dl className="space-y-1.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 text-sm">
          <SummaryRow label="Left Over From Last Month" value={totals.leftOver} />
          <SummaryRow label="Assigned in Month" value={totals.budgeted} />
          <SummaryRow label="Activity" value={-totals.activity} />
        </dl>
      </section>
    </div>
  );
}

function MultiPanel({
  count,
  ids,
  viewMonth,
  onClear,
}: {
  count: number;
  ids: string[];
  viewMonth: Date;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-[color:var(--color-brand-50)] px-3 py-2">
        <span className="text-sm font-medium text-[color:var(--color-brand-700)]">
          {count} categories selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-brand-700)] hover:underline"
        >
          Clear
        </button>
      </div>
      <AutoAssignPanel
        viewedMonth={viewMonth}
        scopedCategoryIds={ids}
        heading="Auto-Assign to selected"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[color:var(--color-fg-muted)]">{label}</dt>
      <dd className="tabular-nums text-[color:var(--color-fg)]">
        <AmountDisplay value={value} tone="neutral" size="sm" />
      </dd>
    </div>
  );
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
