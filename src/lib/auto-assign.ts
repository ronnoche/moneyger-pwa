import { format } from 'date-fns';
import { MoneygerDB, newId, nowISO } from '@/db/db';
import { AVAILABLE_TO_BUDGET } from './budget-math';
import { runPreset } from './auto-assign/presets';
import type { PresetInput } from './auto-assign/types';
import type { AutoAssignHistoryEntry, Transfer } from '@/db/schema';

export * from './auto-assign/types';
export {
  PRESETS,
  getPreset,
  listPresetIds,
  runPreset,
  capByATB,
} from './auto-assign/presets';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isoToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function monthKey(d: Date): string {
  return format(d, 'yyyy-MM');
}

export async function applyPreset(
  presetId: string,
  input: PresetInput,
  db: MoneygerDB,
): Promise<AutoAssignHistoryEntry> {
  const result = runPreset(presetId, input);
  const today = isoToday();
  const now = nowISO();

  const entry: AutoAssignHistoryEntry = {
    id: newId(),
    appliedAt: now,
    presetId,
    scopeMonth: monthKey(input.viewedMonth),
    totalAmount: result.totalAmount,
    moveCount: result.moves.filter((m) => m.amount !== 0).length,
    transferIds: [],
    scope:
      input.scopedCategoryIds && input.scopedCategoryIds.length > 0
        ? 'selected'
        : 'all',
    scopedCategoryIds:
      input.scopedCategoryIds && input.scopedCategoryIds.length > 0
        ? [...input.scopedCategoryIds]
        : null,
    revertedAt: null,
  };

  await db.transaction('rw', db.transfers, db.autoAssignHistory, async () => {
    const created: Transfer[] = [];
    for (const move of result.moves) {
      if (move.amount === 0) continue;
      const abs = round2(Math.abs(move.amount));
      const from = move.amount > 0 ? AVAILABLE_TO_BUDGET : move.categoryId;
      const to = move.amount > 0 ? move.categoryId : AVAILABLE_TO_BUDGET;
      const transfer: Transfer = {
        id: newId(),
        date: today,
        amount: abs,
        fromCategoryId: from,
        toCategoryId: to,
        memo: `[auto-assign: ${presetId}]`,
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
      };
      await db.transfers.add(transfer);
      created.push(transfer);
    }

    entry.transferIds = created.map((t) => t.id);
    await db.autoAssignHistory.add(entry);
  });

  return entry;
}

export async function revertAutoAssign(
  historyEntryId: string,
  db: MoneygerDB,
): Promise<void> {
  await db.transaction('rw', db.transfers, db.autoAssignHistory, async () => {
    const entry = await db.autoAssignHistory.get(historyEntryId);
    if (!entry) throw new Error(`Auto-assign history entry not found: ${historyEntryId}`);
    if (entry.revertedAt) return;

    const originals = await db.transfers.bulkGet(entry.transferIds);
    const today = isoToday();
    const now = nowISO();

    for (const orig of originals) {
      if (!orig) continue;
      const reverse: Transfer = {
        id: newId(),
        date: today,
        amount: orig.amount,
        fromCategoryId: orig.toCategoryId,
        toCategoryId: orig.fromCategoryId,
        memo: `[revert auto-assign: ${entry.presetId}]`,
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
      };
      await db.transfers.add(reverse);
    }

    await db.autoAssignHistory.update(historyEntryId, {
      revertedAt: now,
    });
  });
}
