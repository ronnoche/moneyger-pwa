import { getMoneyFormatter } from '@/lib/currency-prefs';

export function formatMoney(amount: number): string {
  return getMoneyFormatter().format(amount);
}

export function formatSignedMoney(amount: number): string {
  if (amount === 0) return formatMoney(0);
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatMoney(amount)}`;
}

export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
