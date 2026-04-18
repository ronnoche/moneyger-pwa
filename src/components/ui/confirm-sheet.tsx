import { useId, useState } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  typedConfirmation?: string;
  onConfirm: () => unknown;
}

export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  typedConfirmation,
  onConfirm,
}: ConfirmSheetProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const mustType = Boolean(typedConfirmation);
  const canConfirm =
    !busy && (!mustType || typed.trim() === typedConfirmation);

  async function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      if (destructive) haptics.confirm();
      else haptics.light();
      await onConfirm();
      onOpenChange(false);
      setTyped('');
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setTyped('');
    onOpenChange(next);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
    >
      {mustType && (
        <div className="mb-3 space-y-2">
          <label
            htmlFor={inputId}
            className="block text-sm text-[color:var(--color-fg-muted)]"
          >
            Type <span className="font-mono">{typedConfirmation}</span> to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            className="w-full h-11 px-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-brand-600)]"
          />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => handleOpenChange(false)}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          className="flex-1"
          disabled={!canConfirm}
          loading={busy}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
