import { useMemo, useState } from 'react';
import { Tag, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { MoneyInput } from '@/components/money-input';
import { DirectionPill } from '@/components/transactions/direction-pill';
import { PickerCard } from '@/components/transactions/picker-card';
import { CategorySheet } from '@/components/category-picker';
import { AccountSheet } from '@/components/account-sheet';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useCategoryLabel } from '@/hooks/use-category-label';
import { useAccountLabel } from '@/hooks/use-account-label';
import { parseMoneyInput } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { Transaction } from '@/db/schema';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/features/transactions/repo';

interface InlineEditorProps {
  txn: Transaction;
  onDone?: () => void;
}

export function TransactionInlineEditor({ txn, onDone }: InlineEditorProps) {
  const [amount, setAmount] = useState<string>(
    () => (txn.inflow > 0 ? txn.inflow : txn.outflow).toFixed(2),
  );
  const [direction, setDirection] = useState<'outflow' | 'inflow'>(
    txn.inflow > 0 ? 'inflow' : 'outflow',
  );
  const [categoryId, setCategoryId] = useState(txn.categoryId);
  const [accountId, setAccountId] = useState(txn.accountId);
  const [date, setDate] = useState(txn.date);
  const [status, setStatus] = useState<Transaction['status']>(txn.status);
  const [memo, setMemo] = useState(txn.memo);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryLabel = useCategoryLabel(categoryId);
  const accountLabel = useAccountLabel(accountId);

  const numericAmount = useMemo(() => parseMoneyInput(amount), [amount]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      next.amount = 'Enter an amount greater than zero';
    }
    if (!categoryId) next.category = 'Pick a category';
    if (!accountId) next.account = 'Pick an account';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Pick a date';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (saving) return;
    if (!validate()) {
      haptics.error();
      toast.error(Object.values(errors)[0] || 'Fix errors to continue');
      return;
    }
    setSaving(true);
    try {
      await updateTransaction(txn.id, {
        date,
        outflow: direction === 'outflow' ? numericAmount : 0,
        inflow: direction === 'inflow' ? numericAmount : 0,
        categoryId,
        accountId,
        memo: memo.trim(),
        status,
      });
      haptics.confirm();
      toast.success('Saved');
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const snapshot = { ...txn };
      await deleteTransaction(txn.id);
      haptics.confirm();
      toast.withUndo('Transaction deleted', {
        label: 'Undo',
        onUndo: async () => {
          await createTransaction({
            date: snapshot.date,
            outflow: snapshot.outflow,
            inflow: snapshot.inflow,
            categoryId: snapshot.categoryId,
            accountId: snapshot.accountId,
            memo: snapshot.memo,
            status: snapshot.status,
          });
        },
      });
      onDone?.();
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error('Delete failed');
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Edit transaction</h2>
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Changes commit immediately on Save.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="text-[color:var(--color-danger-600)]"
        >
          <Trash2 size={14} strokeWidth={1.75} />
          <span className="ml-1">Delete</span>
        </Button>
      </header>

      <div className="flex items-center gap-2">
        <DirectionPill value={direction} onChange={setDirection} />
      </div>

      <Field label="Amount" htmlFor="inline-amount" error={errors.amount}>
        <MoneyInput
          id="inline-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <PickerCard
          label="Account"
          value={accountLabel}
          placeholder="Pick account"
          icon={Wallet}
          onClick={() => setAccountOpen(true)}
          error={errors.account}
        />
        <PickerCard
          label="Category"
          value={categoryLabel}
          placeholder="Pick category"
          icon={Tag}
          onClick={() => setCategoryOpen(true)}
          error={errors.category}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Date" htmlFor="inline-date" error={errors.date}>
          <input
            id="inline-date"
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Status
          </label>
          <div className="flex gap-1.5">
            {(['cleared', 'pending', 'reconciled'] as const).map((s) => {
              const active = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setStatus(s);
                  }}
                  className={cn(
                    'h-10 flex-1 rounded-lg text-xs font-medium capitalize',
                    active
                      ? 'bg-[color:var(--color-brand-600)] text-white'
                      : 'bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)]',
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Field label="Memo" htmlFor="inline-memo">
        <input
          id="inline-memo"
          type="text"
          className={inputClass}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Optional"
          autoComplete="off"
          maxLength={200}
        />
      </Field>

      <div className="mt-auto flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Close
        </Button>
        <Button onClick={save} loading={saving}>
          Save
        </Button>
      </div>

      <CategorySheet
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          setErrors((e) => ({ ...e, category: '' }));
        }}
        includeAvailableToBudget
      />
      <AccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        value={accountId}
        onChange={(id) => {
          setAccountId(id);
          setErrors((e) => ({ ...e, account: '' }));
        }}
      />
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this transaction?"
        description="This removes the transaction from its account and category math. You can undo for a few seconds."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
