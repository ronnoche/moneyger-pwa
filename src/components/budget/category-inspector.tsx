import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { AmountDisplay } from '@/components/ui/amount-display';
import { AvailablePill } from '@/components/budget/available-pill';
import { AutoAssignPanel } from '@/components/budget/auto-assign-panel';
import { GoalBuilder } from '@/components/budget/goal-builder';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { updateCategory } from '@/features/categories/repo';
import {
  categoryActivityForMonth,
  categoryAvailable,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { formatMoney } from '@/lib/format';
import { goalStatus, normalizeGoal } from '@/lib/goals';
import { useBudgetNote } from '@/hooks/use-budget-note';
import { useNeededThisMonth } from '@/hooks/use-needed-this-month';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spring } from '@/styles/motion';
import { cn } from '@/lib/cn';
import type { Category, Transaction, Transfer } from '@/db/schema';

interface Props {
  cat: Category;
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
  onClose?: () => void;
  embedded?: boolean;
}

export function CategoryInspector({
  cat,
  txns,
  tfrs,
  viewMonth,
  onClose,
  embedded = false,
}: Props) {
  const available = categoryAvailable(cat.id, txns, tfrs);
  const budgeted = categoryBudgetedForMonth(cat.id, viewMonth, tfrs);
  const activity = categoryActivityForMonth(cat.id, viewMonth, txns);
  const leftOver = useMemo(
    () => available - budgeted + activity,
    [available, budgeted, activity],
  );

  const goal = normalizeGoal(cat);
  const status = goalStatus(goal, available, budgeted, viewMonth);
  const needed = useNeededThisMonth(cat, viewMonth);

  return (
    <div className="space-y-4">
      <Header cat={cat} onClose={onClose} embedded={embedded} />

      <AvailableSection
        available={available}
        leftOver={leftOver}
        budgeted={budgeted}
        activity={activity}
        status={status}
      />

      <TargetSection
        cat={cat}
        viewMonth={viewMonth}
        currentAvailable={available}
        currentBudgeted={budgeted}
        status={status}
        needed={needed}
      />

      <AutoAssignSection cat={cat} viewMonth={viewMonth} />

      <NotesSection catId={cat.id} />
    </div>
  );
}

function Header({
  cat,
  onClose,
  embedded,
}: {
  cat: Category;
  onClose?: () => void;
  embedded: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cat.name);

  function startEdit() {
    setDraft(cat.name);
    setEditing(true);
  }

  async function commit() {
    const next = draft.trim();
    if (!next || next === cat.name) {
      setEditing(false);
      return;
    }
    try {
      await updateCategory(cat.id, { name: next });
      toast.success(`Renamed to ${next}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setEditing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className={cn(inputClass, 'flex-1 text-lg font-semibold')}
        />
      ) : (
        <h2 className="flex-1 truncate text-lg font-semibold text-[color:var(--color-fg)]">
          {cat.name}
        </h2>
      )}
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Rename ${cat.name}`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)]"
      >
        <Pencil size={14} strokeWidth={1.75} aria-hidden />
      </button>
      {!embedded && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)]"
        >
          <X size={14} strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </div>
  );
}

function AvailableSection({
  available,
  leftOver,
  budgeted,
  activity,
  status,
}: {
  available: number;
  leftOver: number;
  budgeted: number;
  activity: number;
  status: ReturnType<typeof goalStatus>;
}) {
  return (
    <Collapsible title="Available Balance" defaultOpen>
      <div className="flex justify-center py-1">
        <AvailablePill value={available} status={status} size="md" animate />
      </div>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Row label="Cash Left Over From Last Month" value={leftOver} />
        <Row label="Assigned This Month" value={budgeted} />
        <Row label="Activity" value={-activity} />
      </dl>
    </Collapsible>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[color:var(--color-fg-muted)]">{label}</dt>
      <dd className="tabular-nums text-[color:var(--color-fg)]">
        <AmountDisplay value={value} tone="neutral" size="sm" />
      </dd>
    </div>
  );
}

