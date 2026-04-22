import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addMonths, isSameMonth, startOfMonth } from 'date-fns';
import { monthLabel } from '@/lib/dates';
import { cn } from '@/lib/cn';

interface MonthNavProps {
  month: Date;
  onChange: (d: Date) => void;
  className?: string;
}

export function MonthNav({ month, onChange, className }: MonthNavProps) {
  const today = new Date();
  const isCurrent = isSameMonth(month, today);
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1.5 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(startOfMonth(addMonths(month, -1)))}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] active:bg-[color:var(--color-surface-2)]"
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfMonth(today))}
        disabled={isCurrent}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold tracking-tight',
          isCurrent
            ? 'text-[color:var(--color-fg)]'
            : 'text-[color:var(--color-brand-700)]',
        )}
      >
        <CalendarDays size={16} strokeWidth={1.75} />
        <span>{monthLabel(month)}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfMonth(addMonths(month, 1)))}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] active:bg-[color:var(--color-surface-2)]"
      >
        <ChevronRight size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}
