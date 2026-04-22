import { useState, type ReactElement } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';
import { useApplyPreset } from '@/hooks/use-apply-preset';
import { useRevertAutoAssign } from '@/hooks/use-revert-auto-assign';
import { usePresetPreview } from '@/hooks/use-preset-preview';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { AmountDisplay } from '@/components/ui/amount-display';
import { formatMoney } from '@/lib/format';
import {
  FUND_PRESET_ORDER,
  RESET_PRESET_ORDER,
  PRESET_LABELS,
} from '@/lib/preset-labels';
import type { PresetId } from '@/lib/auto-assign';
import { cn } from '@/lib/cn';

interface Props {
  viewedMonth: Date;
  scopedCategoryIds?: string[];
  trigger: ReactElement;
  onApplied?: () => void;
}

export function AutoAssignDropdown({
  viewedMonth,
  scopedCategoryIds,
  trigger,
  onApplied,
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-80 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-lg)] focus:outline-none data-[state=open]:animate-fade-in"
          >
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              Auto-Assign
            </div>
            {FUND_PRESET_ORDER.map((id) => (
              <PresetRow
                key={id}
                id={id}
                viewedMonth={viewedMonth}
                scopedCategoryIds={scopedCategoryIds}
                onSelect={() => handleApply(id)}
              />
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--color-border)]" />
            {RESET_PRESET_ORDER.map((id) => (
              <PresetRow
                key={id}
                id={id}
                viewedMonth={viewedMonth}
                scopedCategoryIds={scopedCategoryIds}
                destructive
                onSelect={() => setConfirmId(id)}
              />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

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
  onSelect: () => void;
}

function PresetRow({
  id,
  viewedMonth,
  scopedCategoryIds,
  destructive,
  onSelect,
}: PresetRowProps) {
  const preview = usePresetPreview(id, viewedMonth, scopedCategoryIds);
  const label = PRESET_LABELS[id] ?? id;
  const amount = Math.abs(preview.totalAmount);
  const zero = amount < 0.005 && preview.moves.length === 0;

  return (
    <DropdownMenu.Item
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      disabled={zero}
      className={cn(
        'flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-[color:var(--color-surface-2)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        destructive && 'text-[color:var(--color-danger-600)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <AmountDisplay value={amount} size="sm" tone="neutral" />
      </div>
      {preview.cappedByATB && !destructive && (
        <span className="text-[11px] text-[color:var(--color-fg-muted)]">
          Capped by available ATB
        </span>
      )}
    </DropdownMenu.Item>
  );
}
