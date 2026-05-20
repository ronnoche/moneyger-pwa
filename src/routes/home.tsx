import { Navigate } from 'react-router';
import { useAuthSession } from '@/auth/session';
import { isOnboardingComplete } from '@/lib/onboarding';
import Dashboard from '@/routes/dashboard';
import LandingPage from '@/routes/landing';

function Splash(props: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)]">
      <div className="text-sm">{props.label ?? 'Loading...'}</div>
    </div>
  );
}

export default function HomeRoute() {
  const { isAuthenticated, isLoading, isHydrating, shouldOnboard } = useAuthSession();

  if (!isAuthenticated) return <LandingPage />;
  if (isLoading) return <Splash />;
  if (isHydrating) return <Splash label="Syncing from cloud..." />;
  if (shouldOnboard || !isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Dashboard />;
}
