import { useMemo } from 'react';
import { useTransactions, useTransfers } from '@/db/hooks';
import { availableToBudget } from '@/lib/budget-math';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

export function AppHeader() {
  const txns = useTransactions();
  const tfrs = useTransfers();

  const atb = useMemo(() => {
    if (!txns || !tfrs) return null;
    return availableToBudget(txns, tfrs);
  }, [txns, tfrs]);

  return (
    <header className="safe-pt safe-pl safe-pr sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-900/85">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500">
            Available to Budget
          </div>
          <div
            className={cn(
              'font-semibold tabular-nums text-2xl',
              atb === null
                ? 'text-ink-400'
                : atb > 0
                  ? 'text-brand-600 dark:text-brand-500'
                  : atb < 0
                    ? 'text-danger-600 dark:text-danger-500'
                    : 'text-ink-700 dark:text-ink-200',
            )}
          >
            {atb === null ? '--' : formatMoney(atb)}
          </div>
        </div>
      </div>
    </header>
  );
}
