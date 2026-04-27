import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Cloud, Smartphone, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { useAuthSession } from '@/auth/session';
import { cn } from '@/lib/cn';

const features = [
  {
    icon: Table2,
    title: 'Sheets sync with your Google account',
    description:
      'Sign in with Google and push or pull your budget with the spreadsheet you choose.',
  },
  {
    icon: Cloud,
    title: 'Works offline first',
    description: 'Local data on your device. Sign in when you want cloud sync.',
  },
  {
    icon: Smartphone,
    title: 'Install as a PWA',
    description:
      'Add Moneyger to your home screen for an app-like experience on phone or desktop.',
  },
] as const;

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/';
  const { isLoading, signInWithGoogle } = useAuthSession();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');

    return () => {
      const stored = localStorage.getItem('moneyger:theme');
      const preference =
        stored === 'dark' || stored === 'light' || stored === 'system'
          ? stored
          : 'system';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = preference === 'dark' || (preference === 'system' && systemDark);
      if (!shouldBeDark) {
        root.classList.remove('dark');
      }
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#171B4C] text-[color:var(--color-fg)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        aria-hidden
      >
        <div
          className="absolute -left-1/4 top-0 h-[min(70vh,560px)] w-[min(120vw,900px)] rounded-full bg-[color:var(--color-brand-500)] opacity-[0.12] blur-3xl dark:opacity-[0.18]"
        />
        <div
          className="absolute -right-1/4 bottom-0 h-[min(50vh,400px)] w-[min(100vw,700px)] rounded-full bg-[color:var(--color-info)] opacity-[0.08] blur-3xl dark:opacity-[0.14]"
        />
      </div>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-lg sm:max-w-xl">
          <div className="flex justify-center">
            <AppLogo
              className="h-16 w-auto max-w-[min(100%,240px)] sm:h-20"
              alt="Moneyger — Smart Financial Management"
            />
          </div>
          <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight sm:mt-6 sm:text-4xl">
            Budget in the app.
            <br />
            <span className="text-[color:var(--color-fg-muted)]">Sync in Sheets.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-center text-base text-[color:var(--color-fg-muted)] sm:text-lg">
            A fast, local-first budget with optional Google sign-in to connect your
            spreadsheet.
          </p>

          <div className="mt-10 flex justify-center">
            <Button
              className="min-w-[240px] shadow-[var(--shadow-fab)]"
              loading={isLoading}
              onClick={() => signInWithGoogle(nextPath)}
              type="button"
            >
              Sign in with Google
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-[color:var(--color-fg-subtle)]">
            Opens Google to sign in, then returns you to this app.
          </p>

          <ul className="mt-16 space-y-6 sm:mt-20">
            {features.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 p-4 shadow-[var(--shadow-xs)] backdrop-blur-sm dark:bg-[color:var(--color-surface)]/60"
              >
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    'bg-[color:var(--color-brand-100)] text-[color:var(--color-brand-700)]',
                    'dark:bg-[color:var(--color-brand-600)]/20 dark:text-[color:var(--color-brand-500)]',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[color:var(--color-fg)]">{title}</h2>
                  <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
