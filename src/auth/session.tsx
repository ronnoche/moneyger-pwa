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
import { upsertUser } from '@/lib/registry-client';
import { connectUserSheet } from '@/lib/sheet-resolver';
import {
  drainOutbox,
  getPendingSyncCount,
  installOnlineSyncListener,
  pullFullFromSheet,
} from '@/lib/sync';
import { clearSyncMetaForOwner } from '@/lib/sync-meta';
import { clearOnboarding, markOnboardingComplete } from '@/lib/onboarding';
import { toast } from '@/lib/toast';

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
  /** True until the post-login pull/wipe has settled. */
  isHydrating: boolean;
  /** True when a fresh login determined this is a brand new user. */
  shouldOnboard: boolean;
  signInWithGoogle: (nextPath?: string) => void;
  completeSignIn: (code: string, state: string) => Promise<void>;
  /**
   * Returns false if the user cancelled because of unsynced changes.
   * Returns true once sign-out is committed.
   */
  signOut: (options?: { force?: boolean }) => Promise<boolean>;
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

/**
 * Bootstrap path — runs when an existing session is restored (page reload, tab
 * re-open). The user is mid-stream, so DON'T wipe local data. Just re-verify
 * the sheet and drain any leftover queued mutations.
 *
 * Returns true if the sheet was renamed/recreated (caller should treat as a
 * fresh-login wipe).
 */
async function syncOnSessionRestore(session: GoogleSession): Promise<{
  renameDetected: boolean;
  status: 'returning' | 'created' | 'recreated';
}> {
  const ownerKey = session.sub ?? session.email ?? 'unknown';
  try {
    const result = await connectUserSheet(session.accessToken, ownerKey);
    void upsertUser(session.accessToken);
    // Push anything that was queued while offline / before reload.
    void drainOutbox();
    return { renameDetected: result.renameDetected, status: result.status };
  } catch (error) {
    console.error('[Moneyger Sync Error]', {
      operation: 'syncOnSessionRestore',
      error: error instanceof Error ? error.message : 'Restore sync failed',
    });
    return { renameDetected: false, status: 'returning' };
  }
}

/**
 * Fresh-login path — runs after OAuth completes, or after a session restore
 * detects a renamed/missing sheet. Per spec, the Google Sheet is the source of
 * truth: drain anything pending first (already filtered by logout warning),
 * then wipe local IndexedDB and pull from Sheets.
 *
 * Returns whether the user should land on onboarding.
 */
async function syncOnFreshLogin(session: GoogleSession): Promise<{
  shouldOnboard: boolean;
  renameDetected: boolean;
}> {
  const ownerKey = session.sub ?? session.email ?? 'unknown';
  const syncDoneKey = `${FULL_SYNC_DONE_PREFIX}${ownerKey}`;
  try {
    const conn = await connectUserSheet(session.accessToken, ownerKey);
    void upsertUser(session.accessToken);

    if (conn.status === 'created' || conn.status === 'recreated') {
      // Brand new sheet (either no prior sheet, or the previous one was
      // renamed/deleted and we made a new one). Treat as a new user: clear
      // local + onboarding flag, and route to onboarding.
      await wipeLocalForNewAccount();
      clearOnboarding();
      localStorage.removeItem(syncDoneKey);
      if (conn.renameDetected) {
        toast.error(
          'Google Sheet renamed',
          'Your previous Moneyger sheet was renamed in Google Drive, so it is no longer linked. We created a fresh sheet — set up your account again.',
        );
      }
      return { shouldOnboard: true, renameDetected: conn.renameDetected };
    }

    // Returning user: drain queue (just in case), then pull-from-sheet wipes
    // local data and replaces it with sheet contents.
    await drainOutbox();
    const pullResult = await pullFullFromSheet();
    if (!pullResult.ok) {
      console.error('[Moneyger Sync Error]', {
        operation: 'pullFullFromSheet',
        error: pullResult.error ?? 'Initial pull from Google Sheets failed',
        code: pullResult.code,
      });
      return { shouldOnboard: false, renameDetected: false };
    }
    localStorage.setItem(syncDoneKey, 'true');

    const hasData = await hasAnyLocalData();
    if (hasData) {
      markOnboardingComplete();
      return { shouldOnboard: false, renameDetected: false };
    }
    // Sheet existed but had no data (rare: user signed up, sheet auto-created
    // by an old build, never finished onboarding). Send them through.
    clearOnboarding();
    return { shouldOnboard: true, renameDetected: false };
  } catch (error) {
    console.error('[Moneyger Sync Error]', {
      operation: 'syncOnFreshLogin',
      error: error instanceof Error ? error.message : 'Fresh-login sync failed',
    });
    return { shouldOnboard: false, renameDetected: false };
  }
}

