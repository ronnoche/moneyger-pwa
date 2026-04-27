import { useMemo, useState } from 'react';
import type { Category } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';

interface CategoryRehomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCategoryId: string | null;
  categories: Category[];
  onConfirm: (targetCategoryId: string) => Promise<void>;
}

export function CategoryRehomeDialog({
  open,
  onOpenChange,
  sourceCategoryId,
  categories,
  onConfirm,
}: CategoryRehomeDialogProps) {
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [busy, setBusy] = useState(false);

  const choices = useMemo(
    () =>
      categories
        .filter((category) => !category.isArchived && category.id !== sourceCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, sourceCategoryId],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Re-home transactions"
      description="This bucket list has transactions. Pick a destination before archiving."
    >
      <div className="space-y-3 pb-2">
        <Field label="Move transactions to" htmlFor="rehome-target">
          <select
            id="rehome-target"
            className={inputClass}
            value={targetCategoryId}
            onChange={(e) => setTargetCategoryId(e.target.value)}
          >
            <option value="">Select a bucket list</option>
            {choices.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={busy}
            disabled={!targetCategoryId}
            onClick={async () => {
              setBusy(true);
              await onConfirm(targetCategoryId);
              setBusy(false);
              setTargetCategoryId('');
            }}
          >
            Re-home and archive
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
