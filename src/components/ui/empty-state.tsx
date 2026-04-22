import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  BucketsIllustration,
  ReceiptIllustration,
  CoinPurseIllustration,
  MountainIllustration,
  MagnifierCrossedIllustration,
} from '@/components/illustrations/empty-state-illustrations';

export type EmptyStateKind =
  | 'buckets'
  | 'receipt'
  | 'coin-purse'
  | 'mountain'
  | 'search';

interface EmptyStateProps {
  kind: EmptyStateKind;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const illustrations: Record<EmptyStateKind, React.ComponentType> = {
  buckets: BucketsIllustration,
  receipt: ReceiptIllustration,
  'coin-purse': CoinPurseIllustration,
  mountain: MountainIllustration,
  search: MagnifierCrossedIllustration,
};

export function EmptyState({
  kind,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Illustration = illustrations[kind];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12 gap-4',
        className,
      )}
    >
      <Illustration />
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-semibold text-[color:var(--color-fg)]">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
