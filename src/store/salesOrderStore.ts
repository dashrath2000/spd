import { create } from 'zustand';
import type { SalesOrder, Sale } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { useSalesStore } from './salesStore';

interface SalesOrderState {
  orders: SalesOrder[];
  isLoading: boolean;
  addOrder: (order: Omit<SalesOrder, 'id' | 'createdAt'>) => Promise<string>;
  updateOrder: (id: string, updates: Partial<SalesOrder>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  convertToSale: (orderId: string, saleData: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>;
  initialize: () => () => void;
}

export const useSalesOrderStore = create<SalesOrderState>((set, get) => ({
  orders: [],
  isLoading: true,

  addOrder: async (order) => {
    const timestamp = new Date().toISOString();
    const id = await firestoreService.addDocument('sales_orders', {
      ...order,
      createdAt: timestamp,
    });
    return id;
  },

  updateOrder: async (id, updates) => {
    await firestoreService.updateDocument('sales_orders', id, updates);
  },

  deleteOrder: async (id) => {
    await firestoreService.deleteDocument('sales_orders', id);
  },

  convertToSale: async (orderId, saleData) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const { addSale } = useSalesStore.getState();
    
    // Add missing required Sale fields
    const finalSaleData: Sale = {
      ...saleData,
      id: Math.random().toString(36).substring(2, 11), // Simple ID if UUID is not imported here, but Sale needs it
      createdAt: new Date().toISOString(),
    } as Sale;

    await addSale(finalSaleData);
    await firestoreService.deleteDocument('sales_orders', orderId);
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = firestoreService.subscribeToCollection<SalesOrder>(
      'sales_orders',
      (orders) => {
        set({ orders, isLoading: false });
      }
    );
    return unsubscribe;
  },
}));
