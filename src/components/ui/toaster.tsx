import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/app/use-theme';
import { useLargeScreen } from '@/hooks/use-large-screen';

export function Toaster() {
  const { resolved } = useTheme();
  const isLarge = useLargeScreen();
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
      position={isLarge ? 'top-right' : 'bottom-center'}
      offset={24}
      mobileOffset={16}
    />
  );
}
