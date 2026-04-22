import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wider text-ink-500"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

// Per DESIGN_1 §4 Inputs: 48px height, rounded-lg (8px), 1px ink-200 default,
// 2px brand-600 on focus. Numeric fields can layer `tabular-nums text-right`.
export const inputClass =
  'h-12 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] outline-none focus:border-[color:var(--color-brand-600)] focus:ring-2 focus:ring-[color:var(--color-brand-600)]/20';
