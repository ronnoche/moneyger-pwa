import type { PresetId } from '@/lib/auto-assign';

export const PRESET_LABELS: Record<PresetId, string> = {
  underfunded: 'Underfunded',
  assigned_last_month: 'Assigned Last Month',
  spent_last_month: 'Spent Last Month',
  average_assigned: 'Average Assigned',
  average_spent: 'Average Spent',
  reset_available: 'Reset Available Amounts',
  reset_assigned: 'Reset Assigned Amounts',
};

export const FUND_PRESET_ORDER: PresetId[] = [
  'underfunded',
  'assigned_last_month',
  'spent_last_month',
  'average_assigned',
  'average_spent',
];

export const RESET_PRESET_ORDER: PresetId[] = [
  'reset_available',
  'reset_assigned',
];

export function presetLabel(id: string): string {
  return PRESET_LABELS[id as PresetId] ?? id;
}
