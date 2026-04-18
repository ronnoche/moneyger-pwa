import { Delete } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { spring } from '@/styles/motion';

interface NumpadProps {
  onChange: (next: number) => void;
  value: number;
  className?: string;
}

const KEYS: Array<string | 'backspace'> = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '.',
  '0',
  'backspace',
];

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function Numpad({ onChange, value, className }: NumpadProps) {
  const cents = toCents(value);

  function press(key: string | 'backspace') {
    haptics.light();
    if (key === 'backspace') {
      onChange(fromCents(Math.floor(cents / 10)));
      return;
    }
    if (key === '.') return;
    const digit = Number(key);
    if (Number.isNaN(digit)) return;
    const next = cents * 10 + digit;
    if (next > 9_999_999_99) return;
    onChange(fromCents(next));
  }

  return (
    <div
      className={cn(
        'safe-pb grid grid-cols-3 gap-2 p-3 bg-[color:var(--color-surface)] border-t border-[color:var(--color-border)]',
        className,
      )}
    >
      {KEYS.map((key) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => press(key)}
          whileTap={{ scale: 0.94 }}
          transition={spring.snappy}
          aria-label={
            key === 'backspace' ? 'Backspace' : key === '.' ? 'Decimal' : `Digit ${key}`
          }
          className={cn(
            'h-14 min-h-12 rounded-xl text-xl font-mono tabular-nums',
            'flex items-center justify-center',
            'bg-[color:var(--color-bg)] text-[color:var(--color-fg)]',
            'active:bg-[color:var(--color-surface-2)]',
            'border border-[color:var(--color-border)]',
            key === '.' && 'opacity-40',
          )}
          disabled={key === '.'}
        >
          {key === 'backspace' ? <Delete size={22} strokeWidth={1.75} /> : key}
        </motion.button>
      ))}
    </div>
  );
}
