import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CurrencyContext } from '@/app/currency-context';
import {
  CURRENCY_STORAGE_KEY,
  isValidCurrencyCode,
  readStoredCurrency,
  setActiveCurrency,
} from '@/lib/currency-prefs';

function normalizeSet(code: string): string {
  return isValidCurrencyCode(code) ? code.toUpperCase() : 'USD';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(() => readStoredCurrency());

  const setCurrency = useCallback((code: string) => {
    const next = normalizeSet(code);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setActiveCurrency(next);
    setCurrencyState(next);
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency }),
    [currency, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}
