import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  UserPlus,
  Search,
  ParkingCircle as Smartphone,
  CheckCircle2,
  X,
  CreditCard as CreditCardIcon,
  Ticket,
  Gem,
  ChevronDown,
  Banknote,
  Edit2,
  Scale,
  SlidersHorizontal
} from 'lucide-react';

import { usePOSStore } from '../../store/posStore';
import { useCustomerStore } from '../../store/customerStore';
import { useSalesStore } from '../../store/salesStore';
import { useProductStore } from '../../store/productStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSalesOrderStore } from '../../store/salesOrderStore';
import { v4 as uuidv4 } from 'uuid';
import { Button, cn } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCurrency, calculateProductPrice } from '../../utils/calculations';
import { Modal } from '../ui/Modal';
import { generateInvoice, generateOrderReceipt } from '../../utils/invoiceGenerator';
import { CustomerModal } from '../../pages/CustomersPage';
import { OldGoldModal } from './OldGoldModal';
import { useOldGoldPurchaseStore } from '../../store/oldGoldPurchaseStore';
import type { Sale, OldGoldPurchase } from '../../types';

export const CartPanel = ({ isOrderMode }: { isOrderMode?: boolean }) => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    updateItemPrice,
    updateCartItemProduct,
    clearCart,
    currentCustomer,
    setCustomer,
    subtotal,
    totalDiscount,
    oldGoldItems,
    addOldGoldItem,
    removeOldGoldItem,
    oldGoldTotal,
    grandTotal,
    editingOrderId
  } = usePOSStore();

  const { customers, addCustomer } = useCustomerStore();
  const { settings } = useSettingsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSalesOrderSuccessOpen, setIsSalesOrderSuccessOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [successCustomer, setSuccessCustomer] = useState<any>(null);
  const [isOldGoldModalOpen, setIsOldGoldModalOpen] = useState(false);
  const [isSalesOrderModalOpen, setIsSalesOrderModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<string | null>(null); // productId

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-col bg-luxury-charcoal border border-luxury-border rounded-3xl lg:overflow-hidden shadow-2xl relative transition-colors duration-500">
      {/* Scrollable gradient blur indicator */}
      <div className="absolute top-20 inset-x-0 h-10 bg-gradient-to-b from-luxury-charcoal to-transparent z-10 pointer-events-none opacity-50" />

      {/* Header / Customer Selector */}
      <div className="p-6 border-b border-luxury-border-dim bg-luxury-surface relative z-20 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-400/10 rounded-lg text-gold-400">
              <ShoppingBag size={20} />
            </div>
            <h2 className="text-lg font-serif font-bold text-luxury-text tracking-tight uppercase">Active Cart</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOldGoldModalOpen(true)}
              className="p-2 hover:bg-gold-400/10 text-luxury-text-muted hover:text-gold-400 transition-all rounded-lg flex items-center gap-2"
              title="Add Old Gold"
            >
              <Scale size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Add Old Gold</span>
            </button>
            <button
              onClick={clearCart}
              className="p-2 hover:bg-red-500/10 text-luxury-text-muted hover:text-red-400 transition-all rounded-lg"
              title="Clear Cart"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {currentCustomer ? (
          <div className="flex items-center justify-between p-4 bg-gold-400/5 border border-gold-400/20 rounded-2xl group transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center text-luxury-black font-bold">
                {currentCustomer.name[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-luxury-text leading-tight">{currentCustomer.name}</p>
                <p className="text-xs text-luxury-text-muted font-medium">{currentCustomer.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setCustomer(null)}
              className="p-1 hover:bg-luxury-surface rounded-full text-luxury-text-dim hover:text-luxury-text transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Assign Customer (Search by name/phone)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 bg-luxury-input border-2 border-luxury-border-dim rounded-2xl pl-12 pr-6 text-sm focus:border-gold-400/40 outline-none transition-all placeholder:text-luxury-text-dim font-bold uppercase tracking-wide"
            />

            {searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-luxury-charcoal border border-luxury-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up">
                <div className="max-h-64 overflow-y-auto scrollbar-gold">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCustomer(c); setSearchTerm(''); }}
                      className="w-full p-4 flex items-center justify-between hover:bg-luxury-surface transition-colors border-b border-luxury-border-dim last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-luxury-surface flex items-center justify-center text-luxury-text-dim text-xs font-bold">{c.name[0]}</div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-luxury-text">{c.name}</p>
                          <p className="text-[10px] text-luxury-text-dim font-medium">{c.phone}</p>
                        </div>
                      </div>
                      <CheckCircle2 size={16} className="text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-luxury-text-dim mb-3 font-medium">No customer found.</p>
                      <Button
                        onClick={(e) => { e.stopPropagation(); setIsCustomerModalOpen(true); }}
                        size="sm" variant="outline" className="h-8 border-gold-400/30 text-gold-400 text-[10px] uppercase font-bold tracking-wide"
                      >
                        <UserPlus size={12} className="mr-2" /> Add New
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-gold relative z-0">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-16 h-16 bg-luxury-surface rounded-full flex items-center justify-center mb-4">
              <ShoppingBag size={32} />
            </div>
            <p className="text-lg font-serif">Empty Treasure Box</p>
            <p className="text-xs uppercase tracking-wide mt-2">Add items to proceed</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="group animate-slide-up relative bg-luxury-surface border border-luxury-border-dim hover:border-gold-400/30 rounded-2xl p-4 transition-all cursor-pointer"
              onClick={() => setEditingCartItem(item.product.id)}
            >
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-luxury-black rounded-xl overflow-hidden flex items-center justify-center p-2 group-hover:bg-gold-400/5 transition-colors">
                  {item.product.images?.[0] ? <img src={item.product.images[0]} /> : <Gem className="text-luxury-text-dim" size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-luxury-text text-sm line-clamp-2 pr-2 uppercase tracking-wide leading-tight mb-1">{item.product.name}</h4>
                    <div className="flex items-center gap-1">
                      <div className="p-1.5 hover:bg-gold-400/10 rounded-lg text-luxury-text-dim hover:text-gold-400 transition-all opacity-0 group-hover:opacity-100">
                        <SlidersHorizontal size={13} />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-luxury-text-dim hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] uppercase font-bold tracking-wide text-luxury-text-dim mb-2">
                    <span>{item.product.purity}</span>
                    <span>•</span>
                    <span>{item.product.weight}g</span>
                    {item.product._cartOverridden && (
                      <span className="text-[9px] text-gold-400 font-black tracking-widest bg-gold-400/10 px-1.5 rounded border border-gold-400/20">CUSTOM</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div
                      className="flex items-center gap-2 bg-luxury-black p-1 rounded-lg border border-luxury-border-dim"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:text-gold-400 transition-colors"><Minus size={14} /></button>
                      <span className="w-6 text-center text-xs font-bold text-luxury-text">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:text-gold-400 transition-colors"><Plus size={14} /></button>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <CartItemPriceEditor
                        productId={item.product.id}
                        currentPrice={item.finalPrice}
                        basePrice={item.product.sellingPrice * item.quantity}
                        onCommit={updateItemPrice}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {oldGoldItems.length > 0 && (
          <div className="pt-6 border-t border-luxury-border-dim space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400/60 mb-4 px-2">Buyback Assets (Old Gold)</h3>
            {oldGoldItems.map((item) => (
              <div key={item.id} className="group animate-slide-up relative bg-gold-400/5 border border-gold-400/20 rounded-2xl p-4 transition-all">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gold-400/10 rounded-xl flex items-center justify-center text-gold-400">
                    <Scale size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-luxury-text text-sm line-clamp-1 truncate pr-2 uppercase tracking-wide">{item.description}</h4>
                      <button
                        onClick={() => removeOldGoldItem(item.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-luxury-text-dim hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] uppercase font-bold tracking-wide text-luxury-text-dim mb-2">
                      <span>{item.grossWeight}g</span>
                      <span>•</span>
                      <span>{item.melting}% Touch</span>
                      <span>•</span>
                      <span>Fine: {(item.fineWeight || 0).toFixed(3)}g</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] text-luxury-text-dim font-bold italic">Buyback Credit</span>
                      <span className="font-bold text-gold-400 text-sm">-{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary / Footer */}
      <div className="p-8 cart-footer-luxury border-t border-luxury-border rounded-t-3xl shadow-[var(--luxury-shadow-up)] transition-colors">
        <div className="space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-luxury-text-muted font-black tracking-widest uppercase text-[10px]">Subtotal</span>
            <span className="text-luxury-text font-bold">{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-500 font-medium">Loyalty Discount</span>
              <span className="text-green-500 font-bold">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {oldGoldTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gold-400 font-medium">Old Gold Deduction</span>
              <span className="text-gold-400 font-bold">-{formatCurrency(oldGoldTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-[10px] uppercase tracking-wide font-bold">
            <span className="text-luxury-text-dim">CGST Incl. ({settings.cgstPercent}%)</span>
            <span className="text-luxury-text-muted">{formatCurrency((grandTotal / (1 + (settings.cgstPercent + settings.sgstPercent) / 100)) * (settings.cgstPercent / 100))}</span>
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wide font-bold">
            <span className="text-luxury-text-dim">SGST Incl. ({settings.sgstPercent}%)</span>
            <span className="text-luxury-text-muted">{formatCurrency((grandTotal / (1 + (settings.cgstPercent + settings.sgstPercent) / 100)) * (settings.sgstPercent / 100))}</span>
          </div>

          <div className="pt-4 mt-4 border-t border-luxury-border-dim flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wide text-luxury-text-dim mb-1">Grand Total</p>
              <p 
                className="text-3xl font-serif font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(to right, var(--gold-gradient-from, #c9a84c), var(--gold-gradient-to, #f4f0db))'
                }}
              >
                {formatCurrency(grandTotal)}
              </p>
            </div>
            {currentCustomer?.loyaltyPoints ? (
              <div className="p-3 bg-gold-400/5 border border-gold-400/10 rounded-2xl text-right">
                <p className="text-[8px] uppercase tracking-wide font-bold text-gold-400/60 leading-none">Loyalty</p>
                <p className="text-sm font-bold text-gold-400">{currentCustomer.loyaltyPoints} pts</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className={cn("grid gap-4", isOrderMode ? "grid-cols-1" : "grid-cols-2")}>
          <Button
            disabled={cart.length === 0 && oldGoldItems.length === 0}
            onClick={() => {
              if (!currentCustomer) {
                toast.error('SELECT A CUSTOMER FIRST', {
                  icon: '👤',
                  style: {
                    borderRadius: '12px',
                    background: '#121212',
                    color: '#C9A84C',
                    border: '1px solid #C9A84C'
                  }
                });
                return;
              }
              setIsSalesOrderModalOpen(true);
            }}
            className={cn(
              "py-4 rounded-2xl text-lg font-bold tracking-widest uppercase transition-transform hover:scale-[1.02]",
              isOrderMode ? "bg-gold-400 text-luxury-black shadow-[0_10px_30px_rgba(201,168,76,0.3)]" : "text-xs font-bold border-luxury-border/40"
            )}
            variant={isOrderMode ? "gold" : "outline"}
          >
            Save as Order
          </Button>
          {!isOrderMode && (
            <Button
              disabled={(cart.length === 0 && oldGoldItems.length === 0) || !currentCustomer}
              onClick={() => {
                setIsCheckoutOpen(true);
              }}
              className="w-full py-4 rounded-2xl text-lg font-bold tracking-wide uppercase transition-transform hover:scale-[1.02] shadow-[0_10px_30px_rgba(201,168,76,0.2)]"
              variant={grandTotal < 0 ? "outline" : "gold"}
            >
              {grandTotal < 0 ? 'Payout' : 'Checkout'}
            </Button>
          )}
        </div>
        {!currentCustomer && (
          <p className="text-[9px] uppercase font-black tracking-widest text-gold-400/60 text-center mt-3 animate-pulse">
            Select a customer to enable Checkout & Advance Orders
          </p>
        )}
      </div>

      <SalesOrderConfirmModal
        isOpen={isSalesOrderModalOpen}
        onClose={() => setIsSalesOrderModalOpen(false)}
        onConfirm={async (dueDate, totalAdvance, paymentDetails) => {
          const { addOrder, updateOrder } = useSalesOrderStore.getState();
          const orderNumber = `SO-${Date.now().toString().slice(-6)}`;
          
          const orderData = {
            orderNumber,
            customerId: currentCustomer?.id || null,
            customerName: currentCustomer?.name || 'Unknown',
            customerPhone: currentCustomer?.phone || '',
            items: cart,
            oldGoldItems: oldGoldItems,
            subtotal,
            discountTotal: totalDiscount,
            oldGoldTotal: oldGoldTotal,
            cgst: 0,
            sgst: 0,
            igst: 0,
            taxTotal: 0,
            grandTotal,
            amountPaid: totalAdvance,
            advancePaid: totalAdvance,
            balanceDue: grandTotal - totalAdvance,
            change: 0,
            paymentMethod: totalAdvance === paymentDetails.cash ? 'Cash' : 'Split',
            paymentDetails,
            goldRate: settings.goldRate || 0,
            silverRate: settings.silverRate || 0,
            platinumRate: settings.platinumRate || 0,
            dueDate,
            orderStatus: 'Pending',
            notes: editingOrderId ? 'Updated order from POS' : 'Advance order from POS',
            paymentHistory: [{
              date: new Date().toISOString(),
              amount: totalAdvance,
              method: 'Initial Advance',
              note: editingOrderId ? 'Payment updated' : 'Advance received at order creation'
            }]
          };

          if (editingOrderId) {
            toast.promise(
              updateOrder(editingOrderId, orderData as any),
              {
                loading: 'Updating order in vault...',
                success: 'Order updated successfully!',
                error: 'Failed to update order.'
              }
            );
          } else {
            toast.promise(
              addOrder(orderData as any),
              {
                loading: 'Securing order in vault...',
                success: 'Order created successfully!',
                error: 'Failed to create order. Please try again.'
              }
            );
          }
          
          setLastOrder(orderData);
          setSuccessCustomer(currentCustomer);
          clearCart();
          setIsSalesOrderModalOpen(false);
          setIsSalesOrderSuccessOpen(true);
        }}
        totalAmount={grandTotal}
        initialOrder={useSalesOrderStore.getState().orders.find(o => o.id === editingOrderId)}
      />

      <PaymentModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        totalAmount={grandTotal}
      />
      <OldGoldModal
        isOpen={isOldGoldModalOpen}
        onClose={() => setIsOldGoldModalOpen(false)}
        onSave={addOldGoldItem}
      />
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={async (data: any) => {
          const newCustomer = {
            ...data,
            createdAt: new Date().toISOString(),
            totalSpent: 0,
            totalPurchases: 0,
            loyaltyPoints: 0
          };
          const createdId = await addCustomer(newCustomer);
          setCustomer({
            ...newCustomer,
            id: createdId
          } as any); // Assign immediately with correct DB ID
          setIsCustomerModalOpen(false);
          setSearchTerm('');
        }}
      />
      
      <OrderSuccessModal
        isOpen={isSalesOrderSuccessOpen}
        onClose={() => {
          setIsSalesOrderSuccessOpen(false);
          setSuccessCustomer(null);
        }}
        order={lastOrder}
        settings={settings}
        customer={successCustomer}
      />
      <CartItemEditModal
        item={cart.find(i => i.product.id === editingCartItem) || null}
        isOpen={!!editingCartItem}
        onClose={() => setEditingCartItem(null)}
        onSave={(productId, overrides) => {
          updateCartItemProduct(productId, overrides);
          setEditingCartItem(null);
        }}
      />
    </div>
  );
};

const OrderSuccessModal = ({ isOpen, onClose, order, settings, customer }: {
  isOpen: boolean,
  onClose: () => void,
  order: any,
  settings: any,
  customer: any
}) => {
  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Confirmed" size="sm">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-8 animate-scale-in">
        <div className="w-20 h-20 bg-gold-400 rounded-full flex items-center justify-center text-luxury-black shadow-2xl shadow-gold-400/40 animate-bounce">
          <ShoppingBag size={40} />
        </div>
        <div>
          <h3 className="text-3xl font-serif font-bold text-luxury-text mb-2 tracking-tight">Booking Saved</h3>
          <p className="text-sm text-gold-400 font-bold uppercase tracking-wide">{order.orderNumber}</p>
        </div>
        
        <div className="w-full p-6 bg-luxury-surface rounded-3xl border border-luxury-border-dim space-y-4 text-left">
           <div className="flex justify-between items-center">
             <span className="text-[10px] uppercase font-bold text-luxury-text-muted">Total Order</span>
             <span className="text-sm font-bold text-luxury-text">{formatCurrency(order.grandTotal)}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-[10px] uppercase font-bold text-green-500">Advance Received</span>
             <span className="text-lg font-serif font-bold text-green-500">{formatCurrency(order.advancePaid)}</span>
           </div>
           <div className="border-t border-luxury-border-dim pt-2 flex justify-between items-center">
             <span className="text-[10px] uppercase font-bold text-red-400">Balance Due</span>
             <span className="text-lg font-serif font-bold text-red-400">{formatCurrency(order.balanceDue)}</span>
           </div>
        </div>

        <div className="flex flex-col w-full gap-4 pt-4">
          <Button variant="gold" className="h-14 w-full text-sm uppercase font-black tracking-widest shadow-lg shadow-gold-500/20" onClick={onClose}>
            New Transaction
          </Button>
          <Button
            variant="outline"
            className="h-14 w-full border-luxury-border-dim uppercase font-black tracking-widest text-[10px]"
            onClick={() => generateOrderReceipt(order, settings, customer)}
          >
            Download Order Bill
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/** Inline price editor for a single cart item */
const CartItemPriceEditor = ({
  productId,
  currentPrice,
  basePrice,
  onCommit,
}: {
  productId: string;
  currentPrice: number;
  basePrice: number;
  onCommit: (productId: string, price: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const discountPct = basePrice > 0 ? Math.round(((basePrice - currentPrice) / basePrice) * 100) : 0;
  const isOverridden = discountPct > 0;

  const startEdit = () => {
    setValue(currentPrice.toFixed(0));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      onCommit(productId, parsed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-luxury-text-dim font-bold">₹</span>
        <input
          autoFocus
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-24 text-right text-sm font-bold bg-luxury-black border border-gold-400/60 rounded-lg px-2 py-1 text-gold-400 outline-none focus:border-gold-400 transition-colors"
        />
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit price"
      className="flex flex-col items-end gap-0.5 group/price hover:opacity-80 transition-opacity"
    >
      <div className="flex items-center gap-1.5">
        <Edit2 size={10} className="text-luxury-text-dim opacity-0 group-hover/price:opacity-100 transition-opacity" />
        <span className="font-bold text-gold-400 text-sm">{formatCurrency(currentPrice)}</span>
      </div>
      {isOverridden && (
        <span className="text-[8px] text-green-400 font-black tracking-widest bg-green-400/10 px-1.5 rounded">
          -{discountPct}% OFF
        </span>
      )}
    </button>
  );
};

// Payment Modal Sub-component
const PaymentModal = ({ isOpen, onClose, totalAmount }: { isOpen: boolean, onClose: () => void, totalAmount: number }) => {
  const [method, setMethod] = useState<'Cash' | 'Card' | 'UPI' | 'EMI' | 'Split'>('Cash');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '', upi: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [successOldGoldTotal, setSuccessOldGoldTotal] = useState(0);
  const [successPointsEarned, setSuccessPointsEarned] = useState(0);

  const { clearCart, currentCustomer, editingOrderId } = usePOSStore();
  const { logPurchase, addLoyaltyPoints, updateCustomer } = useCustomerStore();
  const { addSale } = useSalesStore();
  const { updateStock } = useProductStore();
  const { settings, incrementInvoiceCounter } = useSettingsStore();

  useEffect(() => {
    if (isOpen && currentCustomer) {
      setSelectedCustomer(currentCustomer);
    } else if (!isOpen) {
      // Reset everything when modal closes so it opens clean next time
      setSelectedCustomer(null);
      setMethod('Cash');
      setReceivedAmount('');
      setSplitAmounts({ cash: '', card: '', upi: '' });
      setIsSuccess(false);
      setInvoiceId('');
      setSuccessOldGoldTotal(0);
      setSuccessPointsEarned(0);
    }
  }, [isOpen, currentCustomer]);

  const handlePayment = async () => {
    const invoiceNumber = `${settings.invoicePrefix}${settings.invoiceCounter.toString().padStart(4, '0')}`;
    setInvoiceId(invoiceNumber);

    const cartState = usePOSStore.getState();
    const subtotal = cartState.subtotal;
    const discount = cartState.totalDiscount;
    const oldGoldTotal = cartState.oldGoldTotal || 0;
    
    // Taxes are calculated on the full amount BEFORE old gold deduction
    const amountBeforeOldGold = subtotal - discount;

    // Reverse calculate the tax portion for the invoice record
    const totalTaxRate = settings.cgstPercent + settings.sgstPercent;
    const baseSubtotal = amountBeforeOldGold / (1 + totalTaxRate / 100);
    const cgst = baseSubtotal * (settings.cgstPercent / 100);
    const sgst = baseSubtotal * (settings.sgstPercent / 100);
    const totalTax = cgst + sgst;

    const grandTotal = amountBeforeOldGold - oldGoldTotal;

    // Financial balancing
    const splitTotal = method === 'Split' ? (Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.upi)) : 0;
    const paidByClient = method === 'Split' ? splitTotal : (Number(receivedAmount) || (grandTotal > 0 ? grandTotal : 0));
    const finalAmountPaid = grandTotal > 0 ? Math.min(paidByClient, grandTotal) : Math.abs(grandTotal);
    const outstanding = grandTotal > 0 ? Math.max(0, grandTotal - finalAmountPaid) : 0;
    const changeAmount = grandTotal > 0 ? Math.max(0, paidByClient - grandTotal) : 0;

    const newSale: Sale = {
      id: uuidv4(),
      invoiceNumber,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone || 'N/A',
      items: cartState.cart,
      oldGoldItems: cartState.oldGoldItems,
      subtotal: baseSubtotal,
      discountTotal: discount / (1 + totalTaxRate / 100),
      oldGoldTotal: oldGoldTotal,
      cgst: cgst,
      sgst: sgst,
      igst: 0,
      taxTotal: totalTax,
      grandTotal: grandTotal,
      amountPaid: finalAmountPaid,
      outstandingBalance: outstanding,
      change: changeAmount,
      paymentMethod: method,
      paymentDetails: method === 'Split' ? {
        cash: Number(splitAmounts.cash) || 0,
        card: Number(splitAmounts.card) || 0,
        upi: Number(splitAmounts.upi) || 0
      } : { [method.toLowerCase()]: finalAmountPaid },
      goldRate: settings.goldRate || 0,
      silverRate: settings.silverRate || 0,
      platinumRate: settings.platinumRate || 0,
      status: (outstanding > 0 ? 'Partially Paid' : 'Completed') as any,
      notes: outstanding > 0 ? `Outstanding balance of ${formatCurrency(outstanding)}` : '',
      createdAt: new Date().toISOString(),
      createdBy: settings.ownerName,
      // Seed first payment history entry
      paymentHistory: finalAmountPaid > 0 ? [{
        date: new Date().toISOString(),
        amount: finalAmountPaid,
        method: method,
        note: 'Initial payment at sale'
      }] : [],
    };

    // Store sale temporarily for printing if needed
    (window as any)._lastSale = newSale;

    try {
      // Execute all Firestore updates
      await addSale(newSale);

      if (editingOrderId) {
        const { deleteOrder } = useSalesOrderStore.getState();
        await deleteOrder(editingOrderId);
      }

      if (selectedCustomer) {
        await logPurchase(selectedCustomer.id, finalAmountPaid);
        if (outstanding > 0) {
          await updateCustomer(selectedCustomer.id, {
            outstandingBalance: (selectedCustomer.outstandingBalance || 0) + outstanding
          });
        }
        await addLoyaltyPoints(selectedCustomer.id, Math.floor(totalAmount / settings.loyaltyPointsPerRupee));
      }

      // Update inventory for each item
      const stockUpdates = newSale.items.map(item =>
        updateStock(item.product.id, -item.quantity)
      );
      await Promise.all(stockUpdates);

      // Log old gold items to old_gold_purchases so they show up in the acquisitions ledger
      if (newSale.oldGoldItems && newSale.oldGoldItems.length > 0) {
        const uniquePurchaseNum = `OGP-${Date.now().toString().slice(-6)}`;
        const purchaseObj: OldGoldPurchase = {
          id: uuidv4(),
          purchaseNumber: uniquePurchaseNum,
          customerId: selectedCustomer?.id || null,
          customerName: selectedCustomer?.name || 'Walk-in Customer',
          customerPhone: selectedCustomer?.phone || 'N/A',
          kycType: 'Aadhar',
          kycNumber: 'POS Trade-in',
          items: newSale.oldGoldItems,
          subtotal: oldGoldTotal,
          payoutAmount: oldGoldTotal,
          paymentMethod: method === 'UPI' ? 'UPI' : 'Cash',
          goldRate: settings.goldRate || 0,
          silverRate: settings.silverRate || 0,
          platinumRate: settings.platinumRate || 0,
          declarationSigned: true,
          notes: `POS Trade-in from Invoice ${newSale.invoiceNumber}`,
          branchId: newSale.branchId,
          createdAt: newSale.createdAt,
          createdBy: settings.ownerName || 'admin'
        };
        await useOldGoldPurchaseStore.getState().addPurchase(purchaseObj);
      }

      await incrementInvoiceCounter();
      
      // Preserve success metadata before clearing POS state
      setSuccessOldGoldTotal(oldGoldTotal);
      setSuccessPointsEarned(Math.max(0, Math.floor(totalAmount / settings.loyaltyPointsPerRupee)));

      // Clear data immediately
      clearCart();
      setReceivedAmount('');
      setSplitAmounts({ cash: '', card: '', upi: '' });
      setIsSuccess(true);
    } catch (error) {
      console.error('Payment processing failed:', error);
    }
  };

  const finalizeTransaction = () => {
    onClose();
    setIsSuccess(false);
    setSelectedCustomer(null);
    setSuccessOldGoldTotal(0);
    setSuccessPointsEarned(0);
  };

  const methodTotal = method === 'Split'
    ? (Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.upi))
    : Number(receivedAmount);

  if (isSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={finalizeTransaction} title="Transaction Authenticated" size="sm">
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-8 animate-scale-in">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/40 animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <div>
            <h3 className="text-3xl font-serif font-bold text-luxury-text mb-2 tracking-tight">Success!</h3>
            <p className="text-sm text-gold-400 font-bold uppercase tracking-wide">{invoiceId}</p>
          </div>
          <div className="w-full p-6 bg-luxury-surface rounded-3xl border border-luxury-border-dim space-y-4">
            <div className="flex flex-col">
              <p className="text-[10px] uppercase font-bold tracking-wide text-luxury-text-dim">Client Portfolio</p>
              <p className="text-sm font-bold text-luxury-text uppercase tracking-wide truncate max-w-[140px]">{selectedCustomer?.name || 'Walk-in'}</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold tracking-wide text-luxury-text-muted">Old Gold Credited</span>
              <span className="text-xl font-serif font-bold text-gold-400">{formatCurrency(successOldGoldTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold tracking-wide text-luxury-text-muted">Points Earned</span>
              <span className="text-xl font-serif font-bold text-green-500">+{successPointsEarned} PTS</span>
            </div>
          </div>
          <div className="flex flex-col w-full gap-4 pt-4">
            <Button variant="gold" className="h-16 w-full text-lg uppercase font-bold tracking-wide shadow-lg shadow-gold-500/20" onClick={finalizeTransaction}>
              Initialize New Sale
            </Button>
            <Button
              variant="outline"
              className="h-14 w-full border-luxury-border-dim uppercase font-bold tracking-wide text-[10px]"
              onClick={() => {
                const lastSale = (window as any)._lastSale;
                if (lastSale) generateInvoice(lastSale, settings, selectedCustomer);
              }}
            >
              Download Detailed Bill
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Transaction" size="md">
      <div className="space-y-8 animate-fade-in">
        <div className="flex bg-luxury-black/20 p-2 rounded-2xl border border-luxury-border-dim">
          {[
            { id: 'Cash', icon: Banknote },
            { id: 'Card', icon: CreditCardIcon },
            { id: 'UPI', icon: Smartphone },
            { id: 'EMI', icon: Ticket },
            { id: 'Split', icon: Gem }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id as any)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all',
                method === m.id ? 'bg-gold-400 text-luxury-black shadow-lg font-bold' : 'text-luxury-text-muted hover:bg-luxury-surface'
              )}
            >
              <m.icon size={24} />
              <span className="text-[10px] uppercase font-bold tracking-wide">{m.id}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <ChevronDown size={14} className={totalAmount < 0 ? "text-red-400" : "text-gold-400"} />
              <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-dim">
                {totalAmount < 0 ? 'Buyback Settlement' : 'Current Vault Selection'}
              </p>
            </div>
            <div className="p-6 bg-luxury-surface border border-luxury-border-dim rounded-2xl space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wide text-luxury-text-muted">
                {totalAmount < 0 ? 'Total Payout to Customer' : 'Total Amount Due'}
              </p>
              <p className={`text-4xl font-serif font-bold ${totalAmount < 0 ? 'text-red-400' : 'text-gold-400'}`}>
                {formatCurrency(Math.abs(totalAmount))}
              </p>
            </div>

            {method === 'Split' ? (
              <div className="space-y-4">
                <Input
                  label="Cash Amount" type="number" placeholder="0"
                  value={splitAmounts.cash} onChange={(e) => setSplitAmounts(s => ({ ...s, cash: e.target.value }))}
                  className="text-xl h-12 font-bold" autoFocus
                />
                <Input
                  label="Card Amount" type="number" placeholder="0"
                  value={splitAmounts.card} onChange={(e) => setSplitAmounts(s => ({ ...s, card: e.target.value }))}
                  className="text-xl h-12 font-bold"
                />
                <Input
                  label="UPI Amount" type="number" placeholder="0"
                  value={splitAmounts.upi} onChange={(e) => setSplitAmounts(s => ({ ...s, upi: e.target.value }))}
                  className="text-xl h-12 font-bold"
                />
              </div>
            ) : (
              <Input
                label={totalAmount < 0 ? "Amount Paid" : "Amount Received"}
                type="number"
                placeholder={Math.abs(totalAmount).toString()}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="text-2xl h-14 font-bold"
                autoFocus
              />
            )}


          </div>

          <div className="space-y-6">
            <div className="p-6 bg-luxury-surface border border-luxury-border-dim rounded-2xl space-y-4">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-muted border-b border-luxury-border-dim pb-2">Order Review</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-gold pr-2">
                {usePOSStore.getState().cart.map(item => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span className="text-luxury-text-muted truncate pr-4">{item.quantity}x {item.product.name}</span>
                    <span className="text-luxury-text font-medium shrink-0">{formatCurrency(item.product.sellingPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {methodTotal > totalAmount && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
                <p className="text-xs uppercase font-bold tracking-widest text-green-500">Change Due</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(methodTotal - totalAmount)}</p>
              </div>
            )}

            {methodTotal > 0 && methodTotal < totalAmount && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                <p className="text-xs uppercase font-bold tracking-widest text-red-500">Remaining Balance</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(totalAmount - methodTotal)}</p>
              </div>
            )}

            {method === 'Split' && methodTotal > 0 && (
              <div className="p-4 bg-luxury-surface border border-luxury-border-dim rounded-xl flex items-center justify-between">
                <p className="text-xs uppercase font-bold tracking-widest text-luxury-text-muted">Split Total</p>
                <p className="text-xl font-bold text-luxury-text">{formatCurrency(methodTotal)}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-luxury-border-dim mt-auto">
              <Button variant="outline" className="flex-1 py-4 border-luxury-border-dim text-luxury-text-muted" onClick={onClose}>Cancel</Button>
              <Button variant="gold" className="flex-1 py-4 uppercase font-bold tracking-widest" onClick={handlePayment}>Finalize</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const SalesOrderConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  totalAmount,
  initialOrder
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (dueDate: string, total: number, details: any) => void,
  totalAmount: number,
  initialOrder?: any
}) => {
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, card: 0, upi: 0 });

  useEffect(() => {
    if (initialOrder && isOpen) {
      setDueDate(new Date(initialOrder.dueDate).toISOString().split('T')[0]);
      setSplitAmounts({
        cash: initialOrder.paymentDetails?.cash || 0,
        card: initialOrder.paymentDetails?.card || 0,
        upi: initialOrder.paymentDetails?.upi || 0
      });
    } else if (!initialOrder && isOpen) {
      setSplitAmounts({ cash: 0, card: 0, upi: 0 });
    }
  }, [initialOrder, isOpen]);

  const totalAdvance = Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.upi);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Advance Order" size="md">
      <div className="p-6 space-y-8 bg-luxury-charcoal">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[10px] uppercase font-bold text-luxury-text-dim mb-1">Total Order Value</p>
            <p className="text-xl font-serif font-bold text-gold-400">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[10px] uppercase font-bold text-luxury-text-dim mb-1">Remaining Balance</p>
            <p className="text-xl font-serif font-bold text-luxury-text">{formatCurrency(totalAmount - totalAdvance)}</p>
          </div>
        </div>

        <div className="space-y-6">
          <Input
            label="Promised Delivery Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-12 bg-luxury-black border-luxury-border"
          />

          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-3">Advance Split Payment</label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-luxury-text-muted ml-2">Cash</label>
                <Input 
                  type="number" 
                  value={splitAmounts.cash || ''} 
                  onChange={(e) => setSplitAmounts({...splitAmounts, cash: Number(e.target.value)})}
                  className="bg-luxury-black border-luxury-border text-green-400 font-bold h-12"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-luxury-text-muted ml-2">Card</label>
                <Input 
                  type="number" 
                  value={splitAmounts.card || ''} 
                  onChange={(e) => setSplitAmounts({...splitAmounts, card: Number(e.target.value)})}
                  className="bg-luxury-black border-luxury-border text-blue-400 font-bold h-12"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-luxury-text-muted ml-2">UPI</label>
                <Input 
                  type="number" 
                  value={splitAmounts.upi || ''} 
                  onChange={(e) => setSplitAmounts({...splitAmounts, upi: Number(e.target.value)})}
                  className="bg-luxury-black border-luxury-border text-purple-400 font-bold h-12"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-luxury-border-dim">
          <div className="flex justify-between items-center mb-8">
            <span className="text-sm font-bold text-luxury-text uppercase tracking-widest">Total Advance</span>
            <span className="text-3xl font-serif font-black text-green-500">{formatCurrency(totalAdvance)}</span>
              <Button variant="outline" className="flex-1 py-4 uppercase font-black tracking-widest border-luxury-border" onClick={onClose}>Abort</Button>
             <Button 
               variant="gold" 
               className="flex-[2] py-4 uppercase font-black tracking-widest shadow-lg shadow-gold-400/20" 
               onClick={() => onConfirm(dueDate, totalAdvance, splitAmounts)}
               disabled={totalAdvance <= 0}
             >
               Commit Advance Order
             </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Cart Item Temporary Edit Modal ──────────────────────────────────────────

const CartItemEditModal = ({
  item,
  isOpen,
  onClose,
  onSave,
}: {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, overrides: any) => void;
}) => {
  const { settings } = useSettingsStore();
  const [form, setForm] = useState<any>({});
  const [livePrice, setLivePrice] = useState<number>(0);

  useEffect(() => {
    if (item && isOpen) {
      setForm({
        weight: item.product.weight,
        purity: item.product.purity,
        metalType: item.product.metalType,
        makingCharges: item.product.makingCharges,
        makingChargePercent: item.product.makingChargePercent,
        isPercentageMakingCharge: item.product.isPercentageMakingCharge,
        stoneCharges: item.product.stoneCharges,
        wastagePercent: item.product.wastagePercent,
        sellingPrice: item.product.sellingPrice,
        isRateSensitive: item.product.isRateSensitive,
        description: item.product.description,
        huid: item.product.huid || '',
      });
    }
  }, [item, isOpen]);

  useEffect(() => {
    if (!item || !form.isRateSensitive) {
      setLivePrice(form.sellingPrice || 0);
      return;
    }
    try {
      const dummy = { ...item.product, ...form };
      const { finalPrice } = calculateProductPrice(dummy, settings);
      setLivePrice(finalPrice);
    } catch {
      setLivePrice(form.sellingPrice || 0);
    }
  }, [
    form.weight, form.makingCharges, form.makingChargePercent, form.isPercentageMakingCharge,
    form.stoneCharges, form.wastagePercent, form.purity, form.metalType, form.isRateSensitive,
    settings.metalRates
  ]);

  if (!item) return null;

  const handleSave = () => {
    const overrides = {
      ...form,
      weight: Number(form.weight) || 0,
      makingCharges: Number(form.makingCharges) || 0,
      makingChargePercent: Number(form.makingChargePercent) || 0,
      stoneCharges: Number(form.stoneCharges) || 0,
      wastagePercent: Number(form.wastagePercent) || 0,
      sellingPrice: form.isRateSensitive ? livePrice : (Number(form.sellingPrice) || item.product.sellingPrice),
      huid: form.huid || '',
      _cartOverridden: true,
    };
    onSave(item.product.id, overrides);
  };

  const numField = (label: string, key: string, step = '1') => (
    <div className="space-y-1.5">
      <label className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">{label}</label>
      <input
        type="number"
        step={step}
        value={form[key] ?? ''}
        onFocus={e => e.target.select()}
        onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
        className="w-full h-11 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-sm font-bold text-luxury-text outline-none focus:border-gold-400/60 transition-colors"
      />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Cart Item" size="md">
      <div className="p-6 bg-luxury-charcoal space-y-6">

        {/* Warning */}
        <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl flex items-center gap-3">
          <SlidersHorizontal size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-[9px] uppercase font-black tracking-widest text-amber-400/80 leading-relaxed">
            Changes are <span className="text-amber-400">session-only</span> — they won't modify the product in inventory.
          </p>
        </div>

        {/* Product identity */}
        <div className="flex items-center gap-4 p-4 bg-luxury-black/40 rounded-2xl border border-luxury-border-dim">
          <div className="w-12 h-12 bg-luxury-surface rounded-xl flex items-center justify-center text-luxury-text-dim border border-luxury-border-dim">
            <Gem size={20} />
          </div>
          <div>
            <p className="font-bold text-luxury-text uppercase tracking-wide text-sm">{item.product.name}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-luxury-text-dim mt-0.5">{item.product.sku}</p>
          </div>
        </div>

        {/* Rate sensitivity toggle */}
        <div className="flex items-center justify-between p-4 bg-luxury-black/40 rounded-xl border border-luxury-border-dim">
          <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Dynamic Pricing (Rate-Sensitive)</span>
          <button
            onClick={() => setForm((p: any) => ({ ...p, isRateSensitive: !p.isRateSensitive }))}
            className={cn('w-10 h-5 rounded-full transition-all relative', form.isRateSensitive ? 'bg-gold-400' : 'bg-luxury-text-dim')}
          >
            <div className={cn('absolute top-0.5 w-4 h-4 bg-luxury-black rounded-full transition-all', form.isRateSensitive ? 'right-0.5' : 'left-0.5')} />
          </button>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          {numField('Weight (g)', 'weight', '0.01')}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Purity</label>
            <select
              value={form.purity || '22K'}
              onChange={e => setForm((p: any) => ({ ...p, purity: e.target.value }))}
              className="w-full h-11 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-sm font-bold text-luxury-text outline-none focus:border-gold-400/60 transition-colors"
            >
              {['24K', '22K', '21K', '20K', '18K', '14K', '9K', '925', '950', 'Other'].map(p => (
                <option key={p} value={p} className="bg-luxury-black">{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {form.isPercentageMakingCharge
            ? numField('Making Charges (%)', 'makingChargePercent', '0.1')
            : numField('Making Charges (₹/g)', 'makingCharges', '1')
          }
          {numField('Stone / Diamond (₹)', 'stoneCharges', '1')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {numField('Wastage (%)', 'wastagePercent', '0.1')}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Making Mode</label>
            <div className="flex bg-luxury-black border border-luxury-border-dim rounded-xl p-1">
              <button
                onClick={() => setForm((p: any) => ({ ...p, isPercentageMakingCharge: false }))}
                className={cn('flex-1 py-2 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all', !form.isPercentageMakingCharge ? 'bg-gold-400 text-luxury-black' : 'text-luxury-text-dim')}
              >₹/g</button>
              <button
                onClick={() => setForm((p: any) => ({ ...p, isPercentageMakingCharge: true }))}
                className={cn('flex-1 py-2 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all', form.isPercentageMakingCharge ? 'bg-gold-400 text-luxury-black' : 'text-luxury-text-dim')}
              >%</button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">HUID</label>
          <input
            type="text"
            value={form.huid || ''}
            onChange={e => setForm((p: any) => ({ ...p, huid: e.target.value }))}
            className="w-full h-11 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-sm font-bold text-luxury-text outline-none focus:border-gold-400/60 transition-colors"
            placeholder="HUID (Optional)"
          />
        </div>

        {/* Final price display */}
        <div className="p-5 bg-gold-400/5 border border-gold-400/20 rounded-2xl space-y-2">
          <p className="text-[9px] uppercase font-black tracking-widest text-gold-400/60">
            {form.isRateSensitive ? 'Calculated Price (Live Rate)' : 'Custom Fixed Price'}
          </p>
          {form.isRateSensitive ? (
            <p className="text-3xl font-serif font-black text-gold-400">
              {formatCurrency(livePrice)}
              <span className="text-xs text-luxury-text-dim font-sans font-bold ml-2">/ unit</span>
            </p>
          ) : (
          <input
              type="number"
              value={form.sellingPrice || ''}
              onFocus={e => e.target.select()}
              onChange={e => setForm((p: any) => ({ ...p, sellingPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full text-3xl font-serif font-black text-gold-400 bg-transparent outline-none border-b-2 border-gold-400/40 focus:border-gold-400 pb-1 transition-colors"
              placeholder="Enter custom price..."
            />
          )}
        </div>

        <div className="flex gap-4 pt-2">
          <Button variant="outline" className="h-12 px-8 border-luxury-border uppercase font-black tracking-widest text-[10px]" onClick={onClose}>Cancel</Button>
          <Button variant="gold" className="h-12 flex-1 uppercase font-black tracking-widest" onClick={handleSave}>
            Apply to Cart
          </Button>
        </div>

      </div>
    </Modal>
  );
};
