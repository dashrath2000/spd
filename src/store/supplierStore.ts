import { create } from 'zustand';
import type { Supplier } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { usePurchaseOrderStore } from './purchaseOrderStore';

interface SupplierState {
  suppliers: Supplier[];
  isLoading: boolean;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchases' | 'outstandingBalance'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  initialize: () => () => void;
}

export const useSupplierStore = create<SupplierState>((set) => ({
  suppliers: [],
  isLoading: true,

  addSupplier: async (supplier) => {
    const timestamp = new Date().toISOString();
    await firestoreService.addDocument('suppliers', {
      ...supplier,
      totalPurchases: 0,
      outstandingBalance: 0,
      createdAt: timestamp,
    });
  },

  updateSupplier: async (id, updates) => {
    await firestoreService.updateDocument('suppliers', id, updates);
  },

  deleteSupplier: async (id) => {
    await firestoreService.deleteDocument('suppliers', id);
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = firestoreService.subscribeToCollection<Supplier>(
      'suppliers',
      async (suppliers) => {
        set({ suppliers, isLoading: false });

        // Reactively sync supplier stats on supplier load/changes
        const { purchaseOrders } = usePurchaseOrderStore.getState();
        if (purchaseOrders.length > 0) {
          for (const supplier of suppliers) {
            const supplierPOs = purchaseOrders.filter(po => po.supplierId === supplier.id);
            const totalPurchases = supplierPOs
              .filter(po => po.status === 'Received')
              .reduce((sum, po) => sum + (po.grandTotal || 0), 0);
            const outstandingBalance = supplierPOs
              .filter(po => po.status !== 'Cancelled')
              .reduce((sum, po) => sum + ((po.grandTotal || 0) - (po.amountPaid || 0)), 0);

            if (
              supplier.outstandingBalance !== outstandingBalance ||
              supplier.totalPurchases !== totalPurchases
            ) {
              await firestoreService.updateDocument('suppliers', supplier.id, {
                outstandingBalance: Math.max(0, outstandingBalance),
                totalPurchases
              });
            }
          }
        }
      }
    );
    return unsubscribe;
  },
}));
