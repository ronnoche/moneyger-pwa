import Dexie, { type EntityTable } from 'dexie';
import type {
  Account,
  Category,
  Group,
  NetWorthEntry,
  SyncLog,
  Transaction,
  Transfer,
} from './schema';

export class AspireDB extends Dexie {
  groups!: EntityTable<Group, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  accounts!: EntityTable<Account, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  netWorthEntries!: EntityTable<NetWorthEntry, 'id'>;
  syncLogs!: EntityTable<SyncLog, 'id'>;

  constructor() {
    super('aspire-pwa');

    this.version(1).stores({
      groups: 'id, sortOrder, isArchived',
      categories: 'id, groupId, sortOrder, isArchived',
      accounts: 'id, isArchived',
      transactions: 'id, date, categoryId, accountId, status',
      transfers: 'id, date, fromCategoryId, toCategoryId',
      netWorthEntries: 'id, date, type',
      syncLogs: 'id, entityType, syncedAt, createdAt',
    });
  }
}

export const db = new AspireDB();

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
