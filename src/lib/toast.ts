import { toast as sonnerToast } from 'sonner';

interface UndoOptions {
  label: string;
  onUndo: () => unknown;
  duration?: number;
}

interface InfoOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, { description }),
  error: (message: string, description?: string) =>
    sonnerToast.error(message, { description }),
  info: (message: string, opts?: InfoOptions) => {
    if (!opts) return sonnerToast(message);
    return sonnerToast(message, {
      description: opts.description,
      duration: opts.duration,
      action: opts.action
        ? { label: opts.action.label, onClick: opts.action.onClick }
        : undefined,
    });
  },
  withUndo: (message: string, opts: UndoOptions) =>
    sonnerToast(message, {
      duration: opts.duration ?? 5000,
      action: {
        label: opts.label,
        onClick: () => {
          void opts.onUndo();
        },
      },
    }),
};
