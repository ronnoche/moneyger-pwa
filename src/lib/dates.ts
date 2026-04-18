import { format, parseISO, startOfMonth } from 'date-fns';

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function monthKey(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(startOfMonth(date), 'yyyy-MM');
}

export function monthLabel(d: Date): string {
  return format(d, 'MMMM yyyy');
}
