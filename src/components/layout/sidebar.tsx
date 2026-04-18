import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Wallet,
} from 'lucide-react';
import { useAccounts, useTransactions } from '@/db/hooks';
import { accountSettledBalance } from '@/lib/budget-math';
import { AmountDisplay } from '@/components/ui/amount-display';
import { useTheme } from '@/app/use-theme';
import { cn } from '@/lib/cn';

interface SidebarProps {
  onOpenPalette: () => void;
}

const primary = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered, end: false },
  { to: '/budget', label: 'Move Money', icon: Wallet, end: false },
  { to: '/reports', label: 'Reports', icon: BarChart3, end: false },
] as const;

export function Sidebar({ onOpenPalette }: SidebarProps) {
  const accounts = useAccounts();
  const txns = useTransactions();
  const { resolved, setPreference } = useTheme();
  const [accountsOpen, setAccountsOpen] = useState(true);

  const netCash = useMemo(() => {
    if (!accounts || !txns) return 0;
    return accounts.reduce((acc, a) => acc + accountSettledBalance(a.id, txns), 0);
  }, [accounts, txns]);

  return (
    <aside
      aria-label="Primary"
      className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-[color:var(--color-border)] lg:bg-[color:var(--color-surface)]"
    >
      <div className="flex h-14 items-center gap-2 border-b border-[color:var(--color-border)] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-brand-600)] text-white">
          <span className="text-sm font-semibold">A</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">Aspire</span>
        <button
          type="button"
          onClick={onOpenPalette}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1.5 text-[10px] font-medium text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)]"
          aria-label="Open command palette"
          title="Command palette (Cmd+K)"
        >
          <kbd className="font-sans">⌘</kbd>
          <kbd className="font-sans">K</kbd>
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-2" aria-label="Primary navigation">
        {primary.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium',
                isActive
                  ? 'bg-[color:var(--color-brand-600)]/10 text-[color:var(--color-brand-700)]'
                  : 'text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]',
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mx-2 my-1 border-t border-[color:var(--color-border)]" />

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <button
          type="button"
          onClick={() => setAccountsOpen((v) => !v)}
          className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          aria-expanded={accountsOpen}
        >
          {accountsOpen ? (
            <ChevronDown size={12} strokeWidth={1.75} />
          ) : (
            <ChevronRight size={12} strokeWidth={1.75} />
          )}
          <span>Accounts</span>
          <span className="ml-auto font-mono tabular-nums text-[11px] normal-case text-[color:var(--color-fg-muted)]">
            <AmountDisplay
              value={netCash}
              tone={netCash < 0 ? 'negative' : 'neutral'}
              size="sm"
            />
          </span>
        </button>

        {accountsOpen && accounts && (
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {accounts.map((a) => {
              const Icon = a.isCreditCard ? CreditCard : Landmark;
              const balance = txns ? accountSettledBalance(a.id, txns) : 0;
              return (
                <li key={a.id}>
                  <NavLink
                    to={`/accounts/${a.id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex h-8 items-center gap-2 rounded-md px-2 text-[13px]',
                        isActive
                          ? 'bg-[color:var(--color-brand-600)]/10 text-[color:var(--color-brand-700)]'
                          : 'text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]',
                      )
                    }
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.75}
                      className={cn(
                        a.isCreditCard && 'text-[color:var(--color-danger-600)]',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="shrink-0 font-mono tabular-nums text-[11px]">
                      <AmountDisplay
                        value={balance}
                        tone={balance < 0 ? 'negative' : 'neutral'}
                        size="sm"
                      />
                    </span>
                  </NavLink>
                </li>
              );
            })}
            <li>
              <Link
                to="/accounts"
                className="flex h-8 items-center rounded-md px-2 text-[12px] text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-fg-muted)]"
              >
                All accounts
              </Link>
            </li>
          </ul>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-[color:var(--color-border)] px-2 py-2">
        <button
          type="button"
          onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          title={resolved === 'dark' ? 'Switch to light' : 'Switch to dark'}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
        >
          {resolved === 'dark' ? (
            <Sun size={16} strokeWidth={1.75} />
          ) : (
            <Moon size={16} strokeWidth={1.75} />
          )}
        </button>
        <Link
          to="/settings"
          aria-label="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
        >
          <SettingsIcon size={16} strokeWidth={1.75} />
        </Link>
        <Link
          to="/more"
          className="ml-auto text-[11px] text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-fg-muted)]"
        >
          More
        </Link>
      </div>
    </aside>
  );
}
