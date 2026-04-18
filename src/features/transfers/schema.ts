import { z } from 'zod';

export const transferFormSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    fromCategoryId: z.string().min(1, 'Pick a source'),
    toCategoryId: z.string().min(1, 'Pick a destination'),
    amount: z
      .string()
      .trim()
      .refine((s) => s !== '' && /^\d+(\.\d{1,2})?$/.test(s), {
        message: 'Enter an amount like 12.34',
      })
      .refine((s) => Number(s) > 0, { message: 'Amount must be positive' }),
    memo: z.string().max(200),
  })
  .refine((data) => data.fromCategoryId !== data.toCategoryId, {
    path: ['toCategoryId'],
    message: 'Source and destination must be different',
  });

export type TransferFormValues = z.infer<typeof transferFormSchema>;
