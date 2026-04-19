import { useMemo, type ReactElement } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAutoAssignHistory } from '@/hooks/use-auto-assign-history';
import { useRevertAutoAssign } from '@/hooks/use-revert-auto-assign';
import { useTransfers } from '@/db/hooks';
import { deleteTransfer } from '@/features/transfers/repo';
import { presetLabel } from '@/lib/preset-labels';
import { AmountDisplay } from '@/components/ui/amount-display';
import type { AutoAssignHistoryEntry, Transfer } from '@/db/schema';

type Entry =
  | { kind: 'preset'; at: string; entry: AutoAssignHistoryEntry }
  | { kind: 'transfer'; at: string; transfer: Transfer };

interface Props {
  trigger: ReactElement;
}

const MAX = 10;

export function RecentMovesPopover({ trigger }: Props) {
  const history = useAutoAssignHistory(MAX);
  const transfers = useTransfers();
  const revertPreset = useRevertAutoAssign();

  const merged = useMemo<Entry[]>(() => {
    const fromHistory: Entry[] = (history ?? []).map((h) => ({
      kind: 'preset',
      at: h.appliedAt,
      entry: h,
    }));

    // Exclude transfers that belong to an auto-assign history entry.
    const autoTransferIds = new Set<string>();
    for (const h of history ?? []) {
      for (const id of h.transferIds) autoTransferIds.add(id);
    }

    const fromTransfers: Entry[] = (transfers ?? [])
      .filter((t) => !autoTransferIds.has(t.id))
      .map((t) => ({ kind: 'transfer', at: t.createdAt, transfer: t }));

    return [...fromHistory, ...fromTransfers]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, MAX);
  }, [history, transfers]);

  async function revertEntry(entry: Entry) {
    try {
      if (entry.kind === 'preset') {
        if (entry.entry.revertedAt) {
          toast.info('Already reverted.');
          return;
        }
        await revertPreset(entry.entry.id);
        toast.success(`Reverted ${presetLabel(entry.entry.presetId)}`);
      } else {
        await deleteTransfer(entry.transfer.id);
        toast.success('Reverted move');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revert failed');
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-96 max-w-[92vw] rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-lg)] focus:outline-none data-[state=open]:animate-fade-in"
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Recent Moves
          </div>
          {merged.length === 0 && (
            <div className="px-3 py-4 text-sm text-[color:var(--color-fg-muted)]">
              No recent moves yet.
            </div>
          )}
          {merged.map((e) => {
            const label =
              e.kind === 'preset'
                ? presetLabel(e.entry.presetId)
                : 'Manual move';
            const amount =
              e.kind === 'preset'
                ? Math.abs(e.entry.totalAmount)
                : Math.abs(e.transfer.amount);
            const when = safeRelative(e.at);
            const reverted = e.kind === 'preset' && Boolean(e.entry.revertedAt);

            return (
              <DropdownMenu.Item
                key={e.kind === 'preset' ? e.entry.id : e.transfer.id}
                onSelect={(evt) => {
                  evt.preventDefault();
                  void revertEntry(e);
                }}
                disabled={reverted}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-[color:var(--color-surface-2)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{label}</span>
                    {reverted && (
                      <span className="rounded bg-[color:var(--color-surface-2)] px-1 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                        Reverted
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[color:var(--color-fg-muted)]">
                    {when}
                  </div>
                </div>
                <AmountDisplay value={amount} size="sm" tone="neutral" />
                {!reverted && (
                  <span className="text-[11px] text-[color:var(--color-brand-700)]">
                    Revert
                  </span>
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}
