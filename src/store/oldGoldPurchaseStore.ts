import { create } from 'zustand';
import type { OldGoldPurchase, RefinedItem } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { useAuthStore } from './authStore';

interface OldGoldPurchaseState {
  purchases: OldGoldPurchase[];
  isLoading: boolean;
  addPurchase: (purchase: OldGoldPurchase) => Promise<void>;
  updatePurchase: (id: string, updates: Partial<OldGoldPurchase>) => Promise<void>;
  sendToRefinery: (id: string, refineryName: string) => Promise<void>;
  receiveFromRefinery: (id: string, refinedItems: RefinedItem[], notes?: string) => Promise<void>;
  markAddedToStock: (id: string) => Promise<void>;
  initialize: () => () => void;
}

export const useOldGoldPurchaseStore = create<OldGoldPurchaseState>((set) => ({
  purchases: [],
  isLoading: true,

  addPurchase: async (purchase) => {
    const activeBranchId = useAuthStore.getState().activeBranchId || 'main';
    const purchaseData = { ...purchase, branchId: purchase.branchId || activeBranchId };

    await firestoreService.setDocument('old_gold_purchases', purchase.id, purchaseData);
  },

  updatePurchase: async (id, updates) => {
    await firestoreService.updateDocument('old_gold_purchases', id, updates);
  },

  sendToRefinery: async (id, refineryName) => {
    const purchase = useOldGoldPurchaseStore.getState().purchases.find(p => p.id === id);
    if (!purchase) return;

    await firestoreService.updateDocument('old_gold_purchases', id, {
      status: 'Sent to Refinery',
      refineryDetails: {
        ...(purchase.refineryDetails || {}),
        sentDate: new Date().toISOString(),
        refineryName,
      },
    });
  },

  receiveFromRefinery: async (id, refinedItems, notes) => {
    const purchase = useOldGoldPurchaseStore.getState().purchases.find(p => p.id === id);
    if (!purchase) return;

    await firestoreService.updateDocument('old_gold_purchases', id, {
      status: 'Refined',
      refineryDetails: {
        ...(purchase.refineryDetails || { sentDate: '' }),
        receivedDate: new Date().toISOString(),
        refinedItems,
        notes: notes || '',
      },
    });
  },

  markAddedToStock: async (id) => {
    await firestoreService.updateDocument('old_gold_purchases', id, {
      status: 'Added to Stock',
    });
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = firestoreService.subscribeToCollection<OldGoldPurchase>(
      'old_gold_purchases',
      (purchases) => {
        const sortedPurchases = [...purchases].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        set({ purchases: sortedPurchases, isLoading: false });
      }
    );
    return unsubscribe;
  },
}));
