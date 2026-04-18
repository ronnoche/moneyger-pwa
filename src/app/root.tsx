import { Outlet, useLocation, Navigate } from 'react-router';
import { TabBar } from '@/components/layout/tab-bar';
import { AppHeader } from '@/components/layout/app-header';
import { useIsEmpty } from '@/db/hooks';

export function RootLayout() {
  const location = useLocation();
  const isEmpty = useIsEmpty();
  const onOnboarding = location.pathname === '/onboarding';

  if (isEmpty === undefined) {
    return <SplashScreen />;
  }

  if (isEmpty && !onOnboarding && location.pathname !== '/settings') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50 text-ink-900 dark:bg-ink-900 dark:text-ink-50">
      {!onOnboarding && <AppHeader />}
      <main className="safe-pl safe-pr flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      {!onOnboarding && <TabBar />}
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-900 text-ink-100">
      <div className="text-sm opacity-60">Loading...</div>
    </div>
  );
}
