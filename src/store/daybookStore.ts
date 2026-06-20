import { create } from 'zustand';
import type { DaybookEntry } from '../types';
import { localDB } from '../lib/localDB';
import { useAuthStore } from './authStore';

interface DaybookStore {
  entries: DaybookEntry[];
  isLoading: boolean;
  addEntry: (entry: DaybookEntry) => Promise<void>;
  updateEntry: (id: string, updates: Partial<DaybookEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  initialize: () => () => void;
}

export const useDaybookStore = create<DaybookStore>((set) => ({
  entries: [],
  isLoading: true,

  addEntry: async (entry) => {
    const activeBranchId = useAuthStore.getState().activeBranchId || 'main';
    await localDB.addDocument('daybook', {
      ...entry,
      branchId: entry.branchId || activeBranchId,
    });
  },

  updateEntry: async (id, updates) => {
    await localDB.updateDocument('daybook', id, updates);
  },

  deleteEntry: async (id) => {
    await localDB.deleteDocument('daybook', id);
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = localDB.subscribeToCollection<DaybookEntry>(
      'daybook',
      (entries) => {
        const sorted = [...entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        set({ entries: sorted, isLoading: false });
      }
    );
    return unsubscribe;
  },
}));
