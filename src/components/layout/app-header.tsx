import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { useTransactions, useTransfers } from '@/db/hooks';
import { availableToBudget } from '@/lib/budget-math';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SyncStatusIndicator } from '@/components/sync/sync-status-indicator';
import { AppLogo } from '@/components/app-logo';
import { haptics } from '@/lib/haptics';

export function AppHeader() {
  const { pathname } = useLocation();
  const txns = useTransactions();
  const tfrs = useTransfers();
  const showBrandMark = pathname !== '/';

  const atb = useMemo(() => {
    if (!txns || !tfrs) return null;
    return availableToBudget(txns, tfrs);
  }, [txns, tfrs]);

  const prevAtb = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevAtb.current;
    if (atb !== null && prev !== null && prev > 0 && atb === 0) {
      haptics.confirm();
    }
    prevAtb.current = atb;
  }, [atb]);

  const tone =
    atb === null || atb === 0
      ? 'neutral'
      : atb > 0
        ? 'positive'
        : 'negative';

  return (
    <header className="safe-pt safe-pl safe-pr sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
        {showBrandMark ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
            <AppLogo className="h-8 w-8" alt="" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--color-fg-muted)]">
            Available to Budget
          </div>
          <AmountDisplay
            value={atb ?? 0}
            tone={tone}
            size="lg"
            animate
            aria-label={
              atb === null ? 'Calculating available to budget' : undefined
            }
          />
        </div>
        <SyncStatusIndicator />
      </div>
    </header>
  );
}
