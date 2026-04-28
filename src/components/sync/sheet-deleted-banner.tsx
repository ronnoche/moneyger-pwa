import { useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useSheetStatus } from '@/hooks/use-sheet-status';
import { fullSync } from '@/lib/sync';
import { recreateUserSheet } from '@/lib/sheet-resolver';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const SESSION_KEY = 'moneyger:google-session';
function readSessionForBanner(): { accessToken: string; sub: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { accessToken?: string; sub?: string | null; email?: string | null } | null;
    if (!p?.accessToken) return null;
    return { accessToken: p.accessToken, sub: p.sub ?? p.email ?? 'unknown' };
  } catch { return null; }
}

export function SheetDeletedBanner() {
  const status = useSheetStatus();
  const [resyncing, setResyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (status.state !== 'error' || status.code !== 'sheet_missing') {
    return null;
  }

  async function handleResync() {
    setActionError(null);
    setResyncing(true);
    try {
      const session = readSessionForBanner();
      if (!session) { setActionError('Not signed in'); return; }
      await recreateUserSheet(session.accessToken, session.sub);
      const result = await fullSync();
      if (!result.ok) {
        setActionError(result.error ?? 'Re-sync failed');
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Re-sync failed');
    } finally {
      setResyncing(false);
    }
  }

  return (
    <div
      role="alert"
      className={cn(
        'w-full shrink-0 border-b border-[color:var(--color-danger-300)]',
        'bg-[color:var(--color-danger-50)] px-4 py-3 text-[color:var(--color-danger-800)]',
        'dark:border-[color:var(--color-danger-800)] dark:bg-[color:var(--color-danger-950)]/50 dark:text-[color:var(--color-danger-200)]',
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <TriangleAlert
            className="mt-0.5 shrink-0 text-[color:var(--color-danger-600)] dark:text-[color:var(--color-danger-400)]"
            size={20}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">
              Your Google Sheet was deleted or is inaccessible. Click Re-sync to create a new
              one and restore all data.
            </p>
            {actionError ? (
              <p className="mt-2 text-xs text-[color:var(--color-danger-700)] dark:text-[color:var(--color-danger-300)]">
                {actionError}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={resyncing}
            onClick={() => void handleResync()}
            className="w-full border-[color:var(--color-danger-300)] bg-[color:var(--color-bg)] sm:w-auto dark:border-[color:var(--color-danger-800)]"
          >
            {resyncing ? (
              <>
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                Re-syncing…
              </>
            ) : (
              'Re-sync'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
