import { useMemo } from 'react';
import { useAccounts } from '@/db/hooks';

export function useAccountLabel(value: string): string {
  const accounts = useAccounts();
  return useMemo(() => {
    if (!value) return '';
    return accounts?.find((a) => a.id === value)?.name ?? '';
  }, [value, accounts]);
}
