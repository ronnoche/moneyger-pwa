export const CURRENCY_STORAGE_KEY = 'moneyger:currency';
export const DEFAULT_CURRENCY = 'USD';

const formatters = new Map<string, Intl.NumberFormat>();

export function isValidCurrencyCode(code: string): boolean {
  const upper = String(code).toUpperCase();
  if (!/^[A-Z]{3}$/.test(upper)) return false;
  try {
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: upper,
    }).format(0);
    return true;
  } catch {
    return false;
  }
}

function normalizeCode(code: string): string {
  if (!isValidCurrencyCode(code)) return DEFAULT_CURRENCY;
  return code.toUpperCase();
}

let active = DEFAULT_CURRENCY;

export function readStoredCurrency(): string {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (raw) return normalizeCode(raw);
  } catch {
    // ignore
  }
  return DEFAULT_CURRENCY;
}

export function getActiveCurrency(): string {
  return active;
}

export function setActiveCurrency(code: string): void {
  active = normalizeCode(code);
  formatters.clear();
}

/** Call once on app load (browser) so formatMoney matches storage before React mounts. */
export function initCurrencyFromStorage(): void {
  if (typeof window === 'undefined') return;
  setActiveCurrency(readStoredCurrency());
}

// Eager read for the main bundle in the browser
if (typeof window !== 'undefined') {
  initCurrencyFromStorage();
}

export function getMoneyFormatter(currency?: string): Intl.NumberFormat {
  const code =
    currency !== undefined ? normalizeCode(currency) : getActiveCurrency();
  let f = formatters.get(code);
  if (!f) {
    f = new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
    formatters.set(code, f);
  }
  return f;
}
