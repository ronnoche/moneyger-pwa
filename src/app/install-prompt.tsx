import { useEffect } from 'react';
import { toast } from '@/lib/toast';
import {
  getVisitCount,
  isIosSafari,
  useStandalone,
} from '@/hooks/use-standalone';

const DISMISSED_KEY = 'moneyger:install-prompt-dismissed';
const MIN_VISITS = 3;

export function InstallPrompt() {
  const standalone = useStandalone();

  useEffect(() => {
    if (standalone) return;
    if (!isIosSafari()) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    } catch {
      return;
    }
    if (getVisitCount() < MIN_VISITS) return;

    const id = window.setTimeout(() => {
      toast.info('Add Moneyger to your Home Screen', {
        description:
          'Tap the Share icon in Safari, then choose "Add to Home Screen".',
        duration: 12000,
        action: {
          label: 'Dismiss',
          onClick: () => {
            try {
              localStorage.setItem(DISMISSED_KEY, '1');
            } catch {
              // noop
            }
          },
        },
      });
      try {
        localStorage.setItem(DISMISSED_KEY, '1');
      } catch {
        // noop
      }
    }, 1500);

    return () => window.clearTimeout(id);
  }, [standalone]);

  return null;
}
