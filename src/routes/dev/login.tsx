import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/auth/session';

const DEV_EMAIL = 'ron@test.com';
const DEV_PASSWORD = 'P@ssw0rd!';
const SESSION_STORAGE_KEY = 'moneyger:google-session';

function createDevSession() {
  return {
    accessToken: 'dev-mock-token-' + Date.now(),
    refreshToken: null,
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    scope: 'openid email profile',
    tokenType: 'Bearer',
    email: DEV_EMAIL,
    name: 'Dev User',
    picture: null,
    sub: 'dev-user-id',
  };
}

export default function DevLogin() {
  const { isAuthenticated, isLoading } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (import.meta.env.PROD) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] px-4">
        <p className="text-[color:var(--color-danger-500)]">
          Dev login is disabled in production.
        </p>
      </main>
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (email !== DEV_EMAIL || password !== DEV_PASSWORD) {
      setError('Invalid credentials');
      setSubmitting(false);
      return;
    }

    const session = createDevSession();
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.location.href = '/';
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] px-4">
      <section className="w-full max-w-sm rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[color:var(--color-fg)]">Dev Login</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Development-only login for testing.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[color:var(--color-fg)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-500)]"
              placeholder="ron@test.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[color:var(--color-fg)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-500)]"
              placeholder="********"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-[color:var(--color-danger-500)]">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={submitting || isLoading}>
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
