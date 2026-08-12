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

export const db = new Dexie('RestoPOSLocalDB') as Dexie & {
  categories: EntityTable<LocalCategory, '_id'>;
  menuItems: EntityTable<LocalMenuItem, '_id'>;
  deals: EntityTable<LocalDeal, '_id'>;
  pendingOrders: EntityTable<PendingOrder, 'id'>;
};

db.version(2).stores({
  categories: '_id, name, status',
  menuItems: '_id, name, status',
  deals: '_id, name, status',
  pendingOrders: '++id, tempId, createdAt'
});
