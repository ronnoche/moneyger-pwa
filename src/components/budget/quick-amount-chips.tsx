import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface QuickChip {
  label: string;
  value: number;
  disabled?: boolean;
}

interface QuickAmountChipsProps {
  chips: QuickChip[];
  onPick: (value: number) => void;
}

export function QuickAmountChips({ chips, onPick }: QuickAmountChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={chip.disabled}
          onClick={() => {
            if (chip.disabled) return;
            haptics.light();
            onPick(chip.value);
          }}
          className={cn(
            'h-9 rounded-full border px-3 text-xs font-medium',
            'border-[color:var(--color-border)] bg-[color:var(--color-surface)]',
            'active:bg-[color:var(--color-surface-2)]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          title={chip.label || `Set amount to ${formatMoney(chip.value)}`}
        >
          {chip.label && (
            <span className="mr-1 text-[color:var(--color-fg-muted)]">
              {chip.label}
            </span>
          )}
          <span className="font-mono tabular-nums">
            {formatMoney(chip.value)}
          </span>
        </button>
      ))}
    </div>
  );
}
