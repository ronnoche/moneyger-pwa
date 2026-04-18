import { useEffect, useState } from 'react';

interface LegacyNavigator {
  standalone?: boolean;
}

function detect(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & LegacyNavigator;
  return nav.standalone === true;
}

export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState<boolean>(() => detect());

  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setStandalone(detect());
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return standalone;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function getVisitCount(): number {
  try {
    const raw = localStorage.getItem('aspire:visits');
    const n = parseInt(raw ?? '0', 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
