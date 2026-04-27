import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { db } from '@/db/db';
import { fullSync } from '@/lib/sync';

const SESSION_STORAGE_KEY = 'moneyger:google-session';
const OAUTH_STATE_KEY = 'moneyger:oauth-state';
const FULL_SYNC_DONE_PREFIX = 'moneyger:full-sync-done:';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

export interface GoogleSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scope: string;
  tokenType: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  sub: string | null;
}

interface AuthContextValue {
  session: GoogleSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: (nextPath?: string) => void;
  completeSignIn: (code: string, state: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): GoogleSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleSession;
    if (!parsed?.accessToken || !parsed?.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeSession(session: GoogleSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // non-fatal
  }
}

function buildRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) {
    try {
      const configured = new URL(fromEnv);
      const runningHost = window.location.hostname;
      const configuredHost = configured.hostname;
      const runningLocal =
        runningHost === 'localhost' || runningHost === '127.0.0.1';
      const configuredLocal =
        configuredHost === 'localhost' || configuredHost === '127.0.0.1';

      // Guard against deploying a localhost redirect URI to production.
      if (configuredLocal && !runningLocal) {
        return `${window.location.origin}/auth/callback`;
      }
    } catch {
      // Invalid env URL -> fall through to origin-based callback.
    }
    return fromEnv;
  }
  return `${window.location.origin}/auth/callback`;
}

function buildAuthUrl(state: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', buildRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

async function readJsonOrThrow(
  response: Response,
  fallbackMessage: string,
): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      `${fallbackMessage}. Empty response from auth endpoint. If you are running local dev, start with "netlify dev" so /.netlify/functions/* routes are available.`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `${fallbackMessage}. Non-JSON response from auth endpoint. If you are running local dev, start with "netlify dev" so /.netlify/functions/* routes are available.`,
    );
  }
}

async function hasAnyLocalData(): Promise<boolean> {
  const counts = await Promise.all([
    db.transactions.count(),
    db.transfers.count(),
    db.accounts.count(),
    db.categories.count(),
    db.groups.count(),
    db.netWorthEntries.count(),
  ]);
  return counts.some((count) => count > 0);
}

async function maybeRunInitialFullSync(session: GoogleSession): Promise<void> {
  const ownerKey = session.sub ?? session.email ?? 'unknown';
  const syncDoneKey = `${FULL_SYNC_DONE_PREFIX}${ownerKey}`;
  try {
    if (localStorage.getItem(syncDoneKey) === 'true') return;
    const hasData = await hasAnyLocalData();
    if (!hasData) {
      localStorage.setItem(syncDoneKey, 'true');
      return;
    }
    const result = await fullSync();
    if (result.ok) {
      localStorage.setItem(syncDoneKey, 'true');
      return;
    }
    console.error('[Moneyger Sync Error]', {
      operation: 'fullSync',
      error: result.error ?? 'Initial full sync failed',
    });
  } catch (error) {
    console.error('[Moneyger Sync Error]', {
      operation: 'fullSync',
      error: error instanceof Error ? error.message : 'Initial full sync failed',
    });
  }
}

async function refreshAccessToken(session: GoogleSession): Promise<GoogleSession> {
  if (!session.refreshToken) return session;
  if (session.expiresAt > Date.now() + 30_000) return session;
  const response = await fetch('/.netlify/functions/google-oauth-refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const payload = (await readJsonOrThrow(
    response,
    'Failed to refresh token',
  )) as
    | {
        ok: true;
        accessToken: string;
        expiresAt: number;
        scope: string;
        tokenType: string;
      }
    | { ok: false; error: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? 'Failed to refresh token' : payload.error);
  }
  return {
    ...session,
    accessToken: payload.accessToken,
    expiresAt: payload.expiresAt,
    scope: payload.scope,
    tokenType: payload.tokenType,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const stored = readStoredSession();
      if (!stored) {
        if (active) {
          setSession(null);
          setIsLoading(false);
        }
        return;
      }
      try {
        const refreshed = await refreshAccessToken(stored);
        if (!active) return;
        setSession(refreshed);
        storeSession(refreshed);
      } catch {
        if (!active) return;
        setSession(null);
        storeSession(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const signInWithGoogle = useCallback((nextPath?: string) => {
    const state = crypto.randomUUID();
    const requestedPath = nextPath && nextPath.startsWith('/') ? nextPath : '/';
    sessionStorage.setItem(
      OAUTH_STATE_KEY,
      JSON.stringify({ state, nextPath: requestedPath }),
    );
    window.location.assign(buildAuthUrl(state));
  }, []);

  const completeSignIn = useCallback(async (code: string, state: string) => {
    const storedRaw = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!storedRaw) {
      throw new Error('Missing OAuth state. Start sign-in again.');
    }
    const stored = JSON.parse(storedRaw) as { state: string; nextPath?: string };
    if (stored.state !== state) {
      throw new Error('OAuth state mismatch. Start sign-in again.');
    }
    const response = await fetch('/.netlify/functions/google-oauth-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri: buildRedirectUri(),
      }),
    });
  const payload = (await readJsonOrThrow(
    response,
    'Google sign-in failed',
  )) as
      | {
          ok: true;
          accessToken: string;
          refreshToken: string | null;
          expiresAt: number;
          scope: string;
          tokenType: string;
          profile: {
            email: string | null;
            name: string | null;
            picture: string | null;
            sub: string | null;
          };
        }
      | { ok: false; error: string };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? 'Google sign-in failed' : payload.error);
    }

    const nextSession: GoogleSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresAt: payload.expiresAt,
      scope: payload.scope,
      tokenType: payload.tokenType,
      email: payload.profile.email,
      name: payload.profile.name,
      picture: payload.profile.picture,
      sub: payload.profile.sub,
    };
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    setSession(nextSession);
    storeSession(nextSession);
    void maybeRunInitialFullSync(nextSession);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    storeSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isLoading,
      signInWithGoogle,
      completeSignIn,
      signOut,
    }),
    [session, isLoading, signInWithGoogle, completeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthSession must be used inside AuthProvider');
  return context;
}
