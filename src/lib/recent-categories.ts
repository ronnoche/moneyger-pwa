const KEY = 'aspire:recentCategoryIds';
const MAX = 5;

export function getRecentCategoryIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentCategoryId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  const current = getRecentCategoryIds().filter((x) => x !== id);
  const next = [id, ...current].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}
