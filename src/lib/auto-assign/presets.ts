import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { Category } from '@/db/schema';
import { neededThisMonth, normalizeGoal } from '../goals';
import type { Preset, PresetInput, PresetMove, PresetResult } from './types';
import {
  buildIndexes,
  categoryAvailableIndexed,
  categoryActivityForMonthIndexed,
  categoryBudgetedForMonthIndexed,
  earliestActivityMonth,
  transfersInMonth,
  type PresetIndexes,
} from './indexes';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scopedCategories(input: PresetInput): Category[] {
  const active = input.categories.filter((c) => !c.isArchived);
  const sorted = [...active].sort((a, b) => a.sortOrder - b.sortOrder);
  if (!input.scopedCategoryIds || input.scopedCategoryIds.length === 0) {
    return sorted;
  }
  const set = new Set(input.scopedCategoryIds);
  return sorted.filter((c) => set.has(c.id));
}

function isSnoozedForMonth(category: Category, viewedMonth: Date): boolean {
  if (!category.snoozedUntil) return false;
  return category.snoozedUntil >= format(viewedMonth, 'yyyy-MM');
}

function sumPositive(moves: PresetMove[]): number {
  return round2(
    moves.filter((m) => m.amount > 0).reduce((t, m) => t + m.amount, 0),
  );
}

function underfundedPriority(cat: Category): number {
  if (!cat.goalDueDate) return Number.MAX_SAFE_INTEGER + cat.sortOrder;
  const due = parseISO(cat.goalDueDate).getTime();
  return due + cat.sortOrder;
}

export function capByATB(
  moves: PresetMove[],
  atb: number,
  priorityByCategoryId: Map<string, number>,
): { moves: PresetMove[]; capped: boolean } {
  const positives = moves.filter((m) => m.amount > 0);
  const negatives = moves.filter((m) => m.amount <= 0);

  const total = sumPositive(positives);
  if (total <= atb) return { moves, capped: false };

  const sorted = [...positives].sort((a, b) => {
    const pa = priorityByCategoryId.get(a.categoryId) ?? 99;
    const pb = priorityByCategoryId.get(b.categoryId) ?? 99;
    return pa - pb;
  });

  let remaining = atb;
  const capped: PresetMove[] = [];
  for (const m of sorted) {
    if (remaining <= 0) break;
    if (m.amount <= remaining) {
      capped.push(m);
      remaining = round2(remaining - m.amount);
    } else {
      capped.push({ ...m, amount: round2(remaining) });
      remaining = 0;
    }
  }

  return { moves: [...capped, ...negatives], capped: true };
}

export const underfunded: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const moves: PresetMove[] = [];
  const priorityByCategoryId = new Map<string, number>();

  for (const cat of cats) {
    if (isSnoozedForMonth(cat, input.viewedMonth)) continue;
    const g = normalizeGoal(cat);
    if (!g) continue;
    const available = categoryAvailableIndexed(cat.id, idx);
    const budgeted = categoryBudgetedForMonthIndexed(cat.id, input.viewedMonth, idx);
    const needed = neededThisMonth(g, available, budgeted, input.viewedMonth);
    if (needed <= 0) continue;

    moves.push({
      categoryId: cat.id,
      amount: needed,
      reason: `Underfunded by ${needed}`,
    });

    priorityByCategoryId.set(cat.id, underfundedPriority(cat));
  }

  const { moves: finalMoves, capped } = capByATB(
    moves,
    input.availableToBudget,
    priorityByCategoryId,
  );

  return {
    moves: finalMoves,
    totalAmount: sumPositive(finalMoves),
    cappedByATB: capped,
  };
};

export const assignedLastMonth: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const prev = subMonths(input.viewedMonth, 1);
  const moves: PresetMove[] = [];

  for (const cat of cats) {
    const lastMonth = categoryBudgetedForMonthIndexed(cat.id, prev, idx);
    if (lastMonth <= 0) continue;
    const already = categoryBudgetedForMonthIndexed(cat.id, input.viewedMonth, idx);
    const delta = round2(lastMonth - already);
    if (delta <= 0) continue;

    moves.push({
      categoryId: cat.id,
      amount: delta,
      reason: `Assigned ${lastMonth} last month`,
    });
  }

  const { moves: finalMoves, capped } = capByATB(
    moves,
    input.availableToBudget,
    new Map(),
  );

  return {
    moves: finalMoves,
    totalAmount: sumPositive(finalMoves),
    cappedByATB: capped,
  };
};

export const spentLastMonth: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const prev = subMonths(input.viewedMonth, 1);
  const moves: PresetMove[] = [];

  for (const cat of cats) {
    const activity = categoryActivityForMonthIndexed(cat.id, prev, idx);
    const spent = Math.max(0, activity);
    if (spent <= 0) continue;
    const already = categoryBudgetedForMonthIndexed(cat.id, input.viewedMonth, idx);
    const delta = round2(Math.max(0, spent - already));
    if (delta <= 0) continue;

    moves.push({
      categoryId: cat.id,
      amount: delta,
      reason: `Spent ${spent} last month`,
    });
  }

  const { moves: finalMoves, capped } = capByATB(
    moves,
    input.availableToBudget,
    new Map(),
  );

  return {
    moves: finalMoves,
    totalAmount: sumPositive(finalMoves),
    cappedByATB: capped,
  };
};

function hasThreeMonthsHistory(
  categoryId: string,
  viewedMonth: Date,
  idx: PresetIndexes,
): boolean {
  const threshold = startOfMonth(subMonths(viewedMonth, 3));
  const earliest = earliestActivityMonth(categoryId, idx);
  if (!earliest) return false;
  return startOfMonth(earliest).getTime() <= threshold.getTime();
}

