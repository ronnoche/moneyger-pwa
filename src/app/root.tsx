import { lazy, Suspense, useCallback, useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router';
import { TabBar } from '@/components/layout/tab-bar';
import { AppHeader } from '@/components/layout/app-header';
import { Sidebar } from '@/components/layout/sidebar';
import { PageTransition } from '@/components/layout/page-transition';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/ui/command-palette';
import { ShortcutHelp } from '@/components/ui/shortcut-help';
import { useAppHotkeys } from '@/hooks/use-app-hotkeys';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { useAuthSession } from '@/auth/session';
import { useIsEmpty } from '@/db/hooks';
import { isOnboardingComplete } from '@/lib/onboarding';

const PwaUpdate = lazy(() =>
  import('@/app/pwa-update').then((m) => ({ default: m.PwaUpdate })),
);
const InstallPrompt = lazy(() =>
  import('@/app/install-prompt').then((m) => ({ default: m.InstallPrompt })),
);

export function RootLayout() {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();
  const isEmpty = useIsEmpty();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarCollapsed, , toggleSidebarCollapsed] = useSidebarCollapsed();

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  useAppHotkeys({ onOpenHelp: openHelp, onOpenPalette: openPalette });

  const path = location.pathname;
  if (authLoading) {
    return <SplashScreen />;
  }
  if (!isAuthenticated) {
    if (path !== '/') {
      const next = `${path}${location.search}${location.hash}`;
      return <Navigate to={`/?next=${encodeURIComponent(next)}`} replace />;
    }
    return (
      <div className="flex min-h-dvh flex-col bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <Outlet />
        <Toaster />
      </div>
    );
  }

  const onOnboarding = path === '/onboarding';
  const onSettings = path === '/settings' || path.startsWith('/settings/');

  if (isEmpty === undefined) {
    return <SplashScreen />;
  }

  if (isEmpty && !onOnboarding && !onSettings && !isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }

  if (onOnboarding && isOnboardingComplete()) {
    return <Navigate to="/" replace />;
  }

  const hideChrome = onOnboarding;

  if (hideChrome) {
    return (
      <div className="flex min-h-dvh flex-col bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <Sidebar
        onOpenPalette={openPalette}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <AppHeader />
        </div>

        <main className="safe-pl safe-pr flex-1 overflow-y-auto pb-24 lg:pb-0">
          <PageTransition />
        </main>

        <div className="lg:hidden">
          <TabBar />
        </div>
      </div>

      <Toaster />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
      <Suspense fallback={null}>
        <PwaUpdate />
        <InstallPrompt />
      </Suspense>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)]">
      <div className="text-sm">Loading...</div>
    </div>
  );
}
