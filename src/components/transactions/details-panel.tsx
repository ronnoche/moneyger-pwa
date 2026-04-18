import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { duration, ease } from '@/styles/motion';

interface DetailsPanelProps {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function DetailsPanel({
  summary,
  children,
  defaultOpen = false,
}: DetailsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Details
          </span>
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {summary}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: duration.fast, ease: ease.out }}
          className="text-[color:var(--color-fg-muted)]"
        >
          <ChevronDown size={16} strokeWidth={1.75} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: duration.base, ease: ease.out },
              opacity: { duration: duration.fast, ease: ease.out },
            }}
            className={cn('overflow-hidden')}
          >
            <div className="space-y-3 border-t border-[color:var(--color-border)] p-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
