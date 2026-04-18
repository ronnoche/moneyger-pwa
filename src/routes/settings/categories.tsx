import { useState } from 'react';
import { useCategories, useGroups } from '@/db/hooks';
import {
  archiveCategory,
  createCategory,
  updateCategory,
} from '@/features/categories/repo';
import type { CategoryType, GoalType } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { SwipeRow } from '@/components/swipe-row';
import { MoneyInput } from '@/components/money-input';
import { PageHeader } from '@/components/layout/page-header';
import { Sheet } from '@/components/ui/sheet';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { cn } from '@/lib/cn';

interface FormState {
  groupId: string;
  name: string;
  type: CategoryType;
  goalType: GoalType;
  goalAmount: string;
  goalDueDate: string;
}

const blankForm = (groupId: string): FormState => ({
  groupId,
  name: '',
  type: 'expense',
  goalType: 'none',
  goalAmount: '',
  goalDueDate: '',
});

export default function SettingsCategories() {
  const groups = useGroups();
  const categories = useCategories();
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm(''));
  const [error, setError] = useState<string | null>(null);

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
      goalAmount: cat.goalAmount ? String(cat.goalAmount) : '',
      goalDueDate: cat.goalDueDate ?? '',
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
    if (form.goalType !== 'none' && goalAmount <= 0) {
      setError('Goal amount must be greater than zero');
      return;
    }

    if (editingId) {
      await updateCategory(editingId, {
        name,
        type: form.type,
        goalType: form.goalType,
        goalAmount,
        goalDueDate,
      });
    } else {
      await createCategory({
        groupId: form.groupId,
        name,
        type: form.type,
        goalType: form.goalType,
        goalAmount,
        goalDueDate,
      });
    }
    setEditOpen(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Categories" backTo="/settings" />

      {groups === undefined ? (
        <p className="text-sm text-ink-500">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-500">
          Create a group first, then add categories.
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
                    No categories
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
                    {inGroup.map((cat) => (
                      <li key={cat.id}>
                        <SwipeRow onDelete={() => archiveCategory(cat.id)}>
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
        title={editingId ? 'Edit category' : 'New category'}
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
              <option value="monthly_funding">Monthly funding</option>
              <option value="target_balance">Target balance</option>
              <option value="target_by_date">Target by date</option>
            </select>
          </Field>

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

          {form.goalType === 'target_by_date' && (
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
    </div>
  );
}

function labelFor(type: CategoryType, goal: GoalType): string {
  const t = type === 'sinking_fund' ? 'Sinking fund' : 'Expense';
  const g =
    goal === 'monthly_funding'
      ? 'Monthly'
      : goal === 'target_balance'
        ? 'Balance'
        : goal === 'target_by_date'
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
