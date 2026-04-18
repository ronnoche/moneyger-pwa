import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import { AmountDisplay } from '@/components/ui/amount-display';
import { availableToBudget } from '@/lib/budget-math';
import type { Transaction, Transfer } from '@/db/schema';
import { cn } from '@/lib/cn';

interface MonthSummaryProps {
  month: Date;
  txns: Transaction[];
  tfrs: Transfer[];
  className?: string;
}

export function MonthSummary({ month, txns, tfrs, className }: MonthSummaryProps) {
  const { income, spent, leftToAssign } = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    let inMonthIncome = 0;
    let inMonthSpent = 0;
    for (const t of txns) {
      const d = parseISO(t.date);
      if (d < start || d > end) continue;
      inMonthIncome += t.inflow;
      inMonthSpent += t.outflow;
    }
    return {
      income: inMonthIncome,
      spent: inMonthSpent,
      leftToAssign: availableToBudget(txns, tfrs),
    };
  }, [month, txns, tfrs]);

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2',
        className,
      )}
    >
      <Cell label="Income" value={income} tone="positive" />
      <Cell label="Spent" value={spent} tone="neutral" />
      <LeftCell value={leftToAssign} />
    </div>
  );
}

interface CellProps {
  label: string;
  value: number;
  tone: 'positive' | 'negative' | 'neutral' | 'auto';
}

function Cell({ label, value, tone }: CellProps) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-2 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
      </span>
      <AmountDisplay value={value} tone={tone} size="sm" />
    </div>
  );
}

function LeftCell({ value }: { value: number }) {
  const tone: 'positive' | 'negative' | 'neutral' =
    value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  return (
    <div className="flex flex-col items-start gap-0.5 px-2 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        Left to assign
      </span>
      <AmountDisplay value={value} tone={tone} size="sm" animate />
    </div>
  );
}
