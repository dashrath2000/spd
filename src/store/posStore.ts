import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { CartItem, Product, Customer, OldGoldItem, SalesOrder } from '../types';

interface POSState {
  cart: CartItem[];
  oldGoldItems: OldGoldItem[];
  currentCustomer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discountPercent: number) => void;
  updateItemPrice: (productId: string, newFinalPrice: number) => void;
  updateCartItemProduct: (productId: string, overrides: Partial<Product>) => void;
  addOldGoldItem: (item: OldGoldItem) => void;
  removeOldGoldItem: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  totalDiscount: number;
  oldGoldTotal: number;
  grandTotal: number;
  editingOrderId: string | null;
  loadOrder: (order: SalesOrder) => void;
}

export const usePOSStore = create<POSState>((set, get) => {
  const updateTotals = (cart: CartItem[], oldGoldItems: OldGoldItem[] = []) => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
    const totalDiscount = cart.reduce(
      (sum, item) => sum + (item.product.sellingPrice * item.quantity * item.discountPercent) / 100,
      0
    );
    const oldGoldTotal = oldGoldItems.reduce((sum, item) => sum + item.value, 0);
    const grandTotal = subtotal - totalDiscount - oldGoldTotal;
    return { subtotal, totalDiscount, oldGoldTotal, grandTotal };
  };

  return {
    cart: [],
    oldGoldItems: [],
    currentCustomer: null,
    subtotal: 0,
    totalDiscount: 0,
    oldGoldTotal: 0,
    grandTotal: 0,
    editingOrderId: null,
    setCustomer: (customer) => set({ currentCustomer: customer }),
    loadOrder: (order) => {
      set({
        cart: order.items,
        oldGoldItems: order.oldGoldItems || [],
        currentCustomer: {
          id: order.customerId || '',
          name: order.customerName,
          phone: order.customerPhone,
        } as Customer,
        editingOrderId: order.id,
        ...updateTotals(order.items, order.oldGoldItems || [])
      });
    },
    addToCart: (product) => {
      const cart = get().cart;
      const existingItem = cart.find((item) => item.product.id === product.id);
      const currentQtyInCart = existingItem ? existingItem.quantity : 0;

      if (currentQtyInCart >= product.stock) {
        toast.error(`Insufficient Stock: Only ${product.stock} pieces of "${product.name}" are available.`, {
          style: {
            background: '#121212',
            color: '#C9A84C',
            border: '1px solid rgba(201,168,76,0.2)',
            fontSize: '10px',
            textTransform: 'uppercase',
            fontWeight: '900',
            letterSpacing: '0.1em'
          },
          duration: 4000
        });
        return;
      }
      
      let newCart;
      if (existingItem) {
        newCart = cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, finalPrice: calculateFinalItemPrice(item.product, item.quantity + 1, item.discountPercent) }
            : item
        );
      } else {
        newCart = [
          ...cart,
          {
            product,
            quantity: 1,
            discountPercent: 0,
            discountAmount: 0,
            finalPrice: product.sellingPrice,
          },
        ];
      }
      set({ cart: newCart, ...updateTotals(newCart, get().oldGoldItems) });
    },
    removeFromCart: (productId) => {
      const newCart = get().cart.filter((item) => item.product.id !== productId);
      set({ cart: newCart, ...updateTotals(newCart, get().oldGoldItems) });
    },
    updateQuantity: (productId, quantity) => {
      const item = get().cart.find(i => i.product.id === productId);
      if (!item) return;

      let qty = Math.max(1, quantity);
      if (qty > item.product.stock) {
        toast.error(`${item.product.name}: Maximum vault stock reached (${item.product.stock}).`, {
          style: {
            background: '#121212',
            color: '#C9A84C',
            border: '1px solid rgba(201,168,76,0.2)',
            fontSize: '10px',
            textTransform: 'uppercase',
            fontWeight: '900',
            letterSpacing: '0.1em'
          },
          duration: 4000
        });
        qty = item.product.stock;
      }

      const newCart = get().cart.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              quantity: qty,
              finalPrice: calculateFinalItemPrice(i.product, qty, i.discountPercent),
            }
          : i
      );
      set({ cart: newCart, ...updateTotals(newCart, get().oldGoldItems) });
    },
    updateDiscount: (productId, discountPercent) => {
      const newCart = get().cart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              discountPercent,
              finalPrice: calculateFinalItemPrice(item.product, item.quantity, discountPercent),
            }
          : item
      );
      set({ cart: newCart, ...updateTotals(newCart, get().oldGoldItems) });
    },
    updateItemPrice: (productId, newFinalPrice) => {
      const newCart = get().cart.map((item) => {
        if (item.product.id !== productId) return item;
        const baseTotal = item.product.sellingPrice * item.quantity;
        const clampedPrice = Math.max(0, newFinalPrice);
        const effectiveDiscount = baseTotal > 0 ? Math.max(0, ((baseTotal - clampedPrice) / baseTotal) * 100) : 0;
        return {
          ...item,
          finalPrice: clampedPrice,
          discountPercent: effectiveDiscount,
          discountAmount: baseTotal - clampedPrice,
        };
      });
      set({ cart: newCart, ...updateTotals(newCart, get().oldGoldItems) });
    },
    updateCartItemProduct: (productId, overrides) => {
      const newCart = get().cart.map((item) => {
        if (item.product.id !== productId) return item;
        const updatedProduct = { ...item.product, ...overrides };
        const newFinalPrice = updatedProduct.sellingPrice * item.quantity;
        return {
          ...item,
          product: updatedProduct,
          finalPrice: newFinalPrice,
          discountPercent: 0,
          discountAmount: 0,
        };
      });
      set({ cart: newCart, ...updateTotals(newCart, get().oldGoldItems) });
    },
    addOldGoldItem: (item) => {
      const newOldGoldItems = [...get().oldGoldItems, item];
      set({ oldGoldItems: newOldGoldItems, ...updateTotals(get().cart, newOldGoldItems) });
    },
    removeOldGoldItem: (id) => {
      const newOldGoldItems = get().oldGoldItems.filter(i => i.id !== id);
      set({ oldGoldItems: newOldGoldItems, ...updateTotals(get().cart, newOldGoldItems) });
    },
    clearCart: () => set({ cart: [], oldGoldItems: [], currentCustomer: null, subtotal: 0, totalDiscount: 0, oldGoldTotal: 0, grandTotal: 0, editingOrderId: null }),
  };
});

function calculateFinalItemPrice(product: Product, quantity: number, discountPercent: number) {
  const baseTotal = product.sellingPrice * quantity;
  const discount = (baseTotal * discountPercent) / 100;
  return baseTotal - discount;
}
