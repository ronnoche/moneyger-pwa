import { useGroups, useCategories, useTransactions, useTransfers } from '@/db/hooks';
import { categoryAvailable } from '@/lib/budget-math';
import { formatMoney } from '@/lib/format';

export default function Dashboard() {
  const groups = useGroups();
  const categories = useCategories();
  const txns = useTransactions();
  const tfrs = useTransfers();

  const loading = !groups || !categories || !txns || !tfrs;

  if (loading) {
    return <div className="p-4 text-sm text-ink-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>

      {groups.length === 0 ? (
        <p className="text-sm text-ink-500">
          No groups yet. Open Settings to create your first one.
        </p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => {
            const inGroup = categories.filter((c) => c.groupId === group.id);
            return (
              <li key={group.id}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-500">
                  {group.name}
                </h2>
                <ul className="divide-y divide-ink-200 rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
                  {inGroup.map((cat) => {
                    const avail = categoryAvailable(cat.id, txns, tfrs);
                    return (
                      <li
                        key={cat.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-sm tabular-nums">
                          {formatMoney(avail)}
                        </span>
                      </li>
                    );
                  })}
                  {inGroup.length === 0 && (
                    <li className="px-4 py-3 text-sm text-ink-400">
                      No categories
                    </li>
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
