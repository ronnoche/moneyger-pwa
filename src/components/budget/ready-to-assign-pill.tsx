import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { CheckCircle2, ChevronDown, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useTransactions, useTransfers } from '@/db/hooks';
import { availableToBudget } from '@/lib/budget-math';
import { AmountDisplay } from '@/components/ui/amount-display';
import { AutoAssignDropdown } from '@/components/budget/auto-assign-dropdown';
import { FixThisSheet } from '@/components/budget/fix-this-sheet';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { duration } from '@/styles/motion';
import { cn } from '@/lib/cn';

interface Props {
  viewedMonth: Date;
  onPresetApplied?: () => void;
}

type AtbState = 'zero' | 'positive' | 'negative' | 'loading';

function classify(atb: number | null): AtbState {
  if (atb === null) return 'loading';
  if (atb > 0.0049) return 'positive';
  if (atb < -0.0049) return 'negative';
  return 'zero';
}

export function ReadyToAssignPill({ viewedMonth, onPresetApplied }: Props) {
  const txns = useTransactions();
  const tfrs = useTransfers();
  const reduced = useReducedMotion();
  const controls = useAnimation();
  const [fixThisOpen, setFixThisOpen] = useState(false);

  const atb = useMemo(() => {
    if (!txns || !tfrs) return null;
    return availableToBudget(txns, tfrs);
  }, [txns, tfrs]);

  const state = classify(atb);

  useEffect(() => {
    if (reduced) return;
    if (state === 'negative') {
      void controls.start({
        x: [0, -2, 2, 0],
        transition: { duration: 0.28 },
      });
    } else {
      void controls.start({ x: 0, transition: { duration: 0 } });
    }
  }, [state, controls, reduced]);

  const bgClass =
    state === 'positive'
      ? 'bg-[color:var(--color-positive-bg)] text-[color:var(--color-positive)]'
      : state === 'negative'
        ? 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-600)]'
        : 'bg-[color:var(--color-ink-100)] text-[color:var(--color-fg)]';

  const subCopy =
    state === 'zero'
      ? 'All Money Assigned'
      : state === 'positive'
        ? 'Ready to Assign'
        : state === 'negative'
          ? 'You assigned more than you have'
          : '';

  return (
    <>
      <motion.div
        animate={controls}
        transition={{ duration: duration.base }}
        className={cn(
          'mx-auto flex w-full max-w-[420px] items-center gap-3 rounded-xl px-4 py-3 shadow-sm',
          bgClass,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <AmountDisplay
            value={atb ?? 0}
            tone="neutral"
            size="lg"
            animate
            className="!text-[color:inherit]"
          />
          <span className="text-[11px] font-medium tracking-wide">{subCopy}</span>
        </div>
        <div className="shrink-0">
          {state === 'zero' && (
            <div
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-brand-600)]/10 text-[color:var(--color-brand-600)]"
            >
              <CheckCircle2 size={18} strokeWidth={2} />
            </div>
          )}

          {state === 'positive' && (
            <AutoAssignDropdown
              viewedMonth={viewedMonth}
              onApplied={onPresetApplied}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-[color:var(--color-brand-600)] px-3 text-[13px] font-semibold text-white active:bg-[color:var(--color-brand-700)]"
                >
                  <span>Assign</span>
                  <ChevronDown size={14} strokeWidth={2} aria-hidden />
                </button>
              }
            />
          )}

          {state === 'negative' && (
            <button
              type="button"
              onClick={() => {
                if (atb === null || atb >= 0) {
                  toast.info('Nothing to fix.');
                  return;
                }
                setFixThisOpen(true);
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-[color:var(--color-danger-600)] px-3 text-[13px] font-semibold text-white active:brightness-90"
            >
              <Wrench size={14} strokeWidth={2} aria-hidden />
              <span>Fix This</span>
            </button>
          )}
        </div>
      </motion.div>

      <FixThisSheet
        open={fixThisOpen}
        onOpenChange={setFixThisOpen}
        viewedMonth={viewedMonth}
      />
    </>
  );
}
