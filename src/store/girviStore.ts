import { create } from 'zustand';
import type { Girvi, GirviPayment } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { useAuthStore } from './authStore';

interface GirviState {
  girvis: Girvi[];
  isLoading: boolean;
  addGirvi: (girvi: Girvi) => Promise<void>;
  updateGirvi: (id: string, updates: Partial<Girvi>) => Promise<void>;
  deleteGirvi: (id: string) => Promise<void>;
  addPayment: (id: string, payment: GirviPayment) => Promise<void>;
  initialize: () => () => void;
}

export const useGirviStore = create<GirviState>((set) => ({
  girvis: [],
  isLoading: true,

  addGirvi: async (girvi) => {
    try {
      const activeBranchId = useAuthStore.getState().activeBranchId || 'main';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const girviData = { ...girvi, branchId: (girvi as any).branchId || activeBranchId };

      if (girvi.id) {
        await firestoreService.setDocument('girvis', girvi.id, girviData);
      } else {
        await firestoreService.addDocument('girvis', girviData);
      }
    } catch (error) {
      console.error('GirviStore: Error adding girvi asset', error);
      throw error;
    }
  },

  updateGirvi: async (id, updates) => {
    try {
      await firestoreService.updateDocument('girvis', id, updates);
    } catch (error) {
      console.error('GirviStore: Error updating girvi asset', error);
      throw error;
    }
  },

  deleteGirvi: async (id) => {
    try {
      await firestoreService.deleteDocument('girvis', id);
    } catch (error) {
      console.error('GirviStore: Error deleting girvi asset', error);
      throw error;
    }
  },

  addPayment: async (id, payment) => {
    try {
      const state = useGirviStore.getState();
      const girvi = state.girvis.find((g) => g.id === id);
      if (!girvi) throw new Error('Girvi asset not found');

      const updatedPayments = [...(girvi.payments || []), payment];
      await firestoreService.updateDocument('girvis', id, { 
        payments: updatedPayments,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error('GirviStore: Error adding payment', error);
      throw error;
    }
  },

  initialize: () => {
    set({ isLoading: true });
    try {
      const unsubscribe = firestoreService.subscribeToCollection<Girvi>(
        'girvis',
        (girvis) => {
          const sortedGirvis = [...girvis].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          set({ girvis: sortedGirvis, isLoading: false });
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('GirviStore: Error initializing collection', error);
      set({ isLoading: false });
      return () => {};
    }
  },
}));
