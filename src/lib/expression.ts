const SAFE = /^[\d\s.+\-*/()]+$/;

export function evaluateExpression(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!SAFE.test(trimmed)) return null;
  if (/[+\-*/]{2,}/.test(trimmed.replace(/\s/g, ''))) return null;
  try {
    const fn = new Function(`"use strict"; return (${trimmed});`) as () => unknown;
    const result = fn();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}
