import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type FocusEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { format, isSameMonth, startOfMonth } from 'date-fns';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Archive, ArrowRightLeft, Pencil, Plus, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { AmountDisplay } from '@/components/ui/amount-display';
import { AvailablePill } from '@/components/budget/available-pill';
import {
  AVAILABLE_TO_BUDGET,
  categoryActivityForMonth,
  categoryAvailable,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { goalStatus, normalizeGoal } from '@/lib/goals';
import { createTransfer } from '@/features/transfers/repo';
import { archiveCategory, updateCategory } from '@/features/categories/repo';
import { cn } from '@/lib/cn';
import type { Category, Transaction, Transfer } from '@/db/schema';

interface Props {
  cat: Category;
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
  selected: boolean;
  onToggleSelected: (id: string, next: boolean) => void;
  onOpenDetail: (id: string) => void;
}

export function CategoryTableRow({
  cat,
  txns,
  tfrs,
  viewMonth,
  selected,
  onToggleSelected,
  onOpenDetail,
}: Props) {
  const navigate = useNavigate();
  const avail = categoryAvailable(cat.id, txns, tfrs);
  const budgeted = categoryBudgetedForMonth(cat.id, viewMonth, tfrs);
  const activity = categoryActivityForMonth(cat.id, viewMonth, txns);
  const goal = normalizeGoal(cat);
  const status = goalStatus(goal, avail, budgeted, viewMonth);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          className={cn(
            'group grid w-full grid-cols-[32px_1fr_140px_140px_140px] items-center gap-2 px-3 py-1.5 text-sm',
            selected && 'bg-[color:var(--color-brand-50)]',
          )}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label={`Select ${cat.name}`}
              checked={selected}
              onChange={(e) => onToggleSelected(cat.id, e.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--color-border-strong)] text-[color:var(--color-brand-600)] accent-[color:var(--color-brand-600)]"
            />
          </div>

          <NameCell cat={cat} />

          <AssignedCell
            cat={cat}
            budgeted={budgeted}
            viewMonth={viewMonth}
            status={status}
          />

          <button
            type="button"
            className="w-full text-right text-[color:var(--color-fg-muted)] tabular-nums hover:text-[color:var(--color-fg)]"
            onClick={() =>
              navigate(`/transactions?category=${encodeURIComponent(cat.id)}`)
            }
            aria-label={`View transactions for ${cat.name}`}
          >
            <AmountDisplay value={-activity} tone="neutral" size="sm" />
          </button>

          <div className="flex justify-end">
            <AvailablePill
              value={avail}
              status={status}
              animate
              onClick={() => onOpenDetail(cat.id)}
              aria-label={`Open ${cat.name} detail`}
            />
          </div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-52 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-lg)]">
          <MenuItem
            icon={<Pencil size={14} strokeWidth={1.75} />}
            onSelect={() => onOpenDetail(cat.id)}
          >
            Edit category
          </MenuItem>
          <MenuItem
            icon={<ArrowRightLeft size={14} strokeWidth={1.75} />}
            onSelect={() =>
              navigate(`/budget?from=${encodeURIComponent(cat.id)}`)
            }
          >
            Move money from
          </MenuItem>
          <MenuItem
            icon={<ArrowRightLeft size={14} strokeWidth={1.75} />}
            onSelect={() =>
              navigate(`/budget?to=${encodeURIComponent(cat.id)}`)
            }
          >
            Move money to
          </MenuItem>
          <MenuItem
            icon={<Receipt size={14} strokeWidth={1.75} />}
            onSelect={() =>
              navigate(`/transactions?category=${encodeURIComponent(cat.id)}`)
            }
          >
            View activity
          </MenuItem>
          <MenuItem
            icon={<Plus size={14} strokeWidth={1.75} />}
            onSelect={() =>
              navigate(`/transactions/new?category=${encodeURIComponent(cat.id)}`)
            }
          >
            New transaction
          </MenuItem>
          <ContextMenu.Separator className="my-1 h-px bg-[color:var(--color-border)]" />
          <MenuItem
            icon={<Archive size={14} strokeWidth={1.75} />}
            onSelect={async () => {
              try {
                await archiveCategory(cat.id);
                toast.success(`Archived ${cat.name}`);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Archive failed',
                );
              }
            }}
          >
            Archive
          </MenuItem>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function NameCell({ cat }: { cat: Category }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cat.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(cat.name);
    setEditing(true);
  }

  async function commit() {
    const next = draft.trim();
    if (!next || next === cat.name) {
      setDraft(cat.name);
      setEditing(false);
      return;
    }
    try {
      await updateCategory(cat.id, { name: next });
      toast.success(`Renamed to ${next}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed');
      setDraft(cat.name);
    } finally {
      setEditing(false);
    }
  }

  function cancel() {
    setDraft(cat.name);
    setEditing(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => void commit()}
        className="h-7 w-full rounded-md border border-[color:var(--color-brand-600)] bg-[color:var(--color-bg)] px-1 text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="truncate pl-6 text-left text-sm font-medium text-[color:var(--color-fg)] hover:underline"
      title={`Rename ${cat.name}`}
    >
      {cat.name}
    </button>
  );
}

interface AssignedCellProps {
  cat: Category;
  budgeted: number;
  viewMonth: Date;
  status: ReturnType<typeof goalStatus>;
}

function AssignedCell({ cat, budgeted, viewMonth, status }: AssignedCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(budgeted.toFixed(2));
    setEditing(true);
  }

  async function commit() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      toast.error('Invalid number');
      cancel();
      return;
    }
    const delta = Math.round((parsed - budgeted) * 100) / 100;
    if (Math.abs(delta) < 0.005) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const date = resolveTransferDate(viewMonth);
      if (delta > 0) {
        await createTransfer({
          date,
          amount: delta,
          fromCategoryId: AVAILABLE_TO_BUDGET,
          toCategoryId: cat.id,
          memo: 'Inline budget edit',
        });
      } else {
        await createTransfer({
          date,
          amount: Math.abs(delta),
          fromCategoryId: cat.id,
          toCategoryId: AVAILABLE_TO_BUDGET,
          memo: 'Inline budget edit',
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  function cancel() {
    setEditing(false);
    setDraft('');
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  function handleBlur(_: FocusEvent<HTMLInputElement>) {
    if (!busy) void commit();
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={handleBlur}
        inputMode="decimal"
        className="h-7 w-full rounded-md border border-[color:var(--color-brand-600)] bg-[color:var(--color-bg)] px-1 text-right text-sm tabular-nums outline-none"
      />
    );
  }

  const funded = status === 'on_track' || status === 'funded';

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group/assigned relative w-full text-right text-sm tabular-nums text-[color:var(--color-fg)] hover:text-[color:var(--color-brand-700)]"
      aria-label={`Edit budgeted for ${cat.name}`}
    >
      <AmountDisplay
        value={budgeted}
        tone="neutral"
        size="sm"
        animate
        className="!text-[color:inherit]"
      />
      {funded && (
        <span
          aria-hidden
          title="Funded for this month"
          className="ml-1 inline-block align-middle text-[color:var(--color-positive)] opacity-0 group-hover/assigned:opacity-100"
        >
          •
        </span>
      )}
    </button>
  );
}

function resolveTransferDate(viewMonth: Date): string {
  const today = new Date();
  if (isSameMonth(today, viewMonth)) {
    return format(today, 'yyyy-MM-dd');
  }
  return format(startOfMonth(viewMonth), 'yyyy-MM-dd');
}

interface MenuItemProps {
  onSelect: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function MenuItem({ onSelect, icon, children }: MenuItemProps) {
  return (
    <ContextMenu.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--color-fg)] outline-none data-[highlighted]:bg-[color:var(--color-surface-2)]"
    >
      <span className="text-[color:var(--color-fg-muted)]">{icon}</span>
      {children}
    </ContextMenu.Item>
  );
}
