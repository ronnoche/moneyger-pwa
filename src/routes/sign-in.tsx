import { Navigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/auth/session';

export default function SignInPage() {
  const location = useLocation();
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuthSession();
  const params = new URLSearchParams(location.search);
  const nextPath = params.get('next') ?? '/';

  if (!isLoading && isAuthenticated) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] px-4">
      <section className="w-full max-w-sm rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[color:var(--color-fg)]">Moneyger</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Sign in to sync your local budget data with Google Sheets.
        </p>
        <Button
          className="mt-6 w-full"
          loading={isLoading}
          onClick={() => signInWithGoogle(nextPath)}
        >
          Sign in with Google
        </Button>
      </section>
    </main>
  );
}
