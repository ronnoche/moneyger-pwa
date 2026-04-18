import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from '@/components/ui/sheet';
import { useCategories, useGroups } from '@/db/hooks';
import { db } from '@/db/db';
import { AVAILABLE_TO_BUDGET, availableToBudget, categoryAvailable } from '@/lib/budget-math';
import { cn } from '@/lib/cn';
import { inputClass } from '@/components/ui/field';
import { formatMoney } from '@/lib/format';
import { getRecentCategoryIds, pushRecentCategoryId } from '@/lib/recent-categories';
import { useCategoryLabel } from '@/hooks/use-category-label';

interface CategoryPickerProps {
  value: string;
  onChange: (id: string) => void;
  includeAvailableToBudget?: boolean;
  id?: string;
  placeholder?: string;
}

export function CategoryPicker({
  value,
  onChange,
  includeAvailableToBudget = true,
  id,
  placeholder = 'Pick a category',
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);

  const label = useCategoryLabel(value);

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          inputClass,
          'flex items-center justify-between text-left',
          !label && 'text-[color:var(--color-fg-subtle)]',
        )}
      >
        <span className="truncate">{label || placeholder}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-[color:var(--color-fg-muted)]"
        />
      </button>

      <CategorySheet
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        includeAvailableToBudget={includeAvailableToBudget}
      />
    </>
  );
}

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (id: string) => void;
  includeAvailableToBudget?: boolean;
}

export function CategorySheet({
  open,
  onOpenChange,
  value,
  onChange,
  includeAvailableToBudget = true,
}: CategorySheetProps) {
  const [query, setQuery] = useState('');
  const groups = useGroups();
  const categories = useCategories();
  const txns = useLiveQuery(() => db.transactions.toArray(), []);
  const tfrs = useLiveQuery(() => db.transfers.toArray(), []);

  const recentIds = useMemo(
    () => (open ? getRecentCategoryIds() : []),
    [open],
  );

  const atb = useMemo(
    () => availableToBudget(txns ?? [], tfrs ?? []),
    [txns, tfrs],
  );

  const availableById = useMemo(() => {
    const map = new Map<string, number>();
    (categories ?? []).forEach((c) => {
      map.set(c.id, categoryAvailable(c.id, txns ?? [], tfrs ?? []));
    });
    return map;
  }, [categories, txns, tfrs]);

  const q = query.trim().toLowerCase();
  const filteredCats = useMemo(() => {
    if (!categories) return [];
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, q]);

  const recent = useMemo(
    () =>
      recentIds
        .map((rid) => (categories ?? []).find((c) => c.id === rid))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [recentIds, categories],
  );

  function select(nextId: string) {
    onChange(nextId);
    if (nextId !== AVAILABLE_TO_BUDGET) pushRecentCategoryId(nextId);
    onOpenChange(false);
    setQuery('');
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
      title="Pick a category"
    >
        <div className="sticky top-0 z-10 bg-[color:var(--color-surface)] pb-2">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-fg-muted)]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories"
              className="w-full h-11 pl-9 pr-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-brand-600)]"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto pb-2">
          {includeAvailableToBudget && !q && (
            <PickerRow
              label="Available to Budget"
              available={atb}
              selected={value === AVAILABLE_TO_BUDGET}
              onClick={() => select(AVAILABLE_TO_BUDGET)}
            />
          )}

          {!q && recent.length > 0 && (
            <div className="mt-3">
              <SectionHeader label="Recently used" />
              <ul>
                {recent.map((cat) => (
                  <li key={cat.id}>
                    <PickerRow
                      label={cat.name}
                      available={availableById.get(cat.id) ?? 0}
                      selected={value === cat.id}
                      onClick={() => select(cat.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {q ? (
            <ul className="mt-2">
              {filteredCats.map((cat) => (
                <li key={cat.id}>
                  <PickerRow
                    label={cat.name}
                    available={availableById.get(cat.id) ?? 0}
                    selected={value === cat.id}
                    onClick={() => select(cat.id)}
                  />
                </li>
              ))}
              {filteredCats.length === 0 && (
                <p className="p-4 text-sm text-[color:var(--color-fg-muted)]">
                  No categories match &ldquo;{query}&rdquo;.
                </p>
              )}
            </ul>
          ) : (
            (groups ?? []).map((group) => {
              const inGroup = (categories ?? []).filter(
                (c) => c.groupId === group.id,
              );
              if (inGroup.length === 0) return null;
              return (
                <div key={group.id} className="mt-3">
                  <SectionHeader label={group.name} />
                  <ul>
                    {inGroup.map((cat) => (
                      <li key={cat.id}>
                        <PickerRow
                          label={cat.name}
                          available={availableById.get(cat.id) ?? 0}
                          selected={value === cat.id}
                          onClick={() => select(cat.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}

          {(!groups || groups.length === 0) && !q && (
            <p className="p-4 text-sm text-[color:var(--color-fg-muted)]">
              No categories yet. Add some from Settings.
            </p>
          )}
        </div>
      </Sheet>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
      {label}
    </div>
  );
}

interface PickerRowProps {
  label: string;
  available: number;
  selected: boolean;
  onClick: () => void;
}

function PickerRow({ label, available, selected, onClick }: PickerRowProps) {
  const tone =
    available < 0
      ? 'text-[color:var(--color-danger-600)]'
      : 'text-[color:var(--color-fg-muted)]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm',
        'active:bg-[color:var(--color-surface-2)]',
        selected && 'text-[color:var(--color-brand-600)] font-medium',
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <span className="truncate">{label}</span>
        {selected && <Check size={16} strokeWidth={1.75} />}
      </span>
      <span className={cn('font-mono tabular-nums text-xs', tone)}>
        {formatMoney(available)}
      </span>
    </button>
  );
}
