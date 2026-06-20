import { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Phone,
  Mail,
  TrendingUp,
  Award,
  Wallet,
  Briefcase,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import { useSupplierStore } from '../store/supplierStore';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import { PODetailModal } from './PurchaseOrderPage';
import type { Supplier, PurchaseOrder } from '../types';

export const SuppliersPage = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
  const { purchaseOrders } = usePurchaseOrderStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierForPortfolio, setSelectedSupplierForPortfolio] = useState<Supplier | null>(null);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const stats = useMemo(() => {
    let totalBalance = 0;
    let totalPurchases = 0;

    suppliers.forEach(s => {
      const sPOs = purchaseOrders.filter(po => po.supplierId === s.id && po.status !== 'Cancelled');
      const outstanding = sPOs.reduce((sum, po) => sum + (po.grandTotal - (po.amountPaid || 0)), 0);
      const purchases = sPOs.filter(po => po.status === 'Received').reduce((sum, po) => sum + po.grandTotal, 0);

      totalBalance += outstanding;
      totalPurchases += purchases;
    });

    return {
      count: suppliers.length,
      totalBalance,
      totalPurchases,
      avgPurchase: suppliers.length > 0 ? totalPurchases / suppliers.length : 0
    };
  }, [suppliers, purchaseOrders]);

  const columns = [
    {
      header: 'Supplier Name',
      accessor: (row: Supplier) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-luxury-surface border border-luxury-border rounded-2xl flex items-center justify-center text-gold-400 font-black text-xl shadow-lg transition-transform hover:scale-105">
            {row.name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-luxury-text uppercase tracking-tight leading-none mb-1">{row.name}</p>
            <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{row.contactPerson || 'No Contact'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Communication',
      accessor: (row: Supplier) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-luxury-text-muted">
            <Phone size={12} className="text-gold-400" />
            <span className="text-xs font-bold font-mono tracking-tighter">{row.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-luxury-text-dim">
            <Mail size={12} />
            <span className="text-[10px] truncate max-w-[150px] italic">{row.email || 'N/A'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Business Volume',
      accessor: (row: Supplier) => {
        const totalPurchases = purchaseOrders
          .filter(po => po.supplierId === row.id && po.status === 'Received')
          .reduce((sum, po) => sum + po.grandTotal, 0);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-luxury-text">{formatCurrency(totalPurchases)}</span>
            <span className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest">Lifetime Supply</span>
          </div>
        );
      }
    },
    {
      header: 'Outstanding Balance',
      accessor: (row: Supplier) => {
        const outstanding = purchaseOrders
          .filter(po => po.supplierId === row.id && po.status !== 'Cancelled')
          .reduce((sum, po) => sum + (po.grandTotal - (po.amountPaid || 0)), 0);
        return (
          <div className="flex flex-col">
            <span className={cn(
              "text-sm font-black font-mono",
              outstanding > 0 ? 'text-red-500' : 'text-green-500'
            )}>
              {formatCurrency(outstanding)}
            </span>
            <Badge variant={outstanding > 0 ? 'error' : 'success'} className="text-[8px] px-1 py-0 w-fit">
              {outstanding > 0 ? 'PAYMENT DUE' : 'SETTLED'}
            </Badge>
          </div>
        );
      }
    },
    {
      header: '',
      accessor: (row: Supplier) => (
        <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity pr-4">
          <button onClick={(e) => { e.stopPropagation(); setEditingSupplier(row); setIsModalOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all">
            <Edit2 size={16} />
          </button>
          <button 
            onClick={async (e) => { 
              e.stopPropagation(); 
              if (confirm(`Are you sure you want to delete supplier "${row.name}"? This action cannot be undone.`)) {
                await deleteSupplier(row.id);
              }
            }} 
            className="p-2 hover:bg-red-500/10 rounded-lg text-luxury-text hover:text-red-500 transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <Briefcase size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Vendor Network</p>
          <p className="text-3xl font-serif font-black text-luxury-text">{stats.count}</p>
        </div>

        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <Wallet size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Total Payable</p>
          <p className="text-3xl font-serif font-black text-red-500">{formatCurrency(stats.totalBalance)}</p>
        </div>

        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <TrendingUp size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Total Purchases</p>
          <p className="text-3xl font-serif font-black text-gold-400">{formatCurrency(stats.totalPurchases)}</p>
        </div>

        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <Award size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Avg Order Value</p>
          <p className="text-3xl font-serif font-black text-luxury-text-muted">{formatCurrency(stats.avgPurchase)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by Vendor Name, Contact Person or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 bg-luxury-charcoal border-2 border-luxury-border-dim rounded-3xl pl-12 pr-6 text-lg focus:border-gold-400 outline-none transition-all placeholder:text-luxury-text-dim text-luxury-text"
          />
        </div>
        <Button variant="gold" size="lg" className="h-16 px-8 font-bold text-[11px] tracking-widest uppercase shadow-lg shadow-gold-400/20" onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}>
          <UserPlus size={20} className="mr-3" /> Add Supplier
        </Button>
      </div>

      <Table
        columns={columns}
        data={filteredSuppliers}
        onRowClick={(row) => { setSelectedSupplierForPortfolio(row); setIsPortfolioOpen(true); }}
      />
      {isModalOpen && (
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          supplier={editingSupplier}
          onSave={async (data) => {
            if (editingSupplier) await updateSupplier(editingSupplier.id, data);
            else await addSupplier(data as Omit<Supplier, 'id' | 'createdAt' | 'totalPurchases' | 'outstandingBalance'>);
            setIsModalOpen(false);
          }}
        />
      )}
      {isPortfolioOpen && selectedSupplierForPortfolio && (
        <SupplierPortfolioModal
          isOpen={isPortfolioOpen}
          onClose={() => setIsPortfolioOpen(false)}
          supplier={selectedSupplierForPortfolio}
          purchaseOrders={purchaseOrders}
          onViewPO={(poId) => setSelectedPOId(poId)}
        />
      )}
      {selectedPOId && (
        <PODetailModal
          isOpen={!!selectedPOId}
          onClose={() => setSelectedPOId(null)}
          po={purchaseOrders.find(p => p.id === selectedPOId) || null}
        />
      )}
    </div>
  );
};

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSave: (data: Partial<Supplier>) => Promise<void>;
}

const SupplierModal = ({ isOpen, onClose, supplier, onSave }: SupplierModalProps) => {
  const [formData, setFormData] = useState<Partial<Supplier>>(supplier || {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    panNumber: '',
    notes: '',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Modify Supplier Details' : 'Onboard New Vendor'} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-6 space-y-10 bg-luxury-charcoal">
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Basic Info</h4>
            <Input
              label="Business Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-14 font-bold bg-luxury-black"
              required
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="h-12 bg-luxury-black"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-12 font-mono bg-luxury-black"
              required
            />
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Financial Data</h4>
            <Input
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              className="h-12 uppercase tracking-widest bg-luxury-black"
            />
            <Input
              label="PAN Number"
              value={formData.panNumber}
              onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
              className="h-12 uppercase tracking-widest bg-luxury-black"
            />
            <Input
              label="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-12 bg-luxury-black"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Address & Notes</h4>
          <textarea
            className="w-full h-24 bg-luxury-black border border-luxury-border rounded-2xl p-4 text-sm text-luxury-text focus:border-gold-400 outline-none"
            placeholder="Complete Office/Factory Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <textarea
            className="w-full h-20 bg-luxury-black border border-luxury-border rounded-2xl p-4 text-xs text-luxury-text-dim focus:border-gold-400 outline-none"
            placeholder="Internal notes about product quality, terms, etc."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-4 pt-6">
          <Button type="button" variant="outline" className="flex-1 py-4 border-luxury-border text-luxury-text-dim uppercase font-black tracking-widest" onClick={onClose}>Discard</Button>
          <Button type="submit" variant="gold" className="flex-1 py-4 uppercase font-black tracking-widest text-lg">Save Vendor Profile</Button>
        </div>
      </form>
    </Modal>
  );
};

interface SupplierPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  purchaseOrders: PurchaseOrder[];
  onViewPO: (poId: string) => void;
}

const SupplierPortfolioModal = ({ isOpen, onClose, supplier: initialSupplier, purchaseOrders, onViewPO }: SupplierPortfolioModalProps) => {
  const { suppliers } = useSupplierStore();
  const supplier = suppliers.find(s => s.id === initialSupplier.id) || initialSupplier;

  const [timePreset, setTimePreset] = useState<'today' | 'month' | 'overall' | 'custom'>('overall');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const supplierOrders = useMemo(() => {
    return purchaseOrders.filter(po => po.supplierId === supplier.id);
  }, [purchaseOrders, supplier.id]);

  const filteredOrders = useMemo(() => {
    return supplierOrders.filter(po => {
      const orderDate = new Date(po.orderDate);
      
      if (timePreset === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        const poDateStr = orderDate.toISOString().split('T')[0];
        if (poDateStr !== todayStr) return false;
      } else if (timePreset === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        if (orderDate < startOfMonth) return false;
      }

      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (orderDate < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (orderDate > to) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [supplierOrders, timePreset, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalPurchases = supplierOrders
      .filter(po => po.status === 'Received')
      .reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const outstanding = supplierOrders
      .filter(po => po.status !== 'Cancelled')
      .reduce((sum, po) => sum + (po.grandTotal - (po.amountPaid || 0)), 0);

    const avgOrder = filteredOrders.length > 0
      ? filteredOrders.reduce((sum, po) => sum + (po.grandTotal || 0), 0) / filteredOrders.length
      : 0;

    return {
      totalOrders: supplierOrders.length,
      filteredOrdersCount: filteredOrders.length,
      lifetimeSupply: totalPurchases,
      outstandingBalance: outstanding,
      avgOrderValue: avgOrder,
    };
  }, [supplierOrders, filteredOrders]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${supplier.name.toUpperCase()} • Vendor Portfolio`} size="xl">
      <div className="p-4 space-y-12">
        {/* Quick Stats Banner */}
        <div className="grid grid-cols-4 gap-6 animate-slide-up transition-colors">
          {[
            { label: 'Outstanding Balance', value: formatCurrency(stats.outstandingBalance), color: stats.outstandingBalance > 0 ? 'text-red-500' : 'text-green-500', icon: Wallet },
            { label: 'Lifetime Purchases', value: formatCurrency(stats.lifetimeSupply), icon: TrendingUp },
            { label: 'Orders Placed', value: `${stats.filteredOrdersCount} Orders`, color: 'text-gold-400', icon: Briefcase },
            { label: 'Avg Order Value', value: formatCurrency(stats.avgOrderValue), icon: Award }
          ].map((stat, i) => (
            <div key={i} className="p-6 bg-luxury-surface border border-luxury-border rounded-3xl group hover:bg-luxury-black/30 transition-colors relative h-full flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4 opacity-40 transition-colors">
                {stat.icon && <stat.icon size={14} />}
                <p className="text-[10px] uppercase font-bold tracking-wide text-luxury-text transition-colors">{stat.label}</p>
              </div>
              <div className="flex items-end justify-between transition-colors">
                <p className={cn('text-2xl font-serif font-black', stat.color || 'text-luxury-text')}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-12">
          {/* Main List Area */}
          <div className="col-span-12 lg:col-span-8 space-y-6 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-luxury-border-dim pb-4">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1 shrink-0">Order History Ledger</h4>
              
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-luxury-black rounded-xl p-1 border border-luxury-border-dim">
                  {([
                    { key: 'overall', label: 'Overall' },
                    { key: 'today', label: 'Today' },
                    { key: 'month', label: 'This Month' },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setTimePreset(tab.key);
                        setFromDate('');
                        setToDate('');
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all',
                        timePreset === tab.key
                          ? 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                          : 'text-luxury-text-dim hover:text-luxury-text'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-luxury-black/40 px-3 py-1.5 rounded-xl border border-luxury-border-dim">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] uppercase text-luxury-text-dim/60 font-black">From</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setTimePreset('custom');
                      }}
                      className="bg-transparent text-[10px] text-luxury-text outline-none font-bold font-mono focus:text-gold-400"
                    />
                  </div>
                  <div className="w-px h-3 bg-luxury-border-dim" />
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] uppercase text-luxury-text-dim/60 font-black">To</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setTimePreset('custom');
                      }}
                      className="bg-transparent text-[10px] text-luxury-text outline-none font-bold font-mono focus:text-gold-400"
                    />
                  </div>
                  {(fromDate || toDate) && (
                    <button
                      onClick={() => {
                        setFromDate('');
                        setToDate('');
                        setTimePreset('overall');
                      }}
                      className="text-red-400 hover:text-white transition-colors pl-1"
                      title="Clear custom range"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[480px] overflow-y-auto scrollbar-gold pr-2 transition-colors">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((po) => {
                  const paid = po.amountPaid || 0;
                  const total = po.grandTotal || 0;
                  const isPaid = paid >= total && total > 0;
                  const isPartial = paid > 0 && paid < total;

                  return (
                    <div key={po.id} className="p-5 bg-luxury-black rounded-2xl border border-luxury-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-gold-400/20 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-luxury-surface rounded-xl text-gold-400 font-mono text-xs font-bold border border-luxury-border-dim">
                          {po.poNumber}
                        </div>
                        <div>
                          <p className="font-bold text-luxury-text text-sm uppercase tracking-wide leading-none mb-1">
                            {new Date(po.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={po.status === 'Received' ? 'success' : po.status === 'Cancelled' ? 'error' : 'info'} className="text-[8px] uppercase">
                              {po.status}
                            </Badge>
                            <Badge variant={isPaid ? 'success' : isPartial ? 'warning' : 'error'} className="text-[8px] uppercase">
                              {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-[8px] uppercase font-black text-luxury-text-dim mb-0.5">PO Value</p>
                          <p className="text-sm font-bold text-luxury-text font-mono">{formatCurrency(total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] uppercase font-black text-luxury-text-dim mb-0.5">Outstanding</p>
                          <p className={cn(
                            "text-sm font-bold font-mono",
                            (total - paid) > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {formatCurrency(total - paid)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewPO(po.id)}
                            className="p-2 bg-luxury-surface border border-luxury-border-dim text-luxury-text-dim hover:text-gold-400 hover:border-gold-400/30 rounded-xl transition-all"
                            title="View PO Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center bg-luxury-surface rounded-3xl border border-dashed border-luxury-border transition-colors">
                  <p className="text-sm text-luxury-text-dim uppercase font-black tracking-widest">
                    No order history records found for this period.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Details sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-8 transition-colors">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Vendor Intelligence</h4>
            <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-6 transition-colors">
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] uppercase font-black text-luxury-text-dim block mb-1">GSTIN</span>
                  <span className="text-xs font-mono font-bold text-luxury-text">{supplier.gstin || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-luxury-text-dim block mb-1">PAN Index</span>
                  <span className="text-xs font-mono font-bold text-luxury-text">{supplier.panNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-luxury-text-dim block mb-1">Address</span>
                  <span className="text-xs font-bold text-luxury-text leading-relaxed block">{supplier.address || 'No registered address'}</span>
                </div>
              </div>
              
              <div className="h-px bg-luxury-border-dim" />

              <div className="space-y-2 italic">
                <span className="text-[9px] uppercase font-black text-luxury-text-dim block not-italic mb-1">Internal Remarks</span>
                <p className="text-luxury-text-muted text-xs leading-relaxed">
                  {supplier.notes || 'No custom notes logged for this supplier.'}
                </p>
              </div>

              <div className="pt-6 border-t border-luxury-border-dim space-y-4 transition-colors">
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                  <span>Vendor Since</span>
                  <span className="text-luxury-text transition-colors">{new Date(supplier.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-8 transition-colors">
          <Button variant="outline" className="h-14 px-12 border-luxury-border uppercase font-black tracking-widest" onClick={onClose}>Close Portfolio</Button>
        </div>
      </div>
    </Modal>
  );
};
