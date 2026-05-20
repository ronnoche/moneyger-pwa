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
import { db } from '@/db/db';
import {
  drainOutbox,
  installOnlineSyncListener,
  pullFullFromSheet,
} from '@/lib/sync';
import { clearOnboarding, markOnboardingComplete } from '@/lib/onboarding';

// ─── Credentials (client-side gate — personal use only) ──────────────────────
const VALID_EMAIL = 'ron@noche.com';
const VALID_PASSWORD = 'P@ngga27!';
const AUTH_KEY = 'moneyger:authed';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrating: boolean;
  shouldOnboard: boolean;
  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true',
  );
  const [isLoading, setIsLoading] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true',
  );
  const [isHydrating, setIsHydrating] = useState(false);
  const [shouldOnboard, setShouldOnboard] = useState(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || bootedRef.current) return;
    bootedRef.current = true;

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
        if (active) {
          setIsHydrating(false);
          setIsLoading(false);
        }
      }
    }
    void boot();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const signIn = useCallback((email: string, password: string): boolean => {
    if (email.trim().toLowerCase() === VALID_EMAIL && password === VALID_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsLoading(true);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    bootedRef.current = false;
    setIsAuthenticated(false);
    setIsLoading(false);
    setIsHydrating(false);
    setShouldOnboard(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated, isLoading, isHydrating, shouldOnboard, signIn, signOut }),
    [isAuthenticated, isLoading, isHydrating, shouldOnboard, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthSession must be used inside AuthProvider');
  return ctx;
}
