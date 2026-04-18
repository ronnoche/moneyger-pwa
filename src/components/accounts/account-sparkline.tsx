import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { addDays, format, isAfter, parseISO, startOfDay, subDays } from 'date-fns';
import type { Transaction } from '@/db/schema';

interface AccountSparklineProps {
  accountId: string;
  txns: Transaction[];
  days?: number;
}

export function AccountSparkline({
  accountId,
  txns,
  days = 7,
}: AccountSparklineProps) {
  const data = useMemo(() => {
    const today = startOfDay(new Date());
    const start = subDays(today, days - 1);

    const mine = txns.filter((t) => t.accountId === accountId);
    const oldestFirst = [...mine].sort((a, b) =>
      a.date === b.date
        ? a.createdAt.localeCompare(b.createdAt)
        : a.date.localeCompare(b.date),
    );

    let priorBalance = 0;
    for (const t of oldestFirst) {
      const d = startOfDay(parseISO(t.date));
      if (isAfter(d, subDays(start, 1))) break;
      priorBalance += t.inflow - t.outflow;
    }

    const deltaByDay = new Map<string, number>();
    for (const t of oldestFirst) {
      const d = startOfDay(parseISO(t.date));
      if (isAfter(start, d)) continue;
      if (isAfter(d, today)) continue;
      const key = format(d, 'yyyy-MM-dd');
      deltaByDay.set(key, (deltaByDay.get(key) ?? 0) + (t.inflow - t.outflow));
    }

    const out: { date: string; balance: number }[] = [];
    let running = priorBalance;
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      const key = format(d, 'yyyy-MM-dd');
      running += deltaByDay.get(key) ?? 0;
      out.push({ date: key, balance: running });
    }
    return out;
  }, [accountId, txns, days]);

  const allSame = data.every((d, _i, arr) => d.balance === arr[0].balance);
  if (data.length === 0 || allSame) return null;

  return (
    <div className="h-12 w-24 shrink-0">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-brand-600)"
            strokeWidth={1.5}
            fill="url(#spark-fill)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
