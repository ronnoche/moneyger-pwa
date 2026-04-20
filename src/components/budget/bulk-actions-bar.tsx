import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, X } from 'lucide-react';
import { AutoAssignDropdown } from '@/components/budget/auto-assign-dropdown';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spring } from '@/styles/motion';

interface Props {
  selectedCount: number;
  selectedIds: string[];
  viewedMonth: Date;
  onClear: () => void;
  onApplied?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  viewedMonth,
  onClear,
  onApplied,
}: Props) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: spring.snappy }}
          exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0, transition: spring.snappy }}
          className="safe-pb pointer-events-none fixed inset-x-0 bottom-16 z-30 px-4 lg:bottom-6"
        >
          <div className="pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 shadow-[var(--shadow-lg)]">
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear selection"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)]"
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
            <div className="text-sm font-medium">
              {selectedCount} selected
            </div>
            <div className="ml-auto">
              <AutoAssignDropdown
                viewedMonth={viewedMonth}
                scopedCategoryIds={selectedIds}
                onApplied={onApplied}
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[color:var(--color-brand-600)] px-3 text-[13px] font-semibold text-white active:bg-[color:var(--color-brand-700)]"
                  >
                    <span>Auto-Assign to selected</span>
                    <ChevronDown size={14} strokeWidth={2} aria-hidden />
                  </button>
                }
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
