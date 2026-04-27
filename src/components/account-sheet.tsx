import { useMemo } from 'react';
import { Check, CreditCard, Landmark } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { useAccounts } from '@/db/hooks';
import { cn } from '@/lib/cn';

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (id: string) => void;
}

export function AccountSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: AccountSheetProps) {
  const accounts = useAccounts();
  const active = useMemo(
    () => (accounts ?? []).filter((a) => !a.isArchived),
    [accounts],
  );

  function pick(id: string) {
    onChange(id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Pick an account">
      {active.length === 0 ? (
        <p className="p-4 text-sm text-[color:var(--color-fg-muted)]">
          No accounts yet. Add one from Settings.
        </p>
      ) : (
        <ul className="max-h-[60dvh] overflow-y-auto pb-2">
          {active.map((a) => {
            const selected = value === a.id;
            const Icon = a.accountCategory === 'credit' ? CreditCard : Landmark;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => pick(a.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm',
                    'active:bg-[color:var(--color-surface-2)]',
                    selected && 'text-[color:var(--color-brand-600)] font-medium',
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-[color:var(--color-fg-muted)]"
                  />
                  <span className="flex-1 truncate">{a.name}</span>
                  {selected && <Check size={16} strokeWidth={1.75} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

