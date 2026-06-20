import { create } from 'zustand';
import type { Karigar, KarigarTransaction, JobOrder } from '../types';
import { localDB } from '../lib/localDB';
import { v4 as uuidv4 } from 'uuid';
import { calculateFineWeight } from '../utils/calculations';

interface KarigarState {
  karigars: Karigar[];
  transactions: KarigarTransaction[];
  jobOrders: JobOrder[];
  isLoading: boolean;
  addKarigar: (karigar: Omit<Karigar, 'id' | 'createdAt' | 'metalBalances' | 'cashBalance'> & { advanceBalance?: number }) => Promise<void>;
  updateKarigar: (id: string, updates: Partial<Karigar>) => Promise<void>;
  deleteKarigar: (id: string) => Promise<void>;
  issueMetal: (tx: Omit<KarigarTransaction, 'id' | 'type'>) => Promise<void>;
  receiveItem: (tx: Omit<KarigarTransaction, 'id' | 'type'>) => Promise<void>;
  payLabor: (tx: Omit<KarigarTransaction, 'id' | 'type' | 'metalType' | 'purity' | 'grossWeight' | 'fineWeight'>) => Promise<void>;
  initialize: () => () => void;

  // Job Order Actions
  addJobOrder: (order: Omit<JobOrder, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reworkCount' | 'rejectFlag'>) => Promise<string>;
  updateJobOrder: (id: string, updates: Partial<JobOrder>) => Promise<void>;
  giveAdvance: (karigarId: string, amount: number) => Promise<void>;
}

export const useKarigarStore = create<KarigarState>((set, get) => ({
  karigars: [],
  transactions: [],
  jobOrders: [],
  isLoading: true,

  addKarigar: async (karigar) => {
    const id = uuidv4();
    const newKarigar: Karigar = {
      ...karigar,
      id,
      metalBalances: {},
      cashBalance: 0,
      advanceBalance: karigar.advanceBalance || 0,
      isActive: karigar.isActive !== undefined ? karigar.isActive : true,
      createdAt: new Date().toISOString(),
    };
    await localDB.addDocument('karigars', newKarigar);
  },

  updateKarigar: async (id, updates) => {
    await localDB.updateDocument('karigars', id, updates);
  },

  deleteKarigar: async (id) => {
    await localDB.deleteDocument('karigars', id);
  },

  issueMetal: async (txData) => {
    const id = uuidv4();
    const karigar = get().karigars.find(k => k.id === txData.karigarId);
    if (!karigar) return;

    const fineWeight = txData.fineWeight || calculateFineWeight(txData.grossWeight || 0, txData.purity || '24K', txData.wastagePercent);
    
    const transaction: KarigarTransaction = {
      ...txData,
      id,
      type: 'ISSUE',
      status: 'Pending',
      fineWeight,
      date: new Date().toISOString()
    };

    // Update artisan balances
    const metalType = txData.metalType || 'Gold';
    const newMetalBalances = { ...karigar.metalBalances };
    newMetalBalances[metalType] = (newMetalBalances[metalType] || 0) + fineWeight;

    // Deduct from Shop Raw Stock if source product is provided
    if (txData.sourceProductId) {
      const { updateStock } = (await import('./productStore')).useProductStore.getState();
      await updateStock(txData.sourceProductId, -(txData.grossWeight || 0));
    }

    await localDB.addDocument('karigar_transactions', transaction);
    await localDB.updateDocument('karigars', karigar.id, { metalBalances: newMetalBalances });
  },

  receiveItem: async (txData) => {
    const id = uuidv4();
    const karigar = get().karigars.find(k => k.id === txData.karigarId);
    if (!karigar) return;

    // fineWeight received back includes the wastage allowed
    const fineWeight = txData.fineWeight || calculateFineWeight(txData.grossWeight || 0, txData.purity || '22K');
    const wastageWeight = fineWeight * ((txData.wastagePercent || 0) / 100);
    const totalDeduction = fineWeight + wastageWeight;

    const transaction: KarigarTransaction = {
      ...txData,
      id,
      type: 'RECEIVE',
      status: 'Completed',
      fineWeight: totalDeduction,
      date: new Date().toISOString()
    };

    // Update balances
    const metalType = txData.metalType || 'Gold';
    const newMetalBalances = { ...karigar.metalBalances };
    newMetalBalances[metalType] = (newMetalBalances[metalType] || 0) - totalDeduction;

    const newCashBalance = (karigar.cashBalance || 0) + (txData.makingCharges || 0);

    // Close linked issue if exists
    if (txData.linkedTransactionId) {
      await localDB.updateDocument('karigar_transactions', txData.linkedTransactionId, { 
        status: 'Completed' 
      });
    }

    // Auto-Inventory Logic
    if (txData.addToInventory) {
      const { addProduct, updateStock } = (await import('./productStore')).useProductStore.getState();
      
      if (txData.inventoryType === 'Raw' && txData.targetProductId) {
        // Increment existing Raw Gold product
        await updateStock(txData.targetProductId, txData.grossWeight || 0);
      } else {
        // Create new Finished Product
        await addProduct({
          name: txData.description,
          sku: `K-${Date.now().toString().slice(-6)}`,
          metalType: txData.metalType || 'Gold',
          purity: txData.purity || '22K',
          weight: txData.grossWeight || 0,
          stock: 1,
          sellingPrice: 0, // Admin to set later
          wastagePercent: txData.wastagePercent || 0,
          makingCharges: txData.makingCharges || 0,
          isRateSensitive: true,
          category: txData.inventoryType === 'Raw' ? 'Raw Material' : 'Jewellery',
          images: [],
          tags: ['Karigar', karigar.name]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
    }

    await localDB.addDocument('karigar_transactions', transaction);
    await localDB.updateDocument('karigars', karigar.id, { 
      metalBalances: newMetalBalances,
      cashBalance: newCashBalance
    });
  },

  payLabor: async (txData) => {
    const id = uuidv4();
    const karigar = get().karigars.find(k => k.id === txData.karigarId);
    if (!karigar) return;

    const transaction: KarigarTransaction = {
      ...txData,
      id,
      type: 'LABOR_PAYMENT',
      date: new Date().toISOString()
    };

    const newCashBalance = (karigar.cashBalance || 0) - (txData.amount || 0);

    await localDB.addDocument('karigar_transactions', transaction);
    await localDB.updateDocument('karigars', karigar.id, { cashBalance: newCashBalance });
  },

  addJobOrder: async (orderData) => {
    const id = uuidv4();
    const newOrder: JobOrder = {
      ...orderData,
      id,
      status: 'draft',
      reworkCount: 0,
      rejectFlag: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await localDB.addDocument('karigar_orders', newOrder);
    return id;
  },

  updateJobOrder: async (id, updates) => {
    const order = get().jobOrders.find(o => o.id === id);
    if (!order) return;
    const merged = {
      ...order,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await localDB.updateDocument('karigar_orders', id, merged);
  },

  giveAdvance: async (karigarId, amount) => {
    const karigar = get().karigars.find(k => k.id === karigarId);
    if (!karigar) return;
    const newAdvance = (karigar.advanceBalance || 0) + amount;
    await localDB.updateDocument('karigars', karigarId, { advanceBalance: newAdvance });

    // Record an advance transaction in ledger
    const id = uuidv4();
    const transaction: KarigarTransaction = {
      id,
      karigarId,
      type: 'LABOR_PAYMENT',
      date: new Date().toISOString(),
      amount: amount,
      description: `Advance Given`,
      createdBy: 'Admin'
    };
    await localDB.addDocument('karigar_transactions', transaction);
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubKarigars = localDB.subscribeToCollection<Karigar>('karigars', (data) => {
      set({ karigars: data });
    });
    const unsubTx = localDB.subscribeToCollection<KarigarTransaction>('karigar_transactions', (data) => {
      set({ transactions: data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) });
    });
    const unsubOrders = localDB.subscribeToCollection<JobOrder>('karigar_orders', (data) => {
      set({ jobOrders: data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
      set({ isLoading: false });
    });

    return () => {
      unsubKarigars();
      unsubTx();
      unsubOrders();
    };
  }
}));
