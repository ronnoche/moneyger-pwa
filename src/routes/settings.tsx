import { Link } from 'react-router';
import { useGroups, useCategories, useAccounts } from '@/db/hooks';

export default function Settings() {
  const groups = useGroups();
  const categories = useCategories();
  const accounts = useAccounts();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>

      <section className="space-y-3">
        <SettingsRow label="Groups" count={groups?.length ?? 0} />
        <SettingsRow label="Bucket Lists" count={categories?.length ?? 0} />
        <SettingsRow label="Accounts" count={accounts?.length ?? 0} />
      </section>

      <p className="mt-6 text-sm text-ink-500">
        Editing UI lands in Phase 3. For now, start from{' '}
        <Link to="/onboarding" className="text-brand-600 underline">
          onboarding
        </Link>
        .
      </p>
    </div>
  );
}

function SettingsRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-ink-800">
      <span className="text-sm">{label}</span>
      <span className="text-sm tabular-nums text-ink-500">{count}</span>
    </div>
  );
}
