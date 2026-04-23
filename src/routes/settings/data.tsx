import { useEffect, useRef, useState } from 'react';
import {
  downloadBackup,
  exportBackup,
  importBackup,
  resetAllData,
} from '@/lib/backup';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type Status =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function SettingsData() {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function setupGoogleAuth() {
      if (!GOOGLE_CLIENT_ID) {
        setStatus({
          kind: 'error',
          message: 'Missing VITE_GOOGLE_CLIENT_ID. Add it in Netlify and local env.',
        });
        return;
      }

      try {
        await loadGoogleIdentityScript();
        if (!active || !window.google || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) return;
            const email = parseGoogleEmailFromIdToken(response.credential);
            setIdToken(response.credential);
            setGoogleEmail(email);
            setStatus({
              kind: 'success',
              message: email
                ? `Signed in with Google: ${email}`
                : 'Signed in with Google.',
            });
          },
        });

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 260,
        });
        setGoogleReady(true);
      } catch (error) {
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Google Auth failed to load',
        });
      }
    }

    void setupGoogleAuth();

    return () => {
      active = false;
    };
  }, []);

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
    if (!idToken) {
      setStatus({ kind: 'error', message: 'Sign in with Google first.' });
      return;
    }

    setBusy(true);
    try {
      const backup = await exportBackup();
      const res = await fetch('/.netlify/functions/sheets-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken, backup }),
      });
      const payload = (await res.json()) as { error?: string; syncedRows?: number };
      if (!res.ok) {
        throw new Error(payload.error || 'Google Sheets sync failed');
      }

      setStatus({
        kind: 'success',
        message: `Synced ${payload.syncedRows ?? 0} rows to Google Sheets.`,
      });
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
          body="Sign in with Google, then push your full backup to the server and append records to your sheet."
        >
          <div className="space-y-3">
            <div ref={googleButtonRef} className="min-h-10" />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleGoogleSync} disabled={busy || !googleReady || !idToken}>
                Sync to Google Sheets
              </Button>
              {googleEmail && (
                <p className="text-xs text-ink-500">Connected account: {googleEmail}</p>
              )}
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

function parseGoogleEmailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(decodeBase64Url(payload)) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-google-identity="true"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Could not load Google Identity script')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Identity script'));
    document.head.appendChild(script);
  });
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
