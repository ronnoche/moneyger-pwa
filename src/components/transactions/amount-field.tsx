import { useEffect, useRef, useState } from 'react';
import { HeroAmount } from './hero-amount';

interface AmountFieldProps {
  value: number;
  onChange: (next: number) => void;
  direction: 'outflow' | 'inflow';
  currency?: string;
  size?: 'default' | 'large';
}

function normalize(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const singleDot =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  const [int, dec] = singleDot.split('.');
  return dec !== undefined ? `${int}.${dec.slice(0, 2)}` : singleDot;
}

export function AmountField({
  value,
  onChange,
  direction,
  currency,
  size = 'default',
}: AmountFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<string>(() => (value > 0 ? value.toFixed(2) : ''));

  useEffect(() => {
    const currentParsed = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(currentParsed) || Math.abs(currentParsed - value) > 0.0001) {
      setRaw(value > 0 ? value.toFixed(2) : '');
    }
  }, [value, raw]);

  function handleInput(next: string) {
    const cleaned = normalize(next);
    setRaw(cleaned);
    if (cleaned === '' || cleaned === '.') {
      onChange(0);
      return;
    }
    const parsed = Number(cleaned);
    onChange(Number.isFinite(parsed) ? parsed : 0);
  }

  function handleBlur() {
    if (raw === '' || raw === '.') return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) setRaw(parsed.toFixed(2));
  }

  return (
    <div
      className="relative flex cursor-text justify-center"
      onClick={() => inputRef.current?.focus()}
    >
      <HeroAmount
        value={value}
        direction={direction}
        currency={currency}
        size={size}
      />
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={handleBlur}
        autoComplete="off"
        aria-label="Amount"
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
      />
    </div>
  );
}
