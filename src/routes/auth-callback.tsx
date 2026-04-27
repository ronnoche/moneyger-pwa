import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuthSession } from '@/auth/session';

export default function AuthCallbackPage() {
  const { completeSignIn } = useAuthSession();
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState('/');

  useEffect(() => {
    let active = true;
    async function run() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (!code || !state) {
        if (!active) return;
        setError('Missing Google authorization response');
        setStatus('error');
        return;
      }
      try {
        const storedRaw = sessionStorage.getItem('moneyger:oauth-state');
        const stored = storedRaw
          ? (JSON.parse(storedRaw) as { nextPath?: string })
          : null;
        await completeSignIn(code, state);
        if (!active) return;
        setNextPath(stored?.nextPath ?? '/');
        setStatus('done');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
        setStatus('error');
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [completeSignIn]);

  if (status === 'done') {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] px-4">
      <section className="w-full max-w-sm rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
        {status === 'loading' ? (
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Completing Google sign-in...
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-[color:var(--color-danger-600)]">
              Sign-in failed
            </p>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {error ?? 'Unexpected error'}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
