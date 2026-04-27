import { Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrency } from '@/app/use-currency';
import { CURRENCY_OPTIONS } from '@/lib/currency-options';
import { cn } from '@/lib/cn';

export default function SettingsCurrency() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Currency" backTo="/settings" />

      <p className="mb-1 text-sm text-ink-500">
        Used for all amounts, charts, and number formatting in the app. Does not
        convert existing balances.
      </p>
      <p className="mb-3 text-xs text-ink-400">
        {CURRENCY_OPTIONS.length} currencies — scroll the list to see them all.
      </p>

      <ul
        className={cn(
          'divide-y divide-ink-200 h-64 sm:h-72',
          'overflow-y-scroll overflow-x-hidden overscroll-y-contain',
          'rounded-xl border border-ink-200 bg-white shadow-sm [scrollbar-gutter:stable] dark:divide-ink-700 dark:border-ink-600 dark:bg-ink-800',
        )}
        aria-label="Currency options"
      >
        {CURRENCY_OPTIONS.map((o) => {
          const selected = currency === o.code;
          return (
            <li key={o.code}>
              <button
                type="button"
                onClick={() => setCurrency(o.code)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-ink-100 dark:active:bg-ink-700',
                  selected && 'text-brand-600',
                )}
              >
                <div>
                  <div className="text-sm">
                    {o.label}{' '}
                    <span className="text-ink-400">({o.code})</span>
                  </div>
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
