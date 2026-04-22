const KEY = 'moneyger:onboarding.complete';

export function isOnboardingComplete(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(KEY) === '1';
}

export function markOnboardingComplete(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // ignore quota errors
  }
}

export function clearOnboarding(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
