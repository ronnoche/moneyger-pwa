import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AmountDisplay } from '@/components/ui/amount-display';
import { CategoryTableRow } from '@/components/budget/category-table-row';
import {
  categoryActivityForMonth,
  categoryAvailable,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spring } from '@/styles/motion';
import { cn } from '@/lib/cn';
import type { Category, Group, Transaction, Transfer } from '@/db/schema';

interface Props {
  groups: Group[];
  categories: Category[];
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
  filterMatches: Set<string>;
  filterActive: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (id: string, next: boolean) => void;
  onToggleGroup: (ids: string[], next: boolean) => void;
  onOpenDetail: (id: string) => void;
}

export function CategoryTable({
  groups,
  categories,
  txns,
  tfrs,
  viewMonth,
  filterMatches,
  filterActive,
  selectedIds,
  onToggleSelected,
  onToggleGroup,
  onOpenDetail,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <TableHeader />
      <ul>
        {groups.map((group) => {
          const inGroup = categories
            .filter((c) => c.groupId === group.id && !c.isArchived)
            .filter((c) => filterMatches.has(c.id));
          if (filterActive && inGroup.length === 0) return null;
          return (
            <li key={group.id}>
              <GroupBlock
                group={group}
                cats={inGroup}
                txns={txns}
                tfrs={tfrs}
                viewMonth={viewMonth}
                selectedIds={selectedIds}
                onToggleSelected={onToggleSelected}
                onToggleGroup={onToggleGroup}
                onOpenDetail={onOpenDetail}
                filterActive={filterActive}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[32px_1fr_140px_140px_140px] items-center gap-2 border-b border-[color:var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
      <div />
      <div>Category</div>
      <div className="text-right">Assigned</div>
      <div className="text-right">Activity</div>
      <div className="text-right">Available</div>
    </div>
  );
}

interface GroupBlockProps {
  group: Group;
  cats: Category[];
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
  selectedIds: Set<string>;
  onToggleSelected: (id: string, next: boolean) => void;
  onToggleGroup: (ids: string[], next: boolean) => void;
  onOpenDetail: (id: string) => void;
  filterActive: boolean;
}

function GroupBlock({
  group,
  cats,
  txns,
  tfrs,
  viewMonth,
  selectedIds,
  onToggleSelected,
  onToggleGroup,
  onOpenDetail,
  filterActive,
}: GroupBlockProps) {
  const [open, setOpen] = useState(true);
  const reduced = useReducedMotion();

  const sums = useMemo(() => {
    let budgeted = 0;
    let activity = 0;
    let available = 0;
    for (const c of cats) {
      budgeted += categoryBudgetedForMonth(c.id, viewMonth, tfrs);
      activity += categoryActivityForMonth(c.id, viewMonth, txns);
      available += categoryAvailable(c.id, txns, tfrs);
    }
    return { budgeted, activity, available };
  }, [cats, txns, tfrs, viewMonth]);

  const allIds = cats.map((c) => c.id);
  const selectedInGroup = allIds.filter((id) => selectedIds.has(id)).length;
  const groupChecked =
    allIds.length > 0 && selectedInGroup === allIds.length
      ? true
      : selectedInGroup > 0
        ? 'indeterminate'
        : false;

  return (
    <div className="border-b border-[color:var(--color-border)] last:border-b-0">
      <div
        className={cn(
          'grid w-full grid-cols-[32px_1fr_140px_140px_140px] items-center gap-2 bg-[color:var(--color-surface-2)] px-3 py-2 text-sm font-semibold',
        )}
      >
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label={`Select all in ${group.name}`}
            checked={groupChecked === true}
            ref={(el) => {
              if (el) el.indeterminate = groupChecked === 'indeterminate';
            }}
            onChange={(e) => onToggleGroup(allIds, e.target.checked)}
            disabled={allIds.length === 0}
            className="h-4 w-4 rounded border-[color:var(--color-border-strong)] accent-[color:var(--color-brand-600)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
          ) : (
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden />
          )}
          <span className="uppercase tracking-wide text-[11px] font-semibold text-[color:var(--color-fg-muted)]">
            {group.name}
          </span>
        </button>
        <div className="text-right tabular-nums text-[color:var(--color-fg-muted)]">
          <AmountDisplay value={sums.budgeted} tone="neutral" size="sm" />
        </div>
        <div className="text-right tabular-nums text-[color:var(--color-fg-muted)]">
          <AmountDisplay value={-sums.activity} tone="neutral" size="sm" />
        </div>
        <div className="text-right tabular-nums text-[color:var(--color-fg-muted)]">
          <AmountDisplay value={sums.available} tone="neutral" size="sm" />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            key="body"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={
              reduced
                ? { opacity: 1 }
                : { height: 'auto', opacity: 1, transition: spring.snappy }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { height: 0, opacity: 0, transition: spring.snappy }
            }
            className="overflow-hidden divide-y divide-[color:var(--color-border)]"
          >
            {cats.length === 0 ? (
              <li className="px-4 py-3 text-xs text-[color:var(--color-fg-muted)]">
                {filterActive
                  ? 'No categories match this filter.'
                  : 'No categories in this group yet.'}
              </li>
            ) : (
              cats.map((cat) => (
                <li key={cat.id}>
                  <CategoryTableRow
                    cat={cat}
                    txns={txns}
                    tfrs={tfrs}
                    viewMonth={viewMonth}
                    selected={selectedIds.has(cat.id)}
                    onToggleSelected={onToggleSelected}
                    onOpenDetail={onOpenDetail}
                  />
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
