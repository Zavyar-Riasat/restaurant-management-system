import Dexie, { type EntityTable } from 'dexie';

export interface LocalCategory {
  _id: string;
  name: string;
  icon?: string;
  status: string;
}

export interface LocalMenuItem {
  _id: string;
  name: string;
  category: any;
  price: number;
  discountPrice?: number;
  image?: string;
  status: string;
}

export interface LocalDeal {
  _id: string;
  name: string;
  category: any;
  includedItems: any[];
  price: number;
  discount: number;
  description?: string;
  image?: string;
  status: string;
}

export interface PendingOrder {
  id?: number;
  tempId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  cashier: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  createdAt: string;
}

export interface ApiCacheEntry {
  key: string;
  data: any;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: any;
  createdAt: string;
}

export const db = new Dexie('RestoPOSLocalDB') as Dexie & {
  categories: EntityTable<LocalCategory, '_id'>;
  menuItems: EntityTable<LocalMenuItem, '_id'>;
  deals: EntityTable<LocalDeal, '_id'>;
  pendingOrders: EntityTable<PendingOrder, 'id'>;
  apiCache: EntityTable<ApiCacheEntry, 'key'>;
  syncQueue: EntityTable<SyncQueueItem, 'id'>;
};

db.version(3).stores({
  categories: '_id, name, status',
  menuItems: '_id, name, status',
  deals: '_id, name, status',
  pendingOrders: '++id, tempId, createdAt',
  apiCache: 'key, updatedAt',
  syncQueue: '++id, createdAt, method, url'
});
