import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings as SettingsIcon,
  Sun,
  Wallet,
} from 'lucide-react';
import { useAccounts, useTransactions } from '@/db/hooks';
import { accountSettledBalance } from '@/lib/budget-math';
import { AmountDisplay } from '@/components/ui/amount-display';
import { useTheme } from '@/app/use-theme';
import { cn } from '@/lib/cn';
import type { Account } from '@/db/schema';

interface SidebarProps {
  onOpenPalette: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

type AccountGroupKey = 'cash' | 'credit' | 'loans' | 'tracking';

const GROUP_ORDER: AccountGroupKey[] = ['cash', 'credit', 'loans', 'tracking'];

const GROUP_LABELS: Record<AccountGroupKey, string> = {
  cash: 'Cash',
  credit: 'Credit',
  loans: 'Loans',
  tracking: 'Tracking',
};

function groupForAccount(a: Account): AccountGroupKey {
  // Phase 0 uses the existing isCreditCard boolean. Phase 4 will expand to a
  // `type` enum and split Loans / Tracking.
  return a.isCreditCard ? 'credit' : 'cash';
}

const primary = [
  { to: '/', label: 'Budget', icon: LayoutDashboard, end: true },
  { to: '/reports', label: 'Reflect', icon: BarChart3, end: false },
  { to: '/accounts', label: 'All Accounts', icon: Wallet, end: true },
] as const;

export function Sidebar({
  onOpenPalette,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const accounts = useAccounts();
  const txns = useTransactions();
  const { resolved, setPreference } = useTheme();

  const [openGroups, setOpenGroups] = useState<Record<AccountGroupKey, boolean>>({
    cash: true,
    credit: true,
    loans: true,
    tracking: true,
  });

  const netCash = useMemo(() => {
    if (!accounts || !txns) return 0;
    return accounts.reduce((acc, a) => acc + accountSettledBalance(a.id, txns), 0);
  }, [accounts, txns]);

  const grouped = useMemo(() => {
    const map: Record<AccountGroupKey, Account[]> = {
      cash: [],
      credit: [],
      loans: [],
      tracking: [],
    };
    if (accounts) {
      for (const a of accounts) {
        map[groupForAccount(a)].push(a);
      }
    }
    return map;
  }, [accounts]);

  const hasAccounts = (accounts?.length ?? 0) > 0;

  return (
    <aside
      aria-label="Primary"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'hidden lg:flex lg:shrink-0 lg:flex-col lg:border-r lg:border-[color:var(--color-border)] lg:bg-[color:var(--color-surface)]',
        collapsed ? 'lg:w-16' : 'lg:w-60',
      )}
    >
      {/* Budget switcher row */}
      <div
        className={cn(
          'flex h-14 items-center gap-2 border-b border-[color:var(--color-border)]',
          collapsed ? 'justify-center px-0' : 'px-3',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-brand-600)] text-white">
          <span className="text-sm font-semibold">A</span>
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold tracking-tight">
              Moneyger
            </span>
            <span className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
              My Budget
            </span>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            aria-label="Switch budget"
            title="Switch budget (coming soon)"
            disabled
            className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-fg-subtle)] opacity-60"
          >
            <ChevronDown size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Command palette trigger (kept; collapses to icon) */}
      <div
        className={cn(
          'flex items-center border-b border-[color:var(--color-border)] py-2',
          collapsed ? 'justify-center px-0' : 'px-3',
        )}
      >
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[11px] font-medium text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)]',
            collapsed ? 'w-8 justify-center' : 'w-full px-2',
          )}
          aria-label="Open command palette"
          title="Command palette (Cmd+K)"
        >
          {collapsed ? (
            <span aria-hidden>⌘K</span>
          ) : (
            <>
              <span>Search or jump to...</span>
              <span className="ml-auto inline-flex items-center gap-0.5">
                <kbd className="font-sans">⌘</kbd>
                <kbd className="font-sans">K</kbd>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Primary nav */}
      <nav
        className={cn('flex flex-col gap-0.5 py-2', collapsed ? 'px-1' : 'px-2')}
        aria-label="Primary navigation"
      >
        {primary.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center rounded-md text-sm font-medium',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]'
                  : 'text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]',
              )
            }
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mx-2 my-1 border-t border-[color:var(--color-border)]" />

      {/* Accounts section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!collapsed && !hasAccounts && (
          <EmptyAccountsCallout />
        )}

        {!collapsed && hasAccounts && (
          <div className="mt-1 flex items-center px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            <span>Accounts</span>
            <span className="ml-auto font-mono tabular-nums text-[11px] normal-case text-[color:var(--color-fg-muted)]">
              <AmountDisplay
                value={netCash}
                tone={netCash < 0 ? 'negative' : 'neutral'}
                size="sm"
              />
            </span>
          </div>
        )}

        {hasAccounts && (
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {GROUP_ORDER.map((groupKey) => {
              const list = grouped[groupKey];
              if (list.length === 0) return null;
              const open = openGroups[groupKey];
              const groupSum = txns
                ? list.reduce((a, acct) => a + accountSettledBalance(acct.id, txns), 0)
                : 0;

              return (
                <li key={groupKey}>
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((s) => ({ ...s, [groupKey]: !s[groupKey] }))
                      }
                      className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
                      aria-expanded={open}
                    >
                      {open ? (
                        <ChevronDown size={12} strokeWidth={1.75} />
                      ) : (
                        <ChevronRight size={12} strokeWidth={1.75} />
                      )}
                      <span>{GROUP_LABELS[groupKey]}</span>
                      <span className="ml-auto font-mono tabular-nums text-[11px] normal-case">
                        <AmountDisplay
                          value={groupSum}
                          tone={groupSum < 0 ? 'negative' : 'neutral'}
                          size="sm"
                        />
                      </span>
                    </button>
                  )}

                  {(open || collapsed) && (
                    <ul className="mt-0.5 flex flex-col gap-0.5">
                      {list.map((a) => {
                        const Icon = a.isCreditCard ? CreditCard : Landmark;
                        const balance = txns ? accountSettledBalance(a.id, txns) : 0;
                        return (
                          <li key={a.id}>
                            <NavLink
                              to={`/accounts/${a.id}`}
                              title={collapsed ? a.name : undefined}
                              className={({ isActive }) =>
                                cn(
                                  'flex h-9 items-center rounded-md text-[13px]',
                                  collapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                  isActive
                                    ? 'bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]'
                                    : 'text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]',
                                )
                              }
                            >
                              <Icon
                                size={14}
                                strokeWidth={1.75}
                                className={cn(
                                  a.isCreditCard &&
                                    'text-[color:var(--color-danger-600)]',
                                )}
                                aria-hidden
                              />
                              {!collapsed && (
                                <>
                                  <span className="min-w-0 flex-1 truncate">
                                    {a.name}
                                  </span>
                                  <span className="shrink-0 font-mono tabular-nums text-[11px]">
                                    <AmountDisplay
                                      value={balance}
                                      tone={balance < 0 ? 'negative' : 'neutral'}
                                      size="sm"
                                    />
                                  </span>
                                </>
                              )}
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!collapsed && (
          <Link
            to="/settings/accounts"
            className="mt-2 flex h-9 items-center gap-2 rounded-md px-2 text-[13px] text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
          >
            <Plus size={14} strokeWidth={1.75} aria-hidden />
            <span>Add Account</span>
          </Link>
        )}
      </div>

      {/* Footer: theme, settings, collapse toggle */}
      <div
        className={cn(
          'flex items-center border-t border-[color:var(--color-border)] py-2',
          collapsed ? 'flex-col gap-1 px-1' : 'gap-1 px-2',
        )}
      >
        <button
          type="button"
          onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
          aria-label={
            resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          }
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
          title="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
        >
          <SettingsIcon size={16} strokeWidth={1.75} />
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]',
            !collapsed && 'ml-auto',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.75} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.75} />
          )}
        </button>
      </div>
    </aside>
  );
}

function EmptyAccountsCallout() {
  return (
    <div className="mt-2 rounded-lg bg-[color:var(--color-surface-2)] p-3 text-[12px] text-[color:var(--color-fg-muted)]">
      <div className="mb-2 font-medium text-[color:var(--color-fg)]">
        No Accounts
      </div>
      <p className="mb-3 leading-snug">
        Add an account to start tracking balances and budgeting your money.
      </p>
      <Link
        to="/settings/accounts"
        className="inline-flex h-8 items-center gap-1 rounded-md bg-[color:var(--color-brand-600)] px-3 text-[12px] font-medium text-white"
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
        <span>Add Account</span>
      </Link>
    </div>
  );
}
