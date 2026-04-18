import type { ComponentType } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { spring } from '@/styles/motion';
import { haptics } from '@/lib/haptics';

interface PickerCardProps {
  label: string;
  value: string;
  placeholder: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  onClick: () => void;
  error?: string;
}

export function PickerCard({
  label,
  value,
  placeholder,
  icon: Icon,
  onClick,
  error,
}: PickerCardProps) {
  const empty = !value;
  return (
    <motion.button
      type="button"
      onClick={() => {
        haptics.light();
        onClick();
      }}
      whileTap={{ scale: 0.98 }}
      transition={spring.snappy}
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-xl border bg-[color:var(--color-surface)] px-3 py-2.5 text-left',
        error
          ? 'border-[color:var(--color-danger-600)]'
          : 'border-[color:var(--color-border)]',
      )}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <Icon size={12} strokeWidth={1.75} />
        {label}
      </span>
      <span
        className={cn(
          'truncate w-full text-sm font-medium',
          empty
            ? 'text-[color:var(--color-fg-subtle)]'
            : 'text-[color:var(--color-fg)]',
        )}
      >
        {value || placeholder}
      </span>
    </motion.button>
  );
}
