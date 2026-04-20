import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRightLeft, Pencil, Plus, Receipt } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { motion } from 'motion/react';
import { SwipeRow } from '@/components/swipe-row';
import { AmountDisplay } from '@/components/ui/amount-display';
import { AvailablePill } from '@/components/budget/available-pill';
import {
  categoryActivityForMonth,
  categoryAvailable,
  categoryBudgetedForMonth,
  goalProgress,
} from '@/lib/budget-math';
import { goalStatus, normalizeGoal } from '@/lib/goals';
import type { Category, Transaction, Transfer } from '@/db/schema';
import { cn } from '@/lib/cn';
import { duration, ease } from '@/styles/motion';
import { haptics } from '@/lib/haptics';

interface CategoryRowProps {
  cat: Category;
  txns: Transaction[];
  tfrs: Transfer[];
  viewMonth: Date;
  onOpen: () => void;
  onEdit: () => void;
}

export function CategoryRow({
  cat,
  txns,
  tfrs,
  viewMonth,
  onOpen,
  onEdit,
}: CategoryRowProps) {
  const navigate = useNavigate();
  const avail = categoryAvailable(cat.id, txns, tfrs);
  const budgeted = categoryBudgetedForMonth(cat.id, viewMonth, tfrs);
  const activity = categoryActivityForMonth(cat.id, viewMonth, txns);
  const progress = goalProgress(cat, avail, budgeted, viewMonth);
  const normalizedGoal = normalizeGoal(cat);
  const status = goalStatus(normalizedGoal, avail, budgeted, viewMonth);

  const prevPct = useRef<number | null>(progress?.pct ?? null);
  useEffect(() => {
    if (!progress) return;
    const prev = prevPct.current;
    if (prev !== null && prev < 1 && progress.pct >= 1) {
      haptics.confirm();
    }
    prevPct.current = progress.pct;
  }, [progress]);

  function goMoveMoney() {
    haptics.light();
    navigate(`/budget?to=${encodeURIComponent(cat.id)}`);
  }

  function goNewTxn() {
    haptics.light();
    navigate(`/transactions/new?category=${encodeURIComponent(cat.id)}`);
  }

  function goListFiltered() {
    navigate(`/transactions?category=${encodeURIComponent(cat.id)}`);
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div>
          <SwipeRow
            leftActions={[
              {
                label: 'Move',
                icon: ArrowRightLeft,
                tone: 'neutral',
                onInvoke: goMoveMoney,
              },
            ]}
            rightActions={[
              {
                label: 'New',
                icon: Plus,
                tone: 'brand',
                onInvoke: goNewTxn,
              },
            ]}
          >
            <button
              type="button"
              onClick={onOpen}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[color:var(--color-fg)]">
                  {cat.name}
                </div>
                {progress && (
                  <div className="mt-1.5">
                    <ProgressHairline pct={progress.pct} />
                  </div>
                )}
              </div>

              <div className="hidden w-24 text-right lg:block">
                <AmountDisplay
                  value={budgeted}
                  tone="neutral"
                  size="sm"
                  className="text-[color:var(--color-fg-muted)]"
                />
              </div>
              <div className="hidden w-24 text-right lg:block">
                <AmountDisplay
                  value={-activity}
                  tone="neutral"
                  size="sm"
                  className="text-[color:var(--color-fg-muted)]"
                />
              </div>
              <div className="flex w-28 justify-end lg:w-28">
                <AvailablePill value={avail} status={status} animate />
              </div>
            </button>
          </SwipeRow>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-48 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-lg)] z-50"
        >
          <MenuItem onSelect={onEdit} icon={<Pencil size={14} strokeWidth={1.75} />}>
            Edit category
          </MenuItem>
          <MenuItem onSelect={goMoveMoney} icon={<ArrowRightLeft size={14} strokeWidth={1.75} />}>
            Move money
          </MenuItem>
          <MenuItem onSelect={goNewTxn} icon={<Plus size={14} strokeWidth={1.75} />}>
            New transaction
          </MenuItem>
          <MenuItem onSelect={goListFiltered} icon={<Receipt size={14} strokeWidth={1.75} />}>
            Jump to transactions
          </MenuItem>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
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

function ProgressHairline({ pct }: { pct: number }) {
  const width = Math.min(100, Math.max(0, Math.round(pct * 100)));
  const over = pct >= 1;
  return (
    <div className="h-[1.5px] w-full overflow-hidden rounded-full bg-[color:var(--color-border)]">
      <motion.div
        className={cn(
          'h-full rounded-full',
          over ? 'bg-[color:var(--color-positive)]' : 'bg-[color:var(--color-brand-500)]',
        )}
        initial={false}
        animate={{ width: `${width}%` }}
        transition={{ duration: duration.base, ease: ease.out }}
      />
    </div>
  );
}
