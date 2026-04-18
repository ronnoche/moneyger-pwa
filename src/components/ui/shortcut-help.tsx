import { Sheet } from '@/components/ui/sheet';

interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

interface Row {
  keys: string[];
  label: string;
}

const NAV: Row[] = [
  { keys: ['g', 'd'], label: 'Dashboard' },
  { keys: ['g', 't'], label: 'Transactions' },
  { keys: ['g', 'b'], label: 'Move Money' },
  { keys: ['g', 'r'], label: 'Reports' },
  { keys: ['g', 'a'], label: 'Accounts' },
  { keys: ['g', 's'], label: 'Settings' },
];

const ACTIONS: Row[] = [
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['n'], label: 'New transaction' },
  { keys: ['m'], label: 'Move money' },
  { keys: ['/'], label: 'Focus search' },
  { keys: ['Esc'], label: 'Close sheet or dialog' },
  { keys: ['?'], label: 'Show this help' },
];

export function ShortcutHelp({ open, onOpenChange }: ShortcutHelpProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts">
      <div className="grid grid-cols-1 gap-6 pb-2 sm:grid-cols-2">
        <Section title="Navigate" rows={NAV} />
        <Section title="Actions" rows={ACTIONS} />
      </div>
    </Sheet>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {title}
      </h3>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-[color:var(--color-fg)]">{r.label}</span>
            <span className="flex items-center gap-1">
              {r.keys.map((k, i) => (
                <kbd
                  key={i}
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-1.5 font-mono text-[11px] text-[color:var(--color-fg-muted)]"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
