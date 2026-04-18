import { useMemo, useState } from 'react';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import {
  useCategories,
  useGroups,
  useTransactions,
} from '@/db/hooks';
import { computeSpendingReport } from '@/lib/reports';
import { formatMoney } from '@/lib/format';
import { Field, inputClass } from '@/components/ui/field';
import { cn } from '@/lib/cn';

type Grouping = 'category' | 'group';
type Preset = 'this_month' | 'last_month' | 'this_year' | 'custom';

function presetRange(p: Preset, today = new Date()): [string, string] {
  switch (p) {
    case 'this_month':
      return [
        format(startOfMonth(today), 'yyyy-MM-dd'),
        format(endOfMonth(today), 'yyyy-MM-dd'),
      ];
    case 'last_month': {
      const prev = subMonths(today, 1);
      return [
        format(startOfMonth(prev), 'yyyy-MM-dd'),
        format(endOfMonth(prev), 'yyyy-MM-dd'),
      ];
    }
    case 'this_year':
      return [
        `${today.getFullYear()}-01-01`,
        `${today.getFullYear()}-12-31`,
      ];
    case 'custom':
      return [
        format(startOfMonth(today), 'yyyy-MM-dd'),
        format(endOfMonth(today), 'yyyy-MM-dd'),
      ];
  }
}

export default function SpendingTab() {
  const txns = useTransactions();
  const categories = useCategories();
  const groups = useGroups();

  const [preset, setPreset] = useState<Preset>('this_month');
  const [range, setRange] = useState<[string, string]>(() =>
    presetRange('this_month'),
  );
  const [grouping, setGrouping] = useState<Grouping>('category');

  const report = useMemo(() => {
    if (!txns || !categories || !groups) return null;
    return computeSpendingReport(
      txns,
      categories,
      groups,
      range[0],
      range[1],
    );
  }, [txns, categories, groups, range]);

  function handlePreset(next: Preset) {
    setPreset(next);
    if (next !== 'custom') {
      setRange(presetRange(next));
    }
  }

  if (!report) {
    return <p className="text-sm text-ink-500">Loading...</p>;
  }

  const rows: Array<{
    key: string;
    name: string;
    outflow: number;
    inflow: number;
    net: number;
  }> =
    grouping === 'category'
      ? report.byCategory.map((r) => ({
          key: r.categoryId,
          name: r.categoryName,
          outflow: r.outflow,
          inflow: r.inflow,
          net: r.net,
        }))
      : report.byGroup.map((r) => ({
          key: r.groupId,
          name: r.groupName,
          outflow: r.outflow,
          inflow: r.inflow,
          net: r.net,
        }));
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.net)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
        {(['this_month', 'last_month', 'this_year', 'custom'] as Preset[]).map(
          (p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className={cn(
                'h-11 text-xs font-medium',
                preset === p
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-500 active:bg-ink-100 dark:active:bg-ink-800',
              )}
            >
              {labelFor(p)}
            </button>
          ),
        )}
      </div>

      {preset === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <input
              type="date"
              className={inputClass}
              value={range[0]}
              onChange={(e) => setRange([e.target.value, range[1]])}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              className={inputClass}
              value={range[1]}
              onChange={(e) => setRange([range[0], e.target.value])}
            />
          </Field>
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
        <div className="text-[11px] uppercase tracking-wider text-ink-500">
          Net spent
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {formatMoney(report.totals.net)}
        </div>
        <div className="mt-1 text-xs text-ink-500">
          Out {formatMoney(report.totals.outflow)} · In{' '}
          {formatMoney(report.totals.inflow)}
        </div>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
        <GroupingButton
          active={grouping === 'category'}
          onClick={() => setGrouping('category')}
          label="By category"
        />
        <GroupingButton
          active={grouping === 'group'}
          onClick={() => setGrouping('group')}
          label="By group"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">
          No transactions in this range yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const widthPct = Math.round((Math.abs(r.net) / max) * 100);
            return (
              <li
                key={r.key}
                className="rounded-xl bg-white p-3 shadow-sm dark:bg-ink-800"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 truncate text-sm">{r.name}</div>
                  <div
                    className={cn(
                      'text-sm tabular-nums',
                      r.net < 0 && 'text-brand-600',
                    )}
                  >
                    {formatMoney(r.net)}
                  </div>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      r.net < 0 ? 'bg-brand-500' : 'bg-danger-500',
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function labelFor(p: Preset): string {
  switch (p) {
    case 'this_month':
      return 'This month';
    case 'last_month':
      return 'Last month';
    case 'this_year':
      return 'This year';
    case 'custom':
      return 'Custom';
  }
}

function GroupingButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-11 text-sm font-medium',
        active
          ? 'bg-brand-600 text-white'
          : 'text-ink-500 active:bg-ink-100 dark:active:bg-ink-800',
      )}
    >
      {label}
    </button>
  );
}
