import { useEffect, useState } from 'react';
import { useMotionValue, useMotionValueEvent, useSpring } from 'motion/react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type Tone = 'auto' | 'positive' | 'negative' | 'neutral';
type Size = 'sm' | 'md' | 'lg' | 'hero';

interface AmountDisplayProps {
  value: number;
  tone?: Tone;
  size?: Size;
  currency?: string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  hero: 'text-amount text-5xl sm:text-6xl',
};

function toneClass(tone: Tone, value: number): string {
  const effective: Tone =
    tone === 'auto'
      ? value < 0
        ? 'negative'
        : value > 0
          ? 'positive'
          : 'neutral'
      : tone;
  switch (effective) {
    case 'positive':
      return 'text-[color:var(--color-positive)]';
    case 'negative':
      return 'text-[color:var(--color-danger-600)]';
    case 'neutral':
    default:
      return 'text-[color:var(--color-fg)]';
  }
}

interface Parts {
  sign: string;
  symbol: string;
  integer: string;
  decimal: string;
}

function spelledOut(value: number, currency: string): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'name',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (value < 0) return `negative ${formatted}`;
  return formatted;
}

function formatIntl(value: number, currency: string): Parts {
  const parts = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(value);

  let sign = '';
  let integer = '';
  let decimal = '';
  let symbol = '';
  let seenDecimal = false;
  for (const part of parts) {
    if (part.type === 'minusSign' || part.type === 'plusSign') sign = part.value;
    else if (part.type === 'currency') symbol = part.value;
    else if (part.type === 'integer' || part.type === 'group') integer += part.value;
    else if (part.type === 'decimal') {
      seenDecimal = true;
      decimal += part.value;
    } else if (part.type === 'fraction') {
      decimal += part.value;
    } else if (part.type === 'literal' && !seenDecimal) {
      integer += part.value;
    }
  }
  return { sign, symbol, integer, decimal };
}

export function AmountDisplay({
  value,
  tone = 'auto',
  size = 'md',
  currency = 'USD',
  animate = false,
  className,
  'aria-label': ariaLabel,
}: AmountDisplayProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 180, damping: 26, mass: 1 });
  const [displayValue, setDisplayValue] = useState(value);

  useMotionValueEvent(spring, 'change', (latest) => {
    setDisplayValue(latest);
  });

  useEffect(() => {
    if (shouldAnimate) {
      mv.set(value);
    } else {
      mv.jump(value);
      spring.jump(value);
    }
  }, [value, shouldAnimate, mv, spring]);

  const parts = formatIntl(displayValue, currency);

  const label = ariaLabel ?? spelledOut(value, currency);

  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex items-baseline font-mono tabular-nums',
        sizeClasses[size],
        toneClass(tone, value),
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex items-baseline">
        {parts.sign && <span>{parts.sign}</span>}
        {parts.symbol && <span>{parts.symbol}</span>}
        <span>{parts.integer}</span>
        <span style={{ opacity: 0.8 }}>{parts.decimal}</span>
      </span>
    </span>
  );
}
