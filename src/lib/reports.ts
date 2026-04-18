import { format, parseISO, startOfMonth } from 'date-fns';
import type { Category, Group, NetWorthEntry, Transaction } from '@/db/schema';

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  groupId: string;
  groupName: string;
  outflow: number;
  inflow: number;
  net: number;
}

export interface SpendingByGroup {
  groupId: string;
  groupName: string;
  outflow: number;
  inflow: number;
  net: number;
}

export interface SpendingTotals {
  outflow: number;
  inflow: number;
  net: number;
}

export interface SpendingReport {
  byCategory: SpendingByCategory[];
  byGroup: SpendingByGroup[];
  totals: SpendingTotals;
}

export function computeSpendingReport(
  txns: Transaction[],
  categories: Category[],
  groups: Group[],
  from: string,
  to: string,
): SpendingReport {
  const inRange = txns.filter((t) => t.date >= from && t.date <= to);

  const catIndex = new Map(categories.map((c) => [c.id, c]));
  const groupIndex = new Map(groups.map((g) => [g.id, g]));

  const byCat = new Map<string, SpendingByCategory>();

  for (const t of inRange) {
    const cat = catIndex.get(t.categoryId);
    if (!cat) continue;
    const group = groupIndex.get(cat.groupId);
    const key = cat.id;
    const existing = byCat.get(key) ?? {
      categoryId: cat.id,
      categoryName: cat.name,
      groupId: cat.groupId,
      groupName: group?.name ?? '(archived)',
      outflow: 0,
      inflow: 0,
      net: 0,
    };
    existing.outflow += t.outflow;
    existing.inflow += t.inflow;
    existing.net = existing.outflow - existing.inflow;
    byCat.set(key, existing);
  }

  const byCategory = [...byCat.values()].sort((a, b) => b.net - a.net);

  const byGroupMap = new Map<string, SpendingByGroup>();
  for (const row of byCategory) {
    const existing = byGroupMap.get(row.groupId) ?? {
      groupId: row.groupId,
      groupName: row.groupName,
      outflow: 0,
      inflow: 0,
      net: 0,
    };
    existing.outflow += row.outflow;
    existing.inflow += row.inflow;
    existing.net = existing.outflow - existing.inflow;
    byGroupMap.set(row.groupId, existing);
  }
  const byGroup = [...byGroupMap.values()].sort((a, b) => b.net - a.net);

  const totals: SpendingTotals = {
    outflow: byCategory.reduce((s, r) => s + r.outflow, 0),
    inflow: byCategory.reduce((s, r) => s + r.inflow, 0),
    net: 0,
  };
  totals.net = totals.outflow - totals.inflow;

  return { byCategory, byGroup, totals };
}

export interface NetWorthSeriesPoint {
  month: string;
  label: string;
  assets: number;
  debts: number;
  net: number;
}

export function computeNetWorthSeries(
  entries: NetWorthEntry[],
): NetWorthSeriesPoint[] {
  if (entries.length === 0) return [];

  const latestByKey = new Map<string, NetWorthEntry>();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const months = new Set<string>();
  for (const e of sorted) {
    months.add(format(startOfMonth(parseISO(e.date)), 'yyyy-MM'));
  }

  const monthList = [...months].sort();

  const series: NetWorthSeriesPoint[] = [];
  for (const monthKey of monthList) {
    const monthEnd = `${monthKey}-31`;
    for (const e of sorted) {
      if (e.date <= monthEnd) {
        latestByKey.set(`${e.type}|${e.category}`, e);
      } else {
        break;
      }
    }

    let assets = 0;
    let debts = 0;
    for (const e of latestByKey.values()) {
      if (e.type === 'asset') assets += e.amount;
      else debts += e.amount;
    }

    const monthDate = parseISO(`${monthKey}-01`);
    series.push({
      month: monthKey,
      label: format(monthDate, 'MMM yy'),
      assets: round2(assets),
      debts: round2(debts),
      net: round2(assets - debts),
    });
  }

  return series;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
