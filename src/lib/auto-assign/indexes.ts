import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { Transaction, Transfer } from '@/db/schema';
import { AVAILABLE_TO_BUDGET } from '../budget-math';

/**
 * Precomputed indexes over transactions and transfers so each preset avoids
 * repeatedly re-filtering the entire list per category.
 *
 * Complexity:
 * - Build: O(N) once where N = txns + transfers.
 * - Per-category lookup: O(k) where k = entries for that category, typically small.
 */
export interface PresetIndexes {
  txnsByCategory: Map<string, Transaction[]>;
  tfrsByCategory: Map<string, Transfer[]>;
  tfrsByMonth: Map<string, Transfer[]>;
  txnsByMonth: Map<string, Transaction[]>;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function buildIndexes(
  transactions: Transaction[],
  transfers: Transfer[],
): PresetIndexes {
  const txnsByCategory = new Map<string, Transaction[]>();
  const tfrsByCategory = new Map<string, Transfer[]>();
  const tfrsByMonth = new Map<string, Transfer[]>();
  const txnsByMonth = new Map<string, Transaction[]>();

  for (const t of transactions) {
    push(txnsByCategory, t.categoryId, t);
    push(txnsByMonth, monthKey(t.date), t);
  }
  for (const t of transfers) {
    push(tfrsByCategory, t.fromCategoryId, t);
    if (t.toCategoryId !== t.fromCategoryId) {
      push(tfrsByCategory, t.toCategoryId, t);
    }
    push(tfrsByMonth, monthKey(t.date), t);
  }

  return { txnsByCategory, tfrsByCategory, tfrsByMonth, txnsByMonth };
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

export function categoryAvailableIndexed(
  categoryId: string,
  idx: PresetIndexes,
): number {
  let sum = 0;
  const txns = idx.txnsByCategory.get(categoryId);
  if (txns) {
    for (const t of txns) sum += t.inflow - t.outflow;
  }
  const tfrs = idx.tfrsByCategory.get(categoryId);
  if (tfrs) {
    for (const t of tfrs) {
      if (t.toCategoryId === categoryId) sum += t.amount;
      if (t.fromCategoryId === categoryId) sum -= t.amount;
    }
  }
  return sum;
}

export function categoryBudgetedForMonthIndexed(
  categoryId: string,
  month: Date,
  idx: PresetIndexes,
): number {
  const key = format(month, 'yyyy-MM');
  const tfrs = idx.tfrsByMonth.get(key);
  if (!tfrs) return 0;
  let sum = 0;
  for (const t of tfrs) {
    if (t.toCategoryId === categoryId) sum += t.amount;
    if (t.fromCategoryId === categoryId) sum -= t.amount;
  }
  return sum;
}

export function categoryActivityForMonthIndexed(
  categoryId: string,
  month: Date,
  idx: PresetIndexes,
): number {
  const key = format(month, 'yyyy-MM');
  const txns = idx.txnsByMonth.get(key);
  if (!txns) return 0;
  let sum = 0;
  for (const t of txns) {
    if (t.categoryId === categoryId) sum += t.outflow - t.inflow;
  }
  return sum;
}

export function transfersInMonth(
  month: Date,
  idx: PresetIndexes,
): Transfer[] {
  const key = format(month, 'yyyy-MM');
  return idx.tfrsByMonth.get(key) ?? [];
}

export function earliestActivityMonth(
  categoryId: string,
  idx: PresetIndexes,
): Date | null {
  const tfrs = idx.tfrsByCategory.get(categoryId);
  const txns = idx.txnsByCategory.get(categoryId);
  let earliest: Date | null = null;
  const consider = (iso: string) => {
    const d = parseISO(iso);
    if (!earliest || d.getTime() < earliest.getTime()) earliest = d;
  };
  if (tfrs) for (const t of tfrs) consider(t.date);
  if (txns) for (const t of txns) consider(t.date);
  return earliest;
}

export { AVAILABLE_TO_BUDGET, startOfMonth, endOfMonth };
