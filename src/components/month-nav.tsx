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
        'flex items-center justify-between rounded-xl bg-white px-2 py-2 shadow-sm dark:bg-ink-800',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(startOfMonth(addMonths(month, -1)))}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 active:bg-ink-100 dark:active:bg-ink-700"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfMonth(today))}
        disabled={isCurrent}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold',
          isCurrent ? 'text-ink-900 dark:text-ink-50' : 'text-brand-600',
        )}
      >
        <CalendarDays size={16} />
        <span>{monthLabel(month)}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfMonth(addMonths(month, 1)))}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 active:bg-ink-100 dark:active:bg-ink-700"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
