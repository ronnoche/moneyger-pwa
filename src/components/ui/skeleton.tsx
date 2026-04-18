import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  className,
  width,
  height = '1em',
  rounded = 'md',
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block align-middle',
        'bg-[color:var(--color-surface-2)] animate-pulse motion-reduce:animate-none',
        roundedClasses[rounded],
        className,
      )}
      style={{ width, height }}
    />
  );
}

interface SkeletonRowsProps {
  count?: number;
  className?: string;
}

export function SkeletonRows({ count = 3, className }: SkeletonRowsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={48} rounded="lg" className="w-full" />
      ))}
    </div>
  );
}
