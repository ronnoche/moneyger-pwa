import Dexie, { type EntityTable } from 'dexie';
import type {
  Account,
  AutoAssignHistoryEntry,
  BudgetNote,
  Category,
  Group,
  NetWorthEntry,
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
  }
}

export const db = new MoneygerDB();

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
