import { AmountDisplay } from '@/components/ui/amount-display';

interface MonthSpentCardProps {
  label: string;
  outflow: number;
  inflow: number;
}

export function MonthSpentCard({ label, outflow, inflow }: MonthSpentCardProps) {
  const net = outflow - inflow;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          {label}
        </span>
        <span className="text-xs text-[color:var(--color-fg-muted)]">
          Spent - received
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <AmountDisplay value={net} tone="neutral" size="sm" />
        <div className="flex gap-2 text-[11px] text-[color:var(--color-fg-muted)]">
          <span className="tabular-nums">
            Out <AmountDisplay value={outflow} tone="neutral" size="sm" className="inline" />
          </span>
          <span className="tabular-nums">
            In <AmountDisplay value={inflow} tone="positive" size="sm" className="inline" />
          </span>
        </div>
      </div>
    </div>
  );
}
