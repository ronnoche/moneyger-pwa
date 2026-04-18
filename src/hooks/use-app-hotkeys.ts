import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router';

interface AppHotkeysProps {
  onOpenHelp: () => void;
  onOpenPalette: () => void;
}

export function useAppHotkeys({ onOpenHelp, onOpenPalette }: AppHotkeysProps): void {
  const navigate = useNavigate();

  const opts = {
    enableOnFormTags: false,
    preventDefault: true,
  } as const;

  useHotkeys('shift+/', onOpenHelp, opts);
  useHotkeys('mod+k', onOpenPalette, { ...opts, enableOnFormTags: true });
  useHotkeys('g>d', () => navigate('/'), opts);
  useHotkeys('g>t', () => navigate('/transactions'), opts);
  useHotkeys('g>b', () => navigate('/budget'), opts);
  useHotkeys('g>r', () => navigate('/reports'), opts);
  useHotkeys('g>a', () => navigate('/accounts'), opts);
  useHotkeys('g>s', () => navigate('/settings'), opts);
  useHotkeys('n', () => navigate('/transactions/new'), opts);
  useHotkeys('m', () => navigate('/budget'), opts);
  useHotkeys(
    '/',
    (e) => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="search"]',
      );
      if (input) {
        e.preventDefault();
        input.focus();
      }
    },
    opts,
  );
}
