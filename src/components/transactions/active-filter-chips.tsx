import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

interface ActiveFilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  className?: ComponentProps<'div'>['className'];
}

export function ActiveFilterChips({
  chips,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onRemove}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--color-brand-600)] bg-[color:var(--color-positive-bg)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-brand-700)]"
        >
          <span className="truncate max-w-[10rem]">{c.label}</span>
          <X size={12} strokeWidth={2} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto shrink-0 text-xs font-medium text-[color:var(--color-fg-muted)] px-2 py-1"
      >
        Clear all
      </button>
    </div>
  );
}
