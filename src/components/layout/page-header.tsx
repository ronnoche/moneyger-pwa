import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ title, backTo, action }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleBack() {
    const hasHistory = location.key !== 'default';
    if (hasHistory) {
      navigate(-1);
      return;
    }
    if (backTo) {
      navigate(backTo);
    }
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      {backTo && (
        <button
          type="button"
          onClick={handleBack}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 active:bg-ink-100 dark:active:bg-ink-800"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {action}
    </div>
  );
}
