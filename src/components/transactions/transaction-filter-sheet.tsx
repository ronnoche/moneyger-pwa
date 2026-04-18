import { useState } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAccounts, useCategories } from '@/db/hooks';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import type {
  DateRangeKey,
  TransactionFilterValue,
} from './transaction-filter-types';
import { emptyFilterValue } from './transaction-filter-types';

interface TransactionFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TransactionFilterValue;
  onChange: (next: TransactionFilterValue) => void;
}

const DATE_RANGES: Array<{ key: DateRangeKey; label: string }> = [
  { key: 'all', label: 'All time' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-30-days', label: 'Last 30 days' },
  { key: 'this-year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

export function TransactionFilterSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: TransactionFilterSheetProps) {
  const accounts = useAccounts();
  const categories = useCategories();
  const [local, setLocal] = useState<TransactionFilterValue>(value);

  function update<K extends keyof TransactionFilterValue>(
    key: K,
    next: TransactionFilterValue[K],
  ) {
    haptics.light();
    setLocal((prev) => ({ ...prev, [key]: next }));
  }

  function apply() {
    onChange(local);
    onOpenChange(false);
  }

  function clear() {
    setLocal(emptyFilterValue);
    onChange(emptyFilterValue);
    onOpenChange(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setLocal(value);
        onOpenChange(next);
      }}
      title="Filter transactions"
    >
      <div className="space-y-4 pb-1">
        <section>
          <Label>Account</Label>
          <ChipRow>
            <Chip
              active={local.accountId === ''}
              onClick={() => update('accountId', '')}
            >
              All
            </Chip>
            {(accounts ?? [])
              .filter((a) => !a.isArchived)
              .map((a) => (
                <Chip
                  key={a.id}
                  active={local.accountId === a.id}
                  onClick={() => update('accountId', a.id)}
                >
                  {a.name}
                </Chip>
              ))}
          </ChipRow>
        </section>

        <section>
          <Label>Category</Label>
          <ChipRow>
            <Chip
              active={local.categoryId === ''}
              onClick={() => update('categoryId', '')}
            >
              All
            </Chip>
            <Chip
              active={local.categoryId === AVAILABLE_TO_BUDGET}
              onClick={() => update('categoryId', AVAILABLE_TO_BUDGET)}
            >
              Available to Budget
            </Chip>
            {(categories ?? [])
              .filter((c) => !c.isArchived)
              .map((c) => (
                <Chip
                  key={c.id}
                  active={local.categoryId === c.id}
                  onClick={() => update('categoryId', c.id)}
                >
                  {c.name}
                </Chip>
              ))}
          </ChipRow>
        </section>

        <section>
          <Label>Date range</Label>
          <ChipRow>
            {DATE_RANGES.map((r) => (
              <Chip
                key={r.key}
                active={local.dateRange === r.key}
                onClick={() => update('dateRange', r.key)}
              >
                {r.label}
              </Chip>
            ))}
          </ChipRow>

          {local.dateRange === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label="From date"
                value={local.from}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, from: e.target.value }))
                }
                className="h-10 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 text-sm focus:border-[color:var(--color-brand-600)] focus:outline-none"
              />
              <input
                type="date"
                aria-label="To date"
                value={local.to}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, to: e.target.value }))
                }
                className="h-10 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 text-sm focus:border-[color:var(--color-brand-600)] focus:outline-none"
              />
            </div>
          )}
        </section>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={clear}>
            Clear all
          </Button>
          <Button className="flex-1" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1.5 px-1">{children}</div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium',
        active
          ? 'border-[color:var(--color-brand-600)] bg-[color:var(--color-positive-bg)] text-[color:var(--color-brand-700)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-fg-muted)]',
      )}
    >
      {children}
    </button>
  );
}
