import { create } from 'zustand';
import type { Product } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { useAuthStore } from './authStore';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, quantity: number) => Promise<void>;
  initialize: () => () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: true,

  addProduct: async (product) => {
    const timestamp = new Date().toISOString();
    const activeBranchId = useAuthStore.getState().activeBranchId;
    await firestoreService.addDocument('products', {
      ...product,
      branchId: product.branchId || activeBranchId || 'main',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },

  updateProduct: async (id, updates) => {
    await firestoreService.updateDocument('products', id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  deleteProduct: async (id) => {
    await firestoreService.deleteDocument('products', id);
  },

  updateStock: async (id, quantity) => {
    const product = get().products.find((p) => p.id === id);
    if (product) {
      await firestoreService.updateDocument('products', id, {
        stock: Math.max(0, product.stock + quantity),
        updatedAt: new Date().toISOString(),
      });
    }
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = firestoreService.subscribeToCollection<Product>(
      'products',
      (products) => {
        set({ products, isLoading: false });
      }
    );
    return unsubscribe;
  },
}));

