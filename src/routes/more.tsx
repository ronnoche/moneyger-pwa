import { Link } from 'react-router';
import { ChevronRight, Wallet, Settings as SettingsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function More() {
  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">More</h1>
      <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
        <MoreRow to="/accounts" icon={Wallet} label="Accounts" />
        <MoreRow to="/settings" icon={SettingsIcon} label="Settings" />
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
