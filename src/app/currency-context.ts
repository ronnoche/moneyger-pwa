import { createContext } from 'react';

export interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);
