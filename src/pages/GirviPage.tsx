import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Plus,
  Eye, 
  CreditCard,
  Trash2,
  Edit2,
  Package,
  Gem
} from 'lucide-react';
import { useGirviStore } from '../store/girviStore';
import { useOwnerLoanStore } from '../store/ownerLoanStore';
import { useSettingsStore } from '../store/settingsStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, calculateGirviInterest, calculateDailyInterest } from '../utils/calculations';

import { GirviModal } from '../components/girvi/GirviModal';
import { GirviDetailModal } from '../components/girvi/GirviDetailModal';
import { GirviPaymentModal } from '../components/girvi/GirviPaymentModal';
import { GirviAnalysis } from '../components/girvi/GirviAnalysis';

import { OwnerLoanModal } from '../components/girvi/OwnerLoanModal';
import { OwnerLoanPaymentModal } from '../components/girvi/OwnerLoanPaymentModal';
import { OwnerLoanDetailModal } from '../components/girvi/OwnerLoanDetailModal';

import type { Girvi, OwnerLoan } from '../types';
import toast from 'react-hot-toast';

export const GirviPage = () => {
  const { girvis, deleteGirvi, isLoading: isGirviLoading } = useGirviStore();
  const { ownerLoans, deleteOwnerLoan, isLoading: isOwnerLoading } = useOwnerLoanStore();
  const { settings } = useSettingsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'customer' | 'owner'>('customer');
  const [subView, setSubView] = useState<'ledger' | 'analysis'>('ledger');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Closed'>('All');

  // Customer Girvi Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedGirvi, setSelectedGirvi] = useState<Girvi | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [girviToEdit, setGirviToEdit] = useState<Girvi | null>(null);

  // Owner Loan Modals
  const [isOwnerNewOpen, setIsOwnerNewOpen] = useState(false);
  const [selectedOwnerLoan, setSelectedOwnerLoan] = useState<OwnerLoan | null>(null);
  const [isOwnerDetailOpen, setIsOwnerDetailOpen] = useState(false);
  const [isOwnerPaymentOpen, setIsOwnerPaymentOpen] = useState(false);

  const filteredGirvis = useMemo(() => girvis.filter(g => {
    const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
    if (!matchesStatus) return false;

    const term = searchTerm.toLowerCase();
    const matchesCustomer = g.customerName.toLowerCase().includes(term) || g.customerPhone.includes(term);
    
    let matchesItems = false;
    if (Array.isArray(g.items)) {
      matchesItems = g.items.some(item => item.description.toLowerCase().includes(term));
    }
    
    return matchesCustomer || matchesItems;
  }), [girvis, searchTerm, statusFilter]);

  const filteredOwnerLoans = useMemo(() => ownerLoans.filter(l => {
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    if (!matchesStatus) return false;

    const term = searchTerm.toLowerCase();
    const matchesLender = l.lenderName.toLowerCase().includes(term) || l.lenderPhone.includes(term) || (l.loanNumber || '').toLowerCase().includes(term);
    
    let matchesItems = false;
    if (Array.isArray(l.items)) {
      matchesItems = l.items.some(item => item.description.toLowerCase().includes(term));
    }
    
    return matchesLender || matchesItems;
  }), [ownerLoans, searchTerm, statusFilter]);

  const handleDeleteGirvi = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer record?')) {
      try {
        await deleteGirvi(id);
        toast.success('Record deleted successfully');
      } catch (err) {
        toast.error('Failed to delete record');
      }
    }
  };

  const handleDeleteOwnerLoan = async (id: string) => {
    if (confirm('Are you sure you want to delete this owner loan record?')) {
      try {
        await deleteOwnerLoan(id);
        toast.success('Owner loan record deleted successfully');
      } catch (err) {
        toast.error('Failed to delete owner loan record');
      }
    }
  };

  const girviColumns = [
    { 
      header: 'Client / Date', 
      accessor: (row: Girvi) => (
        <div className="flex flex-col">
           <div className="flex items-center gap-2">
              <span className="font-bold text-luxury-text">{row.customerName}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-400/10 text-gold-400 border border-gold-400/20 font-mono font-black uppercase tracking-wider">
                {row.girviNumber || 'Legacy'}
              </span>
           </div>
           <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{new Date(row.loanDate).toLocaleDateString()}</span>
        </div>
      )
    },
    { 
      header: 'Collateral Items', 
      accessor: (row: Girvi) => {
        const isArray = Array.isArray(row.items);
        const displayItems = isArray 
          ? (row.items.length === 1 ? row.items[0].description : `${row.items.length} Ornaments`)
          : 'No items';
        const weight = row.totalWeight || 0;
        
        return (
          <div className="flex flex-col">
             <span className="text-xs font-bold text-luxury-text line-clamp-1">{displayItems}</span>
             <span className="text-[10px] text-gold-400 font-black uppercase">
               {weight.toFixed(3)}g Total
             </span>
          </div>
        );
      }
    },
    { 
      header: 'Loan Details', 
      accessor: (row: Girvi) => (
        <div className="flex flex-col">
           <span className="text-sm font-black text-gold-400 font-mono">{formatCurrency(row.loanAmount)}</span>
           <span className="text-[10px] text-luxury-text-muted uppercase font-black">Int: {row.interestRate}% {row.isCompoundInterest ? '(Comp)' : '(Simp)'}</span>
        </div>
      )
    },
    { 
      header: 'Interest Due', 
      accessor: (row: Girvi) => {
        const interestPaid = (row.payments || []).filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
        const due = row.status === 'Closed' ? 0 : calculateGirviInterest(row.loanAmount, row.interestRate, row.loanDate, row.isCompoundInterest, interestPaid);
        return (
          <div className="flex flex-col">
             <span className="text-sm font-black text-red-400 font-mono">{formatCurrency(due)}</span>
             <span className="text-[10px] text-luxury-text-muted uppercase font-black">Accrued as of today</span>
          </div>
        );
      }
    },
    { 
      header: 'Repayment Status', 
      accessor: (row: Girvi) => {
        const principalPaid = (row.payments || [])
          .filter(p => p.type === 'Principal' || p.type === 'Settlement')
          .reduce((sum, p) => sum + p.amount, 0);
        const outstanding = row.status === 'Closed' ? 0 : Math.max(0, row.loanAmount - principalPaid);
        return (
          <div className="flex flex-col">
            <div className="flex flex-col mb-1.5">
              <span className="text-[10px] text-luxury-text-muted uppercase font-black">Principal Left</span>
              <span className="text-sm font-black text-luxury-text font-mono">{formatCurrency(outstanding)}</span>
            </div>
            <div className="w-24 h-1.5 bg-luxury-black rounded-full overflow-hidden border border-luxury-border">
              <div 
                className="h-full bg-gold-400" 
                style={{ width: `${row.status === 'Closed' ? 100 : Math.min(100, (principalPaid / row.loanAmount) * 100)}%` }} 
              />
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Validation', 
      accessor: (row: Girvi) => {
        const lastPayment = (row.payments || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const lastActivityDate = lastPayment ? new Date(lastPayment.date) : new Date(row.loanDate);
        const monthsSinceActivity = (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        const isAtRisk = row.status === 'Active' && monthsSinceActivity >= settings.girviDefaultPeriodMonths;

        return (
          <div className="flex flex-col gap-1.5 items-start">
            <Badge 
              variant={row.status === 'Active' ? 'warning' : row.status === 'Closed' ? 'success' : 'error'} 
              className="text-[10px] uppercase font-black tracking-widest px-3 py-1"
            >
              {row.status}
            </Badge>
            {isAtRisk && (
              <Badge variant="error" className="text-[8px] uppercase font-black px-2 py-0.5 animate-pulse bg-red-500/20 text-red-400 border-red-500/30">
                High Risk • {Math.floor(monthsSinceActivity)}M Overdue
              </Badge>
            )}
          </div>
        );
      }
    },
    { 
      header: '', 
      accessor: (row: Girvi) => (
        <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity pr-4">
           <button onClick={(e) => { e.stopPropagation(); setSelectedGirvi(row); setIsDetailOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all" title="View Details">
              <Eye size={16} />
           </button>
            {row.status !== 'Closed' && (
               <>
                  <button 
                     onClick={(e) => { 
                        e.stopPropagation(); 
                        setGirviToEdit(row);
                        setIsEditConfirmOpen(true);
                     }} 
                     className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all" 
                     title="Edit Record"
                  >
                     <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedGirvi(row); setIsPaymentModalOpen(true); }} className="p-2 hover:bg-green-500/10 rounded-lg text-luxury-text hover:text-green-500 transition-all" title="Add Payment">
                     <CreditCard size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGirvi(row.id); }} className="p-2 hover:bg-red-500/10 rounded-lg text-luxury-text hover:text-red-500 transition-all" title="Delete Record">
                     <Trash2 size={16} />
                  </button>
               </>
            )}
        </div>
      )
    }
  ];

  const ownerColumns = [
    { 
      header: 'Lender / Date', 
      accessor: (row: OwnerLoan) => (
        <div className="flex flex-col">
           <div className="flex items-center gap-2">
              <span className="font-bold text-luxury-text">{row.lenderName}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-400/10 text-gold-400 border border-gold-400/20 font-mono font-black uppercase tracking-wider">
                {row.loanNumber || 'Legacy'}
              </span>
           </div>
           <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{new Date(row.loanDate).toLocaleDateString()}</span>
        </div>
      )
    },
    { 
      header: 'Pledged Collateral', 
      accessor: (row: OwnerLoan) => {
        const isArray = Array.isArray(row.items);
        const displayItems = isArray 
          ? (row.items.length === 1 ? row.items[0].description : `${row.items.length} Ornaments`)
          : 'No items';
        const weight = row.totalWeight || 0;
        
        // Sourced counts
        const hasInventory = isArray && row.items.some(i => i.sourceType === 'inventory');
        const hasVault = isArray && row.items.some(i => i.sourceType === 'customer_girvi');

        return (
          <div className="flex flex-col">
             <span className="text-xs font-bold text-luxury-text line-clamp-1">{displayItems}</span>
             <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gold-400 font-black uppercase">
                  {weight.toFixed(3)}g Total
                </span>
                {hasInventory && (
                  <Badge variant="success" className="text-[7px] px-1 py-0.2 uppercase font-black tracking-wider flex items-center gap-0.5">
                     <Package size={8} /> Stock
                  </Badge>
                )}
                {hasVault && (
                  <Badge variant="warning" className="text-[7px] px-1 py-0.2 uppercase font-black tracking-wider flex items-center gap-0.5">
                     <Gem size={8} /> Vault
                  </Badge>
                )}
             </div>
          </div>
        );
      }
    },
    { 
      header: 'Loan Details', 
      accessor: (row: OwnerLoan) => (
        <div className="flex flex-col">
           <span className="text-sm font-black text-gold-400 font-mono">{formatCurrency(row.loanAmount)}</span>
           <span className="text-[10px] text-luxury-text-muted uppercase font-black">Int: {row.interestRate}% {row.isCompoundInterest ? '(Comp)' : '(Simp)'}</span>
        </div>
      )
    },
    { 
      header: 'Interest Due (Daily)', 
      accessor: (row: OwnerLoan) => {
        const interestPaid = (row.payments || []).filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
        const due = calculateDailyInterest(row.loanAmount, row.interestRate, row.loanDate, row.isCompoundInterest, interestPaid);
        return (
          <div className="flex flex-col">
             <span className="text-sm font-black text-red-400 font-mono">{formatCurrency(due)}</span>
             <span className="text-[10px] text-luxury-text-muted uppercase font-black">Accrued as of today</span>
          </div>
        );
      }
    },
    { 
      header: 'Repayment Status', 
      accessor: (row: OwnerLoan) => {
        const principalPaid = (row.payments || []).filter(p => p.type === 'Principal').reduce((sum, p) => sum + p.amount, 0);
        const outstanding = row.loanAmount - principalPaid;
        return (
          <div className="flex flex-col">
            <div className="flex flex-col mb-1.5">
              <span className="text-[10px] text-luxury-text-muted uppercase font-black">Principal Left</span>
              <span className="text-sm font-black text-luxury-text font-mono">{formatCurrency(outstanding)}</span>
            </div>
            <div className="w-24 h-1.5 bg-luxury-black rounded-full overflow-hidden border border-luxury-border">
              <div 
                className="h-full bg-gold-400" 
                style={{ width: `${Math.min(100, (principalPaid / row.loanAmount) * 100)}%` }} 
              />
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (row: OwnerLoan) => (
         <Badge 
           variant={row.status === 'Active' ? 'warning' : 'success'} 
           className="text-[10px] uppercase font-black tracking-widest px-3 py-1"
         >
           {row.status}
         </Badge>
      )
    },
    { 
      header: '', 
      accessor: (row: OwnerLoan) => (
        <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity pr-4">
           <button onClick={(e) => { e.stopPropagation(); setSelectedOwnerLoan(row); setIsOwnerDetailOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all" title="View Details">
              <Eye size={16} />
           </button>
            {row.status !== 'Closed' && (
               <>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedOwnerLoan(row); setIsOwnerNewOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all" title="Edit Record">
                     <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedOwnerLoan(row); setIsOwnerPaymentOpen(true); }} className="p-2 hover:bg-green-500/10 rounded-lg text-luxury-text hover:text-green-500 transition-all" title="Record Repayment / Topup">
                     <CreditCard size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteOwnerLoan(row.id); }} className="p-2 hover:bg-red-500/10 rounded-lg text-luxury-text hover:text-red-500 transition-all" title="Delete Record">
                     <Trash2 size={16} />
                  </button>
               </>
            )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in transition-colors duration-500">
      
      {/* Header section */}
      <div className="flex items-end justify-between">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <ChevronRight size={16} className="text-gold-400" />
             <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-muted">Girvi Portfolio</p>
           </div>
           <h1 className="text-4xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase">
             Gold <span className="text-gold-400">Pawn management</span>
           </h1>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex bg-luxury-charcoal/50 border border-luxury-border-dim p-1 rounded-xl mr-4 shadow-lg">
               <button 
                 onClick={() => { setView('customer'); setSubView('ledger'); setStatusFilter('All'); }}
                 className={cn(
                   "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                   view === 'customer' ? "bg-gold-400 text-luxury-black shadow-lg" : "text-luxury-text-muted hover:text-luxury-text"
                 )}
               >
                 Customer Pawns
               </button>
               <button 
                 onClick={() => { setView('owner'); setSubView('ledger'); setStatusFilter('All'); }}
                 className={cn(
                   "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                   view === 'owner' ? "bg-gold-400 text-luxury-black shadow-lg" : "text-luxury-text-muted hover:text-luxury-text"
                 )}
               >
                 Owner Loans
               </button>
            </div>

            {subView === 'ledger' && (
              <Button 
                variant="gold" 
                className="h-16 px-8 flex items-center gap-3 shadow-lg shadow-gold-500/10" 
                onClick={() => {
                  if (view === 'customer') {
                    setSelectedGirvi(null);
                    setIsNewModalOpen(true);
                  } else {
                    setSelectedOwnerLoan(null);
                    setIsOwnerNewOpen(true);
                  }
                }}
              >
                 <Plus size={20} />
                 <span className="font-black uppercase tracking-widest text-sm">
                   {view === 'customer' ? 'New Girvi Asset' : 'New Owner Loan'}
                 </span>
              </Button>
            )}
         </div>
      </div>

      {/* Sub-view toggle (Ledger vs Analytics) */}
      <div className="flex bg-luxury-surface/20 border border-luxury-border-dim p-4 rounded-3xl justify-between items-center transition-all mb-4">
         <div className="flex bg-luxury-charcoal/50 border border-luxury-border-dim p-1 rounded-xl shadow-lg animate-fade-in">
            <button
               onClick={() => setSubView('ledger')}
               className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  subView === 'ledger' ? "bg-gold-400 text-luxury-black shadow-lg font-black" : "text-luxury-text-muted hover:text-luxury-text"
               )}
            >
               {view === 'customer' ? 'Ledger Registry' : 'Loan Ledger'}
            </button>
            <button
               onClick={() => setSubView('analysis')}
               className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  subView === 'analysis' ? "bg-gold-400 text-luxury-black shadow-lg font-black" : "text-luxury-text-muted hover:text-luxury-text"
               )}
            >
               Analytics Insights
            </button>
         </div>
      </div>

      {subView === 'analysis' ? (
        <GirviAnalysis view={view} />
      ) : (
        <div className="grid grid-cols-12 gap-8">
           <div className="col-span-12 flex flex-col gap-6">
              
              {/* Search Bar */}
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
                 <input 
                    type="text"
                    placeholder={
                      view === 'customer' 
                        ? "Search customer pawns by depositor, phone, or description..." 
                        : "Search owner loans by lender name, phone, loan number, or description..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-16 bg-luxury-input border-2 border-luxury-border-dim rounded-3xl pl-12 pr-6 text-lg focus:border-gold-400/40 outline-none transition-all placeholder:text-luxury-text-dim shadow-inner text-luxury-text"
                 />
                 <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                    <div className="h-8 w-[1px] bg-luxury-border-dim" />
                    <Filter className="text-luxury-text-dim hover:text-gold-400 transition-colors cursor-pointer" size={20} />
                 </div>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-6">
                 <div className="flex bg-luxury-charcoal/50 border border-luxury-border-dim p-1 rounded-xl shadow-lg">
                    {['All', 'Active', 'Closed'].map((status) => (
                       <button
                          key={status}
                          onClick={() => setStatusFilter(status as any)}
                          className={cn(
                             "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                             statusFilter === status ? "bg-gold-400 text-luxury-black shadow-lg" : "text-luxury-text-muted hover:text-luxury-text"
                          )}
                       >
                          {status}
                       </button>
                    ))}
                 </div>
                 <div className="h-4 w-[1px] bg-luxury-border-dim" />
                 
                 <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-luxury-text-dim/80 font-black tracking-widest">
                       {view === 'customer' ? 'Customer Portfolio Ledger' : 'Owner Borrowed Portfolio Ledger'}
                    </p>
                    <p className="text-xs font-bold text-luxury-text">
                       Showing {view === 'customer' ? filteredGirvis.length : filteredOwnerLoans.length} Records
                    </p>
                 </div>
              </div>

              {/* Data Table */}
              {view === 'customer' ? (
                <Table 
                   columns={girviColumns} 
                   data={filteredGirvis} 
                   onRowClick={(row) => { setSelectedGirvi(row); setIsDetailOpen(true); }} 
                   isLoading={isGirviLoading} 
                />
              ) : (
                <Table 
                   columns={ownerColumns} 
                   data={filteredOwnerLoans} 
                   onRowClick={(row) => { setSelectedOwnerLoan(row); setIsOwnerDetailOpen(true); }} 
                   isLoading={isOwnerLoading} 
                />
              )}
           </div>
        </div>
      )}

      {/* Customer Modals */}
      <GirviModal 
        isOpen={isNewModalOpen} 
        onClose={() => { setIsNewModalOpen(false); setSelectedGirvi(null); }} 
        girvi={selectedGirvi}
      />
      <Modal 
        isOpen={isEditConfirmOpen} 
        onClose={() => { setIsEditConfirmOpen(false); setGirviToEdit(null); }} 
        title="Confirm Action"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-luxury-text text-base leading-relaxed">
            Are you sure you want to edit ghirvi detail?
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => { setIsEditConfirmOpen(false); setGirviToEdit(null); }}
              className="px-6 py-2.5 font-black uppercase tracking-widest text-xs"
            >
              Cancel
            </Button>
            <Button 
              variant="gold" 
              onClick={() => {
                if (girviToEdit) {
                  setSelectedGirvi(girviToEdit);
                  setIsNewModalOpen(true);
                }
                setIsEditConfirmOpen(false);
                setGirviToEdit(null);
              }}
              className="px-6 py-2.5 font-black uppercase tracking-widest text-xs"
            >
              Edit
            </Button>
          </div>
        </div>
      </Modal>
      <GirviDetailModal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        girvi={selectedGirvi} 
      />
      {selectedGirvi && (
        <GirviPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          girvi={selectedGirvi}
        />
      )}

      {/* Owner Modals */}
      <OwnerLoanModal 
        isOpen={isOwnerNewOpen}
        onClose={() => { setIsOwnerNewOpen(false); setSelectedOwnerLoan(null); }}
        loan={selectedOwnerLoan}
      />
      <OwnerLoanDetailModal 
        isOpen={isOwnerDetailOpen}
        onClose={() => setIsOwnerDetailOpen(false)}
        loan={selectedOwnerLoan}
      />
      {selectedOwnerLoan && (
        <OwnerLoanPaymentModal 
          isOpen={isOwnerPaymentOpen}
          onClose={() => setIsOwnerPaymentOpen(false)}
          loan={selectedOwnerLoan}
        />
      )}

    </div>
  );
};
