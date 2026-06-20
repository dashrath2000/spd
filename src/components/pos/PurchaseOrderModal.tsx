import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button, cn } from '../ui/Button';
import { useSupplierStore } from '../../store/supplierStore';
import { formatCurrency } from '../../utils/calculations';
import type { PurchaseOrder, PurchaseOrderItem } from '../../types';

/** Convert purity string like "18K", "22K", "24K" to numeric karat value */
const purityToKarat = (purity: string): number => {
  const match = purity?.match(/(\d+)K/i);
  return match ? parseInt(match[1]) : 24;
};

/** Calculate item total using gold karat formula:
 *  karatRate = pureGoldRate * (karat/24 + wastage%)
 *  metalAmount = karatRate * grossWeight   (qty NOT used in amount)
 *  makingAmount = isMakingChargePercent ? metalAmount * mc% : mc (flat per item)
 *  total = metalAmount + makingAmount
 */
const calcWholesaleTotal = (item: Partial<PurchaseOrderItem>) => {
  const grossWeight = item.weight || 0;
  const pureGoldRate = item.rate || 0;
  const wastagePct = item.wastage || 0;       // e.g. 5 means 5%
  const karat = purityToKarat(item.purity || '24K');
  const karatInPercentage = karat / 24;       // e.g. 18/24 = 0.75
  const karatRate = pureGoldRate * (karatInPercentage + wastagePct / 100);
  const metalAmount = karatRate * grossWeight;
  const mc = item.makingCharge || 0;
  const makingAmount = item.isMakingChargePercent ? metalAmount * (mc / 100) : mc;
  const total = metalAmount + makingAmount;
  return { karat, karatInPercentage, karatRate, metalAmount, makingAmount, total };
};

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => Promise<void>;
  po?: PurchaseOrder | null;
}

