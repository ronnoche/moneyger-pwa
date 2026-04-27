import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
import { subscribeSyncStatus } from '@/lib/sync';
import { toast } from '@/lib/toast';

type IndicatorState =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'success'; syncedAt: string }
  | { state: 'error'; error: string };

function getSuccessLabel(syncedAt: string): string {
  const ageMs = Date.now() - new Date(syncedAt).getTime();
  if (ageMs < 30_000) return 'Synced just now';
  if (ageMs < 60_000) return 'Synced under a minute ago';
  return `Synced at ${new Date(syncedAt).toLocaleTimeString()}`;
}

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<IndicatorState>({ state: 'idle' });

  useEffect(() => subscribeSyncStatus(setStatus), []);

  const label = useMemo(() => {
    if (status.state === 'syncing') return 'Syncing...';
    if (status.state === 'success') return getSuccessLabel(status.syncedAt);
    if (status.state === 'error') return 'Sync failed';
    return 'Sync idle';
  }, [status]);

  if (status.state === 'idle') return null;

  if (status.state === 'error') {
    return (
      <button
        type="button"
        onClick={() => toast.error('Sync failed', status.error)}
        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-danger-300)] bg-[color:var(--color-danger-50)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-danger-700)]"
        title={status.error}
      >
        <TriangleAlert size={12} />
        <span>{label}</span>
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

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CircleCheck size={12} />
      <span>{label}</span>
    </div>
  );
}
