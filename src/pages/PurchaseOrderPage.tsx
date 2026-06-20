import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Truck,
  Calendar,
  ArrowDownLeft,
  Eye,
  Download,
  Edit
} from 'lucide-react';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { useSupplierStore } from '../store/supplierStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import { PurchaseOrderModal } from '../components/pos/PurchaseOrderModal';
import { generatePurchaseBill } from '../utils/purchaseBillGenerator';
import { useSettingsStore } from '../store/settingsStore';
import type { PurchaseOrder } from '../types';
import { SuppliersPage } from './SuppliersPage';

/** Convert purity like "18K" -> 18 */
export const purityToKarat = (purity: string): number => {
  const match = purity?.match(/(\d+)K/i);
  return match ? parseInt(match[1]) : 24;
};

/** Rebuild karat calc for display in detail view */
export const getWholesaleCalc = (rate: number, purity: string, wastage?: number) => {
  const karat = purityToKarat(purity);
  const karatInPercentage = karat / 24;
  const wastagePct = wastage || 0;
  const karatRate = rate * (karatInPercentage + wastagePct / 100);
  return { karat, karatInPercentage, karatRate, wastagePct };
};


export const PurchaseOrderPage = () => {
  const { purchaseOrders, receivePO, addPO, updatePO } = usePurchaseOrderStore();
  const { suppliers } = useSupplierStore();
  const { settings } = useSettingsStore();
  const [subTab, setSubTab] = useState<'orders' | 'suppliers'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  const selectedPO = useMemo(() => {
    if (!selectedPOId) return null;
    return purchaseOrders.find(p => p.id === selectedPOId) || null;
  }, [selectedPOId, purchaseOrders]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' ? true : 
                             filterStatus === 'Unpaid' ? (po.amountPaid || 0) === 0 :
                             filterStatus === 'Partial' ? ((po.amountPaid || 0) > 0 && (po.amountPaid || 0) < (po.grandTotal || 0)) :
                             po.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchaseOrders, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const active = purchaseOrders.filter(p => p.status !== 'Received' && p.status !== 'Cancelled');
    const totalOut = active.reduce((sum, p) => sum + p.grandTotal, 0);
    return {
      activeCount: active.length,
      totalOutflow: totalOut
    };
  }, [purchaseOrders]);

  const columns = [
    {
      header: 'Purchase ID',
      accessor: (row: PurchaseOrder) => (
        <div className="flex flex-col">
          <span className="font-bold text-luxury-text uppercase tracking-tight leading-none mb-1">{row.poNumber}</span>
          <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{new Date(row.orderDate).toLocaleDateString()}</p>
        </div>
      )
    },
    {
      header: 'Supplier',
      accessor: (row: PurchaseOrder) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-luxury-surface border border-luxury-border rounded-lg flex items-center justify-center text-gold-400 font-bold text-xs">
            {row.supplierName[0].toUpperCase()}
          </div>
          <span className="text-sm font-bold text-luxury-text">{row.supplierName}</span>
        </div>
      )
    },
    {
      header: 'Amount',
      accessor: (row: PurchaseOrder) => (
        <span className="text-sm font-black font-mono text-luxury-text">{formatCurrency(row.grandTotal)}</span>
      )
    },
    {
      header: 'Expected By',
      accessor: (row: PurchaseOrder) => (
        <div className="flex items-center gap-2 text-luxury-text-dim">
          <Calendar size={12} className="text-gold-400" />
          <span className="text-[10px] font-bold uppercase">{new Date(row.expectedDate).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      header: 'Fulfillment',
      accessor: (row: PurchaseOrder) => (
        <Badge 
          variant={
            row.status === 'Received' ? 'success' : 
            row.status === 'Cancelled' ? 'error' : 
            row.status === 'Ordered' ? 'info' : 'warning'
          }
          className="text-[10px] uppercase font-black tracking-widest px-3 py-1"
        >
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Payment',
      accessor: (row: PurchaseOrder) => {
        const paid = row.amountPaid || 0;
        const total = row.grandTotal || 0;
        const isPaid = paid >= total && total > 0;
        const isPartial = paid > 0 && paid < total;
        const outstanding = total - paid;
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge 
              variant={isPaid ? 'success' : isPartial ? 'warning' : 'error'}
              className="text-[10px] uppercase font-black tracking-widest px-3 py-1"
            >
              {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
            </Badge>
            {!isPaid && (
              <span className="text-[9px] text-red-500 font-bold font-mono">
                Due: {formatCurrency(outstanding)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Operations',
      accessor: (row: PurchaseOrder) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPOId(row.id);
            }}
            className="p-2 bg-luxury-surface border border-luxury-border-dim text-luxury-text-dim hover:text-gold-400 hover:border-gold-400/40 rounded-xl transition-all"
            title="View Purchase Order"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const supplier = suppliers.find(s => s.id === row.supplierId) || null;
              generatePurchaseBill(row, settings, supplier);
            }}
            className="p-2 bg-luxury-surface border border-luxury-border-dim text-luxury-text-dim hover:text-gold-400 hover:border-gold-400/40 rounded-xl transition-all"
            title="Download Purchase Order"
          >
            <Download size={16} />
          </button>
          {row.status !== 'Received' && row.status !== 'Cancelled' && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingPO(row);
              }}
              className="p-2 bg-luxury-surface border border-luxury-border-dim text-luxury-text-dim hover:text-gold-400 hover:border-gold-400/40 rounded-xl transition-all"
              title="Edit Purchase Order"
            >
              <Edit size={16} />
            </button>
          )}
          {row.status !== 'Received' && row.status !== 'Cancelled' && (
            <Button 
              variant="gold" 
              size="sm" 
              className="h-9 px-4 text-[9px] font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 border-none text-white"
              onClick={(e) => {
                e.stopPropagation();
                receivePO(row.id);
              }}
            >
              <Truck size={12} className="mr-2" /> Mark Received
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Sub-tab selection for PO vs Suppliers */}
      <div className="flex bg-luxury-black/40 p-1.5 rounded-xl border border-luxury-border-dim w-fit">
        <button
          onClick={() => setSubTab('orders')}
          className={cn(
            'px-5 py-2 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all',
            subTab === 'orders' ? 'bg-gold-400 text-luxury-black font-black' : 'text-luxury-text-muted hover:text-luxury-text'
          )}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setSubTab('suppliers')}
          className={cn(
            'px-5 py-2 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all',
            subTab === 'suppliers' ? 'bg-gold-400 text-luxury-black font-black' : 'text-luxury-text-muted hover:text-luxury-text'
          )}
        >
          Suppliers
        </button>
      </div>

      {subTab === 'suppliers' ? (
        <SuppliersPage />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
                <Truck size={48} />
              </div>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Ongoing Purchases</p>
              <p className="text-3xl font-serif font-black text-luxury-text">{stats.activeCount}</p>
            </div>

            <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
                <ArrowDownLeft size={48} />
              </div>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Committed Outflow</p>
              <p className="text-3xl font-serif font-black text-red-500">{formatCurrency(stats.totalOutflow)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search by PO Number or Supplier Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 bg-luxury-charcoal border-2 border-luxury-border-dim rounded-2xl pl-12 pr-6 text-sm focus:border-gold-400 outline-none transition-all text-luxury-text"
              />
            </div>
            <Button variant="gold" size="lg" className="h-14 px-8 font-bold text-[11px] tracking-widest uppercase shadow-lg shadow-gold-400/20 shrink-0" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} className="mr-3" /> Create New PO
            </Button>
            <div className="flex gap-2">
              {['all', 'Ordered', 'Partial', 'Received', 'Unpaid'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest border transition-all",
                    filterStatus === s ? "bg-gold-400 border-gold-400 text-luxury-black" : "bg-luxury-charcoal border-luxury-border text-luxury-text-dim hover:border-gold-400/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredPOs}
            onRowClick={(row) => setSelectedPOId(row.id)}
          />

          <PurchaseOrderModal 
            isOpen={isModalOpen || !!editingPO}
            onClose={() => {
              setIsModalOpen(false);
              setEditingPO(null);
            }}
            po={editingPO}
            onSave={async (data) => {
              if (editingPO) {
                await updatePO(editingPO.id, data);
              } else {
                await addPO(data);
              }
              setIsModalOpen(false);
              setEditingPO(null);
            }}
          />

          <PODetailModal
            po={selectedPO}
            isOpen={!!selectedPOId}
            onClose={() => setSelectedPOId(null)}
            onEdit={selectedPO ? () => {
              setEditingPO(selectedPO);
              setSelectedPOId(null);
            } : undefined}
          />
        </>
      )}
    </div>
  );
};

export const PODetailModal = ({ 
  po, 
  isOpen, 
  onClose,
  onEdit
}: { 
  po: PurchaseOrder | null; 
  isOpen: boolean; 
  onClose: () => void;
  onEdit?: () => void;
}) => {
  if (!po) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Purchase Order: ${po.poNumber}`} size="2xl">
      <div className="space-y-8 animate-fade-in p-2">
        {/* Header Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[10px] uppercase font-black text-luxury-text-dim mb-1 tracking-widest">Supplier</p>
            <p className="text-sm font-bold text-luxury-text">{po.supplierName}</p>
          </div>
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[10px] uppercase font-black text-luxury-text-dim mb-1 tracking-widest">Expected Date</p>
            <p className="text-sm font-bold text-luxury-text">{new Date(po.expectedDate).toLocaleDateString()}</p>
          </div>
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[10px] uppercase font-black text-luxury-text-dim mb-1 tracking-widest">Total Valuation</p>
            <p className="text-lg font-serif font-black text-gold-400">{formatCurrency(po.grandTotal)}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-luxury-surface rounded-2xl border border-luxury-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-luxury-black border-b border-luxury-border">
                <th className="px-4 py-3 text-[10px] uppercase font-black text-gold-400 tracking-widest">#</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black text-gold-400 tracking-widest">Description</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black text-gold-400 tracking-widest text-right">Weight</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black text-gold-400 tracking-widest text-right">Qty</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black text-gold-400 tracking-widest text-right">24K Rate / Karat Rate</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black text-gold-400 tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, index) => {
                const isWholesale = item.stockType === 'Wholesale';
                const calc = isWholesale ? getWholesaleCalc(item.rate, item.purity, item.wastage) : null;
                return (
                  <>
                    <tr key={index} className="border-b border-luxury-border-dim hover:bg-gold-400/5 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-luxury-text-dim">{index + 1}</td>
                      <td className="px-4 py-5">
                        <p className="text-base font-bold text-luxury-text">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-md font-black uppercase tracking-widest border",
                            item.stockType === 'Wholesale'
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : item.stockType === 'Raw' 
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          )}>
                            {item.stockType || 'Fine'}
                          </span>
                          <span className="text-xs uppercase font-black text-gold-400/60">{item.metalType}</span>
                          <span className="text-xs uppercase font-black text-luxury-text-muted">{item.purity}</span>
                          {item.sku && (
                             <span className="text-xs uppercase font-mono tracking-widest text-luxury-text-dim px-1.5 py-0.5 bg-luxury-black rounded-sm border border-luxury-border">SKU: {item.sku}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-luxury-text text-right">{item.weight.toFixed(3)}g</td>
                      <td className="px-4 py-4 text-sm font-bold text-luxury-text text-right">{isWholesale ? '-' : item.quantity}</td>
                      <td className="px-4 py-4 text-sm text-right">
                        {isWholesale && calc ? (
                          <div>
                            <p className="text-xs text-luxury-text-dim">24K: {formatCurrency(item.rate)}</p>
                            <p className="font-bold text-luxury-text text-sm">{formatCurrency(calc.karatRate)}<span className="text-xs text-luxury-text-dim ml-1">/g ({item.purity})</span></p>
                          </div>
                        ) : (
                          <span className="font-bold text-luxury-text text-sm">{formatCurrency(item.rate)}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-base font-black text-gold-400 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                    {isWholesale && calc && (
                      <tr key={`${index}-calc`} className="bg-gold-400/5 border-b border-luxury-border-dim">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-4 text-sm text-luxury-text-dim flex-wrap">
                            <span className="font-black text-gold-400 uppercase tracking-widest text-sm">Calc:</span>
                            <span><span className="text-luxury-text-dim">{calc.karat}K ÷ 24 =</span> <span className="text-luxury-text font-bold">{(calc.karatInPercentage * 100).toFixed(2)}%</span></span>
                            <span className="text-luxury-text-dim">+</span>
                            <span><span className="text-luxury-text-dim">Wastage</span> <span className="text-luxury-text font-bold">{calc.wastagePct}%</span></span>
                            <span className="text-luxury-text-dim">=</span>
                            <span><span className="text-luxury-text-dim">Effective</span> <span className="text-luxury-text font-bold">{((calc.karatInPercentage + calc.wastagePct / 100) * 100).toFixed(2)}%</span></span>
                            <span className="text-luxury-text-dim">→</span>
                            <span><span className="text-luxury-text-dim">{formatCurrency(item.rate)} × {((calc.karatInPercentage + calc.wastagePct / 100) * 100).toFixed(2)}% =</span> <span className="text-gold-400 font-bold">{formatCurrency(calc.karatRate)}/g</span></span>
                            <span className="text-luxury-text-dim">→</span>
                            <span><span className="text-gold-400 font-bold">{formatCurrency(calc.karatRate)}</span> <span className="text-luxury-text-dim">× {item.weight.toFixed(3)}g =</span> <span className="text-gold-400 font-black text-base">{formatCurrency(item.total)}</span></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-end px-4 pt-4 border-t border-luxury-border-dim">
           <div className="space-y-4">
             <Badge variant={po.status === 'Received' ? 'success' : 'warning'} className="uppercase tracking-widest text-[10px] font-black px-4 py-2 block w-fit">
                Order Status: {po.status}
             </Badge>
             <div className="flex gap-8">
               <div>
                 <p className="text-[8px] uppercase font-black text-luxury-text-dim mb-1">Amount Paid</p>
                 <p className="text-sm font-bold text-green-400">{formatCurrency(po.amountPaid || 0)}</p>
               </div>
               <div>
                 <p className="text-[8px] uppercase font-black text-luxury-text-dim mb-1">Balance Due</p>
                 <p className="text-sm font-bold text-red-400">{formatCurrency(po.grandTotal - (po.amountPaid || 0))}</p>
               </div>
             </div>
           </div>
           
           {(po.grandTotal - (po.amountPaid || 0)) > 0 && (
              <div className="flex items-center gap-3 bg-luxury-black p-3 rounded-2xl border border-gold-400/20">
                <div className="space-y-1">
                  <p className="text-[8px] uppercase font-black text-luxury-text-dim tracking-widest">New Payment</p>
                  <input 
                    type="number"
                    id={`pay-${po.id}`}
                    placeholder="Enter amount..."
                    className="w-28 h-8 bg-luxury-surface border border-luxury-border rounded-lg px-3 text-xs font-bold text-luxury-text outline-none focus:border-gold-400"
                  />
                </div>
                <Button 
                  size="sm" 
                  variant="gold" 
                  className="h-8 px-4 text-[9px] font-black uppercase tracking-widest"
                  onClick={async () => {
                    const input = document.getElementById(`pay-${po.id}`) as HTMLInputElement;
                    const amount = parseFloat(input.value);
                    if (amount > 0) {
                      const { recordPayment } = usePurchaseOrderStore.getState();
                      await recordPayment(po.id, amount);
                      input.value = '';
                    }
                  }}
                >
                  Pay Balance
                </Button>
              </div>
           )}

           <div className="text-right">
              <p className="text-[10px] uppercase font-black text-luxury-text-dim">Grand Total Amount</p>
              <p className="text-3xl font-serif font-black text-luxury-text">{formatCurrency(po.grandTotal)}</p>
           </div>
        </div>

        <div className="flex justify-end pt-4 gap-4">
           {po.status !== 'Received' && po.status !== 'Cancelled' && onEdit && (
             <Button variant="gold" className="px-8 uppercase font-black tracking-widest text-[10px]" onClick={onEdit}>
                Edit PO
             </Button>
           )}
           <Button variant="outline" className="px-8 border-luxury-border uppercase font-black tracking-widest text-[10px]" onClick={onClose}>
              Close Preview
           </Button>
        </div>
      </div>
    </Modal>
  );
};
