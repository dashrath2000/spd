/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { PurchaseOrder } from '../types';
import { localDB as firestoreService } from '../lib/localDB';
import { useProductStore } from './productStore';
import { useSupplierStore } from './supplierStore';
import { useDaybookStore } from './daybookStore';
import { getAutomatedHSN, generateAutoSKU } from '../utils/calculations';
import { v4 as uuidv4 } from 'uuid';

interface PurchaseOrderState {
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  addPO: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => Promise<string>;
  updatePO: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  deletePO: (id: string) => Promise<void>;
  receivePO: (id: string) => Promise<void>;
  recordPayment: (id: string, amount: number) => Promise<void>;
  initialize: () => () => void;
}

export const usePurchaseOrderStore = create<PurchaseOrderState>((set, get) => ({
  purchaseOrders: [],
  isLoading: true,

  addPO: async (po) => {
    const timestamp = new Date().toISOString();
    const id = await firestoreService.addDocument('purchase_orders', {
      ...po,
      createdAt: timestamp,
    });

    // Log advance payment to daybook if any
    if ((po.amountPaid || 0) > 0) {
      await useDaybookStore.getState().addEntry({
        id: uuidv4(),
        date: timestamp,
        type: 'OUT',
        category: 'Expense',
        amount: po.amountPaid,
        paymentMethod: (po.paymentMethod === 'Cash' ? 'Cash' : po.paymentMethod === 'UPI' ? 'UPI' : po.paymentMethod === 'Card' ? 'Card' : 'Bank') as any,
        description: `PO ${po.poNumber} — Advance payment to ${po.supplierName}`,
        createdBy: po.createdBy || 'Admin',
      });
    }

    return id;
  },

  updatePO: async (id, updates) => {
    const oldPO = get().purchaseOrders.find(p => p.id === id);
    await firestoreService.updateDocument('purchase_orders', id, updates);

    if (oldPO) {
      const daybookStore = useDaybookStore.getState();
      const poNumber = updates.poNumber || oldPO.poNumber;
      const supplierName = updates.supplierName || oldPO.supplierName;
      const amountPaid = updates.amountPaid !== undefined ? updates.amountPaid : oldPO.amountPaid;
      const paymentMethod = updates.paymentMethod || oldPO.paymentMethod;

      // Find the advance payment entry for this PO.
      const daybookEntry = daybookStore.entries.find(e => 
        e.description.startsWith(`PO ${oldPO.poNumber} — Advance payment to`)
      );

      if (daybookEntry) {
        if (amountPaid === 0) {
          // Deleted/removed advance payment
          await daybookStore.deleteEntry(daybookEntry.id);
        } else {
          // Updated advance payment
          await daybookStore.updateEntry(daybookEntry.id, {
            amount: amountPaid,
            description: `PO ${poNumber} — Advance payment to ${supplierName}`,
            paymentMethod: (paymentMethod === 'Cash' ? 'Cash' : paymentMethod === 'UPI' ? 'UPI' : paymentMethod === 'Card' ? 'Card' : 'Bank') as any,
          });
        }
      } else if (amountPaid > 0) {
        // Added advance payment where there wasn't one before
        await daybookStore.addEntry({
          id: uuidv4(),
          date: oldPO.createdAt, // use original PO creation time
          type: 'OUT',
          category: 'Expense',
          amount: amountPaid,
          paymentMethod: (paymentMethod === 'Cash' ? 'Cash' : paymentMethod === 'UPI' ? 'UPI' : paymentMethod === 'Card' ? 'Card' : 'Bank') as any,
          description: `PO ${poNumber} — Advance payment to ${supplierName}`,
          createdBy: updates.createdBy || oldPO.createdBy || 'Admin',
        });
      }
    }
  },

  deletePO: async (id) => {
    await firestoreService.deleteDocument('purchase_orders', id);
  },

  receivePO: async (id) => {
    const po = get().purchaseOrders.find(p => p.id === id);
    if (!po) throw new Error('Purchase Order not found');

    const { updateStock, addProduct, products } = useProductStore.getState();

    // 1. Update stock or Create New Products for each item in the PO
    for (const item of po.items) {
      if (item.productId) {
        // Existing Product - Update Stock
        await updateStock(item.productId, item.quantity);
      } else if (item.stockType === 'Wholesale') {
         const existingBulk = products.find(p => p.category === 'Wholesale Metal' && p.metalType === item.metalType && p.purity === item.purity);
         if (existingBulk) {
            await useProductStore.getState().updateProduct(existingBulk.id, {
               weight: (existingBulk.weight || 0) + (item.weight || 0),
               stock: 1
            });
         } else {
            await addProduct({
              name: `Bulk ${item.purity} ${item.metalType}`,
              sku: generateAutoSKU('Wholesale Metal', item.metalType, item.purity, products),
              category: 'Wholesale Metal',
              metalType: item.metalType,
              purity: item.purity as any,
              weight: item.weight || 0,
              makingCharges: 0,
              makingChargePercent: 0,
              isPercentageMakingCharge: false,
              stoneCharges: 0,
              wastagePercent: item.wastage || 0,
              basePrice: item.rate || 0,
              sellingPrice: (item.rate || 0) * 1.15,
              stock: 1,
              lowStockThreshold: 1,
              barcode: `PO-W-${Date.now().toString().slice(-6)}`,
              images: [],
              description: item.description || `Wholesale stock from PO #${po.poNumber}`,
              hsnCode: getAutomatedHSN('Wholesale Metal', item.metalType),
              isActive: true,
              isRateSensitive: true,
              stockType: 'Wholesale'
            });
         }
      } else {
        // New Item - Auto-create in Inventory
        const category = item.stockType === 'Raw' ? 'Raw Material' : (item.category || 'Other');
        const metalType = item.metalType || 'Gold';
        const purity = item.purity || '22K';
        const generatedSku = item.sku || generateAutoSKU(category, metalType, purity, products);

        await addProduct({
          name: item.description || 'New Purchase Item',
          sku: generatedSku,
          category,
          metalType,
          purity: purity as any,
          weight: item.weight || 0,
          makingCharges: 0,
          makingChargePercent: 0,
          isPercentageMakingCharge: false,
          stoneCharges: 0,
          wastagePercent: 0,
          basePrice: item.rate || 0,
          sellingPrice: (item.rate || 0) * 1.15, // Default 15% margin
          stock: item.quantity || 1,
          lowStockThreshold: 2,
          barcode: `PO-${Date.now().toString().slice(-8)}`,
          images: [],
          description: `Automatically created from PO #${po.poNumber}`,
          hsnCode: getAutomatedHSN(category, metalType),
          isActive: true,
          isRateSensitive: true,
          stockType: item.stockType || 'Fine'
        });
      }
    }

    // 2. Close the PO
    await firestoreService.updateDocument('purchase_orders', id, { 
      status: 'Received',
      updatedAt: new Date().toISOString()
    } as any);
  },

  recordPayment: async (id, amount) => {
    const po = get().purchaseOrders.find(p => p.id === id);
    if (!po) throw new Error('Purchase Order not found');

    // 1. Update PO Amount Paid
    const newAmountPaid = (po.amountPaid || 0) + amount;
    await firestoreService.updateDocument('purchase_orders', id, {
      amountPaid: newAmountPaid,
      updatedAt: new Date().toISOString()
    } as any);

    // 2. Log payment to daybook
    await useDaybookStore.getState().addEntry({
      id: uuidv4(),
      date: new Date().toISOString(),
      type: 'OUT',
      category: 'Expense',
      amount: amount,
      paymentMethod: 'Bank',
      description: `PO ${po.poNumber} — Payment to ${po.supplierName}`,
      createdBy: 'Admin',
    });
  },

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = firestoreService.subscribeToCollection<PurchaseOrder>(
      'purchase_orders',
      async (purchaseOrders) => {
        set({ purchaseOrders, isLoading: false });

        // Reactively sync supplier stats
        const { suppliers, updateSupplier } = useSupplierStore.getState();
        if (suppliers.length > 0) {
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
              await updateSupplier(supplier.id, {
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
