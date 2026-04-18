import { useNavigate } from 'react-router';
import { db, newId } from '@/db/db';

export default function Onboarding() {
  const navigate = useNavigate();

  async function seedStarter() {
    const groupId = newId();
    await db.groups.add({
      id: groupId,
      name: 'Monthly Bills',
      sortOrder: 0,
      isArchived: false,
    });
    await db.categories.add({
      id: newId(),
      groupId,
      name: 'Groceries',
      type: 'expense',
      goalType: 'monthly_funding',
      goalAmount: 450,
      goalDueDate: null,
      sortOrder: 0,
      isArchived: false,
    });
    await db.accounts.add({
      id: newId(),
      name: 'Checking',
      isCreditCard: false,
      isArchived: false,
    });
    navigate('/', { replace: true });
  }

  return (
    <div className="safe-pt safe-pl safe-pr safe-pb mx-auto flex min-h-dvh max-w-xl flex-col justify-between px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome to Aspire</h1>
        <p className="mt-2 text-sm text-ink-500">
          Zero-based envelope budgeting, offline first. Set up your first group,
          category, and account to get started.
        </p>

        <ul className="mt-8 space-y-3 text-sm">
          <li className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
            <strong className="block text-ink-900 dark:text-ink-50">
              1. Create a group
            </strong>
            <span className="text-ink-500">
              Groups bundle related categories (for example, Monthly Bills or
              Savings).
            </span>
          </li>
          <li className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
            <strong className="block text-ink-900 dark:text-ink-50">
              2. Add categories
            </strong>
            <span className="text-ink-500">
              Each category holds a portion of your money (Groceries, Rent,
              Emergency Fund).
            </span>
          </li>
          <li className="rounded-xl bg-white p-4 shadow-sm dark:bg-ink-800">
            <strong className="block text-ink-900 dark:text-ink-50">
              3. Add an account
            </strong>
            <span className="text-ink-500">
              Checking, savings, or a credit card. Transactions live against
              accounts.
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={seedStarter}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700"
        >
          Create a starter setup
        </button>
        <p className="text-center text-xs text-ink-400">
          You can fully customize everything afterward in Settings.
        </p>
      </div>
    </div>
  );
}
