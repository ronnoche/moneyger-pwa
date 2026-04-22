import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useCategories, useTransactions, useTransfers } from '@/db/hooks';
import { createTransfer } from '@/features/transfers/repo';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { CategorySheet } from '@/components/category-picker';
import { AmountField } from '@/components/transactions/amount-field';
import { DetailsPanel } from '@/components/transactions/details-panel';
import { FromToCards } from '@/components/budget/from-to-cards';
import { QuickAmountChips, type QuickChip } from '@/components/budget/quick-amount-chips';
import {
  AVAILABLE_TO_BUDGET,
  availableToBudget,
  categoryAvailable,
  categoryBudgetedForMonth,
  goalProgress,
} from '@/lib/budget-math';
import { todayISO } from '@/lib/dates';
import { toast } from '@/lib/toast';
import { haptics } from '@/lib/haptics';

type PickerTarget = 'from' | 'to' | null;

export default function MoveMoney() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const txns = useTransactions();
  const tfrs = useTransfers();
  const categories = useCategories();

  const [fromId, setFromId] = useState(AVAILABLE_TO_BUDGET as string);
  const [toId, setToId] = useState(() => params.get('to') ?? '');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState('');
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const fromAvailable = useMemo(() => {
    if (!txns || !tfrs) return 0;
    if (!fromId) return 0;
    return fromId === AVAILABLE_TO_BUDGET
      ? availableToBudget(txns, tfrs)
      : categoryAvailable(fromId, txns, tfrs);
  }, [txns, tfrs, fromId]);

  const toAvailable = useMemo(() => {
    if (!txns || !tfrs || !toId) return 0;
    return toId === AVAILABLE_TO_BUDGET
      ? availableToBudget(txns, tfrs)
      : categoryAvailable(toId, txns, tfrs);
  }, [txns, tfrs, toId]);

  const fromLabel = useLabel(fromId, categories);
  const toLabel = useLabel(toId, categories);

  const chips = useMemo<QuickChip[]>(() => {
    const base: QuickChip[] = [
      { label: '', value: 25 },
      { label: '', value: 50 },
      { label: '', value: 100 },
    ];
    const destCat =
      toId && toId !== AVAILABLE_TO_BUDGET
        ? categories?.find((c) => c.id === toId)
        : undefined;
    if (destCat && txns && tfrs) {
      const budgeted = categoryBudgetedForMonth(destCat.id, new Date(), tfrs);
      const progress = goalProgress(destCat, toAvailable, budgeted, new Date());
      if (progress && progress.needed > 0) {
        base.push({
          label: 'Fill goal',
          value: round2(progress.needed),
        });
      }
    }
    if (fromAvailable > 0) {
      base.push({
        label: 'All of it',
        value: round2(fromAvailable),
      });
    }
    return base;
  }, [toId, categories, txns, tfrs, toAvailable, fromAvailable]);

  function swap() {
    const prevFrom = fromId;
    setFromId(toId || AVAILABLE_TO_BUDGET);
    setToId(prevFrom);
    setErrors({});
  }

  function validate(): boolean {
    const next: { [k: string]: string } = {};
    if (!fromId) next.from = 'Pick a source';
    if (!toId) next.to = 'Pick a destination';
    if (fromId && toId && fromId === toId) next.to = 'Source and destination must differ';
    if (amount <= 0) next.amount = 'Enter an amount greater than zero';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Pick a date';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!validate()) {
      haptics.error();
      const first = Object.values(errors)[0] || 'Fix errors to continue';
      toast.error(first);
      return;
    }
    setSubmitting(true);
    try {
      await createTransfer({
        date,
        amount,
        fromCategoryId: fromId,
        toCategoryId: toId,
        memo: memo.trim(),
      });
      haptics.confirm();
      toast.success('Money moved');
      navigate(-1);
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error('Move failed. Try again.');
      setSubmitting(false);
    }
  }

  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(formatShortDate(date));
    if (memo) parts.push('memo');
    return parts.join(' · ');
  }, [date, memo]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="px-4 pt-4">
        <PageHeader title="Move Money" backTo=".." />
      </div>

      <div className="flex-1 space-y-4 px-4 pb-28">
        <div className="pt-2">
          <AmountField value={amount} onChange={setAmount} direction="inflow" />
          {errors.amount && (
            <p className="mt-1 text-center text-xs text-[color:var(--color-danger-600)]">
              {errors.amount}
            </p>
          )}
        </div>

        <FromToCards
          fromLabel={fromLabel}
          fromAvailable={fromAvailable}
          onPickFrom={() => setPicker('from')}
          toLabel={toLabel}
          toAvailable={toAvailable}
          onPickTo={() => setPicker('to')}
          onSwap={swap}
          canSwap={Boolean(toId)}
        />
        {(errors.from || errors.to) && (
          <p className="text-center text-xs text-[color:var(--color-danger-600)]">
            {errors.from || errors.to}
          </p>
        )}

        <QuickAmountChips chips={chips} onPick={setAmount} />

        <DetailsPanel summary={summary}>
          <div>
            <label
              htmlFor="move-date"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]"
            >
              Date
            </label>
            <input
              id="move-date"
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="move-memo"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]"
            >
              Memo
            </label>
            <input
              id="move-memo"
              type="text"
              className={inputClass}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
              maxLength={200}
            />
          </div>
        </DetailsPanel>
      </div>

      <div className="safe-pb fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-bg)]/80">
        <div className="mx-auto max-w-xl px-3 pb-3 pt-3">
          <Button
            className="w-full"
            onClick={handleSubmit}
            loading={submitting}
          >
            Move money
          </Button>
        </div>
      </div>

      <CategorySheet
        open={picker === 'from'}
        onOpenChange={(next) => setPicker(next ? 'from' : null)}
        value={fromId}
        onChange={(id) => {
          setFromId(id);
          setErrors((e) => ({ ...e, from: '', to: '' }));
        }}
        includeAvailableToBudget
      />

      <CategorySheet
        open={picker === 'to'}
        onOpenChange={(next) => setPicker(next ? 'to' : null)}
        value={toId}
        onChange={(id) => {
          setToId(id);
          setErrors((e) => ({ ...e, to: '' }));
        }}
        includeAvailableToBudget
      />
    </div>
  );
}

function useLabel(
  id: string,
  categories: ReturnType<typeof useCategories>,
): string {
  if (!id) return '';
  if (id === AVAILABLE_TO_BUDGET) return 'Available to Budget';
  return categories?.find((c) => c.id === id)?.name ?? '';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
