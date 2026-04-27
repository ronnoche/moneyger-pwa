import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BudgetFilterId =
  | 'all'
  | 'underfunded'
  | 'overfunded'
  | 'money_available'
  | 'snoozed';

interface Props {
  value: BudgetFilterId;
  onChange: (next: BudgetFilterId) => void;
  search: string;
  onSearchChange: (next: string) => void;
}

const CHIPS: { id: BudgetFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'underfunded', label: 'Underfunded' },
  { id: 'overfunded', label: 'Overfunded' },
  { id: 'money_available', label: 'Money Available' },
  { id: 'snoozed', label: 'Snoozed' },
];

export function FilterChips({ value, onChange, search, onSearchChange }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1"
      data-filter-chips
    >
      {CHIPS.map((chip) => {
        const active = chip.id === value;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            aria-pressed={active}
            className={cn(
              'flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-medium transition-colors',
              active
                ? 'bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]'
                : 'bg-[color:var(--color-ink-100)] text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-surface-2)] dark:bg-[color:var(--color-surface-2)] dark:text-[color:var(--color-fg)]',
            )}
          >
            {chip.label}
          </button>
        );
      })}

      <div className="ml-auto flex items-center">
        {searchOpen ? (
          <div className="flex items-center gap-1 rounded-full bg-[color:var(--color-ink-100)] px-2 dark:bg-[color:var(--color-surface-2)]">
            <Search
              size={14}
              strokeWidth={1.75}
              className="text-[color:var(--color-fg-muted)]"
              aria-hidden
            />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Find bucket list..."
              className="h-8 w-40 bg-transparent text-[13px] outline-none placeholder:text-[color:var(--color-fg-muted)]"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.currentTarget.blur();
                  onSearchChange('');
                  setSearchOpen(false);
                }
              }}
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                onSearchChange('');
                setSearchOpen(false);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-border)]"
            >
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Search bucket lists"
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)]"
          >
            <Search size={14} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
