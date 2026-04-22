import { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { AvailablePill } from '@/components/budget/available-pill';
import { updateCategory } from '@/features/categories/repo';
import { neededThisMonth, type NormalizedGoal } from '@/lib/goals';
import { parseMoneyInput } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Category, GoalCadence } from '@/db/schema';

type BuilderCadence =
  | 'none'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'
  | 'target_balance';

const OPTIONS: { id: BuilderCadence; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
  { id: 'target_balance', label: 'Target Balance' },
];

interface Props {
  cat: Category;
  viewedMonth: Date;
  currentAvailable: number;
  currentBudgeted: number;
  onSaved: () => void;
  onCancel: () => void;
}

export function GoalBuilder({
  cat,
  viewedMonth,
  currentAvailable,
  currentBudgeted,
  onSaved,
  onCancel,
}: Props) {
  const initial = initialState(cat, viewedMonth);
  const [cadence, setCadence] = useState<BuilderCadence>(initial.cadence);
  const [amount, setAmount] = useState<string>(initial.amount);
  const [dueDate, setDueDate] = useState<string>(initial.dueDate);
  const [recurring, setRecurring] = useState<boolean>(initial.recurring);
  const [startMonth, setStartMonth] = useState<string>(initial.startMonth);
  const [saving, setSaving] = useState(false);

  const candidateGoal = useMemo<NormalizedGoal | null>(() => {
    return buildCandidateGoal({
      cadence,
      amount,
      dueDate,
      recurring,
      startMonth,
    });
  }, [cadence, amount, dueDate, recurring, startMonth]);

  const previewAvailable = useMemo(() => {
    if (!candidateGoal) return currentAvailable;
    const needed = neededThisMonth(
      candidateGoal,
      currentAvailable,
      currentBudgeted,
      viewedMonth,
    );
    return currentAvailable + needed;
  }, [candidateGoal, currentAvailable, currentBudgeted, viewedMonth]);

  async function handleSave() {
    setSaving(true);
    try {
      const patch = toPatch({
        cadence,
        amount,
        dueDate,
        recurring,
        startMonth,
      });
      if (patch.error) {
        toast.error(patch.error);
        return;
      }
      await updateCategory(cat.id, patch.patch);
      toast.success(cadence === 'none' ? 'Goal removed' : 'Goal saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const isCreate = cat.goalType === 'none';
  const primaryLabel =
    cadence === 'none' ? 'Remove Goal' : isCreate ? 'Save Target' : 'Save Target';

  return (
    <div className="space-y-3">
      <Segmented value={cadence} onChange={setCadence} />

      <DynamicFields
        cadence={cadence}
        amount={amount}
        onAmountChange={setAmount}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        recurring={recurring}
        onRecurringChange={setRecurring}
        startMonth={startMonth}
        onStartMonthChange={setStartMonth}
      />

      {cadence !== 'none' && (
        <LivePreview
          catName={cat.name}
          value={previewAvailable}
        />
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant={cadence === 'none' ? 'ghost' : 'primary'}
          size="sm"
          onClick={handleSave}
          disabled={saving}
          loading={saving}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
}: {
  value: BuilderCadence;
  onChange: (v: BuilderCadence) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Goal cadence"
      className="flex flex-wrap gap-1 rounded-xl bg-[color:var(--color-surface-2)] p-1"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'h-8 flex-1 rounded-lg px-2 text-[12px] font-medium transition-colors',
            value === opt.id
              ? 'bg-[color:var(--color-surface)] text-[color:var(--color-brand-700)] shadow-[var(--shadow-sm)]'
              : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface DynamicProps {
  cadence: BuilderCadence;
  amount: string;
  onAmountChange: (v: string) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  recurring: boolean;
  onRecurringChange: (v: boolean) => void;
  startMonth: string;
  onStartMonthChange: (v: string) => void;
}

function DynamicFields({
  cadence,
  amount,
  onAmountChange,
  dueDate,
  onDueDateChange,
  recurring,
  onRecurringChange,
  startMonth,
  onStartMonthChange,
}: DynamicProps) {
  if (cadence === 'none') {
    return (
      <p className="px-1 text-sm text-[color:var(--color-fg-muted)]">
        Removing the goal clears all goal fields for this category.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <LabeledField
        id="goal-amount"
        label={amountLabel(cadence)}
      >
        <input
          id="goal-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          className={inputClass}
        />
      </LabeledField>

      {cadence === 'weekly' && (
        <LabeledField id="goal-start" label="Starting from">
          <input
            id="goal-start"
            type="date"
            value={startMonth}
            onChange={(e) => onStartMonthChange(e.target.value)}
            className={inputClass}
          />
        </LabeledField>
      )}

      {cadence === 'yearly' && (
        <RecurringToggle
          recurring={recurring}
          onChange={onRecurringChange}
          recurringLabel="Spread evenly"
          nonRecurringLabel="Save by"
          dueDate={dueDate}
          onDueDateChange={onDueDateChange}
        />
      )}

      {cadence === 'custom' && (
        <>
          <LabeledField id="goal-due" label="By">
            <input
              id="goal-due"
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className={inputClass}
            />
          </LabeledField>
          <label className="flex items-center gap-2 px-1 text-sm">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => onRecurringChange(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--color-brand-600)]"
            />
            Repeat after due date
          </label>
        </>
      )}
    </div>
  );
}

function RecurringToggle({
  recurring,
  onChange,
  recurringLabel,
  nonRecurringLabel,
  dueDate,
  onDueDateChange,
}: {
  recurring: boolean;
  onChange: (v: boolean) => void;
  recurringLabel: string;
  nonRecurringLabel: string;
  dueDate: string;
  onDueDateChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1 rounded-xl bg-[color:var(--color-surface-2)] p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            'h-8 flex-1 rounded-lg text-[12px] font-medium',
            recurring
              ? 'bg-[color:var(--color-surface)] text-[color:var(--color-brand-700)]'
              : 'text-[color:var(--color-fg-muted)]',
          )}
        >
          {recurringLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            'h-8 flex-1 rounded-lg text-[12px] font-medium',
            !recurring
              ? 'bg-[color:var(--color-surface)] text-[color:var(--color-brand-700)]'
              : 'text-[color:var(--color-fg-muted)]',
          )}
        >
          {nonRecurringLabel}
        </button>
      </div>
      {!recurring && (
        <LabeledField id="yearly-due" label="Fund by month">
          <input
            id="yearly-due"
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            className={inputClass}
          />
        </LabeledField>
      )}
    </div>
  );
}

function LabeledField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 px-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function LivePreview({
  catName,
  value,
}: {
  catName: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        Preview next month
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm">{catName}</span>
        <AvailablePill value={value} animate />
      </div>
    </div>
  );
}

function amountLabel(cadence: BuilderCadence): string {
  switch (cadence) {
    case 'weekly':
      return 'I need per week';
    case 'monthly':
      return 'I need per month';
    case 'yearly':
      return 'I need per year';
    case 'custom':
      return 'I need';
    case 'target_balance':
      return 'Save up to';
    default:
      return 'Amount';
  }
}

interface BuilderState {
  cadence: BuilderCadence;
  amount: string;
  dueDate: string;
  recurring: boolean;
  startMonth: string;
}

function initialState(cat: Category, viewedMonth: Date): BuilderState {
  const def: BuilderState = {
    cadence: 'none',
    amount: '',
    dueDate: '',
    recurring: false,
    startMonth: format(startOfMonth(viewedMonth), 'yyyy-MM-dd'),
  };

  const cadence = mapLegacyCadence(cat.goalType);
  return {
    ...def,
    cadence,
    amount: cat.goalAmount > 0 ? String(cat.goalAmount) : '',
    dueDate: cat.goalDueDate ?? '',
    recurring: cat.goalRecurring ?? (cadence === 'yearly'),
    startMonth: cat.goalStartMonth ?? def.startMonth,
  };
}

function mapLegacyCadence(type: GoalCadence): BuilderCadence {
  switch (type) {
    case 'monthly_funding':
      return 'monthly';
    case 'target_balance':
      return 'target_balance';
    case 'target_by_date':
      return 'custom';
    case 'weekly':
    case 'monthly':
    case 'yearly':
    case 'custom':
      return type;
    default:
      return 'none';
  }
}

function buildCandidateGoal(s: BuilderState): NormalizedGoal | null {
  if (s.cadence === 'none') return null;
  const amount = parseMoneyInput(s.amount);
  if (!(amount > 0)) return null;

  switch (s.cadence) {
    case 'weekly':
      return {
        cadence: 'weekly',
        amount,
        dueDate: null,
        recurring: true,
        startMonth: s.startMonth ? parseISO(s.startMonth) : null,
      };
    case 'monthly':
      return {
        cadence: 'monthly',
        amount,
        dueDate: null,
        recurring: true,
        startMonth: null,
      };
    case 'yearly':
      return {
        cadence: 'yearly',
        amount,
        dueDate: s.dueDate ? parseISO(s.dueDate) : null,
        recurring: s.recurring,
        startMonth: null,
      };
    case 'custom':
      return {
        cadence: 'custom',
        amount,
        dueDate: s.dueDate ? parseISO(s.dueDate) : null,
        recurring: s.recurring,
        startMonth: null,
      };
    case 'target_balance':
      return {
        cadence: 'none',
        amount,
        dueDate: null,
        recurring: false,
        startMonth: null,
      };
    default:
      return null;
  }
}

type Patch = Partial<{
  goalType: GoalCadence;
  goalAmount: number;
  goalDueDate: string | null;
  goalRecurring: boolean | null;
  goalStartMonth: string | null;
}>;

function toPatch(s: BuilderState):
  | { patch: Patch; error?: undefined }
  | { patch: Patch; error: string } {
  if (s.cadence === 'none') {
    return {
      patch: {
        goalType: 'none',
        goalAmount: 0,
        goalDueDate: null,
        goalRecurring: null,
        goalStartMonth: null,
      },
    };
  }

  const amount = parseMoneyInput(s.amount);
  if (!(amount > 0)) {
    return { patch: {}, error: 'Enter an amount greater than zero.' };
  }

  switch (s.cadence) {
    case 'weekly':
      return {
        patch: {
          goalType: 'weekly',
          goalAmount: amount,
          goalDueDate: null,
          goalRecurring: true,
          goalStartMonth: s.startMonth || null,
        },
      };
    case 'monthly':
      return {
        patch: {
          goalType: 'monthly',
          goalAmount: amount,
          goalDueDate: null,
          goalRecurring: true,
          goalStartMonth: null,
        },
      };
    case 'yearly':
      if (!s.recurring && !s.dueDate) {
        return { patch: {}, error: 'Pick a month to save by.' };
      }
      return {
        patch: {
          goalType: 'yearly',
          goalAmount: amount,
          goalDueDate: s.recurring ? null : s.dueDate,
          goalRecurring: s.recurring,
          goalStartMonth: null,
        },
      };
    case 'custom':
      if (!s.dueDate) {
        return { patch: {}, error: 'Pick a due date.' };
      }
      return {
        patch: {
          goalType: 'custom',
          goalAmount: amount,
          goalDueDate: s.dueDate,
          goalRecurring: s.recurring,
          goalStartMonth: null,
        },
      };
    case 'target_balance':
      return {
        patch: {
          goalType: 'target_balance',
          goalAmount: amount,
          goalDueDate: null,
          goalRecurring: null,
          goalStartMonth: null,
        },
      };
    default:
      return { patch: {}, error: 'Unsupported cadence.' };
  }
}
