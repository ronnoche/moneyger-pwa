import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/app/use-theme';

export function Toaster() {
  const { resolved } = useTheme();
  return (
    <SonnerToaster
      theme={resolved}
      visibleToasts={3}
      closeButton
      richColors={false}
      toastOptions={{
        style: {
          background: 'var(--color-surface)',
          color: 'var(--color-fg)',
          border: '1px solid var(--color-border)',
          fontFamily: 'var(--font-sans)',
          boxShadow: 'var(--shadow-md)',
        },
      }}
      className="sm:!top-4 sm:!right-4 sm:!bottom-auto sm:!left-auto"
      position="bottom-center"
    />
  );
}
