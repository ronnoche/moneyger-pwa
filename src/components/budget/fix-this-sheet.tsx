import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AmountDisplay } from '@/components/ui/amount-display';
import {
  useCategories,
  useTransactions,
  useTransfers,
} from '@/db/hooks';
import {
  AVAILABLE_TO_BUDGET,
  availableToBudget,
  categoryBudgetedForMonth,
} from '@/lib/budget-math';
import { createTransfer } from '@/features/transfers/repo';
import { getActiveCurrency } from '@/lib/currency-prefs';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewedMonth: Date;
}

export function FixThisSheet({ open, onOpenChange, viewedMonth }: Props) {
  const categories = useCategories();
  const transactions = useTransactions();
  const transfers = useTransfers();
  const [busyId, setBusyId] = useState<string | null>(null);

  const atb = useMemo(() => {
    if (!transactions || !transfers) return 0;
    return availableToBudget(transactions, transfers);
  }, [transactions, transfers]);

  const rows = useMemo(() => {
    if (!categories || !transfers) return [];
    return categories
      .filter((c) => !c.isArchived)
      .map((c) => ({
        cat: c,
        budgeted: categoryBudgetedForMonth(c.id, viewedMonth, transfers),
      }))
      .filter((r) => r.budgeted > 0.005)
      .sort((a, b) => b.budgeted - a.budgeted);
  }, [categories, transfers, viewedMonth]);

  const overage = Math.max(0, -atb);

  async function pullBack(categoryId: string, amount: number) {
    if (amount <= 0) return;
    setBusyId(categoryId);
    try {
      await createTransfer({
        date: format(viewedMonth, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        amount,
        fromCategoryId: categoryId,
        toCategoryId: AVAILABLE_TO_BUDGET,
        memo: 'Fix This: reduced over-assignment',
      });
      toast.success(`Pulled back ${amount.toFixed(2)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pull back');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Fix over-assigned budget"
      description={
        atb < 0
          ? `You've assigned ${formatOver(overage)} more than you have. Pull money back from bucket lists with a positive Budgeted this month.`
          : 'Nothing to fix right now.'
      }
    >
      <div className="max-h-[60vh] space-y-2 overflow-y-auto pb-2">
        {rows.length === 0 && (
          <div className="rounded-lg bg-[color:var(--color-surface-2)] p-4 text-sm text-[color:var(--color-fg-muted)]">
            No bucket lists with positive Budgeted this month to pull from. You
            may need to receive income or move from a bucket list's Available balance.
          </div>
        )}

        {rows.map(({ cat, budgeted }) => {
          const suggested = Math.min(budgeted, overage);
          const isBusy = busyId === cat.id;
          return (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{cat.name}</div>
                <div className="text-[11px] text-[color:var(--color-fg-muted)]">
                  Budgeted{' '}
                  <AmountDisplay value={budgeted} size="sm" tone="neutral" />
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={isBusy}
                disabled={isBusy || suggested <= 0 || overage <= 0}
                onClick={() => pullBack(cat.id, suggested)}
                className={cn('shrink-0')}
              >
                Pull {suggested.toFixed(0) !== '0' ? suggested.toFixed(2) : '0'}
              </Button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function formatOver(amount: number): string {
  const currency = getActiveCurrency();
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amount,
  );
}
