import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Tag, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { AmountField } from '@/components/transactions/amount-field';
import { DirectionPill } from '@/components/transactions/direction-pill';
import { PickerCard } from '@/components/transactions/picker-card';
import { DetailsPanel } from '@/components/transactions/details-panel';
import { CategorySheet } from '@/components/category-picker';
import { AccountSheet } from '@/components/account-sheet';
import { useCategoryLabel } from '@/hooks/use-category-label';
import { useAccountLabel } from '@/hooks/use-account-label';
import type { TransactionFormValues } from '@/features/transactions/schema';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';
import { toast } from '@/lib/toast';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

export interface TransactionFormProps {
  defaultValues: TransactionFormValues;
  title: string;
  submitLabel: string;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function parseInitialAmount(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function TransactionForm({
  defaultValues,
  title,
  submitLabel,
  onSubmit,
  onDelete,
}: TransactionFormProps) {
  const navigate = useNavigate();

  const [amount, setAmount] = useState<number>(() =>
    parseInitialAmount(defaultValues.amount),
  );
  const [direction, setDirection] = useState<'outflow' | 'inflow'>(
    defaultValues.direction,
  );
  const [categoryId, setCategoryId] = useState(() => {
    if (defaultValues.direction === 'inflow') return AVAILABLE_TO_BUDGET;
    return defaultValues.categoryId === AVAILABLE_TO_BUDGET
      ? ''
      : defaultValues.categoryId;
  });
  const [accountId, setAccountId] = useState(defaultValues.accountId);
  const [date, setDate] = useState(defaultValues.date);
  const [status, setStatus] = useState(defaultValues.status);
  const [memo, setMemo] = useState(defaultValues.memo);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const categoryLabel = useCategoryLabel(categoryId);
  const accountLabel = useAccountLabel(accountId);

  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(formatShortDate(date));
    if (status === 'pending') parts.push('Pending');
    if (memo) parts.push('memo');
    return parts.join(' · ');
  }, [date, status, memo]);

  function validate(): boolean {
    const next: { [k: string]: string } = {};
    if (!amount || amount <= 0) next.amount = 'Enter an amount greater than zero';
    if (!categoryId) next.category = 'Pick a bucket list';
    if (!accountId) next.account = 'Pick an account';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Pick a date';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!validate()) {
      haptics.error();
      const first = Object.values(errors)[0];
      if (first) toast.error(first);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        date,
        direction,
        amount: amount.toFixed(2),
        categoryId,
        accountId,
        memo,
        status,
      });
      haptics.confirm();
      navigate(-1);
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error('Could not save. Try again.');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete();
      haptics.confirm();
      toast.success('Transaction deleted');
      navigate(-1);
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error('Delete failed');
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="px-4 pt-4">
        <PageHeader
          title={title}
          backTo=".."
          action={
            onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[color:var(--color-danger-600)]"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )
          }
        />
      </div>

      <div className="flex-1 space-y-4 px-4 pb-6">
        <div className="flex justify-center">
          <DirectionPill
            value={direction}
            onChange={(next) => {
              setDirection(next);
              if (next === 'inflow') {
                setCategoryId(AVAILABLE_TO_BUDGET);
                setErrors((e) => ({ ...e, category: '' }));
              } else if (categoryId === AVAILABLE_TO_BUDGET) {
                setCategoryId('');
              }
            }}
          />
        </div>

        <div className="pt-2">
          <AmountField
            value={amount}
            onChange={setAmount}
            direction={direction}
            size="large"
          />
          {errors.amount && (
            <p className="mt-1 text-center text-xs text-[color:var(--color-danger-600)]">
              {errors.amount}
            </p>
          )}
        </div>

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
            label="Bucket List"
            value={categoryLabel}
            placeholder="Pick bucket list"
            icon={Tag}
            onClick={() => setCategoryOpen(true)}
            error={errors.category}
            disabled={direction === 'inflow'}
          />
        </div>

        <DetailsPanel summary={summary} defaultOpen>
          <div>
            <label
              htmlFor="txn-date"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]"
            >
              Date
            </label>
            <input
              id="txn-date"
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              Status
            </span>
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
                      'h-8 flex-1 rounded-lg text-xs font-medium capitalize',
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

          <div>
            <label
              htmlFor="txn-memo"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]"
            >
              Memo
            </label>
            <input
              id="txn-memo"
              type="text"
              className={inputClass}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
              maxLength={200}
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} loading={submitting}>
            {submitLabel}
          </Button>
        </DetailsPanel>
      </div>

      <CategorySheet
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          setErrors((e) => ({ ...e, category: '' }));
        }}
        includeAvailableToBudget={false}
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

      {onDelete && (
        <ConfirmSheet
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this transaction?"
          description="This removes the transaction from its account and bucket list math. You can undo for a few seconds."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function formatShortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Date';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
