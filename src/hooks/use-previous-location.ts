import { useState } from 'react';
import { useLocation } from 'react-router';

export interface DirectionalLocation {
  pathname: string;
  direction: 'forward' | 'back' | 'replace';
}

function depth(path: string): number {
  return path.split('/').filter(Boolean).length;
}

export function usePreviousLocation(): DirectionalLocation {
  const location = useLocation();
  const [tracked, setTracked] = useState<DirectionalLocation & { prev: string }>({
    pathname: location.pathname,
    prev: location.pathname,
    direction: 'replace',
  });

  if (tracked.pathname !== location.pathname) {
    const direction: DirectionalLocation['direction'] =
      depth(location.pathname) >= depth(tracked.pathname) ? 'forward' : 'back';
    setTracked({
      pathname: location.pathname,
      prev: tracked.pathname,
      direction,
    });
  }

  return {
    pathname: tracked.pathname,
    direction: tracked.direction,
  };
}
