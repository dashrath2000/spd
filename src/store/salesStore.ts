import { create } from 'zustand';
import type { Sale } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { useAuthStore } from './authStore';

interface SalesState {
  sales: Sale[];
  isLoading: boolean;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  updateSaleStatus: (id: string, status: Sale['status']) => Promise<void>;
  initialize: () => () => void;
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],
  isLoading: true,

  addSale: async (sale) => {
    const activeBranchId = useAuthStore.getState().activeBranchId || 'main';
    const saleData = { ...sale, branchId: sale.branchId || activeBranchId };

    if (sale.id) {
      await firestoreService.setDocument('sales', sale.id, saleData);
    } else {
      await firestoreService.addDocument('sales', saleData);
    }
  },

  updateSale: async (id, updates) => {
    await firestoreService.updateDocument('sales', id, updates);
  },

  updateSaleStatus: async (id, status) => {
    await firestoreService.updateDocument('sales', id, { status });
  },

  initialize: () => {
    set({ isLoading: true });
    // Sort by createdAt descending
    const unsubscribe = firestoreService.subscribeToCollection<Sale>(
      'sales',
      (sales) => {
        const sortedSales = [...sales].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        set({ sales: sortedSales, isLoading: false });
      }
    );
    return unsubscribe;
  },
}));