async function wipeLocalForNewAccount(): Promise<void> {
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
      db.budgetNotes,
      db.autoAssignHistory,
      db.reconcileEvents,
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
        db.budgetNotes.clear(),
        db.autoAssignHistory.clear(),
        db.reconcileEvents.clear(),
      ]);
    },
  );
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
  const [isHydrating, setIsHydrating] = useState(false);
  const [shouldOnboard, setShouldOnboard] = useState(false);

  // Auto-drain queue when the browser comes back online.
  useEffect(() => {
    installOnlineSyncListener();
  }, []);

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
        // Restore path: don't wipe local. Just verify sheet + drain queue.
        const restore = await syncOnSessionRestore(refreshed);
        if (!active) return;
        if (restore.renameDetected) {
          // Sheet was renamed since last session — promote to fresh-login
          // semantics so we wipe + onboard.
          setIsHydrating(true);
          const result = await syncOnFreshLogin(refreshed);
          if (!active) return;
          setShouldOnboard(result.shouldOnboard);
          setIsHydrating(false);
        } else if (restore.status === 'created') {
          // Edge case: registry says created during restore (shouldn't happen
          // in practice because cache would have been hit). Be safe and route.
          setShouldOnboard(true);
        }
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
    setIsHydrating(true);
    try {
      const result = await syncOnFreshLogin(nextSession);
      setShouldOnboard(result.shouldOnboard);
    } finally {
      setIsHydrating(false);
    }
  }, []);

  const signOut = useCallback(
    async (options: { force?: boolean } = {}): Promise<boolean> => {
      // Spec #3 safeguard: warn the user if there are local changes that
      // haven't reached Google Sheets yet. Per their request, log out wipes
      // local data on next login, so unsynced rows would be lost.
      if (!options.force) {
        const pending = await getPendingSyncCount();
        if (pending > 0) {
          const confirmed = window.confirm(
            `You have ${pending} unsynced change${pending === 1 ? '' : 's'} that have not been pushed to Google Sheets yet.\n\n` +
              `If you log out now, those changes may not appear in your Google Sheet, and they will be replaced by sheet data the next time you sign in.\n\n` +
              `Are you sure you want to log out?`,
          );
          if (!confirmed) return false;
        }
      }

      const ownerKey = session?.sub ?? session?.email ?? null;
      // Best-effort: try to flush before tearing down the session.
      try {
        await drainOutbox();
      } catch {
        /* swallow — user already accepted the risk */
      }

      // Clear queued mutations and per-account sync metadata so the next user
      // (or the same user re-logging in) starts from a clean slate. Local
      // entity tables are preserved here; the next fresh-login will wipe and
      // re-pull them from the Sheet.
      try {
        await db.outbox.clear();
      } catch {
        /* non-fatal */
      }
      if (ownerKey) clearSyncMetaForOwner(ownerKey);

      setSession(null);
      storeSession(null);
      setShouldOnboard(false);
      return true;
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isLoading,
      isHydrating,
      shouldOnboard,
      signInWithGoogle,
      completeSignIn,
      signOut,
    }),
    [
      session,
      isLoading,
      isHydrating,
      shouldOnboard,
      signInWithGoogle,
      completeSignIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthSession must be used inside AuthProvider');
  return context;
}
