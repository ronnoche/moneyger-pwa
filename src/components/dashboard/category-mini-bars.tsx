import { useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, YAxis } from 'recharts';
import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import type { Transaction } from '@/db/schema';

interface CategoryMiniBarsProps {
  categoryId: string;
  txns: Transaction[];
}

export function CategoryMiniBars({ categoryId, txns }: CategoryMiniBarsProps) {
  const data = useMemo(() => {
    const today = startOfDay(new Date());
    const start = subDays(today, 29);
    const buckets: { date: string; amount: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(start, i);
      buckets.push({ date: format(d, 'yyyy-MM-dd'), amount: 0 });
    }
    const map = new Map(buckets.map((b) => [b.date, b]));
    for (const t of txns) {
      if (t.categoryId !== categoryId) continue;
      const d = startOfDay(parseISO(t.date));
      if (d < start || d > today) continue;
      const key = format(d, 'yyyy-MM-dd');
      const bucket = map.get(key);
      if (bucket) bucket.amount += t.outflow - t.inflow;
    }
    return buckets;
  }, [categoryId, txns]);

  const hasActivity = data.some((d) => d.amount !== 0);
  if (!hasActivity) {
    return (
      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border)] text-xs text-[color:var(--color-fg-muted)]">
        No activity in the last 30 days
      </div>
    );
  }

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={[0, 'auto']} />
          <Bar
            dataKey="amount"
            fill="var(--color-brand-500)"
            radius={[2, 2, 2, 2]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
