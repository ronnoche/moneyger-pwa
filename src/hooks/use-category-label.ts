import { useMemo } from 'react';
import { useCategories } from '@/db/hooks';
import { AVAILABLE_TO_BUDGET } from '@/lib/budget-math';

export function useCategoryLabel(value: string): string {
  const categories = useCategories();
  return useMemo(() => {
    if (!value) return '';
    if (value === AVAILABLE_TO_BUDGET) return 'Available to Budget';
    const cat = categories?.find((c) => c.id === value);
    return cat?.name ?? '';
  }, [value, categories]);
}