function TargetSection({
  cat,
  viewMonth,
  currentAvailable,
  currentBudgeted,
  status,
  needed,
}: {
  cat: Category;
  viewMonth: Date;
  currentAvailable: number;
  currentBudgeted: number;
  status: ReturnType<typeof goalStatus>;
  needed: number;
}) {
  const hasGoal = cat.goalType !== 'none' && cat.goalAmount > 0;
  const [editing, setEditing] = useState(false);

  return (
    <Collapsible title="Target" defaultOpen={hasGoal}>
      {editing ? (
        <GoalBuilder
          cat={cat}
          viewedMonth={viewMonth}
          currentAvailable={currentAvailable}
          currentBudgeted={currentBudgeted}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : hasGoal ? (
        <TargetSummary
          cat={cat}
          status={status}
          needed={needed}
          currentAvailable={currentAvailable}
          currentBudgeted={currentBudgeted}
          onEdit={() => setEditing(true)}
        />
      ) : (
        <NoGoalPrompt catName={cat.name} onCreate={() => setEditing(true)} />
      )}
    </Collapsible>
  );
}

function TargetSummary({
  cat,
  status,
  needed,
  currentAvailable,
  currentBudgeted,
  onEdit,
}: {
  cat: Category;
  status: ReturnType<typeof goalStatus>;
  needed: number;
  currentAvailable: number;
  currentBudgeted: number;
  onEdit: () => void;
}) {
  const copy = statusCopy(status, needed, cat.goalAmount, currentAvailable);
  const progress = calcProgress(
    cat,
    currentAvailable,
    currentBudgeted,
    needed,
  );
  const color = statusBarColor(status);

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full flex-col gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 text-left hover:border-[color:var(--color-border-strong)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[color:var(--color-fg)]">
            {copy}
          </div>
          <div className="text-[11px] text-[color:var(--color-fg-muted)]">
            Goal of {formatMoney(cat.goalAmount)}
          </div>
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-fg)]"
          aria-hidden
        />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-border)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: color,
          }}
        />
      </div>
    </button>
  );
}

function NoGoalPrompt({
  catName,
  onCreate,
}: {
  catName: string;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[color:var(--color-border)] p-3">
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        How much do you need for {catName}? When you create a goal, we’ll let
        you know how much to set aside.
      </p>
      <Button size="sm" onClick={onCreate}>
        Create Goal
      </Button>
    </div>
  );
}

function AutoAssignSection({
  cat,
  viewMonth,
}: {
  cat: Category;
  viewMonth: Date;
}) {
  return (
    <Collapsible title="Auto-Assign" defaultOpen={false}>
      <AutoAssignPanel
        viewedMonth={viewMonth}
        scopedCategoryIds={[cat.id]}
        heading="Apply to this category"
      />
    </Collapsible>
  );
}

function NotesSection({ catId }: { catId: string }) {
  const [value, setValue] = useBudgetNote(`cat:${catId}`);
  return (
    <Collapsible title="Notes" defaultOpen={false}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter a note..."
        rows={3}
        className={cn(inputClass, 'min-h-[72px] resize-y py-2')}
      />
    </Collapsible>
  );
}

function Collapsible({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
      >
        <span>{title}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          aria-hidden
          className={cn('transition-transform', !open && '-rotate-90')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
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
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function statusCopy(
  status: ReturnType<typeof goalStatus>,
  needed: number,
  goalAmount: number,
  currentAvailable: number,
): string {
  switch (status) {
    case 'underfunded':
      return `Needs ${formatMoney(needed)} this month`;
    case 'on_track':
      return 'Funded for this month';
    case 'funded':
      return 'Fully funded';
    case 'overfunded':
      return `Overfunded by ${formatMoney(Math.max(0, currentAvailable - goalAmount))}`;
    default:
      return 'Goal set';
  }
}

function statusBarColor(status: ReturnType<typeof goalStatus>): string {
  switch (status) {
    case 'overfunded':
      return 'var(--color-warning)';
    case 'on_track':
    case 'funded':
      return 'var(--color-positive)';
    default:
      return 'var(--color-brand-500)';
  }
}

function calcProgress(
  cat: Category,
  currentAvailable: number,
  currentBudgeted: number,
  needed: number,
): number {
  if (cat.goalType === 'target_balance' || cat.goalType === 'none') {
    if (cat.goalAmount <= 0) return 0;
    return clamp01(currentAvailable / cat.goalAmount);
  }
  const denom = needed + currentBudgeted;
  if (denom <= 0) return 1;
  return clamp01((currentBudgeted + currentAvailable) / denom);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
