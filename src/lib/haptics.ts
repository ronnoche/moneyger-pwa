type HapticKind = 'light' | 'confirm' | 'error';

let switchEl: HTMLInputElement | null = null;
let supportsSwitch = false;

function ensureSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null;
  if (switchEl) return switchEl;
  const el = document.createElement('input');
  el.type = 'checkbox';
  el.setAttribute('switch', '');
  el.style.position = 'absolute';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.style.width = '1px';
  el.style.height = '1px';
  el.setAttribute('aria-hidden', 'true');
  el.tabIndex = -1;
  document.body.appendChild(el);
  switchEl = el;
  supportsSwitch = typeof el.toggleAttribute === 'function';
  return el;
}

function fireSwitch(): boolean {
  const el = ensureSwitch();
  if (!el || !supportsSwitch) return false;
  try {
    el.checked = !el.checked;
    return true;
  } catch {
    return false;
  }
}

function fireVibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

function fire(kind: HapticKind): void {
  if (fireSwitch()) return;
  switch (kind) {
    case 'light':
      fireVibrate(10);
      return;
    case 'confirm':
      fireVibrate([10, 40, 10]);
      return;
    case 'error':
      fireVibrate([20, 60, 20, 60, 20]);
      return;
  }
}

export const haptics = {
  light: () => fire('light'),
  confirm: () => fire('confirm'),
  error: () => fire('error'),
};
