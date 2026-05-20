import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      // No code — might be a direct visit; go home
      void navigate('/', { replace: true });
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) {
        setError(err.message);
      } else {
        void navigate('/', { replace: true });
      }
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#171B4C] px-4">
        <p className="text-sm font-medium text-red-400">Sign in failed</p>
        <p className="text-xs text-white/40">{error}</p>
        <a href="/" className="mt-2 text-xs text-white/60 underline underline-offset-2">
          Go back
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#171B4C]">
      <p className="text-sm text-white/40">Signing you in…</p>
    </div>
  );
}
