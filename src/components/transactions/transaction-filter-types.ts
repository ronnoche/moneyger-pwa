export type DateRangeKey =
  | 'all'
  | 'this-month'
  | 'last-30-days'
  | 'this-year'
  | 'custom';

export interface TransactionFilterValue {
  accountId: string;
  categoryId: string;
  dateRange: DateRangeKey;
  from: string;
  to: string;
}

export const emptyFilterValue: TransactionFilterValue = {
  accountId: '',
  categoryId: '',
  dateRange: 'all',
  from: '',
  to: '',
};
