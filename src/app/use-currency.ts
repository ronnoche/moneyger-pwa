import { useContext } from 'react';
import { CurrencyContext, type CurrencyContextValue } from '@/app/currency-context';

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used inside CurrencyProvider');
  }
  return ctx;
}
