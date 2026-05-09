import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { db } from '@/db/db';
import { Button } from '@/components/ui/button';
import {
  drainOutbox,
  fullSync,
  subscribeSyncStatus,
  type SyncStatus,
} from '@/lib/sync';
import { getLastSyncedAt } from '@/lib/sync-meta';

const RELATIVE_TICK_MS = 30_000;

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return 'Never';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 'Never';
  const diff = Math.max(0, now - ts);
  const sec = Math.round(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Settings panel showing last-sync timestamp, queue depth, force-sync, and
 * any persistent error from the most recent sync. Backed by the persistent
 * outbox so the queue depth and last-sync time survive reloads.
 */
export function SyncPanel() {
  const pendingCount = useLiveQuery(() => db.outbox.count(), [], 0);
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeSyncStatus(setStatus), []);

  // Refresh "x min ago" labels without re-rendering parents.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), RELATIVE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const lastSyncedAt = getLastSyncedAt();
  const lastError =
    status.state === 'error' ? status.error : null;
  const isSyncing = status.state === 'syncing' || busy;

  async function handleForceSync() {
    setActionMessage(null);
    setBusy(true);
    try {
      // Drain queue first so any pending mutations land before we trust the
      // "last synced" timestamp.
      const drainResult = await drainOutbox();
      if (!drainResult.ok) {
        setActionMessage({
          kind: 'error',
          message: drainResult.error ?? 'Sync failed',
        });
        return;
      }
      setActionMessage({ kind: 'success', message: 'Sync complete.' });
    } catch (err) {
      setActionMessage({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleFullReupload() {
    if (
      !window.confirm(
        'Re-upload every local record to your Google Sheet? This will overwrite matching rows in the sheet with your local data. Use this only for recovery.',
      )
    ) {
      return;
    }
    setActionMessage(null);
    setBusy(true);
    try {
      const result = await fullSync();
      if (!result.ok) {
        setActionMessage({
          kind: 'error',
          message: result.error ?? 'Full re-upload failed',
        });
        return;
      }
      setActionMessage({ kind: 'success', message: 'Full re-upload complete.' });
    } catch (err) {
      setActionMessage({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Full re-upload failed',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Google Sheets sync</h2>
          <p className="mt-1 text-xs text-ink-500">
            Changes you make are saved locally first, then pushed to your Google
            Sheet. Renaming the sheet in Drive disconnects it — log out and back
            in to start fresh.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        <Row label="Last synced">
          <span className="tabular-nums">{formatRelative(lastSyncedAt, now)}</span>
        </Row>
        <Row label="Pending changes">
          <span className="tabular-nums">{pendingCount ?? 0}</span>
        </Row>
        {lastError ? (
          <Row label="Last error">
            <span className="text-[color:var(--color-danger-600)]">{lastError}</span>
          </Row>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleForceSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Sync now
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={handleFullReupload}
          disabled={isSyncing}
        >
          Re-upload all
        </Button>
      </div>

      {actionMessage ? (
        <p
          role="status"
          className={
            actionMessage.kind === 'success'
              ? 'mt-3 inline-flex items-center gap-1 text-xs text-brand-600'
              : 'mt-3 inline-flex items-center gap-1 text-xs text-[color:var(--color-danger-600)]'
          }
        >
          {actionMessage.kind === 'success' ? (
            <CheckCircle2 size={14} />
          ) : (
            <TriangleAlert size={14} />
          )}
          {actionMessage.message}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: SyncStatus }) {
  if (status.state === 'syncing') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-fg-muted)]">
        <Loader2 size={12} className="animate-spin" />
        Syncing
      </span>
    );
  }
  if (status.state === 'error') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--color-danger-300)] bg-[color:var(--color-danger-50)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-danger-700)] dark:border-[color:var(--color-danger-800)] dark:bg-[color:var(--color-danger-950)]/40 dark:text-[color:var(--color-danger-300)]">
        <TriangleAlert size={12} />
        {status.code === 'sheet_missing' ? 'Sheet missing' : 'Failed'}
      </span>
    );
  }
  if (status.state === 'success') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 size={12} />
        Up to date
      </span>
    );
  }
  return null;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
