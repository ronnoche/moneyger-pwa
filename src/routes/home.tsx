import { Navigate } from 'react-router';
import { useAuthSession } from '@/auth/session';
import { isOnboardingComplete } from '@/lib/onboarding';
import Dashboard from '@/routes/dashboard';
import LandingPage from '@/routes/landing';

function HomeSplash(props: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)]">
      <div className="text-sm">{props.label ?? 'Loading...'}</div>
    </div>
  );
}

export default function HomeRoute() {
  const { isAuthenticated, isLoading, isHydrating, shouldOnboard } =
    useAuthSession();
  if (isLoading) return <HomeSplash />;
  if (!isAuthenticated) return <LandingPage />;
  // Hold the dashboard until the post-login pull/wipe finishes so we don't
  // flash empty-state UI before pulling the user's records from Sheets.
  if (isHydrating) return <HomeSplash label="Restoring from Google Sheets..." />;
  if (shouldOnboard || !isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Dashboard />;
}
