export type CategoryType = 'expense' | 'sinking_fund';
export type TxnStatus = 'cleared' | 'pending' | 'reconciled';
export type AccountCategory = 'cash' | 'credit' | 'loan' | 'tracking';
export type AccountSubtype =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit_card'
  | 'line_of_credit'
  | 'mortgage'
  | 'auto_loan'
  | 'student_loan'
  | 'personal_loan'
  | 'medical_debt'
  | 'other_debt'
  | 'asset'
  | 'liability';
export type GoalBehavior =
  | 'set_aside_another'
  | 'refill_up_to'
  | 'fill_up_to'
  | 'have_a_balance_of';

export type GoalCadence =
  | 'none'
  | 'monthly_funding'
  | 'target_balance'
  | 'target_by_date'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type GoalType = GoalCadence;

export interface Group {
  id: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  type: CategoryType;
  goalType: GoalCadence;
  goalBehavior: GoalBehavior | null;
  goalAmount: number;
  goalDueDate: string | null;
  goalRecurring: boolean | null;
  goalStartMonth: string | null;
  snoozedUntil: string | null;
  linkedAccountId: string | null;
  sortOrder: number;
  isArchived: boolean;
}

export interface Account {
  id: string;
  name: string;
  accountCategory: AccountCategory;
  subtype: AccountSubtype;
  onBudget: boolean;
  lastReconciledAt: string | null;
  /**
   * @deprecated Use accountCategory/subtype instead.
   */
  isCreditCard: boolean;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  outflow: number;
  inflow: number;
  categoryId: string;
  accountId: string;
  memo: string;
  status: TxnStatus;
  reconciledAt: string | null;
  reconcileEventId: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export interface ReconcileEvent {
  id: string;
  accountId: string;
  reconciledAt: string;
  adjustmentTxnId: string | null;
  revertedAt: string | null;
}

export interface Transfer {
  id: string;
  date: string;
  amount: number;
  fromCategoryId: string;
  toCategoryId: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export interface NetWorthEntry {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: 'asset' | 'debt';
  notes: string;
}

export interface SyncLog {
  id: string;
  entityType:
    | 'transaction'
    | 'transfer'
    | 'category'
    | 'account'
    | 'group'
    | 'net_worth';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  syncedAt: string | null;
  error: string | null;
}

export interface AutoAssignHistoryEntry {
  id: string;
  appliedAt: string;
  presetId: string;
  scopeMonth: string;
  totalAmount: number;
  moveCount: number;
  transferIds: string[];
  scope: 'all' | 'selected';
  scopedCategoryIds: string[] | null;
  revertedAt: string | null;
}

export interface BudgetNote {
  id: string;
  content: string;
  updatedAt: string;
}
