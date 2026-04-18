import { forwardRef } from 'react';
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { inputClass } from '@/components/ui/field';
import { evaluateExpression } from '@/lib/expression';
import { parseMoneyInput } from '@/lib/format';

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'>;

interface MoneyInputProps extends NativeProps {
  enableExpression?: boolean;
}

function dispatchValue(node: HTMLInputElement, next: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(node, next);
  node.dispatchEvent(new Event('input', { bubbles: true }));
  node.dispatchEvent(new Event('change', { bubbles: true }));
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    { className, placeholder = '0.00', onKeyDown, onBlur, enableExpression = true, ...rest },
    ref,
  ) => {
    function tryEvaluate(node: HTMLInputElement): boolean {
      if (!enableExpression) return false;
      const raw = node.value;
      if (!/[+\-*/]/.test(raw)) return false;
      const result = evaluateExpression(raw);
      if (result === null) return false;
      dispatchValue(node, result.toFixed(2));
      return true;
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === '=' || e.key === 'Enter') {
            const evaluated = tryEvaluate(e.currentTarget);
            if (evaluated && e.key === '=') e.preventDefault();
          }
          onKeyDown?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          const node = e.currentTarget;
          const raw = node.value;
          if (enableExpression && /[+\-*/]/.test(raw)) {
            tryEvaluate(node);
          } else if (raw) {
            const parsed = parseMoneyInput(raw);
            if (Number.isFinite(parsed)) {
              const normalized = parsed.toFixed(2);
              if (normalized !== raw) dispatchValue(node, normalized);
            }
          }
          onBlur?.(e);
        }}
        className={cn(inputClass, 'text-right tabular-nums font-mono', className)}
        {...rest}
      />
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
