import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/app-logo';
import { useAuthSession } from '@/auth/session';

export default function LandingPage() {
  const { signInWithGoogle } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force dark mode on landing page
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    return () => {
      const stored = localStorage.getItem('moneyger:theme');
      const pref =
        stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!(pref === 'dark' || (pref === 'system' && systemDark))) {
        root.classList.remove('dark');
      }
    };
  }, []);

  async function handleGoogleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Browser will redirect to Google — no further action needed here
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#171B4C] px-4">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[min(70vh,560px)] w-[min(120vw,900px)] rounded-full bg-[color:var(--color-brand-500)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[min(50vh,400px)] w-[min(100vw,700px)] rounded-full bg-[color:var(--color-info)] opacity-[0.07] blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3">
          <AppLogo className="h-16 w-auto" alt="Moneyger" />
          <h1 className="text-2xl font-semibold tracking-tight text-white">Moneyger</h1>
          <p className="text-sm text-white/50">Personal finance dashboard</p>
        </div>

        {/* Sign-in card */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGoogleSignIn()}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin text-gray-500" />
            ) : (
              <GoogleIcon />
            )}
            {busy ? 'Redirecting…' : 'Sign in with Google'}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-center text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
