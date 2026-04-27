import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { MoneyInput } from '@/components/money-input';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { commitReconcile, startReconcile } from '@/lib/reconcile';
import { toast } from '@/lib/toast';

interface ReconcileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  clearedBalance: number;
  onCommitted?: () => void;
}

export function ReconcileModal({
  open,
  onOpenChange,
  accountId,
  clearedBalance,
  onCommitted,
}: ReconcileModalProps) {
  const [entered, setEntered] = useState(() => clearedBalance.toFixed(2));
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseMoneyInput(entered), [entered]);
  const gap = Number.isFinite(parsed)
    ? Math.round((parsed - clearedBalance) * 100) / 100
    : 0;

  async function handleCommit() {
    if (!Number.isFinite(parsed)) {
      toast.error('Enter a valid balance.');
      return;
    }
    setBusy(true);
    try {
      await startReconcile(accountId, parsed);
      await commitReconcile(accountId, parsed);
      toast.success(
        gap === 0
          ? 'Reconcile complete.'
          : `Reconcile complete with adjustment ${formatMoney(gap)}.`,
      );
      onOpenChange(false);
      onCommitted?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reconcile account"
      description={`Is your current balance ${formatMoney(clearedBalance)}?`}
    >
      <div className="space-y-3 pb-2">
        <div>
          <label
            htmlFor="reconcile-balance"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]"
          >
            Enter current balance
          </label>
          <MoneyInput
            id="reconcile-balance"
            value={entered}
            onChange={(e) => setEntered(e.target.value)}
            placeholder="0.00"
          />
        </div>
        {Number.isFinite(parsed) && (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Gap: <span className={gap === 0 ? '' : 'font-semibold'}>{formatMoney(gap)}</span>
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleCommit} loading={busy}>
            Reconcile
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