function trailingAverage(
  cat: Category,
  viewedMonth: Date,
  idx: PresetIndexes,
  metric: 'assigned' | 'spent',
): number {
  const months = [
    subMonths(viewedMonth, 1),
    subMonths(viewedMonth, 2),
    subMonths(viewedMonth, 3),
  ];
  let total = 0;
  for (const m of months) {
    total +=
      metric === 'assigned'
        ? categoryBudgetedForMonthIndexed(cat.id, m, idx)
        : Math.max(0, categoryActivityForMonthIndexed(cat.id, m, idx));
  }
  return round2(total / 3);
}

export const averageAssigned: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const moves: PresetMove[] = [];

  for (const cat of cats) {
    if (!hasThreeMonthsHistory(cat.id, input.viewedMonth, idx)) continue;
    const avg = trailingAverage(cat, input.viewedMonth, idx, 'assigned');
    if (avg <= 0) continue;
    const budgeted = categoryBudgetedForMonthIndexed(cat.id, input.viewedMonth, idx);
    const delta = round2(Math.max(0, avg - budgeted));
    if (delta <= 0) continue;

    moves.push({
      categoryId: cat.id,
      amount: delta,
      reason: `3-mo avg assigned ${avg}`,
    });
  }

  const { moves: finalMoves, capped } = capByATB(
    moves,
    input.availableToBudget,
    new Map(),
  );

  return {
    moves: finalMoves,
    totalAmount: sumPositive(finalMoves),
    cappedByATB: capped,
  };
};

export const averageSpent: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const moves: PresetMove[] = [];

  for (const cat of cats) {
    if (!hasThreeMonthsHistory(cat.id, input.viewedMonth, idx)) continue;
    const avg = trailingAverage(cat, input.viewedMonth, idx, 'spent');
    if (avg <= 0) continue;
    const budgeted = categoryBudgetedForMonthIndexed(cat.id, input.viewedMonth, idx);
    const delta = round2(Math.max(0, avg - budgeted));
    if (delta <= 0) continue;

    moves.push({
      categoryId: cat.id,
      amount: delta,
      reason: `3-mo avg spent ${avg}`,
    });
  }

  const { moves: finalMoves, capped } = capByATB(
    moves,
    input.availableToBudget,
    new Map(),
  );

  return {
    moves: finalMoves,
    totalAmount: sumPositive(finalMoves),
    cappedByATB: capped,
  };
};

export const resetAvailable: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const moves: PresetMove[] = [];

  for (const cat of cats) {
    const available = categoryAvailableIndexed(cat.id, idx);
    if (available <= 0) continue;
    moves.push({
      categoryId: cat.id,
      amount: round2(-available),
      reason: `Reset ${available} back to ATB`,
    });
  }

  return { moves, totalAmount: 0, cappedByATB: false };
};

export const resetAssigned: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const start = startOfMonth(input.viewedMonth);
  const end = endOfMonth(input.viewedMonth);
  const moves: PresetMove[] = [];

  const monthTransfers = transfersInMonth(input.viewedMonth, idx);
  const netByCategory = new Map<string, number>();
  for (const t of monthTransfers) {
    const d = parseISO(t.date);
    if (d < start || d > end) continue;
    if (t.toCategoryId) {
      netByCategory.set(
        t.toCategoryId,
        (netByCategory.get(t.toCategoryId) ?? 0) + t.amount,
      );
    }
    if (t.fromCategoryId) {
      netByCategory.set(
        t.fromCategoryId,
        (netByCategory.get(t.fromCategoryId) ?? 0) - t.amount,
      );
    }
  }

  for (const cat of cats) {
    const net = netByCategory.get(cat.id);
    if (!net) continue;
    moves.push({
      categoryId: cat.id,
      amount: round2(-net),
      reason: `Reset ${net} assigned this month`,
    });
  }

  return { moves, totalAmount: 0, cappedByATB: false };
};

export const reduceOverfunding: Preset = (input) => {
  const idx = buildIndexes(input.transactions, input.transfers);
  const cats = scopedCategories(input);
  const moves: PresetMove[] = [];

  for (const cat of cats) {
    const goal = normalizeGoal(cat);
    if (!goal || goal.amount === null || goal.amount <= 0) continue;
    const available = categoryAvailableIndexed(cat.id, idx);
    if (available <= goal.amount) continue;
    const excess = round2(available - goal.amount);
    if (excess <= 0) continue;
    moves.push({
      categoryId: cat.id,
      amount: -excess,
      reason: `Reduce overfunded by ${excess}`,
    });
  }

  return { moves, totalAmount: 0, cappedByATB: false };
};

export const PRESETS = {
  underfunded,
  assigned_last_month: assignedLastMonth,
  spent_last_month: spentLastMonth,
  average_assigned: averageAssigned,
  average_spent: averageSpent,
  reduce_overfunding: reduceOverfunding,
  reset_available: resetAvailable,
  reset_assigned: resetAssigned,
} satisfies Record<string, Preset>;

export type PresetMap = typeof PRESETS;

export function getPreset(id: string): Preset | undefined {
  return (PRESETS as Record<string, Preset>)[id];
}

export function listPresetIds(): string[] {
  return Object.keys(PRESETS);
}

export function runPreset(id: string, input: PresetInput): PresetResult {
  const fn = getPreset(id);
  if (!fn) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return fn(input);
}
