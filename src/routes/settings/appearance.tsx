import { Check } from 'lucide-react';
import { useTheme } from '@/app/use-theme';
import type { ThemePreference } from '@/app/theme-context';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

const options: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Match the device setting' },
  { value: 'light', label: 'Light', hint: 'Always light mode' },
  { value: 'dark', label: 'Dark', hint: 'Always dark mode' },
];

export default function SettingsAppearance() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Appearance" backTo="/settings" />

      <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
        {options.map((o) => {
          const selected = preference === o.value;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => setPreference(o.value)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-ink-100 dark:active:bg-ink-700',
                  selected && 'text-brand-600',
                )}
              >
                <div>
                  <div className="text-sm">{o.label}</div>
                  <div className="text-xs text-ink-500">{o.hint}</div>
                </div>
                {selected && <Check size={18} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
