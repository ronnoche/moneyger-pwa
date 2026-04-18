import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { spring } from '@/styles/motion';

interface DirectionPillProps {
  value: 'outflow' | 'inflow';
  onChange: (next: 'outflow' | 'inflow') => void;
}

export function DirectionPill({ value, onChange }: DirectionPillProps) {
  return (
    <div
      role="tablist"
      aria-label="Transaction direction"
      className="relative inline-flex rounded-full bg-[color:var(--color-surface-2)] p-1"
    >
      {(['outflow', 'inflow'] as const).map((dir) => {
        const active = dir === value;
        return (
          <button
            key={dir}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                haptics.light();
                onChange(dir);
              }
            }}
            className={cn(
              'relative z-10 h-8 min-w-20 rounded-full px-4 text-xs font-semibold',
              active
                ? 'text-[color:var(--color-fg)]'
                : 'text-[color:var(--color-fg-muted)]',
            )}
          >
            {active && (
              <motion.span
                layoutId="direction-pill-thumb"
                transition={spring.default}
                className="absolute inset-0 rounded-full bg-[color:var(--color-surface)] shadow-[var(--shadow-sm)]"
              />
            )}
            <span className="relative">
              {dir === 'outflow' ? 'Outflow' : 'Inflow'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
