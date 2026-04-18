import { db } from './db';

const FIRST_RUN_KEY = 'aspire:first-run-complete';

export async function ensureFirstRun(): Promise<void> {
  if (localStorage.getItem(FIRST_RUN_KEY) === '1') return;
  await db.open();
  localStorage.setItem(FIRST_RUN_KEY, '1');
}

export async function isEmpty(): Promise<boolean> {
  const [groupCount, categoryCount, accountCount] = await Promise.all([
    db.groups.count(),
    db.categories.count(),
    db.accounts.count(),
  ]);
  return groupCount === 0 && categoryCount === 0 && accountCount === 0;
}
