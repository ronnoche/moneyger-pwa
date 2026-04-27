import { db, newId, nowISO } from '@/db/db';
import type { Transfer } from '@/db/schema';
import { syncInBackground } from '@/lib/sync';

export interface TransferInput {
  date: string;
  amount: number;
  fromCategoryId: string;
  toCategoryId: string;
  memo: string;
}

export async function createTransfer(input: TransferInput): Promise<Transfer> {
  const now = nowISO();
  const transfer: Transfer = {
    id: newId(),
    date: input.date,
    amount: Math.round(input.amount * 100) / 100,
    fromCategoryId: input.fromCategoryId,
    toCategoryId: input.toCategoryId,
    memo: input.memo,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };
  await db.transfers.add(transfer);
  syncInBackground('create', 'transfers', transfer);
  return transfer;
}

export async function deleteTransfer(id: string): Promise<void> {
  await db.transfers.delete(id);
  syncInBackground('delete', 'transfers', { id });
}
