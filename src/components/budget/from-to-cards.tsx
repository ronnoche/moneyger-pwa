import { motion } from 'motion/react';
import { ArrowLeftRight, ChevronDown } from 'lucide-react';
import { AmountDisplay } from '@/components/ui/amount-display';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { spring } from '@/styles/motion';

interface FromToCardsProps {
  fromLabel: string;
  fromAvailable: number;
  onPickFrom: () => void;
  toLabel: string;
  toAvailable: number;
  onPickTo: () => void;
  onSwap: () => void;
  canSwap: boolean;
}

export function FromToCards({
  fromLabel,
  fromAvailable,
  onPickFrom,
  toLabel,
  toAvailable,
  onPickTo,
  onSwap,
  canSwap,
}: FromToCardsProps) {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-2">
        <Card
          caption="From"
          label={fromLabel}
          placeholder="Pick a source"
          available={fromAvailable}
          onClick={onPickFrom}
          tone="source"
        />
        <Card
          caption="To"
          label={toLabel}
          placeholder="Pick a destination"
          available={toAvailable}
          onClick={onPickTo}
          tone="destination"
        />
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.button
          type="button"
          onClick={() => {
            if (!canSwap) {
              haptics.error();
              return;
            }
            haptics.light();
            onSwap();
          }}
          whileTap={{ scale: 0.92 }}
          aria-label="Swap source and destination"
          transition={spring.snappy}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-[color:var(--color-surface)] shadow-[var(--shadow-sm)]',
            canSwap
              ? 'border-[color:var(--color-brand-600)] text-[color:var(--color-brand-600)]'
              : 'border-[color:var(--color-border)] text-[color:var(--color-fg-subtle)]',
          )}
        >
          <ArrowLeftRight size={16} strokeWidth={1.75} />
        </motion.button>
      </div>
    </div>
  );
}

interface CardProps {
  caption: string;
  label: string;
  placeholder: string;
  available: number;
  onClick: () => void;
  tone: 'source' | 'destination';
}

function Card({ caption, label, placeholder, available, onClick, tone }: CardProps) {
  const empty = !label;
  return (
    <button
      type="button"
      onClick={() => {
        haptics.light();
        onClick();
      }}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-[color:var(--color-surface)] px-4 py-3 text-left',
        'border-[color:var(--color-border)] active:bg-[color:var(--color-surface-2)]',
      )}
    >
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          {caption}
        </span>
        <span
          className={cn(
            'truncate text-base font-medium',
            empty
              ? 'text-[color:var(--color-fg-subtle)]'
              : 'text-[color:var(--color-fg)]',
          )}
        >
          {label || placeholder}
        </span>
      </div>
      <div
        className={cn(
          'flex flex-col items-end gap-0.5',
          tone === 'destination' && 'opacity-70',
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Available
        </span>
        {empty ? (
          <span className="text-sm text-[color:var(--color-fg-subtle)]">-</span>
        ) : (
          <AmountDisplay value={available} tone="auto" size="md" animate />
        )}
      </div>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-[color:var(--color-fg-muted)]"
      />
    </button>
  );
}
