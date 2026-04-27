import { useAuthSession } from '@/auth/session';
import Dashboard from '@/routes/dashboard';
import LandingPage from '@/routes/landing';

function HomeSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)]">
      <div className="text-sm">Loading...</div>
    </div>
  );
}

export default function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuthSession();
  if (isLoading) return <HomeSplash />;
  if (!isAuthenticated) return <LandingPage />;
  return <Dashboard />;
}
