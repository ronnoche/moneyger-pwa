import { z } from 'zod';

const moneyString = z
  .string()
  .trim()
  .refine((s) => s === '' || /^-?\d+(\.\d{1,2})?$/.test(s), {
    message: 'Enter an amount like 12.34',
  });

export const transactionFormSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    direction: z.enum(['outflow', 'inflow']),
    amount: moneyString,
    categoryId: z.string().min(1, 'Pick a category'),
    accountId: z.string().min(1, 'Pick an account'),
    memo: z.string().max(200, 'Keep memo under 200 characters'),
    status: z.enum(['cleared', 'pending', 'reconciled']),
  })
  .refine((data) => data.amount !== '' && Number(data.amount) > 0, {
    path: ['amount'],
    message: 'Amount must be greater than zero',
  });

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function toRepoInput(values: TransactionFormValues): {
  date: string;
  outflow: number;
  inflow: number;
  categoryId: string;
  accountId: string;
  memo: string;
  status: TransactionFormValues['status'];
} {
  const amount = Number(values.amount);
  return {
    date: values.date,
    outflow: values.direction === 'outflow' ? amount : 0,
    inflow: values.direction === 'inflow' ? amount : 0,
    categoryId: values.categoryId,
    accountId: values.accountId,
    memo: values.memo.trim(),
    status: values.status,
  };
}
