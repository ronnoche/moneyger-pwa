import { z } from 'zod';

export const netWorthFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  type: z.enum(['asset', 'debt']),
  category: z.string().trim().min(1, 'Enter a label'),
  amount: z
    .string()
    .trim()
    .refine((s) => s !== '' && /^\d+(\.\d{1,2})?$/.test(s), {
      message: 'Enter an amount like 1234.56',
    })
    .refine((s) => Number(s) > 0, { message: 'Amount must be positive' }),
  notes: z.string().max(500),
});

export type NetWorthFormValues = z.infer<typeof netWorthFormSchema>;
