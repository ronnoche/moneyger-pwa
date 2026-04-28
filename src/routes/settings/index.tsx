import { Link } from 'react-router';
import {
  ChevronRight,
  Banknote,
  Database,
  FolderTree,
  LogOut,
  Palette,
  Tags,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthSession } from '@/auth/session';
import { useAccounts, useCategories, useGroups } from '@/db/hooks';
import { PageHeader } from '@/components/layout/page-header';
import { useTheme } from '@/app/use-theme';
import { useCurrency } from '@/app/use-currency';

export default function Settings() {
  const groups = useGroups();
  const categories = useCategories();
  const accounts = useAccounts();
  const { signOut } = useAuthSession();
  const { preference } = useTheme();
  const { currency } = useCurrency();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Settings" backTo="/" />

      <Section label="Budget">
        <Row
          to="/settings/groups"
          icon={FolderTree}
          label="Buckets"
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
        <Row
          to="/settings/currency"
          icon={Banknote}
          label="Currency"
          detail={currency}
        />
        <Row to="/settings/data" icon={Database} label="Data" />
        <Row icon={LogOut} label="Log out" onClick={signOut} />
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
  onClick,
}: {
  to?: string;
  icon: LucideIcon;
  label: string;
  detail?: string;
  onClick?: () => void;
}) {
  const rowClassName =
    'flex items-center gap-3 px-4 py-3 active:bg-ink-100 dark:active:bg-ink-700';
  const content = (
    <>
      <Icon size={20} className="text-ink-500" />
      <span className="flex-1 text-sm">{label}</span>
      {detail && (
        <span className="text-sm capitalize tabular-nums text-ink-400">
          {detail}
        </span>
      )}
      <ChevronRight size={18} className="text-ink-400" />
    </>
  );

  return (
    <li>
      {to ? (
        <Link to={to} className={rowClassName}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className={`${rowClassName} w-full text-left`}
        >
          {content}
        </button>
      )}
    </li>
  );
}
