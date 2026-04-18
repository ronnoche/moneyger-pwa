import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  ListOrdered,
  ArrowLeftRight,
  BarChart3,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered, end: false },
  { to: '/budget', label: 'Budget', icon: ArrowLeftRight, end: false },
  { to: '/reports', label: 'Reports', icon: BarChart3, end: false },
  { to: '/more', label: 'More', icon: Menu, end: false },
] as const;

export function TabBar() {
  return (
    <nav
      className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/90 backdrop-blur dark:border-ink-700 dark:bg-ink-900/90"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2 pt-1">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium',
                  isActive
                    ? 'text-brand-600 dark:text-brand-500'
                    : 'text-ink-500 dark:text-ink-400',
                )
              }
            >
              <Icon size={22} strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