export const PurchaseOrderModal = ({ isOpen, onClose, onSave, po }: PurchaseOrderModalProps) => {
  const { suppliers } = useSupplierStore();

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [items, setItems] = useState<Partial<PurchaseOrderItem>[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [amountPaid, setAmountPaid] = useState(0);
  const [applyTax, setApplyTax] = useState(true);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  useEffect(() => {
    if (po) {
      setSupplierId(po.supplierId);
      setExpectedDate(po.expectedDate ? new Date(po.expectedDate).toISOString().split('T')[0] : '');
      setItems(po.items);
      setNotes(po.notes || '');
      setPaymentMethod(po.paymentMethod || 'Bank Transfer');
      setAmountPaid(po.amountPaid || 0);
      setApplyTax((po.taxTotal || 0) > 0);
    } else {
      setSupplierId('');
      setExpectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setItems([]);
      setNotes('');
      setPaymentMethod('Bank Transfer');
      setAmountPaid(0);
      setApplyTax(true);
    }
  }, [po, isOpen]);

  const addItem = () => {
    setItems([...items, {
      description: '',
      metalType: 'Gold',
      purity: '22K',
      weight: 0,
      quantity: 1,
      rate: 0,
      total: 0,
      stockType: 'Wholesale' // Default to wholesale since it's common
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<PurchaseOrderItem>) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...updates };

    if (item.stockType === 'Wholesale') {
      item.quantity = 1;
    }

    // Auto-calculate total
    if ('weight' in updates || 'rate' in updates || 'quantity' in updates || 'wastage' in updates || 'purity' in updates || 'makingCharge' in updates || 'isMakingChargePercent' in updates || 'stockType' in updates) {
      if (item.stockType === 'Wholesale') {
        // Gold karat formula: karatRate = pureGoldRate * (karat/24 + wastage%)
        // finalAmount = metalAmount + makingCharges  (qty is display-only)
        const { total } = calcWholesaleTotal(item);
        item.total = total;
      } else {
        // Fine/Retail: traditional weight * rate * qty + making charge
        const w = item.weight || 0;
        const r = item.rate || 0;
        const q = item.quantity || 1;
        const mc = item.makingCharge || 0;
        const metalValue = w * r * q;
        const mcValue = item.isMakingChargePercent ? metalValue * (mc / 100) : mc;
        item.total = metalValue + mcValue;
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const totals = items.reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.total || 0),
    items: acc.items + (item.quantity || 0)
  }), { subtotal: 0, items: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) return;

    const taxRate = applyTax ? 0.03 : 0;
    const poData: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
      poNumber: po ? po.poNumber : `PO-${Date.now().toString().slice(-6)}`,
      supplierId,
      supplierName: selectedSupplier?.name || 'Unknown',
      items: items as PurchaseOrderItem[],
      subtotal: totals.subtotal,
      taxTotal: totals.subtotal * taxRate,
      grandTotal: totals.subtotal * (1 + taxRate),
      amountPaid: amountPaid,
      orderDate: po ? po.orderDate : new Date().toISOString(),
      expectedDate: new Date(expectedDate).toISOString(),
      status: po 
        ? (po.status === 'Received' || po.status === 'Cancelled' ? po.status : ((amountPaid > 0 && amountPaid < (totals.subtotal * (1 + taxRate))) ? 'Partial' : 'Ordered'))
        : ((amountPaid > 0 && amountPaid < (totals.subtotal * (1 + taxRate))) ? 'Partial' : 'Ordered'),
      paymentMethod,
      notes,
      createdBy: po ? po.createdBy : 'Admin'
    };

    await onSave(poData);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSupplierId('');
    setItems([]);
    setNotes('');
    setAmountPaid(0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={po ? "Edit Purchase Order" : "Generate Purchase Order"} size="full">
      <form onSubmit={handleSubmit} className="p-6 space-y-8 bg-luxury-charcoal">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Select Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-12 bg-luxury-black border border-luxury-border rounded-xl px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
              required
            >
              <option value="">Choose a Vendor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Expected Delivery"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="h-12 bg-luxury-black"
            required
          />

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Payment Terms</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-12 bg-luxury-black border border-luxury-border rounded-xl px-4 text-sm text-luxury-text outline-none"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Credit (Post-dated)">Credit (Post-dated)</option>
              <option value="Metal Swap">Metal Swap</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-luxury-border-dim pb-2">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Order Items</h4>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 border-gold-400/30 text-gold-400 hover:bg-gold-400/10">
              <Plus size={14} className="mr-2" /> Add Item
            </Button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-luxury-black/30 border border-luxury-border-dim rounded-2xl relative group space-y-4">
                <button type="button" onClick={() => removeItem(index)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                  <Trash2 size={14} />
                </button>

                <div className="flex items-center gap-4 border-b border-luxury-border-dim pb-3">
                  <div className="flex bg-luxury-black p-1 rounded-xl border border-luxury-border">
                    <button
                      type="button"
                      onClick={() => updateItem(index, { stockType: 'Wholesale', description: '' })}
                      className={cn(
                        'px-6 py-2 rounded-lg flex items-center justify-center transition-all uppercase font-black text-[9px] tracking-widest',
                        item.stockType === 'Wholesale' ? 'bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20' : 'text-luxury-text-muted hover:bg-luxury-surface/40'
                      )}
                    >
                      Wholesale
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItem(index, { stockType: 'Fine', description: '' })}
                      className={cn(
                        'px-6 py-2 rounded-lg flex items-center justify-center transition-all uppercase font-black text-[9px] tracking-widest',
                        item.stockType !== 'Wholesale' ? 'bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20' : 'text-luxury-text-muted hover:bg-luxury-surface/40'
                      )}
                    >
                      Fine Product (Retail)
                    </button>
                  </div>
                </div>

                {item.stockType === 'Wholesale' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[repeat(15,_minmax(0,_1fr))] gap-3 items-end">
                      <div className="col-span-3 space-y-2">
                        <label className="text-sm uppercase font-black tracking-widest text-luxury-text-dim">Metal & Purity</label>
                        <div className="flex gap-1">
                          <select
                            className="w-1/2 h-11 bg-luxury-surface border border-luxury-border-dim rounded-lg px-2 text-sm font-black uppercase text-luxury-text outline-none focus:border-gold-400"
                            value={item.metalType}
                            onChange={(e) => updateItem(index, { metalType: e.target.value as any, description: `Wholesale ${item.purity || '22K'} ${e.target.value}` })}
                          >
                            <option value="Gold">Gold</option>
                            <option value="Silver">Silver</option>
                            <option value="Platinum">Platinum</option>
                          </select>
                          <select
                            className="w-1/2 h-11 bg-luxury-surface border border-luxury-border-dim rounded-lg px-2 text-sm font-black uppercase text-luxury-text outline-none focus:border-gold-400"
                            value={item.purity}
                            onChange={(e) => updateItem(index, { purity: e.target.value as any, description: `Wholesale ${e.target.value} ${item.metalType || 'Gold'}` })}
                          >
                            {item.metalType === 'Gold' ? (
                              <>
                                <option value="24K">24K</option>
                                <option value="22K">22K</option>
                                <option value="18K">18K</option>
                                <option value="14K">14K</option>
                              </>
                            ) : (
                              <>
                                <option value="999">999</option>
                                <option value="925">925</option>
                                <option value="916">916</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Gross Weight (g)"
                          type="number"
                          step="0.001"
                          value={item.weight || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,4}$/.test(val)) {
                              updateItem(index, { weight: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Wastage %"
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5"
                          value={item.wastage || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,3}$/.test(val)) {
                              updateItem(index, { wastage: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          label="Pure Gold Rate/g (24K)"
                          type="number"
                          step="0.001"
                          value={item.rate || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,3}$/.test(val)) {
                              updateItem(index, { rate: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label={
                            <div className="flex justify-between items-center w-full">
                              <span>Making</span>
                              <div className="flex gap-1 bg-luxury-black/50 p-0.5 rounded-[4px] border border-luxury-border">
                                <button type="button" onClick={() => updateItem(index, { isMakingChargePercent: true })} className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-black leading-none", item.isMakingChargePercent ? "bg-gold-400 text-luxury-black" : "text-luxury-text-dim hover:text-luxury-text")}>%</button>
                                <button type="button" onClick={() => updateItem(index, { isMakingChargePercent: false })} className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-black leading-none", !item.isMakingChargePercent ? "bg-gold-400 text-luxury-black" : "text-luxury-text-dim hover:text-luxury-text")}>₹</button>
                              </div>
                            </div>
                          }
                          type="number"
                          step="0.01"
                          placeholder={item.isMakingChargePercent ? 'e.g. 2' : 'e.g. 500'}
                          value={item.makingCharge || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(val)) {
                              updateItem(index, { makingCharge: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-3 text-right pb-3">
                        <p className="text-xs uppercase font-black text-luxury-text-dim mb-1">Total</p>
                        <p className="text-xl font-black text-gold-400">{formatCurrency(item.total || 0)}</p>
                      </div>
                    </div>

                    {/* Calculation Breakdown Panel */}
                    {(item.weight || 0) > 0 && (item.rate || 0) > 0 && (() => {
                      const { karat, karatInPercentage, karatRate, metalAmount } = calcWholesaleTotal(item);
                      const wastagePct = item.wastage || 0;
                      const mc = item.makingCharge || 0;
                      return (
                        <div className="bg-gold-400/5 border border-gold-400/20 rounded-xl p-4">
                          <p className="text-sm uppercase font-black tracking-[0.2em] text-gold-400 mb-4">⚙ Calculation Breakdown</p>
                          <div className="grid grid-cols-5 gap-4">
                            <div className="bg-luxury-black/40 rounded-lg p-4">
                              <p className="text-luxury-text-dim font-black uppercase text-xs mb-2 tracking-widest">Karat %</p>
                              <p className="text-luxury-text font-bold text-base">{karat}K ÷ 24 = <span className="text-gold-400">{(karatInPercentage * 100).toFixed(2)}%</span></p>
                            </div>
                            <div className="bg-luxury-black/40 rounded-lg p-4">
                              <p className="text-luxury-text-dim font-black uppercase text-xs mb-2 tracking-widest">Karat + Wastage</p>
                              <p className="text-luxury-text font-bold text-base">{(karatInPercentage * 100).toFixed(2)}% + {wastagePct}% = <span className="text-gold-400">{((karatInPercentage + wastagePct / 100) * 100).toFixed(2)}%</span></p>
                            </div>
                            <div className="bg-luxury-black/40 rounded-lg p-4">
                              <p className="text-luxury-text-dim font-black uppercase text-xs mb-2 tracking-widest">Karat Rate/g</p>
                              <p className="text-luxury-text font-bold text-base">{formatCurrency(item.rate || 0)} × {((karatInPercentage + wastagePct / 100) * 100).toFixed(2)}% = <span className="text-gold-400">{formatCurrency(karatRate)}</span></p>
                            </div>
                            <div className="bg-luxury-black/40 rounded-lg p-4">
                              <p className="text-luxury-text-dim font-black uppercase text-xs mb-2 tracking-widest">Metal Amount</p>
                              <p className="text-luxury-text font-bold text-base">{formatCurrency(karatRate)} × {(item.weight || 0).toFixed(3)}g = <span className="text-gold-400">{formatCurrency(metalAmount)}</span></p>
                            </div>
                            <div className="bg-luxury-black/40 rounded-lg p-4 border border-gold-400/30">
                              <p className="text-luxury-text-dim font-black uppercase text-xs mb-2 tracking-widest">Making + Final</p>
                              <p className="text-luxury-text font-bold text-base">
                                {mc > 0 ? (
                                  <>{formatCurrency(metalAmount)} + <span className="text-blue-400">{item.isMakingChargePercent ? `${mc}%` : formatCurrency(mc)}</span> = </>
                                ) : 'No making charge → '}
                                <span className="text-gold-400 font-black">{formatCurrency(item.total || 0)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <Input
                          label="Product Name"
                          placeholder="e.g. Royal Heritage Necklace"
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          label="SKU (Optional)"
                          placeholder="Leave blank to auto-generate"
                          value={item.sku || ''}
                          onChange={(e) => updateItem(index, { sku: e.target.value })}
                        />
                      </div>
                      <div className="col-span-4 space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Category</label>
                        <select
                          className="w-full h-11 bg-luxury-surface border border-luxury-border-dim rounded-xl px-3 text-xs text-luxury-text outline-none focus:border-gold-400"
                          value={item.category || ''}
                          onChange={(e) => updateItem(index, { category: e.target.value })}
                        >
                          <option value="Ring">Ring</option>
                          <option value="Necklace">Necklace</option>
                          <option value="Bangle">Bangle</option>
                          <option value="Earrings">Earrings</option>
                          <option value="Pendant">Pendant</option>
                          <option value="Bracelet">Bracelet</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-[repeat(13,_minmax(0,_1fr))] gap-3 items-end">
                      <div className="col-span-3 space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Metal & Purity</label>
                        <div className="flex gap-1">
                          <select
                            className="w-1/2 h-11 bg-luxury-surface border border-luxury-border-dim rounded-lg px-2 text-[10px] font-black uppercase text-luxury-text outline-none focus:border-gold-400"
                            value={item.metalType}
                            onChange={(e) => updateItem(index, { metalType: e.target.value as any })}
                          >
                            <option value="Gold">Gold</option>
                            <option value="Silver">Silver</option>
                            <option value="Platinum">Platinum</option>
                          </select>
                          <select
                            className="w-1/2 h-11 bg-luxury-surface border border-luxury-border-dim rounded-lg px-2 text-[10px] font-black uppercase text-luxury-text outline-none focus:border-gold-400"
                            value={item.purity}
                            onChange={(e) => updateItem(index, { purity: e.target.value as any })}
                          >
                            {item.metalType === 'Gold' ? (
                              <>
                                <option value="24K">24K</option>
                                <option value="22K">22K</option>
                                <option value="18K">18K</option>
                                <option value="14K">14K</option>
                              </>
                            ) : (
                              <>
                                <option value="999">999</option>
                                <option value="925">925</option>
                                <option value="916">916</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Weight (g)"
                          type="number"
                          step="0.001"
                          value={item.weight || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,4}$/.test(val)) {
                              updateItem(index, { weight: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Rate/g"
                          type="number"
                          step="0.001"
                          value={item.rate || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,3}$/.test(val)) {
                              updateItem(index, { rate: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label={
                            <div className="flex justify-between items-center w-full">
                              <span>Making</span>
                              <div className="flex gap-1 bg-luxury-black/50 p-0.5 rounded-[4px] border border-luxury-border">
                                <button type="button" onClick={() => updateItem(index, { isMakingChargePercent: true })} className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-black leading-none", item.isMakingChargePercent ? "bg-gold-400 text-luxury-black" : "text-luxury-text-dim hover:text-luxury-text")}>%</button>
                                <button type="button" onClick={() => updateItem(index, { isMakingChargePercent: false })} className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-black leading-none", !item.isMakingChargePercent ? "bg-gold-400 text-luxury-black" : "text-luxury-text-dim hover:text-luxury-text")}>Amt</button>
                              </div>
                            </div>
                          }
                          type="number"
                          step="0.01"
                          value={item.makingCharge || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(val)) {
                              updateItem(index, { makingCharge: val === '' ? 0 : parseFloat(val) });
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Qty"
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, { quantity: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div className="col-span-2 text-right pb-3">
                        <p className="text-[8px] uppercase font-black text-luxury-text-dim mb-1">Total</p>
                        <p className="text-sm font-black text-gold-400">{formatCurrency(item.total || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 pt-4">
          <div className="col-span-8">
            <textarea
              className="w-full h-full bg-luxury-black border border-luxury-border rounded-2xl p-4 text-xs text-luxury-text-dim outline-none focus:border-gold-400"
              placeholder="Additional instructions for the supplier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="col-span-4 p-6 bg-gold-400/5 rounded-2xl border border-gold-400/20 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-luxury-text-dim uppercase font-black tracking-widest">Subtotal</span>
              <span className="text-luxury-text font-bold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="text-luxury-text-dim uppercase font-black tracking-widest flex items-center gap-2">
                Tax (3%)
                <button
                  type="button"
                  onClick={() => setApplyTax(!applyTax)}
                  className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    applyTax ? "bg-gold-400" : "bg-luxury-border"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                    applyTax ? "transform translate-x-4" : ""
                  )} />
                </button>
              </span>
              <span className="text-luxury-text font-bold">{formatCurrency(applyTax ? totals.subtotal * 0.03 : 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gold-400/20">
              <span className="text-[10px] uppercase font-black tracking-widest text-gold-400">Grand Total</span>
              <span className="text-xl font-serif font-black text-gold-400">{formatCurrency(totals.subtotal * (applyTax ? 1.03 : 1))}</span>
            </div>

            <div className="pt-2">
              <label className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim block mb-1">Paid Amount (Partial/Advance)</label>
              <input
                type="number"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full h-10 bg-gold-400/10 border border-gold-400/30 rounded-xl px-4 text-xs font-bold text-luxury-text outline-none focus:border-gold-400 transition-all"
                placeholder="Enter amount paid..."
              />
            </div>

            {amountPaid > 0 && (
              <div className="flex justify-between text-[10px] pt-1">
                <span className="text-luxury-text-dim uppercase font-black">Balance Due</span>
                <span className="text-red-400 font-bold">{formatCurrency((totals.subtotal * (applyTax ? 1.03 : 1)) - amountPaid)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" className="flex-1 py-4 border-luxury-border" onClick={onClose}>Discard</Button>
          <Button type="submit" variant="gold" className="flex-1 py-4 uppercase font-black tracking-widest" disabled={!supplierId || items.length === 0}>
            {po ? "Update Purchase Order" : "Issue Purchase Order"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
