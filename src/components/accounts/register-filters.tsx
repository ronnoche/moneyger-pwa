import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';

export type RegisterDateRange =
  | 'all'
  | 'this-month'
  | 'last-30-days';

export type RegisterStatus = 'all' | 'cleared' | 'pending' | 'reconciled';

interface RegisterFiltersProps {
  range: RegisterDateRange;
  onRangeChange: (next: RegisterDateRange) => void;
  status: RegisterStatus;
  onStatusChange: (next: RegisterStatus) => void;
}

const RANGE_OPTS: { value: RegisterDateRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-30-days', label: 'Last 30 days' },
];

const STATUS_OPTS: { value: RegisterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'pending', label: 'Pending' },
  { value: 'reconciled', label: 'Reconciled' },
];

export function RegisterFilters({
  range,
  onRangeChange,
  status,
  onStatusChange,
}: RegisterFiltersProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-1.5 py-2">
        {RANGE_OPTS.map((opt) => (
          <Chip
            key={opt.value}
            active={range === opt.value}
            label={opt.label}
            onClick={() => {
              haptics.light();
              onRangeChange(opt.value);
            }}
          />
        ))}
        <span aria-hidden className="mx-1 w-px self-stretch bg-[color:var(--color-border)]" />
        {STATUS_OPTS.map((opt) => (
          <Chip
            key={opt.value}
            active={status === opt.value}
            label={opt.label}
            onClick={() => {
              haptics.light();
              onStatusChange(opt.value);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 shrink-0 rounded-full border px-3 text-xs font-medium',
        active
          ? 'border-[color:var(--color-brand-600)] bg-[color:var(--color-brand-600)]/10 text-[color:var(--color-brand-600)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-fg-muted)]',
      )}
    >
      {label}
    </button>
  );
}
