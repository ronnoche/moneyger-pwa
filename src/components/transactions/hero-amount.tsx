import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { duration, ease } from '@/styles/motion';

interface HeroAmountProps {
  value: number;
  direction: 'outflow' | 'inflow';
  currency?: string;
  size?: 'default' | 'large';
}

function splitParts(value: number, currency: string) {
  const fmt = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const parts = fmt.formatToParts(Math.abs(value));
  let symbol = '';
  let integer = '';
  let decimal = '';
  let hitDecimal = false;
  for (const p of parts) {
    if (p.type === 'currency') symbol = p.value;
    else if (p.type === 'integer' || p.type === 'group') {
      if (!hitDecimal) integer += p.value;
    } else if (p.type === 'decimal') {
      hitDecimal = true;
      decimal += p.value;
    } else if (p.type === 'fraction') {
      decimal += p.value;
    }
  }
  return { symbol, integer, decimal };
}

export function HeroAmount({
  value,
  direction,
  currency = 'USD',
  size = 'default',
}: HeroAmountProps) {
  const parts = useMemo(() => splitParts(value, currency), [value, currency]);
  const empty = value === 0;
  const tone =
    direction === 'inflow'
      ? 'text-[color:var(--color-positive)]'
      : 'text-[color:var(--color-fg)]';

  return (
    <motion.div
      initial={false}
      animate={{
        color:
          direction === 'inflow'
            ? 'var(--color-positive)'
            : 'var(--color-fg)',
      }}
      transition={{ duration: duration.fast, ease: ease.out }}
      aria-label={`${direction === 'inflow' ? 'Inflow' : 'Outflow'} amount ${value.toFixed(2)} ${currency}`}
      className={cn(
        'flex items-baseline justify-center select-none',
        size === 'large' ? 'text-[4.5rem] leading-[4.5rem] sm:text-[5rem] sm:leading-[5rem]' : 'text-amount',
        empty && 'text-[color:var(--color-fg-subtle)]',
      )}
    >
      <span aria-hidden="true" className={cn('inline-flex items-baseline', tone)}>
        <span className="mr-1">{direction === 'inflow' ? '+' : '-'}</span>
        <span>{parts.symbol}</span>
        <span>{parts.integer}</span>
        <span style={{ opacity: 0.7 }}>{parts.decimal}</span>
      </span>
    </motion.div>
  );
}
