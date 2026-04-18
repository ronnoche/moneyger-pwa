import { useEffect } from 'react';
import { toast } from '@/lib/toast';

export function PwaUpdate() {
  useEffect(() => {
    let disposed = false;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (disposed) return;
      const updateSW = registerSW({
        onNeedRefresh() {
          toast.info('Update available', {
            duration: Infinity,
            action: {
              label: 'Refresh',
              onClick: () => {
                void updateSW(true);
              },
            },
          });
        },
        onOfflineReady() {
          toast.success('Ready to work offline');
        },
      });
    });
    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
