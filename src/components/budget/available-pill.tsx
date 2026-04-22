import { Clock } from 'lucide-react';
import { AmountDisplay } from '@/components/ui/amount-display';
import type { GoalStatus } from '@/lib/goals';
import { cn } from '@/lib/cn';

interface Props {
  value: number;
  status?: GoalStatus;
  animate?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

export function AvailablePill({
  value,
  status = 'none',
  animate = false,
  size = 'sm',
  onClick,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const variant = classify(value);
  const funded = status === 'on_track' || status === 'funded';

  // Per DESIGN_1 §4 Available pill: 600 weight for positive/negative, 400 for zero.
  const tone =
    variant === 'positive'
      ? 'bg-[color:var(--color-positive-bg)] text-[color:var(--color-positive)] font-semibold'
      : variant === 'negative'
        ? 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-600)] font-semibold'
        : 'bg-[color:var(--color-ink-100)] text-[color:var(--color-fg-muted)] font-normal dark:bg-[color:var(--color-surface-2)]';

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm',
        size === 'md' ? 'h-7' : 'h-6',
        tone,
        className,
      )}
    >
      <AmountDisplay
        value={value}
        tone="neutral"
        size="sm"
        animate={animate}
        className="!text-[color:inherit]"
      />
      {funded && (
        <Clock
          size={12}
          strokeWidth={2}
          aria-label="Funded for this month"
          className="shrink-0 opacity-80"
        />
      )}
    </span>
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex"
    >
      {content}
    </button>
  );
}

function classify(value: number): 'positive' | 'negative' | 'zero' {
  if (value > 0.0049) return 'positive';
  if (value < -0.0049) return 'negative';
  return 'zero';
}
