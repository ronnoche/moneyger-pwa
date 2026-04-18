import { db, newId } from '@/db/db';
import type { Account } from '@/db/schema';

export interface AccountInput {
  name: string;
  isCreditCard: boolean;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const account: Account = {
    id: newId(),
    name: input.name.trim(),
    isCreditCard: input.isCreditCard,
    isArchived: false,
  };
  await db.accounts.add(account);
  return account;
}

export async function updateAccount(
  id: string,
  patch: Partial<Omit<Account, 'id'>>,
): Promise<void> {
  await db.accounts.update(id, patch);
}

export async function archiveAccount(id: string): Promise<void> {
  await db.accounts.update(id, { isArchived: true });
}
