import type { Category, Transaction, Transfer } from '@/db/schema';

export interface PresetInput {
  categories: Category[];
  viewedMonth: Date;
  transactions: Transaction[];
  transfers: Transfer[];
  availableToBudget: number;
  scopedCategoryIds?: string[];
}

export interface PresetMove {
  categoryId: string;
  amount: number;
  reason?: string;
}

export interface PresetResult {
  moves: PresetMove[];
  totalAmount: number;
  cappedByATB: boolean;
}

export type Preset = (input: PresetInput) => PresetResult;

export type PresetId =
  | 'underfunded'
  | 'assigned_last_month'
  | 'spent_last_month'
  | 'average_assigned'
  | 'average_spent'
  | 'reduce_overfunding'
  | 'reset_available'
  | 'reset_assigned';
