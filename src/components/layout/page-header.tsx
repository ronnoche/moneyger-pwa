import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ title, backTo, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {backTo && (
        <Link
          to={backTo}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 active:bg-ink-100 dark:active:bg-ink-800"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </Link>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {action}
    </div>
  );
}
