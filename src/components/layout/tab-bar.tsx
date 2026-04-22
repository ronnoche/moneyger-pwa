import { NavLink } from 'react-router';
import {
  BarChart3,
  Landmark,
  LayoutDashboard,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Mobile tab bar: 4 primary destinations per DESIGN_1 §4 Tab bar.
// Labels mirror the desktop sidebar ("Reflect") for cross-platform consistency.
const tabs = [
  { to: '/', label: 'Budget', icon: LayoutDashboard, end: true },
  { to: '/reports', label: 'Reflect', icon: BarChart3, end: false },
  { to: '/accounts', label: 'Accounts', icon: Landmark, end: false },
  { to: '/more', label: 'More', icon: Menu, end: false },
] as const;

export function TabBar() {
  return (
    <nav
      className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 backdrop-blur-lg"
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
                  'flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.05em]',
                  isActive
                    ? 'text-[color:var(--color-brand-600)] dark:text-[color:var(--color-brand-500)]'
                    : 'text-[color:var(--color-fg-muted)]',
                )
              }
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
