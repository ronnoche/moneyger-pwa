import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/app-logo';
import { useAuthSession } from '@/auth/session';

export default function LandingPage() {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuthSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Force dark mode on landing
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    return () => {
      const stored = localStorage.getItem('moneyger:theme');
      const pref = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!(pref === 'dark' || (pref === 'system' && systemDark))) {
        root.classList.remove('dark');
      }
    };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || isLoading) return;
    setError('');
    setBusy(true);
    const ok = signIn(email, password);
    if (ok) {
      void navigate('/', { replace: true });
    } else {
      setError('Incorrect email or password.');
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

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <AppLogo className="h-14 w-auto" alt="Moneyger" />
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Moneyger
          </h1>
          <p className="text-sm text-white/50">Personal finance dashboard</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm"
        >
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-white/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-[color:var(--color-brand-500)] focus:bg-white/15 focus:ring-1 focus:ring-[color:var(--color-brand-500)]"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-white/70">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-[color:var(--color-brand-500)] focus:bg-white/15 focus:ring-1 focus:ring-[color:var(--color-brand-500)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || isLoading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[color:var(--color-brand-700)] disabled:opacity-60"
            >
              {busy || isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
