import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { spring } from '@/styles/motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof HTMLMotionProps<'button'>
>;

type ButtonProps = BaseProps & HTMLMotionProps<'button'> & NativeButtonProps;

// Per DESIGN_1 §4 Buttons: mobile has no hover. Desktop lifts bg by ~4% lightness.
// Active state scales via Motion whileTap.
const variants: Record<Variant, string> = {
  primary:
    'bg-[color:var(--color-brand-600)] text-white shadow-[var(--shadow-xs)] lg:hover:bg-[color:var(--color-brand-500)] active:bg-[color:var(--color-brand-700)] disabled:opacity-50',
  secondary:
    'bg-[color:var(--color-surface)] text-[color:var(--color-fg)] border border-[color:var(--color-border)] lg:hover:bg-[color:var(--color-surface-2)] active:bg-[color:var(--color-surface-2)]',
  ghost:
    'bg-transparent text-[color:var(--color-fg)] lg:hover:bg-[color:var(--color-surface-2)] active:bg-[color:var(--color-surface-2)]',
  danger:
    'bg-[color:var(--color-danger-600)] text-white shadow-[var(--shadow-xs)] lg:hover:bg-[color:var(--color-danger-500)] active:bg-[color:var(--color-danger-500)]',
};

const sizes: Record<Size, string> = {
  md: 'h-12 px-4 text-base rounded-xl font-semibold',
  sm: 'h-9 px-3 text-sm rounded-lg font-medium',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      loading = false,
      disabled,
      onClick,
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={spring.snappy}
        onClick={(e) => {
          if (isDisabled) return;
          if (variant === 'primary') haptics.light();
          if (variant === 'danger') haptics.confirm();
          onClick?.(e);
        }}
        className={cn(
          'inline-flex items-center justify-center gap-2 select-none',
          'transition-colors',
          variants[variant],
          sizes[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2
            size={size === 'sm' ? 16 : 18}
            strokeWidth={1.75}
            className="animate-spin"
          />
        ) : (
          children
        )}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className, ...rest }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={cn(
          size === 'sm' ? 'h-9 w-9 p-0' : 'h-12 w-12 p-0',
          className,
        )}
        {...rest}
      >
        {icon}
      </Button>
    );
  },
);
IconButton.displayName = 'IconButton';
