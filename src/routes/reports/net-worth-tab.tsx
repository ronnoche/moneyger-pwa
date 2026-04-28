import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAccounts, useNetWorthEntries, useTransactions } from '@/db/hooks';
import {
  createNetWorthEntry,
  deleteNetWorthEntry,
} from '@/features/net-worth/repo';
import {
  netWorthFormSchema,
  type NetWorthFormValues,
} from '@/features/net-worth/schema';
import { computeNetWorthSeries } from '@/lib/reports';
import { accountSettledBalance } from '@/lib/budget-math';
import { formatMoney } from '@/lib/format';
import { Field, inputClass } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/money-input';
import { Sheet } from '@/components/ui/sheet';
import { SwipeRow } from '@/components/swipe-row';
import { useTheme } from '@/app/use-theme';
import { todayISO } from '@/lib/dates';
import { cn } from '@/lib/cn';

export default function NetWorthTab() {
  const accounts = useAccounts();
  const txns = useTransactions();
  const entries = useNetWorthEntries();
  const [addOpen, setAddOpen] = useState(false);

  const series = useMemo(
    () => (entries ? computeNetWorthSeries(entries) : []),
    [entries],
  );

  const liveNetWorth = useMemo(() => {
    if (!accounts || !txns) return null;
    let assets = 0;
    let debts = 0;
    for (const account of accounts) {
      const balance = accountSettledBalance(account.id, txns);
      if (balance >= 0) assets += balance;
      else debts += Math.abs(balance);
    }
    return {
      assets,
      debts,
      net: assets - debts,
    };
  }, [accounts, txns]);

  const latest = liveNetWorth ?? series[series.length - 1];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
        <div className="text-[11px] uppercase tracking-wider text-ink-500">
          Latest net worth
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {latest ? formatMoney(latest.net) : '—'}
        </div>
        {latest && (
          <div className="mt-1 text-xs text-ink-500">
            Assets {formatMoney(latest.assets)} · Debts{' '}
            {formatMoney(latest.debts)}
          </div>
        )}
      </div>

      {series.length >= 2 ? (
        <div className="rounded-xl bg-white p-2 pr-4 shadow-sm dark:bg-ink-800">
          <NetWorthView series={series} />
        </div>
      ) : (
        <p className="rounded-xl bg-white p-4 text-sm text-ink-500 shadow-sm dark:bg-ink-800">
          Log at least two months of entries to see historical trend.
        </p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Entries
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Add entry
        </Button>
      </div>

      {entries === undefined ? (
        <p className="text-sm text-ink-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink-500">
          No entries yet. Log one to start tracking your net worth.
        </p>
      ) : (
        <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
          {entries.map((e) => (
            <li key={e.id}>
              <SwipeRow onDelete={() => deleteNetWorthEntry(e.id)}>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{e.category}</div>
                    <div className="truncate text-xs text-ink-500">
                      {e.date} · {e.type === 'asset' ? 'Asset' : 'Debt'}
                      {e.notes && <span> · {e.notes}</span>}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-sm tabular-nums',
                      e.type === 'debt' ? 'text-danger-600' : 'text-ink-900 dark:text-ink-100',
                    )}
                  >
                    {e.type === 'debt' ? '-' : ''}
                    {formatMoney(e.amount)}
                  </div>
                </div>
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen} title="Add net worth entry">
        <AddEntryForm onClose={() => setAddOpen(false)} />
      </Sheet>
    </div>
  );
}

function NetWorthView({
  series,
}: {
  series: ReturnType<typeof computeNetWorthSeries>;
}) {
  const [mode, setMode] = useState<'chart' | 'table'>('chart');
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end px-2 pt-1">
        <div
          role="tablist"
          aria-label="Display mode"
          className="inline-flex overflow-hidden rounded-lg border border-ink-200 text-[11px] font-medium dark:border-ink-700"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'chart'}
            onClick={() => setMode('chart')}
            className={cn(
              'h-7 px-2',
              mode === 'chart'
                ? 'bg-brand-600 text-white'
                : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800',
            )}
          >
            Chart
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'table'}
            onClick={() => setMode('table')}
            className={cn(
              'h-7 px-2',
              mode === 'table'
                ? 'bg-brand-600 text-white'
                : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800',
            )}
          >
            Table
          </button>
        </div>
      </div>
      {mode === 'chart' ? <NetWorthChart series={series} /> : <NetWorthTable series={series} />}
    </div>
  );
}

function NetWorthTable({
  series,
}: {
  series: ReturnType<typeof computeNetWorthSeries>;
}) {
  return (
    <div className="overflow-x-auto px-2 pb-3">
      <table className="w-full text-xs">
        <caption className="sr-only">Net worth history by month</caption>
        <thead>
          <tr className="text-left text-ink-500">
            <th scope="col" className="py-2 pr-3 font-medium">Month</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Assets</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Debts</th>
            <th scope="col" className="py-2 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200 dark:divide-ink-700">
          {series.map((p) => (
            <tr key={p.label}>
              <th scope="row" className="py-1.5 pr-3 font-normal">{p.label}</th>
              <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(p.assets)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(p.debts)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatMoney(p.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NetWorthChart({
  series,
}: {
  series: ReturnType<typeof computeNetWorthSeries>;
}) {
  const { resolved } = useTheme();
  const axis = resolved === 'dark' ? '#94a3b8' : '#64748b';
  const grid = resolved === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="label" stroke={axis} fontSize={11} />
        <YAxis
          stroke={axis}
          fontSize={11}
          tickFormatter={(v) => compact(Number(v))}
        />
        <Tooltip
          formatter={(v) => formatMoney(Number(v))}
          contentStyle={{
            background: resolved === 'dark' ? '#1e293b' : '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: axis }}
          iconType="plainline"
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="Net"
        />
        <Line
          type="monotone"
          dataKey="assets"
          stroke="#0ea5e9"
          strokeWidth={1.5}
          dot={false}
          name="Assets"
        />
        <Line
          type="monotone"
          dataKey="debts"
          stroke="#ef4444"
          strokeWidth={1.5}
          dot={false}
          name="Debts"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

function AddEntryForm({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NetWorthFormValues>({
    resolver: zodResolver(netWorthFormSchema),
    defaultValues: {
      date: todayISO(),
      type: 'asset',
      category: '',
      amount: '',
      notes: '',
    },
  });

  async function submit(values: NetWorthFormValues) {
    await createNetWorthEntry({
      date: values.date,
      type: values.type,
      category: values.category,
      amount: Number(values.amount),
      notes: values.notes,
    });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 pb-2">
      <Field label="Date" error={errors.date?.message}>
        <input type="date" className={inputClass} {...register('date')} />
      </Field>

      <Field label="Type" error={errors.type?.message}>
        <select className={inputClass} {...register('type')}>
          <option value="asset">Asset</option>
          <option value="debt">Debt</option>
        </select>
      </Field>

      <Field label="Label" error={errors.category?.message}>
        <input
          className={inputClass}
          placeholder="Home value, 401k, Mortgage"
          autoComplete="off"
          {...register('category')}
        />
      </Field>

      <Field label="Amount" error={errors.amount?.message}>
        <MoneyInput {...register('amount')} />
      </Field>

      <Field label="Notes" error={errors.notes?.message}>
        <input
          className={inputClass}
          placeholder="Optional"
          autoComplete="off"
          {...register('notes')}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
