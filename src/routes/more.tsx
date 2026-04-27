import { Link } from 'react-router';
import {
  ChevronRight,
  FolderTree,
  LogOut,
  Tags,
  Wallet,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthSession } from '@/auth/session';

export default function More() {
  const { signOut } = useAuthSession();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">More</h1>
      <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
        <MoreRow to="/settings/groups" icon={FolderTree} label="Buckets" />
        <MoreRow to="/settings/categories" icon={Tags} label="Bucket Lists" />
        <MoreRow to="/accounts" icon={Wallet} label="Accounts" />
        <MoreRow to="/settings" icon={SettingsIcon} label="Settings" />
        <MoreActionRow
          icon={LogOut}
          label="Log out"
          onClick={() => {
            signOut();
          }}
        />
      </ul>
    </div>
  );
}

function MoreRow({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-3 active:bg-ink-100 dark:active:bg-ink-700">
        <Icon size={20} className="text-ink-500" />
        <span className="flex-1 text-sm">{label}</span>
        <ChevronRight size={18} className="text-ink-400" />
      </Link>
    </li>
  );
}

function MoreActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-100 dark:active:bg-ink-700"
      >
        <Icon size={20} className="text-ink-500" />
        <span className="flex-1 text-sm">{label}</span>
        <ChevronRight size={18} className="text-ink-400" />
      </button>
    </li>
  );
}
