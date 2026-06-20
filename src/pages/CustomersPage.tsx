import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Phone,
  Mail,
  TrendingUp,
  Award,
  Wallet,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Package,
  Clock,
  ChevronDown,
  ChevronUp,
  Gem,
  Download,
  History,
  Scale,
  Eye
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCustomerStore } from '../store/customerStore';
import { useGirviStore } from '../store/girviStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useSalesStore } from '../store/salesStore';
import { useSettingsStore } from '../store/settingsStore';
import { formatCurrency } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import { generateInvoice } from '../utils/invoiceGenerator';
import { calculateGirviInterest } from '../utils/calculations';
import { GirviPaymentModal } from '../components/girvi/GirviPaymentModal';
import { GirviDetailModal } from '../components/girvi/GirviDetailModal';
import type { Customer, Sale, PaymentEntry, Girvi } from '../types';

/** Amount still owed on a specific sale */
const getBillOutstanding = (sale: Sale): number => {
  return Math.max(0, sale.grandTotal - (sale.amountPaid ?? sale.grandTotal));
};

export const CustomersPage = () => {
  const { customers, addCustomer, updateCustomer } = useCustomerStore();
  const { sales } = useSalesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const columns = [
    {
      header: 'Elegance Member',
      accessor: (row: Customer) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-400 rounded-2xl flex items-center justify-center text-luxury-black font-black text-xl shadow-lg shadow-gold-400/20 transition-transform hover:scale-105">
            {row.name[0]}
          </div>
          <div>
            <p className="font-bold text-luxury-text uppercase tracking-tight leading-none mb-1 transition-colors">{row.name}</p>
            <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest transition-colors">Since {new Date(row.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Communication',
      accessor: (row: Customer) => (
        <div className="flex flex-col gap-1.5 transition-colors">
          <div className="flex items-center gap-2 text-luxury-text-muted">
            <Phone size={12} className="text-gold-400" />
            <span className="text-xs font-bold font-mono tracking-tighter">{row.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-luxury-text-dim">
            <Mail size={12} />
            <span className="text-[10px] truncate max-w-[150px] italic">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Loyalty Portfolio',
      accessor: (row: Customer) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-gold-400" />
            <span className="text-sm font-black text-gold-400 font-mono tracking-tight">{row.loyaltyPoints} PTS</span>
          </div>
          <Badge variant="gold" className="text-[8px] px-1 py-0 pointer-events-none uppercase tracking-widest">Elite Member</Badge>
        </div>
      )
    },
    {
      header: 'Spending History',
      accessor: (row: Customer) => (
        <div className="flex flex-col transition-colors">
          <span className="text-sm font-bold text-luxury-text">{formatCurrency(row.totalSpent)}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{row.totalPurchases} Trxn</span>
            {(row.outstandingBalance || 0) > 0 && (
              <Badge variant="error" className="text-[8px] px-1 py-0">OUST: {formatCurrency(row.outstandingBalance)}</Badge>
            )}
          </div>
        </div>
      )
    },
    {
      header: '',
      accessor: (row: Customer) => (
        <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity pr-4">
          <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(row); setIsPortfolioOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all flex items-center gap-2 transition-colors">
            <TrendingUp size={16} /> <span className="text-[10px] uppercase font-bold">Portfolio</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(row); setIsModalOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all transition-colors"><Edit2 size={16} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border transition-colors relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <Wallet size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Active Portfolio</p>
          <p className="text-3xl font-serif font-black text-luxury-text">{customers.length}</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp size={12} className="text-gold-400" />
            <span className="text-[9px] uppercase font-black tracking-widest text-gold-400/80">+12% Growth</span>
          </div>
        </div>

        {[
          { label: 'Elite Members', value: 8, color: 'text-gold-400', icon: Award },
          { label: 'Average Loyalty', value: '1,450 pts', color: 'text-luxury-text', icon: TrendingUp },
          { label: 'Customer Lifetime', value: '2.4 Yrs', color: 'text-luxury-text-muted', icon: Wallet }
        ].map((stat, i) => (
          <div key={i} className="card-luxury p-6 bg-luxury-charcoal border-luxury-border transition-colors relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
              <stat.icon size={48} />
            </div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">{stat.label}</p>
            <p className={cn('text-3xl font-serif font-black', stat.color)}>{stat.value}</p>
            <p className="text-[9px] uppercase font-black tracking-widest text-luxury-text-muted mt-2">Verified Protocol</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-8">
        <div className="flex-1 relative group transition-colors">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by Member Name or Secure Phone Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 bg-luxury-charcoal border-2 border-luxury-border-dim rounded-3xl pl-12 pr-6 text-lg focus:border-gold-400 outline-none transition-all placeholder:text-luxury-text-dim shadow-inner text-luxury-text"
          />
        </div>
        <Button variant="gold" size="lg" className="h-16 px-8 font-bold text-[11px] tracking-widest uppercase shadow-[0_10px_40px_rgba(201,168,76,0.3)] shrink-0" onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}>
          <UserPlus size={20} className="mr-3" /> Enroll New Member
        </Button>
      </div>

      <div className="col-span-12">
        <Table
          columns={columns}
          data={filteredCustomers}
          onRowClick={(row) => { setSelectedCustomer(row); setIsPortfolioOpen(true); }}
        />
      </div>

      <CustomerPortfolioModal
        isOpen={isPortfolioOpen}
        onClose={() => setIsPortfolioOpen(false)}
        customer={selectedCustomer}
        sales={sales.filter(s => s.customerId === selectedCustomer?.id)}
      />

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
        onSave={async (data: Partial<Customer>) => {
          try {
            if (editingCustomer) await updateCustomer(editingCustomer.id, data);
            else await addCustomer(data as any);
            setIsModalOpen(false);
          } catch (error) {
            console.error('Failed to save customer:', error);
          }
        }}
      />
    </div>
  );
};


const CustomerPortfolioModal = ({ isOpen, onClose, customer: initialCustomer, sales }: { isOpen: boolean, onClose: () => void, customer: Customer | null, sales: Sale[] }) => {
  const [activeTab, setActiveTab] = useState<'Sales' | 'Girvi'>('Sales');
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [clearingSale, setClearingSale] = useState<Sale | null>(null);
  const [billFilter, setBillFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const { customers, updateCustomer } = useCustomerStore();
  const { girvis } = useGirviStore();
  const { addSale, updateSale } = useSalesStore();
  const { settings, incrementInvoiceCounter } = useSettingsStore();
  const [selectedGirvi, setSelectedGirvi] = useState<Girvi | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGirviForDetail, setSelectedGirviForDetail] = useState<Girvi | null>(null);

  const customer = customers.find(c => c.id === initialCustomer?.id) || initialCustomer;

  const customerGirvis = useMemo(() => {
    if (!customer) return [];
    return girvis.filter(g => {
      if (g.customerId && g.customerId.trim() !== '') {
        return g.customerId === customer.id;
      }
      return !!(customer.phone && customer.phone.trim() !== '' && g.customerPhone === customer.phone);
    });
  }, [girvis, customer]);

  const girviTotals = useMemo(() => {
    return customerGirvis.reduce((acc, g) => {
      if (g.status === 'Active') {
        const interestPaid = (g.payments || []).filter(p => p.type === 'Interest').reduce((s, p) => s + p.amount, 0);
        const interestDue = calculateGirviInterest(g.loanAmount, g.interestRate, g.loanDate, g.isCompoundInterest, interestPaid);
        acc.principal += g.loanAmount;
        acc.interest += interestDue;
      }
      return acc;
    }, { principal: 0, interest: 0 });
  }, [customerGirvis]);

  if (!customer) return null;

  /** Collect against total outstanding (old global collect) */
  const handleGlobalCollection = async (amount: number, method: string) => {
    if (!customer) return;
    const invoiceNumber = `PAY-${settings.invoiceCounter.toString().padStart(4, '0')}`;
    try {
      await updateCustomer(customer.id, {
        outstandingBalance: Math.max(0, (customer.outstandingBalance || 0) - amount),
        totalPaid: (customer.totalPaid || 0) + amount
      });
      const collectionSale: Sale = {
        id: uuidv4(),
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: [],
        subtotal: amount,
        discountTotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        taxTotal: 0,
        grandTotal: amount,
        amountPaid: amount,
        change: 0,
        paymentMethod: method as any,
        paymentDetails: { cash: amount },
        goldRate: settings.goldRate || 0,
        silverRate: settings.silverRate || 0,
        platinumRate: settings.platinumRate || 0,
        status: 'Completed',
        notes: `Balance collection for ${customer.name}`,
        createdAt: new Date().toISOString(),
        createdBy: settings.ownerName
      };
      await addSale(collectionSale);
      await incrementInvoiceCounter();
      setIsCollectOpen(false);
    } catch (error) {
      console.error('Collection failed:', error);
    }
  };

  /** Clear outstanding on a specific bill */
  const handleBillClear = async (sale: Sale, amount: number, method: string) => {
    if (!customer) return;
    const billOutstanding = getBillOutstanding(sale);
    const clearing = Math.min(amount, billOutstanding);
    const newAmountPaid = (sale.amountPaid ?? 0) + clearing;
    const newStatus: Sale['status'] = newAmountPaid >= sale.grandTotal ? 'Completed' : 'Partially Paid';
    // Build new payment history entry
    const newEntry: PaymentEntry = {
      date: new Date().toISOString(),
      amount: clearing,
      method,
      note: newStatus === 'Completed' ? 'Full balance cleared' : 'Partial payment'
    };
    const updatedHistory: PaymentEntry[] = [...(sale.paymentHistory || []), newEntry];
    try {
      await updateSale(sale.id, {
        amountPaid: newAmountPaid,
        status: newStatus,
        paymentMethod: method as Sale['paymentMethod'],
        paymentHistory: updatedHistory
      });
      await updateCustomer(customer.id, {
        outstandingBalance: Math.max(0, (customer.outstandingBalance || 0) - clearing),
        totalPaid: (customer.totalPaid || 0) + clearing
      });
      setClearingSale(null);
    } catch (error) {
      console.error('Bill clear failed:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${customer.name.toUpperCase()} • Client Portfolio`} size="xl">
      <div className="p-4 space-y-12">
        {/* Quick Stats Banner */}
        <div className="grid grid-cols-4 gap-6 animate-slide-up transition-colors">
          {activeTab === 'Sales' ? [
            { label: 'Spending Velocity', value: formatCurrency(customer.totalSpent), icon: TrendingUp },
            { label: 'Outstanding Dues', value: formatCurrency(customer.outstandingBalance || 0), color: (customer.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-green-500', icon: Wallet },
            { label: 'Loyalty Gallery', value: `${customer.loyaltyPoints} PTS`, color: 'text-gold-400', icon: Award },
            { label: 'Visit Depth', value: `${customer.totalPurchases} visits` }
          ].map((stat, i) => (
            <div key={i} className="p-6 bg-luxury-surface border border-luxury-border rounded-3xl group hover:bg-luxury-black/30 transition-colors relative h-full flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4 opacity-40 transition-colors">
                {stat.icon && <stat.icon size={14} />}
                <p className="text-[10px] uppercase font-bold tracking-wide text-luxury-text transition-colors">{stat.label}</p>
              </div>
              <div className="flex items-end justify-between transition-colors">
                <p className={cn('text-2xl font-serif font-black', stat.color || 'text-luxury-text')}>{stat.value}</p>
                {/* {stat.label === 'Outstanding Dues' && (customer.outstandingBalance || 0) > 0 && (
                  <button
                    onClick={() => setIsCollectOpen(true)}
                    className="px-3 py-1 bg-gold-400 text-luxury-black text-[10px] uppercase font-bold rounded-lg hover:bg-white transition-colors"
                  >
                    Collect All
                  </button>
                )} */}
              </div>
            </div>
          )) : [
            { label: 'Active Principal', value: formatCurrency(girviTotals.principal), color: 'text-gold-400', icon: Scale },
            { label: 'Accrued Interest', value: formatCurrency(girviTotals.interest), color: 'text-red-400', icon: Wallet },
            { label: 'Assets Pledged', value: `${customerGirvis.filter(g => g.status === 'Active').length} ITEMS`, icon: Package },
            { label: 'Investment Risk', value: 'Low Protocol', color: 'text-luxury-text-dim' }
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

        {/* Global balance collection modal */}
        <BalanceCollectionModal
          isOpen={isCollectOpen}
          onClose={() => setIsCollectOpen(false)}
          outstanding={customer.outstandingBalance || 0}
          onCollect={handleGlobalCollection}
        />

        {/* Per-bill clear modal */}
        {clearingSale && (
          <BillClearModal
            isOpen={!!clearingSale}
            onClose={() => setClearingSale(null)}
            sale={clearingSale}
            onClear={handleBillClear}
          />
        )}

        <div className="flex bg-luxury-black/60 p-1.5 rounded-2xl border border-luxury-border-dim w-fit">
          {[
            { id: 'Sales', label: 'Sales Ledger', icon: History },
            { id: 'Girvi', label: 'Girvi Archive', icon: Scale }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-3 px-8 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest',
                activeTab === tab.id ? 'bg-gold-400 text-luxury-black shadow-lg' : 'text-luxury-text-dim hover:text-luxury-text'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-12">
          {/* Main List Area */}
          <div className="col-span-12 lg:col-span-8 space-y-6 transition-colors">
            {activeTab === 'Sales' ? (
              <>
                {/* Header + filter tabs */}
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1 shrink-0">Bill History</h4>
                  <div className="flex items-center gap-1 bg-luxury-black rounded-xl p-1 border border-luxury-border-dim">
                    {([
                      { key: 'all', label: 'All', count: sales.length },
                      { key: 'pending', label: 'Pending', count: sales.filter(s => getBillOutstanding(s) > 0).length },
                      { key: 'completed', label: 'Completed', count: sales.filter(s => getBillOutstanding(s) === 0).length },
                    ] as const).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setBillFilter(tab.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all',
                          billFilter === tab.key
                            ? tab.key === 'pending'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : tab.key === 'completed'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                            : 'text-luxury-text-dim hover:text-luxury-text'
                        )}
                      >
                        {tab.label}
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[8px] font-black',
                          billFilter === tab.key
                            ? tab.key === 'pending' ? 'bg-red-500/30' : tab.key === 'completed' ? 'bg-green-500/30' : 'bg-gold-400/30'
                            : 'bg-luxury-surface'
                        )}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 max-h-[480px] overflow-y-auto scrollbar-gold pr-2 transition-colors">
                  {(() => {
                    const filtered = sales.filter(s =>
                      billFilter === 'all' ? true
                        : billFilter === 'pending' ? getBillOutstanding(s) > 0
                          : getBillOutstanding(s) === 0
                    );
                    return filtered.length > 0 ? (
                      filtered.map((sale, i) => (
                        <BillCard
                          key={i}
                          sale={sale}
                          customer={customer}
                          onClear={() => setClearingSale(sale)}
                        />
                      ))
                    ) : (
                      <div className="p-12 text-center bg-luxury-surface rounded-3xl border border-dashed border-luxury-border transition-colors">
                        <p className="text-sm text-luxury-text-dim uppercase font-black tracking-widest">
                          {billFilter === 'pending' ? 'No pending bills — all settled!' : billFilter === 'completed' ? 'No completed bills yet.' : 'No transaction records found in the vault.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-red-400 pl-4 py-1 shrink-0">Pawn History (Girvi)</h4>
                  <Badge variant="outline" className="text-[8px] uppercase tracking-[0.2em]">{customerGirvis.length} Assets Pledged</Badge>
                </div>
                <div className="space-y-4 max-h-[480px] overflow-y-auto scrollbar-gold pr-2 transition-colors">
                  {customerGirvis.length > 0 ? (
                    customerGirvis.map((girvi: Girvi) => (
                      <GirviCard
                        key={girvi.id}
                        girvi={girvi}
                        onRecordPayment={() => {
                          setSelectedGirvi(girvi);
                          setIsPaymentModalOpen(true);
                        }}
                        onViewDetail={() => {
                          setSelectedGirviForDetail(girvi);
                          setIsDetailOpen(true);
                        }}
                      />
                    ))
                  ) : (
                    <div className="p-12 text-center bg-luxury-surface rounded-3xl border border-dashed border-luxury-border">
                      <Scale className="mx-auto text-luxury-text-dim/20 mb-4" size={48} />
                      <p className="text-sm text-luxury-text-dim uppercase font-black tracking-widest">No Girvi records for this client.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notes sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-8 transition-colors">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Intelligence & Notes</h4>
            <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-6 italic transition-colors">
              <p className="text-luxury-text-muted text-sm leading-relaxed transition-colors">
                {customer.notes || 'No professional annotations available for this member. Maintaining neutral protocol.'}
              </p>
              <div className="pt-6 border-t border-luxury-border-dim space-y-4 transition-colors">
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                  <span>Boutique Tier</span>
                  <span className="text-gold-400">Elite Acquisition</span>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                  <span>Auth. Member Since</span>
                  <span className="text-luxury-text transition-colors">{new Date(customer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-8 transition-colors">
          <Button variant="outline" className="h-14 px-12 border-luxury-border uppercase font-black tracking-widest" onClick={onClose}>Close Portfolio</Button>
        </div>
      </div>

      {selectedGirvi && (
        <GirviPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          girvi={selectedGirvi}
        />
      )}

      <GirviDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        girvi={selectedGirviForDetail}
      />
    </Modal>
  );
};

const GirviCard = ({ girvi, onRecordPayment, onViewDetail }: { girvi: Girvi; onRecordPayment: () => void; onViewDetail: () => void }) => {
  const interestPaid = (girvi.payments || []).filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
  const totalInterestDue = girvi.status === 'Closed' ? 0 : calculateGirviInterest(girvi.loanAmount, girvi.interestRate, girvi.loanDate, girvi.isCompoundInterest, interestPaid);

  return (
    <div className={cn(
      "p-6 rounded-[32px] border transition-all group",
      girvi.status === 'Active' ? 'bg-luxury-black border-gold-400/20 hover:border-gold-400/40' : 'bg-luxury-surface border-luxury-border-dim opacity-60'
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-luxury-surface rounded-2xl flex items-center justify-center text-gold-400 border border-gold-400/10 shadow-xl group-hover:scale-110 transition-transform">
            <Scale size={24} />
          </div>
          <div>
            <p className="font-serif font-black text-lg text-luxury-text uppercase tracking-tight leading-none mb-1">Asset Ledger #{girvi.id.slice(0, 8).toUpperCase()}</p>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest">{new Date(girvi.loanDate).toLocaleDateString()}</p>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <p className="text-[10px] text-gold-400/80 uppercase font-black tracking-widest">{girvi.items.length} Ornaments Pledged</p>
            </div>
          </div>
        </div>
        <Badge variant={girvi.status === 'Active' ? 'warning' : girvi.status === 'Closed' ? 'success' : 'error'} className="text-[9px] uppercase font-black tracking-widest px-3 py-1">
          {girvi.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-1.5 p-4 bg-luxury-surface rounded-2xl border border-luxury-border-dim">
          <p className="text-[9px] uppercase font-black text-luxury-text-dim tracking-[0.2em]">Principal Debt</p>
          <p className="text-xl font-black text-luxury-text font-mono tracking-tighter">{formatCurrency(girvi.loanAmount)}</p>
        </div>
        <div className="space-y-1.5 p-4 bg-red-400/5 rounded-2xl border border-red-400/10">
          <p className="text-[9px] uppercase font-black text-red-400/60 tracking-[0.2em]">Accrued Interest</p>
          <p className="text-xl font-black text-red-400 font-mono tracking-tighter">{formatCurrency(totalInterestDue)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-luxury-border-dim">
        <div className="flex items-center gap-3">
          {
            girvi.status !== 'Closed' &&
            <button
              onClick={onRecordPayment}
              className="flex items-center gap-2.5 px-6 py-3 bg-gold-400 text-luxury-black rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-white transition-all shadow-lg shadow-gold-400/10"
            >
              <CreditCard size={14} /> Record Transaction
            </button>
          }

          <button
            onClick={onViewDetail}
            className="p-3 bg-luxury-surface border border-luxury-border-dim text-luxury-text-dim hover:text-gold-400 hover:border-gold-400/40 rounded-xl transition-all"
            title="View Asset Specification"
          >
            <Eye size={16} />
          </button>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-luxury-text-dim uppercase font-black tracking-widest mb-1">Interest Protocol</p>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold text-luxury-text">{girvi.interestRate}% monthly</span>
            {girvi.isCompoundInterest && <Badge variant="gold" className="text-[7px] py-0 px-1">Compound</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CustomerModal = ({ isOpen, onClose, customer, onSave }: any) => {
  const [formData, setFormData] = useState<Partial<Customer>>(customer || {
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    panNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (customer) setFormData(customer);
    else setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      panNumber: '',
      notes: '',
    });
  }, [customer, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customer ? 'Edit Member' : 'Enrolling New Member'} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-12 bg-luxury-charcoal transition-colors">
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-8">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Identity Profile</h4>
            <div className="space-y-6">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onFocus={(e) => e.target.select()}
                className="h-14 font-serif text-lg font-bold bg-luxury-black border-luxury-border"
                required
              />
              <Input
                label="Secure Phone (Optional)"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, phone: val });
                }}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-14 font-mono font-bold tracking-widest bg-luxury-black border-luxury-border"
              />
              <Input
                label="Private Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={(e) => e.target.select()}
                className="h-14 bg-luxury-black border-luxury-border"
              />
            </div>
          </div>

          <div className="space-y-8">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Business & Social</h4>
            <div className="space-y-6">
              <Input
                label="GSTIN (Optional)"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="h-14 font-black uppercase tracking-widest text-xs bg-luxury-black border-luxury-border"
              />
              <Input
                label="PAN Index"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                className="h-14 font-black uppercase tracking-widest text-xs bg-luxury-black border-luxury-border"
              />
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-gold-200/60 uppercase">Residence Address</label>
                <textarea
                  className="textarea-luxury w-full h-32 text-sm"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-luxury-border-dim" />

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-black tracking-widest text-gold-200/60">Professional Notes & Preferences</label>
          <textarea
            className="textarea-luxury w-full h-24 text-sm"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add details about their favourite metal, design preferences, or special dates..."
          />
        </div>

        <div className="flex gap-4 pt-8">
          <Button type="button" variant="outline" className="h-14 px-12 border-luxury-border uppercase font-black tracking-widest" onClick={onClose}>Discard</Button>
          <Button type="submit" variant="gold" className="h-14 flex-1 uppercase font-black tracking-widest text-lg">Secure Member Profile</Button>
        </div>
      </form>
    </Modal>
  );
};

const BalanceCollectionModal = ({ isOpen, onClose, outstanding, onCollect }: { isOpen: boolean, onClose: () => void, outstanding: number, onCollect: (amount: number, method: string) => void }) => {
  const [amount, setAmount] = useState(outstanding.toString());
  const [method, setMethod] = useState('Cash');

  useEffect(() => { setAmount(outstanding.toString()); }, [outstanding, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collect Outstanding Balance" size="sm">
      <div className="p-4 space-y-8 animate-scale-in transition-colors bg-luxury-charcoal">
        <div className="p-6 bg-luxury-surface border border-luxury-border rounded-2xl space-y-2 transition-colors">
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Total Outstanding Balance</p>
          <p className="text-3xl font-serif font-black text-red-500 transition-colors uppercase tracking-tight">{formatCurrency(outstanding)}</p>
        </div>

        <Input
          label="Collection Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-2xl h-14 font-black bg-luxury-black border-luxury-border text-luxury-text"
          autoFocus
        />

        <div className="space-y-4">
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Payment Method</p>
          <div className="grid grid-cols-3 gap-3 transition-colors">
            {['Cash', 'Card', 'UPI'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'py-3 rounded-xl border-2 transition-all text-[10px] uppercase font-black tracking-widest',
                  method === m ? 'bg-gold-400 border-gold-400 text-luxury-black shadow-lg shadow-gold-400/20' : 'bg-luxury-black border-luxury-border text-luxury-text-dim hover:border-gold-400/40 hover:text-gold-400'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4 transition-colors">
          <Button variant="outline" className="flex-1 py-4 border-luxury-border text-luxury-text-dim uppercase font-black tracking-widest" onClick={onClose}>Cancel</Button>
          <Button variant="gold" className="flex-1 py-4 uppercase font-black tracking-widest" onClick={() => onCollect(Number(amount), method)}>Collect Funds</Button>
        </div>
      </div>
    </Modal>
  );
};

/** Modal to clear the outstanding on a specific bill */
const BillClearModal = ({
  isOpen, onClose, sale, onClear
}: {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onClear: (sale: Sale, amount: number, method: string) => void;
}) => {
  const billOutstanding = getBillOutstanding(sale);
  const [amount, setAmount] = useState(billOutstanding.toString());
  const [method, setMethod] = useState('Cash');

  useEffect(() => { setAmount(billOutstanding.toString()); }, [sale, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Clear Bill — ${sale.invoiceNumber}`} size="sm">
      <div className="p-4 space-y-8 animate-scale-in bg-luxury-charcoal">
        {/* Bill summary */}
        <div className="p-5 bg-luxury-surface border border-luxury-border rounded-2xl space-y-3">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">
            <span>Bill Date</span>
            <span className="text-luxury-text">{new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">
            <span>Bill Total</span>
            <span className="text-luxury-text font-mono">{formatCurrency(sale.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">
            <span>Already Paid</span>
            <span className="text-green-400 font-mono">{formatCurrency(sale.amountPaid ?? 0)}</span>
          </div>
          <div className="h-px bg-luxury-border-dim" />
          <div className="flex justify-between text-sm uppercase font-black tracking-widest">
            <span className="text-red-400">Pending Amount</span>
            <span className="text-red-400 font-mono">{formatCurrency(billOutstanding)}</span>
          </div>
        </div>

        <Input
          label="Amount to Clear"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-2xl h-14 font-black bg-luxury-black border-luxury-border text-luxury-text"
          autoFocus
        />

        <div className="space-y-3">
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Payment Method</p>
          <div className="grid grid-cols-3 gap-3">
            {['Cash', 'Card', 'UPI'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'py-3 rounded-xl border-2 transition-all text-[10px] uppercase font-black tracking-widest',
                  method === m
                    ? 'bg-gold-400 border-gold-400 text-luxury-black shadow-lg shadow-gold-400/20'
                    : 'bg-luxury-black border-luxury-border text-luxury-text-dim hover:border-gold-400/40 hover:text-gold-400'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <Button variant="outline" className="flex-1 py-4 border-luxury-border text-luxury-text-dim uppercase font-black tracking-widest" onClick={onClose}>Cancel</Button>
          <Button variant="gold" className="flex-1 py-4 uppercase font-black tracking-widest" onClick={() => onClear(sale, Number(amount), method)}>
            Clear Bill
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/** Expandable bill card showing items purchased + payment history */
const BillCard = ({ sale, onClear, customer }: { sale: Sale; onClear: () => void; customer: Customer | null }) => {
  const { settings } = useSettingsStore();
  const [expanded, setExpanded] = useState(false);
  const billOutstanding = getBillOutstanding(sale);
  const hasOutstanding = billOutstanding > 0;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all overflow-hidden',
        hasOutstanding
          ? 'unpaid-bill-card'
          : 'bg-luxury-black border-luxury-border'
      )}
    >
      {/* ── Header row ── */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-luxury-surface rounded-xl text-gold-400 font-mono text-xs font-bold border border-luxury-border-dim">
              {sale.invoiceNumber}
            </div>
            <div>
              <p className="font-bold text-luxury-text text-sm uppercase tracking-wide leading-none mb-1">
                {new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">
                {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} • {sale.paymentMethod}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={sale.status === 'Completed' ? 'success' : 'warning'} className="text-[8px] uppercase">
              {sale.status}
            </Badge>
          </div>
        </div>

        {/* ── Amount summary ── */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-luxury-text-muted" />
              <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Bill Total</span>
              <span className="text-sm font-bold text-luxury-text font-mono">{formatCurrency(sale.grandTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400" />
              <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Paid</span>
              <span className="text-sm font-bold text-green-400 font-mono">{formatCurrency(sale.amountPaid ?? 0)}</span>
            </div>
            {hasOutstanding && (
              <div className="flex items-center gap-2">
                <AlertCircle size={11} className="text-red-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-red-400">Pending</span>
                <span className="text-sm font-bold text-red-400 font-mono">{formatCurrency(billOutstanding)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasOutstanding && (
              <button
                onClick={onClear}
                className="flex items-center gap-2 px-4 py-2 bg-gold-400 text-luxury-black text-[10px] uppercase font-black rounded-xl hover:bg-white transition-all shadow-lg shadow-gold-400/20"
              >
                <CreditCard size={12} />
                Clear Bill
              </button>
            )}
            <button
              onClick={() => generateInvoice(sale, settings, customer)}
              title="Download Bill PDF"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-luxury-surface border border-luxury-border-dim text-luxury-text-muted hover:text-gold-400 hover:border-gold-400/30 text-[10px] uppercase font-black tracking-widest transition-all"
            >
              <Download size={12} />
              PDF
            </button>
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-2 rounded-xl bg-luxury-surface border border-luxury-border-dim text-luxury-text-muted hover:text-gold-400 hover:border-gold-400/30 transition-all"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expandable detail panel ── */}
      {expanded && (
        <div className="border-t border-luxury-border-dim">

          {/* Products purchased */}
          {sale.items.length > 0 && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Package size={12} className="text-gold-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Items Purchased</span>
              </div>
              <div className="space-y-2">
                {sale.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2.5 px-3 bg-luxury-surface/50 rounded-xl border border-luxury-border-dim"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-luxury-black rounded-lg flex items-center justify-center border border-luxury-border-dim">
                        <Gem size={14} className="text-gold-400/60" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-luxury-text uppercase tracking-wide leading-none">
                          {item.product.name}
                        </p>
                        <p className="text-[9px] text-luxury-text-dim uppercase font-black tracking-widest mt-0.5">
                          {item.product.metalType} • {item.product.purity} • {item.product.weight}g
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-luxury-text font-mono">
                        {formatCurrency(item.finalPrice)}
                      </p>
                      <p className="text-[9px] text-luxury-text-dim font-bold tracking-widest">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history timeline */}
          <div className="p-5 pt-0 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={12} className="text-gold-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Payment History</span>
            </div>
            {(sale.paymentHistory && sale.paymentHistory.length > 0) ? (
              <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[13px] top-4 bottom-4 w-px bg-luxury-border-dim" />
                <div className="space-y-3">
                  {sale.paymentHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {/* Timeline dot */}
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 mt-0.5 z-10',
                        idx === (sale.paymentHistory!.length - 1)
                          ? 'bg-gold-400 border-gold-400 text-luxury-black'
                          : 'bg-luxury-surface border-luxury-border text-luxury-text-dim'
                      )}>
                        <CheckCircle2 size={12} />
                      </div>
                      {/* Entry detail */}
                      <div className="flex-1 py-2 px-3 bg-luxury-surface/40 rounded-xl border border-luxury-border-dim">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-luxury-text font-mono">{formatCurrency(entry.amount)}</p>
                            <p className="text-[9px] text-luxury-text-dim uppercase font-black tracking-widest mt-0.5">
                              {entry.method}
                              {entry.note && ` • ${entry.note}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-luxury-text-dim font-bold">
                              {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-[9px] text-luxury-text-dim/60">
                              {new Date(entry.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest italic">
                No payment log available for this bill.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
