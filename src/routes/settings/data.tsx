import { useRef, useState } from 'react';
import { useAuthSession } from '@/auth/session';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { downloadBackup, exportBackup, importBackup, resetAllData } from '@/lib/backup';
import { fullSync } from '@/lib/sync';

type Status =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function SettingsData() {
  const { session, signOut } = useAuthSession();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
      setStatus({ kind: 'success', message: 'Backup downloaded.' });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(mode: 'replace' | 'merge') {
    const input = fileInput.current;
    if (!input) return;
    input.value = '';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        await importBackup(file, mode);
        setStatus({
          kind: 'success',
          message: `Imported (${mode === 'replace' ? 'replaced' : 'merged'}).`,
        });
      } catch (e) {
        setStatus({ kind: 'error', message: (e as Error).message });
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }

  async function handleReset() {
    const confirmed = confirm(
      'Reset all data? Every bucket, bucket list, account, transaction, and net worth entry will be deleted. This cannot be undone.',
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await resetAllData();
      setStatus({ kind: 'success', message: 'All data cleared.' });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSync() {
    setBusy(true);
    try {
      const result = await fullSync();
      if (!result.ok) throw new Error(result.error ?? 'Google Sheets sync failed');
      setStatus({ kind: 'success', message: 'Full sync completed.' });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Data" backTo="/settings" />

      <input ref={fileInput} type="file" accept="application/json" className="hidden" />

      <section className="space-y-4">
        <Card
          title="Export"
          body="Download a JSON backup of everything in this app. Keep it somewhere safe."
        >
          <Button onClick={handleExport} disabled={busy}>
            Export backup
          </Button>
        </Card>

        <Card
          title="Import"
          body="Replace erases current data first. Merge keeps existing records and upserts from the file."
        >
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleImport('merge')}
              disabled={busy}
            >
              Merge
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleImport('replace')}
              disabled={busy}
            >
              Replace
            </Button>
          </div>
        </Card>

        <Card
          title="Google Sheets Sync"
          body="Your app-level Google session is active. Trigger a full sync to push current local records to Apps Script."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleGoogleSync} disabled={busy}>
                Sync to Google Sheets
              </Button>
              <Button variant="secondary" onClick={signOut} disabled={busy}>
                Sign out
              </Button>
            </div>
            <p className="text-xs text-ink-500">
              Connected account: {session?.email ?? 'Unknown account'}
            </p>
            <p className="text-xs text-ink-500">
              Scope includes profile, email, spreadsheets, and drive.file.
            </p>
            <div className="text-[11px] text-ink-500">
              Access token is available client-side in the auth session.
            </div>
          </div>
        </Card>

        <Card
          title="Reset"
          body="Delete every record from this device. Your backups are untouched."
        >
          <Button variant="danger" onClick={handleReset} disabled={busy}>
            Reset all data
          </Button>
        </Card>
      </section>

      {status.kind !== 'idle' && (
        <p
          role="status"
          className={
            status.kind === 'success'
              ? 'mt-4 text-sm text-brand-600'
              : 'mt-4 text-sm text-danger-600'
          }
        >
          {status.message}
        </p>
      )}
    </div>
  );
}

function Card({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-ink-500">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
