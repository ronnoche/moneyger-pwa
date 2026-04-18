import { useCallback, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Moon,
  Plus,
  Receipt,
  Settings,
  Sun,
  SunMoon,
  Wallet,
} from 'lucide-react';
import { useTheme } from '@/app/use-theme';
import { useAccounts } from '@/db/hooks';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { setPreference } = useTheme();
  const accounts = useAccounts();
  const [value, setValue] = useState('');

  const run = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      setValue('');
      fn();
    },
    [onOpenChange],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setValue('');
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Command palette"
      overlayClassName="fixed inset-0 bg-black/50 z-[69] data-[state=open]:animate-fade-in"
      contentClassName="fixed left-1/2 top-[10vh] z-[70] w-[92vw] max-w-lg -translate-x-1/2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-lg)] overflow-hidden outline-none"
      value={value}
      onValueChange={setValue}
    >
      <div className="flex flex-col">
        <Command.Input
          placeholder="Type a command or search..."
          className="w-full h-12 px-4 bg-transparent border-b border-[color:var(--color-border)] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none"
        />
        <Command.List className="max-h-[60dvh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-[color:var(--color-fg-muted)]">
            No results.
          </Command.Empty>

          <Command.Group heading="Navigate" className="cmdk-group">
            <Item
              icon={<LayoutDashboard size={16} strokeWidth={1.75} />}
              label="Dashboard"
              shortcut={['g', 'd']}
              onSelect={() => run(() => navigate('/'))}
            />
            <Item
              icon={<Receipt size={16} strokeWidth={1.75} />}
              label="Transactions"
              shortcut={['g', 't']}
              onSelect={() => run(() => navigate('/transactions'))}
            />
            <Item
              icon={<Wallet size={16} strokeWidth={1.75} />}
              label="Move Money"
              shortcut={['g', 'b']}
              onSelect={() => run(() => navigate('/budget'))}
            />
            <Item
              icon={<BarChart3 size={16} strokeWidth={1.75} />}
              label="Reports"
              shortcut={['g', 'r']}
              onSelect={() => run(() => navigate('/reports'))}
            />
            <Item
              icon={<CreditCard size={16} strokeWidth={1.75} />}
              label="Accounts"
              shortcut={['g', 'a']}
              onSelect={() => run(() => navigate('/accounts'))}
            />
            <Item
              icon={<Settings size={16} strokeWidth={1.75} />}
              label="Settings"
              shortcut={['g', 's']}
              onSelect={() => run(() => navigate('/settings'))}
            />
          </Command.Group>

          <Command.Group heading="Create" className="cmdk-group">
            <Item
              icon={<Plus size={16} strokeWidth={1.75} />}
              label="New Transaction"
              shortcut={['n']}
              onSelect={() => run(() => navigate('/transactions/new'))}
            />
            <Item
              icon={<ArrowLeftRight size={16} strokeWidth={1.75} />}
              label="Move Money"
              shortcut={['m']}
              onSelect={() => run(() => navigate('/budget'))}
            />
          </Command.Group>

          {accounts && accounts.length > 0 && (
            <Command.Group heading="Go to account" className="cmdk-group">
              {accounts.map((a) => (
                <Item
                  key={a.id}
                  icon={
                    a.isCreditCard ? (
                      <CreditCard size={16} strokeWidth={1.75} />
                    ) : (
                      <Landmark size={16} strokeWidth={1.75} />
                    )
                  }
                  label={a.name}
                  onSelect={() => run(() => navigate(`/accounts/${a.id}`))}
                />
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Theme" className="cmdk-group">
            <Item
              icon={<Sun size={16} strokeWidth={1.75} />}
              label="Light"
              onSelect={() => run(() => setPreference('light'))}
            />
            <Item
              icon={<Moon size={16} strokeWidth={1.75} />}
              label="Dark"
              onSelect={() => run(() => setPreference('dark'))}
            />
            <Item
              icon={<SunMoon size={16} strokeWidth={1.75} />}
              label="System"
              onSelect={() => run(() => setPreference('system'))}
            />
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  shortcut?: string[];
}

function Item({ icon, label, onSelect, shortcut }: ItemProps) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[color:var(--color-fg)] data-[selected=true]:bg-[color:var(--color-surface-2)] cursor-pointer"
    >
      <span className="text-[color:var(--color-fg-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="flex items-center gap-1">
          {shortcut.map((k, i) => (
            <kbd
              key={i}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]"
            >
              {k}
            </kbd>
          ))}
        </span>
      )}
    </Command.Item>
  );
}
