import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
import { subscribeSyncStatus } from '@/lib/sync';
import { toast } from '@/lib/toast';

/** Hide the success pill after this long so "just now" does not sit stale without re-renders. */
const SUCCESS_BADGE_HIDE_MS = 15_000;

type IndicatorState =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'success'; syncedAt: string }
  | { state: 'error'; error: string; code?: 'sheet_missing' };

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<IndicatorState>({ state: 'idle' });
  const [successBadgeHidden, setSuccessBadgeHidden] = useState(false);

  const successSyncedAt = status.state === 'success' ? status.syncedAt : null;

  useEffect(() => subscribeSyncStatus(setStatus), []);

  useEffect(() => {
    if (!successSyncedAt) {
      setSuccessBadgeHidden(false);
      return;
    }
    setSuccessBadgeHidden(false);
    const id = window.setTimeout(() => {
      setSuccessBadgeHidden(true);
    }, SUCCESS_BADGE_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [successSyncedAt]);

  const label = useMemo(() => {
    if (status.state === 'syncing') return 'Syncing...';
    if (status.state === 'success') return 'Synced just now';
    if (status.state === 'error') return 'Sync failed';
    return 'Sync idle';
  }, [status]);

  if (status.state === 'idle') return null;

  if (status.state === 'error') {
    const title =
      status.code === 'sheet_missing'
        ? `${status.error} Open Settings → Data after fixing the sheet.`
        : status.error;
    return (
      <button
        type="button"
        onClick={() =>
          toast.error(
            status.code === 'sheet_missing' ? 'Google Sheet missing' : 'Sync failed',
            status.error,
          )
        }
        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-danger-300)] bg-[color:var(--color-danger-50)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-danger-700)]"
        title={title}
      >
        <TriangleAlert size={12} />
        <span>{status.code === 'sheet_missing' ? 'Sheet missing' : label}</span>
      </button>
    );
  }

  if (status.state === 'syncing') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-fg-muted)]">
        <Loader2 size={12} className="animate-spin" />
        <span>{label}</span>
      </div>
    );
  }

  if (status.state === 'success' && successBadgeHidden) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CircleCheck size={12} />
      <span>{label}</span>
    </div>
  );
}
