import { cn } from '@/lib/cn';

const LOGO = '/logo.svg';

export function AppLogo({
  className,
  alt = 'Moneyger',
}: {
  className?: string;
  /** Defaults to the app name for screen readers */
  alt?: string;
}) {
  return (
    <img
      src={LOGO}
      alt={alt}
      draggable={false}
      className={cn('pointer-events-none select-none object-contain', className)}
    />
  );
}
