import { create } from 'zustand';
import type { Customer } from '../types';
import { localDB as firestoreService } from '../lib/localDB';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'totalPurchases' | 'totalSpent' | 'totalPaid' | 'outstandingBalance' | 'notes'> & { notes?: string }) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addLoyaltyPoints: (id: string, points: number) => Promise<void>;
  logPurchase: (id: string, amount: number) => Promise<void>;
  initialize: () => () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: true,

  addCustomer: async (customer) => {
    const newCustomer = {
      ...customer,
      notes: customer.notes || '',
      loyaltyPoints: 0,
      totalPurchases: 0,
      totalSpent: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    const id = await firestoreService.addDocument('customers', newCustomer);
    return id;
  },

  updateCustomer: async (id, updates) => {
    await firestoreService.updateDocument('customers', id, updates);
  },

  deleteCustomer: async (id) => {
    await firestoreService.deleteDocument('customers', id);
  },

  addLoyaltyPoints: async (id, points) => {
    const customer = get().customers.find((c) => c.id === id);
    if (customer) {
      await firestoreService.updateDocument('customers', id, {
        loyaltyPoints: Math.max(0, customer.loyaltyPoints + points),
      });
    }
  },

  logPurchase: async (id, amount) => {
    const customer = get().customers.find((c) => c.id === id);
    if (customer) {
      await firestoreService.updateDocument('customers', id, {
        totalPurchases: customer.totalPurchases + 1,
        totalSpent: customer.totalSpent + amount,
        totalPaid: (customer.totalPaid || 0) + amount,
        outstandingBalance: Math.max(0, customer.outstandingBalance || 0),
      });
    }
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = firestoreService.subscribeToCollection<Customer>(
      'customers',
      (customers) => {
        set({ customers, isLoading: false });
      }
    );
    return unsubscribe;
  },
}));

