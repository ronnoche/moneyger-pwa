import { useState } from 'react';
import { useCategories, useGroups } from '@/db/hooks';
import {
  archiveCategory,
  CategoryHasTransactionsError,
  createCategory,
  rehomeCategoryTransactions,
  updateCategory,
} from '@/features/categories/repo';
import type { CategoryType, GoalBehavior, GoalType } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { SwipeRow } from '@/components/swipe-row';
import { MoneyInput } from '@/components/money-input';
import { PageHeader } from '@/components/layout/page-header';
import { Sheet } from '@/components/ui/sheet';
import { CategoryRehomeDialog } from '@/components/category-rehome-dialog';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { cn } from '@/lib/cn';

interface FormState {
  groupId: string;
  name: string;
  type: CategoryType;
  goalType: GoalType;
  goalBehavior: GoalBehavior;
  goalAmount: string;
  goalDueDate: string;
  goalRecurring: boolean;
}

const blankForm = (groupId: string): FormState => ({
  groupId,
  name: '',
  type: 'expense',
  goalType: 'none',
  goalBehavior: 'set_aside_another',
  goalAmount: '',
  goalDueDate: '',
  goalRecurring: false,
});

export default function SettingsCategories() {
  const groups = useGroups();
  const categories = useCategories();
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm(''));
  const [error, setError] = useState<string | null>(null);
  const [rehomeOpen, setRehomeOpen] = useState(false);
  const [rehomeSourceId, setRehomeSourceId] = useState<string | null>(null);

  function openNew(groupId: string) {
    setEditingId(null);
    setForm(blankForm(groupId));
    setError(null);
    setEditOpen(true);
  }

  function openEdit(catId: string) {
    const cat = categories?.find((c) => c.id === catId);
    if (!cat) return;
    setEditingId(cat.id);
    setForm({
      groupId: cat.groupId,
      name: cat.name,
      type: cat.type,
      goalType: cat.goalType,
      goalBehavior: cat.goalBehavior ?? 'set_aside_another',
      goalAmount: cat.goalAmount ? String(cat.goalAmount) : '',
      goalDueDate: cat.goalDueDate ?? '',
      goalRecurring: cat.goalRecurring ?? false,
    });
    setError(null);
    setEditOpen(true);
  }

  async function submit() {
    const name = form.name.trim();
    if (!name) {
      setError('Name required');
      return;
    }
    const goalAmount =
      form.goalType === 'none' ? 0 : parseMoneyInput(form.goalAmount);
    const goalDueDate =
      form.goalType === 'target_by_date' && form.goalDueDate
        ? form.goalDueDate
        : null;
    if (form.goalType === 'target_by_date' && !goalDueDate) {
      setError('Pick a due date for target-by-date goals');
      return;
    }
    if (form.goalBehavior === 'have_a_balance_of' && form.goalType !== 'custom') {
      setError('Have a Balance Of requires custom frequency');
      return;
    }
    if (form.goalBehavior === 'have_a_balance_of' && form.goalRecurring) {
      setError('Have a Balance Of cannot repeat');
      return;
    }
    if (form.goalType !== 'none' && goalAmount <= 0) {
      setError('Goal amount must be greater than zero');
      return;
    }

    if (editingId) {
      await updateCategory(editingId, {
        name,
        type: form.type,
        goalType: form.goalType,
        goalBehavior: form.goalBehavior,
        goalAmount,
        goalDueDate,
        goalRecurring: form.goalType === 'none' ? null : form.goalRecurring,
      });
    } else {
      await createCategory({
        groupId: form.groupId,
        name,
        type: form.type,
        goalType: form.goalType,
        goalBehavior: form.goalBehavior,
        goalAmount,
        goalDueDate,
        goalRecurring: form.goalType === 'none' ? null : form.goalRecurring,
      });
    }
    setEditOpen(false);
  }

  async function handleArchive(catId: string) {
    try {
      await archiveCategory(catId);
    } catch (err) {
      if (err instanceof CategoryHasTransactionsError) {
        setRehomeSourceId(catId);
        setRehomeOpen(true);
        return;
      }
      throw err;
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Bucket Lists" backTo="/settings" />

      {groups === undefined ? (
        <p className="text-sm text-ink-500">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-500">
          Create a bucket first, then add bucket lists.
        </p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => {
            const inGroup = (categories ?? []).filter(
              (c) => c.groupId === group.id,
            );
            return (
              <li key={group.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                    {group.name}
                  </h2>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openNew(group.id)}
                  >
                    Add
                  </Button>
                </div>
                {inGroup.length === 0 ? (
                  <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-400 dark:bg-ink-800">
                    No bucket lists
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
                    {inGroup.map((cat) => (
                      <li key={cat.id}>
                        <SwipeRow onDelete={() => handleArchive(cat.id)}>
                          <button
                            type="button"
                            onClick={() => openEdit(cat.id)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <div>
                              <div className="text-sm">{cat.name}</div>
                              <div className="text-xs text-ink-500">
                                {labelFor(cat.type, cat.goalType)}
                                {cat.goalAmount > 0 && (
                                  <>
                                    <span className="mx-1">·</span>
                                    {formatMoney(cat.goalAmount)}
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        </SwipeRow>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editingId ? 'Edit bucket list' : 'New bucket list'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3 pb-2"
        >
          <Field label="Name" htmlFor="cat-name" error={error ?? undefined}>
            <input
              id="cat-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label="Type" htmlFor="cat-type">
            <SegmentedControl
              value={form.type}
              onChange={(type) => setForm({ ...form, type })}
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'sinking_fund', label: 'Sinking fund' },
              ]}
            />
          </Field>

          <Field label="Goal" htmlFor="cat-goal">
            <select
              id="cat-goal"
              className={inputClass}
              value={form.goalType}
              onChange={(e) =>
                setForm({ ...form, goalType: e.target.value as GoalType })
              }
            >
              <option value="none">None</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </Field>

          {form.goalType !== 'none' && (
            <>
              <Field label="Behavior" htmlFor="cat-goal-behavior">
                <select
                  id="cat-goal-behavior"
                  className={inputClass}
                  value={form.goalBehavior}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      goalBehavior: e.target.value as GoalBehavior,
                    })
                  }
                >
                  <option value="set_aside_another">Set Aside Another</option>
                  <option value="refill_up_to">Refill Up To</option>
                  <option value="fill_up_to">Fill Up To</option>
                  {form.goalType === 'custom' && (
                    <option value="have_a_balance_of">Have a Balance Of</option>
                  )}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded accent-brand-600"
                  checked={form.goalRecurring}
                  onChange={(e) =>
                    setForm({ ...form, goalRecurring: e.target.checked })
                  }
                  disabled={form.goalBehavior === 'have_a_balance_of'}
                />
                Repeat goal
              </label>
            </>
          )}

          {form.goalType !== 'none' && (
            <Field label="Goal amount" htmlFor="cat-amount">
              <MoneyInput
                id="cat-amount"
                value={form.goalAmount}
                onChange={(e) =>
                  setForm({ ...form, goalAmount: e.target.value })
                }
              />
            </Field>
          )}

          {form.goalType === 'custom' && (
            <Field label="Due date" htmlFor="cat-due">
              <input
                id="cat-due"
                type="date"
                className={inputClass}
                value={form.goalDueDate}
                onChange={(e) =>
                  setForm({ ...form, goalDueDate: e.target.value })
                }
              />
            </Field>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingId ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Sheet>
      <CategoryRehomeDialog
        open={rehomeOpen}
        onOpenChange={setRehomeOpen}
        sourceCategoryId={rehomeSourceId}
        categories={categories ?? []}
        onConfirm={async (targetCategoryId) => {
          if (!rehomeSourceId) return;
          await rehomeCategoryTransactions(rehomeSourceId, targetCategoryId);
          await updateCategory(rehomeSourceId, { isArchived: true });
          setRehomeOpen(false);
          setRehomeSourceId(null);
        }}
      />
    </div>
  );
}

function labelFor(type: CategoryType, goal: GoalType): string {
  const t = type === 'sinking_fund' ? 'Sinking fund' : 'Expense';
  const g =
    goal === 'monthly'
      ? 'Monthly'
      : goal === 'weekly'
        ? 'Weekly'
        : goal === 'yearly'
          ? 'Yearly'
          : goal === 'custom'
          ? 'By date'
          : 'No goal';
  return `${t} · ${g}`;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: SegmentedProps<T>) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-11 text-sm font-medium',
            value === o.value
              ? 'bg-brand-600 text-white'
              : 'text-ink-700 active:bg-ink-100 dark:text-ink-200 dark:active:bg-ink-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
