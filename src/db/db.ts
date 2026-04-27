import Dexie, { type EntityTable } from 'dexie';
import type {
  Account,
  AutoAssignHistoryEntry,
  BudgetNote,
  Category,
  Group,
  NetWorthEntry,
  ReconcileEvent,
  SyncLog,
  Transaction,
  Transfer,
} from './schema';

export class MoneygerDB extends Dexie {
  groups!: EntityTable<Group, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  accounts!: EntityTable<Account, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  netWorthEntries!: EntityTable<NetWorthEntry, 'id'>;
  syncLogs!: EntityTable<SyncLog, 'id'>;
  autoAssignHistory!: EntityTable<AutoAssignHistoryEntry, 'id'>;
  budgetNotes!: EntityTable<BudgetNote, 'id'>;
  reconcileEvents!: EntityTable<ReconcileEvent, 'id'>;

  constructor() {
    super('moneyger-pwa');

    this.version(1).stores({
      groups: 'id, sortOrder, isArchived',
      categories: 'id, groupId, sortOrder, isArchived',
      accounts: 'id, isArchived',
      transactions: 'id, date, categoryId, accountId, status',
      transfers: 'id, date, fromCategoryId, toCategoryId',
      netWorthEntries: 'id, date, type',
      syncLogs: 'id, entityType, syncedAt, createdAt',
    });

    this.version(2)
      .stores({
        groups: 'id, sortOrder, isArchived',
        categories: 'id, groupId, sortOrder, isArchived',
        accounts: 'id, isArchived',
        transactions: 'id, date, categoryId, accountId, status',
        transfers: 'id, date, fromCategoryId, toCategoryId',
        netWorthEntries: 'id, date, type',
        syncLogs: 'id, entityType, syncedAt, createdAt',
        autoAssignHistory: 'id, appliedAt, presetId, scopeMonth',
        budgetNotes: 'id, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Category, 'id'>('categories')
          .toCollection()
          .modify((c) => {
            if (c.goalRecurring === undefined) c.goalRecurring = null;
            if (c.goalStartMonth === undefined) c.goalStartMonth = null;
          });
      });

    this.version(3)
      .stores({
        groups: 'id, sortOrder, isArchived',
        categories: 'id, groupId, sortOrder, isArchived, linkedAccountId, snoozedUntil',
        accounts: 'id, isArchived, accountCategory, subtype, onBudget',
        transactions:
          'id, date, categoryId, accountId, status, reconciledAt, reconcileEventId',
        transfers: 'id, date, fromCategoryId, toCategoryId',
        netWorthEntries: 'id, date, type',
        syncLogs: 'id, entityType, syncedAt, createdAt',
        autoAssignHistory: 'id, appliedAt, presetId, scopeMonth',
        budgetNotes: 'id, updatedAt',
        reconcileEvents: 'id, accountId, reconciledAt, revertedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Account, 'id'>('accounts')
          .toCollection()
          .modify((account) => {
            const isCredit = !!account.isCreditCard;
            if (!account.accountCategory) {
              account.accountCategory = isCredit ? 'credit' : 'cash';
            }
            if (!account.subtype) {
              account.subtype = isCredit ? 'credit_card' : 'checking';
            }
            if (account.onBudget === undefined) {
              account.onBudget =
                account.accountCategory === 'cash' ||
                account.accountCategory === 'credit';
            }
            if (account.lastReconciledAt === undefined) {
              account.lastReconciledAt = null;
            }
          });

        await tx
          .table<Category, 'id'>('categories')
          .toCollection()
          .modify((category) => {
            if (category.goalBehavior === undefined) {
              if (
                category.goalType === 'monthly_funding' ||
                category.goalType === 'weekly' ||
                category.goalType === 'monthly' ||
                category.goalType === 'yearly'
              ) {
                category.goalBehavior = 'set_aside_another';
              } else if (category.goalType === 'target_balance') {
                category.goalBehavior = 'refill_up_to';
              } else if (
                category.goalType === 'target_by_date' ||
                category.goalType === 'custom'
              ) {
                category.goalBehavior = 'fill_up_to';
              } else {
                category.goalBehavior = null;
              }
            }
            if (category.snoozedUntil === undefined) {
              category.snoozedUntil = null;
            }
            if (category.linkedAccountId === undefined) {
              category.linkedAccountId = null;
            }
          });

        await tx
          .table<Transaction, 'id'>('transactions')
          .toCollection()
          .modify((transaction) => {
            if (transaction.reconciledAt === undefined) {
              transaction.reconciledAt =
                transaction.status === 'reconciled'
                  ? transaction.updatedAt || transaction.createdAt
                  : null;
            }
            if (transaction.reconcileEventId === undefined) {
              transaction.reconcileEventId = null;
            }
          });
      });
  }
}

export const db = new MoneygerDB();

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
