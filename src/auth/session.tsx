import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { db } from '@/db/db';
import { supabase } from '@/lib/supabase';
import {
  drainOutbox,
  installOnlineSyncListener,
  pullFullFromSheet,
} from '@/lib/sync';
import { clearOnboarding, markOnboardingComplete } from '@/lib/onboarding';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrating: boolean;
  shouldOnboard: boolean;
  userEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function hasAnyLocalData(): Promise<boolean> {
  const counts = await Promise.all([
    db.transactions.count(),
    db.transfers.count(),
    db.accounts.count(),
    db.categories.count(),
    db.groups.count(),
    db.netWorthEntries.count(),
  ]);
  return counts.some((c) => c > 0);
}

async function clearLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.groups,
      db.categories,
      db.accounts,
      db.transactions,
      db.transfers,
      db.netWorthEntries,
      db.outbox,
      db.autoAssignHistory,
      db.budgetNotes,
      db.reconcileEvents,
      db.syncLogs,
    ],
    async () => {
      await Promise.all([
        db.groups.clear(),
        db.categories.clear(),
        db.accounts.clear(),
        db.transactions.clear(),
        db.transfers.clear(),
        db.netWorthEntries.clear(),
        db.outbox.clear(),
        db.autoAssignHistory.clear(),
        db.budgetNotes.clear(),
        db.reconcileEvents.clear(),
        db.syncLogs.clear(),
      ]);
    },
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [shouldOnboard, setShouldOnboard] = useState(false);
  const bootedForUserRef = useRef<string | null>(null);

  // Hydrate session on mount and listen for auth changes.
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionResolved(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSessionResolved(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;
  const isAuthenticated = !!userId;

  useEffect(() => {
    if (!userId) return;
    if (bootedForUserRef.current === userId) return;
    bootedForUserRef.current = userId;

    installOnlineSyncListener();

    let active = true;
    async function boot() {
      try {
        const hasData = await hasAnyLocalData();
        if (hasData) {
          markOnboardingComplete();
          void drainOutbox();
          return;
        }
        if (active) setIsHydrating(true);
        const result = await pullFullFromSheet();
        if (!active) return;
        if (result.ok) {
          const hasDataNow = await hasAnyLocalData();
          if (hasDataNow) {
            markOnboardingComplete();
          } else {
            clearOnboarding();
            setShouldOnboard(true);
          }
        } else {
          clearOnboarding();
          setShouldOnboard(true);
        }
      } catch (e) {
        console.error('Boot sync failed:', e);
        if (active) {
          clearOnboarding();
          setShouldOnboard(true);
        }
      } finally {
        if (active) setIsHydrating(false);
      }
    }
    void boot();
    return () => {
      active = false;
    };
  }, [userId]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    bootedForUserRef.current = null;
    setShouldOnboard(false);
    setIsHydrating(false);
    // Wipe local cache so the next signed-in user doesn't see prior data.
    try {
      await clearLocalData();
    } catch (e) {
      console.error('Failed to clear local data on sign-out:', e);
    }
    clearOnboarding();
  }, []);

  const isLoading = !sessionResolved;

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      isHydrating,
      shouldOnboard,
      userEmail: session?.user?.email ?? null,
      signInWithGoogle,
      signOut,
    }),
    [
      isAuthenticated,
      isLoading,
      isHydrating,
      shouldOnboard,
      session?.user?.email,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthSession must be used inside AuthProvider');
  return ctx;
}
