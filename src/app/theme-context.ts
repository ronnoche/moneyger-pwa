import { createContext } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
