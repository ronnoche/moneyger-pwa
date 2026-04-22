import { Link } from 'react-router';
import {
  ChevronRight,
  Database,
  FolderTree,
  Palette,
  Tags,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAccounts, useCategories, useGroups } from '@/db/hooks';
import { PageHeader } from '@/components/layout/page-header';
import { useTheme } from '@/app/use-theme';

export default function Settings() {
  const groups = useGroups();
  const categories = useCategories();
  const accounts = useAccounts();
  const { preference } = useTheme();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Settings" backTo="/more" />

      <Section label="Budget">
        <Row
          to="/settings/groups"
          icon={FolderTree}
          label="Groups"
          detail={String(groups?.length ?? 0)}
        />
        <Row
          to="/settings/categories"
          icon={Tags}
          label="Bucket Lists"
          detail={String(categories?.length ?? 0)}
        />
        <Row
          to="/settings/accounts"
          icon={Wallet}
          label="Accounts"
          detail={String(accounts?.length ?? 0)}
        />
      </Section>

      <Section label="App">
        <Row
          to="/settings/appearance"
          icon={Palette}
          label="Appearance"
          detail={preference}
        />
        <Row to="/settings/data" icon={Database} label="Data" />
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </h2>
      <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
        {children}
      </ul>
    </section>
  );
}

function Row({
  to,
  icon: Icon,
  label,
  detail,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  detail?: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 px-4 py-3 active:bg-ink-100 dark:active:bg-ink-700"
      >
        <Icon size={20} className="text-ink-500" />
        <span className="flex-1 text-sm">{label}</span>
        {detail && (
          <span className="text-sm capitalize tabular-nums text-ink-400">
            {detail}
          </span>
        )}
        <ChevronRight size={18} className="text-ink-400" />
      </Link>
    </li>
  );
}
