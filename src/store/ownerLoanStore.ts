import { create } from 'zustand';
import type { OwnerLoan, OwnerLoanPayment } from '../types';
import { localDB } from '../lib/localDB';
import { useAuthStore } from './authStore';
import { useProductStore } from './productStore';

const adjustInventoryStockForLoan = async (
  oldLoan: OwnerLoan | null | undefined,
  newLoan: OwnerLoan | null | undefined
) => {
  try {
    const updateStock = useProductStore.getState().updateStock;

    // Case 1: Loan added
    if (!oldLoan && newLoan) {
      if (newLoan.status === 'Active') {
        for (const item of newLoan.items || []) {
          if (item.sourceType === 'inventory' && item.productId) {
            await updateStock(item.productId, -1);
          }
        }
      }
    }
    // Case 2: Loan deleted
    else if (oldLoan && !newLoan) {
      if (oldLoan.status === 'Active') {
        for (const item of oldLoan.items || []) {
          if (item.sourceType === 'inventory' && item.productId) {
            await updateStock(item.productId, 1);
          }
        }
      }
    }
    // Case 3: Loan updated
    else if (oldLoan && newLoan) {
      const wasActive = oldLoan.status === 'Active';
      const isActive = newLoan.status === 'Active';

      if (wasActive && !isActive) {
        // Active -> Closed: return all items back to stock
        for (const item of oldLoan.items || []) {
          if (item.sourceType === 'inventory' && item.productId) {
            await updateStock(item.productId, 1);
          }
        }
      } else if (!wasActive && isActive) {
        // Closed -> Active: deduct all items from stock
        for (const item of newLoan.items || []) {
          if (item.sourceType === 'inventory' && item.productId) {
            await updateStock(item.productId, -1);
          }
        }
      } else if (wasActive && isActive) {
        // Still active: check for added or removed items
        const oldProductIds = (oldLoan.items || [])
          .filter(i => i.sourceType === 'inventory' && i.productId)
          .map(i => i.productId!);
        const newProductIds = (newLoan.items || [])
          .filter(i => i.sourceType === 'inventory' && i.productId)
          .map(i => i.productId!);

        // Removed items
        const removedIds = oldProductIds.filter(id => !newProductIds.includes(id));
        for (const id of removedIds) {
          await updateStock(id, 1);
        }

        // Added items
        const addedIds = newProductIds.filter(id => !oldProductIds.includes(id));
        for (const id of addedIds) {
          await updateStock(id, -1);
        }
      }
    }
  } catch (error) {
    console.error('OwnerLoanStore: Error adjusting stock for loan items', error);
  }
};

interface OwnerLoanState {
  ownerLoans: OwnerLoan[];
  isLoading: boolean;
  addOwnerLoan: (loan: OwnerLoan) => Promise<void>;
  updateOwnerLoan: (id: string, updates: Partial<OwnerLoan>) => Promise<void>;
  deleteOwnerLoan: (id: string) => Promise<void>;
  addOwnerLoanPayment: (id: string, paymentOrPayments: OwnerLoanPayment | OwnerLoanPayment[]) => Promise<void>;
  initialize: () => () => void;
}

export const useOwnerLoanStore = create<OwnerLoanState>((set) => ({
  ownerLoans: [],
  isLoading: true,

  addOwnerLoan: async (loan) => {
    try {
      const activeBranchId = useAuthStore.getState().activeBranchId || 'main';
      const loanData = { ...loan, branchId: loan.branchId || activeBranchId };

      if (loan.id) {
        await localDB.setDocument('owner_loans', loan.id, loanData);
      } else {
        await localDB.addDocument('owner_loans', loanData);
      }
      
      // Stock adjustment
      await adjustInventoryStockForLoan(null, loanData);
    } catch (error) {
      console.error('OwnerLoanStore: Error adding owner loan', error);
      throw error;
    }
  },

  updateOwnerLoan: async (id, updates) => {
    try {
      const oldLoan = useOwnerLoanStore.getState().ownerLoans.find((l) => l.id === id);
      await localDB.updateDocument('owner_loans', id, updates);
      
      if (oldLoan) {
        const newLoan = { ...oldLoan, ...updates } as OwnerLoan;
        await adjustInventoryStockForLoan(oldLoan, newLoan);
      }
    } catch (error) {
      console.error('OwnerLoanStore: Error updating owner loan', error);
      throw error;
    }
  },

  deleteOwnerLoan: async (id) => {
    try {
      const oldLoan = useOwnerLoanStore.getState().ownerLoans.find((l) => l.id === id);
      await localDB.deleteDocument('owner_loans', id);
      
      if (oldLoan) {
        await adjustInventoryStockForLoan(oldLoan, null);
      }
    } catch (error) {
      console.error('OwnerLoanStore: Error deleting owner loan', error);
      throw error;
    }
  },

  addOwnerLoanPayment: async (id, paymentOrPayments) => {
    try {
      const state = useOwnerLoanStore.getState();
      const loan = state.ownerLoans.find((l) => l.id === id);
      if (!loan) throw new Error('Owner loan not found');

      const newPayments = Array.isArray(paymentOrPayments) ? paymentOrPayments : [paymentOrPayments];
      const updatedPayments = [...(loan.payments || []), ...newPayments];
      
      let updatedAmount = loan.loanAmount;
      newPayments.forEach(p => {
        if (p.type === 'Top-up') {
          updatedAmount += Math.abs(p.amount);
        }
      });

      await localDB.updateDocument('owner_loans', id, { 
        payments: updatedPayments,
        loanAmount: updatedAmount,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error('OwnerLoanStore: Error adding owner loan payment', error);
      throw error;
    }
  },

  initialize: () => {
    set({ isLoading: true });
    try {
      const unsubscribe = localDB.subscribeToCollection<OwnerLoan>(
        'owner_loans',
        (loans) => {
          const sortedLoans = [...loans].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          set({ ownerLoans: sortedLoans, isLoading: false });
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('OwnerLoanStore: Error initializing collection', error);
      set({ isLoading: false });
      return () => {};
    }
  },
}));
