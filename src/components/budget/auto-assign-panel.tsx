import { useState } from 'react';
import { toast } from 'sonner';
import { AmountDisplay } from '@/components/ui/amount-display';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useApplyPreset } from '@/hooks/use-apply-preset';
import { useRevertAutoAssign } from '@/hooks/use-revert-auto-assign';
import { usePresetPreview } from '@/hooks/use-preset-preview';
import {
  FUND_PRESET_ORDER,
  PRESET_LABELS,
  RESET_PRESET_ORDER,
} from '@/lib/preset-labels';
import { formatMoney } from '@/lib/format';
import type { PresetId } from '@/lib/auto-assign';
import { cn } from '@/lib/cn';

interface Props {
  viewedMonth: Date;
  scopedCategoryIds?: string[];
  onApplied?: () => void;
  heading?: string;
}

export function AutoAssignPanel({
  viewedMonth,
  scopedCategoryIds,
  onApplied,
  heading = 'Auto-Assign',
}: Props) {
  const [confirmId, setConfirmId] = useState<PresetId | null>(null);
  const applyPreset = useApplyPreset(viewedMonth);
  const revertPreset = useRevertAutoAssign();

  async function handleApply(id: PresetId) {
    try {
      const entry = await applyPreset(id, scopedCategoryIds);
      const label = PRESET_LABELS[id] ?? id;
      toast.success(
        `Applied ${label} · ${formatMoney(Math.abs(entry.totalAmount))}`,
        {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await revertPreset(entry.id);
                toast.success(`Reverted ${label}`);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Revert failed',
                );
              }
            },
          },
        },
      );
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed');
    }
  }

  return (
    <>
      <section className="space-y-2">
        <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          {heading}
        </h3>
        <ul className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          {FUND_PRESET_ORDER.map((id) => (
            <li key={id}>
              <PresetRow
                id={id}
                viewedMonth={viewedMonth}
                scopedCategoryIds={scopedCategoryIds}
                onApply={() => handleApply(id)}
              />
            </li>
          ))}
          <li className="h-px bg-[color:var(--color-border)]" aria-hidden />
          {RESET_PRESET_ORDER.map((id) => (
            <li key={id}>
              <PresetRow
                id={id}
                viewedMonth={viewedMonth}
                scopedCategoryIds={scopedCategoryIds}
                destructive
                onApply={() => setConfirmId(id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <ConfirmSheet
        open={confirmId !== null}
        onOpenChange={(v) => !v && setConfirmId(null)}
        title={confirmId ? (PRESET_LABELS[confirmId] ?? 'Reset') : 'Reset'}
        description={
          confirmId === 'reset_available'
            ? 'This returns all Available balances to the Available to Budget pool. You can undo from the Recent Moves list.'
            : 'This clears every bucket list’s Budgeted for this month. You can undo from the Recent Moves list.'
        }
        destructive
        confirmLabel="Reset"
        onConfirm={async () => {
          if (confirmId) await handleApply(confirmId);
        }}
      />
    </>
  );
}

interface PresetRowProps {
  id: PresetId;
  viewedMonth: Date;
  scopedCategoryIds?: string[];
  destructive?: boolean;
  onApply: () => void;
}

function PresetRow({
  id,
  viewedMonth,
  scopedCategoryIds,
  destructive,
  onApply,
}: PresetRowProps) {
  const preview = usePresetPreview(id, viewedMonth, scopedCategoryIds);
  const label = PRESET_LABELS[id] ?? id;
  const amount = Math.abs(preview.totalAmount);
  const zero = amount < 0.005 && preview.moves.length === 0;

  return (
    <button
      type="button"
      onClick={onApply}
      disabled={zero}
      className={cn(
        'flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-[color:var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50',
        destructive && 'text-[color:var(--color-danger-600)]',
      )}
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{label}</div>
        {preview.cappedByATB && !destructive && (
          <div className="text-[11px] text-[color:var(--color-fg-muted)]">
            Capped by available ATB
          </div>
        )}
      </div>
      <AmountDisplay
        value={amount}
        tone="neutral"
        size="sm"
        className="shrink-0 tabular-nums"
      />
    </button>
  );
}
