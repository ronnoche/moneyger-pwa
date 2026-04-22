import { useCallback, useEffect, useState } from 'react';
import type { BudgetViewMode } from '@/components/budget/budget-toolbar';

const KEY = 'moneyger:budget-view-mode';

function isValid(v: unknown): v is BudgetViewMode {
  return v === 'list' || v === 'block';
}

function read(defaultMode: BudgetViewMode): BudgetViewMode {
  if (typeof window === 'undefined') return defaultMode;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw && isValid(raw)) return raw;
  } catch {
    // ignore
  }
  return defaultMode;
}

export function useBudgetViewMode(): [BudgetViewMode, (v: BudgetViewMode) => void] {
  // Default: list on desktop, block on mobile.
  const defaultMode: BudgetViewMode =
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
      ? 'list'
      : 'block';

  const [mode, setMode] = useState<BudgetViewMode>(() => read(defaultMode));

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const setModeCb = useCallback((v: BudgetViewMode) => setMode(v), []);
  return [mode, setModeCb];
}
