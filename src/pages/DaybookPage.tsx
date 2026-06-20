import { useState, useMemo } from 'react';
import { BookText, Plus, ArrowUpRight, ArrowDownRight, Wallet, Filter, Search, Scale } from 'lucide-react';
import { useSalesStore } from '../store/salesStore';
import { useDaybookStore } from '../store/daybookStore';
import { useGirviStore } from '../store/girviStore';
import { useOwnerLoanStore } from '../store/ownerLoanStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOldGoldPurchaseStore } from '../store/oldGoldPurchaseStore';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { formatCurrency } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { v4 as uuidv4 } from 'uuid';


export const DaybookPage = () => {
  const { sales } = useSalesStore();
  const { entries, addEntry } = useDaybookStore();
  const { girvis } = useGirviStore();
  const { ownerLoans } = useOwnerLoanStore();
  const { settings } = useSettingsStore();
  const { activeBranchId, profile } = useAuthStore();
  const { purchases } = useOldGoldPurchaseStore();
  const { purchaseOrders } = usePurchaseOrderStore();
  
  const [filterDate, setFilterDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Combine and filter transactions for the selected day
  const dailyTransactions = useMemo(() => {
    // A. Parse manual entries
    const mappedEntries: any[] = entries.map(e => ({
      ...e,
      source: 'manual',
      time: new Date(e.date).getTime()
    })).filter(e => {
      if (e.category === 'Other') {
        const desc = e.description || '';
        if (desc.startsWith('Direct Old Gold Purchase Payout') || desc.startsWith('Old Gold Purchase - Inv:')) {
          return false;
        }
      }
      return true;
    });

    // B. Parse Sales into Daybook transactions (Only track paid amounts natively here, or breakdown from paymentHistory)
    const salesTransactions: any[] = [];
    sales.forEach(sale => {
      const isPayout = sale.grandTotal < 0;
      if (sale.paymentHistory && sale.paymentHistory.length > 0) {
        sale.paymentHistory.forEach(ph => {
          salesTransactions.push({
            id: uuidv4(),
            branchId: sale.branchId,
            date: ph.date,
            type: isPayout ? 'OUT' : 'IN',
            category: isPayout ? 'Buyback' : 'Sale',
            amount: ph.amount,
            paymentMethod: ph.method,
            description: `${isPayout ? 'Buyback Settlement' : 'POS Receipt'} - ${sale.invoiceNumber} (${sale.customerName})`,
            createdBy: sale.createdBy,
            source: 'auto',
            time: new Date(ph.date).getTime()
          });
        });
      } else if (sale.amountPaid > 0 || isPayout) {
        // Fallback for older transactions or standalone payouts
        salesTransactions.push({
          id: uuidv4(),
          branchId: sale.branchId,
          date: sale.createdAt,
          type: isPayout ? 'OUT' : 'IN',
          category: isPayout ? 'Buyback' : 'Sale',
          amount: Math.abs(sale.amountPaid || sale.grandTotal),
          paymentMethod: sale.paymentMethod,
          description: `${isPayout ? 'Buyback Settlement' : 'POS Receipt'} - ${sale.invoiceNumber} (${sale.customerName})`,
          createdBy: sale.createdBy,
          source: 'auto',
          time: new Date(sale.createdAt).getTime()
        });
      }

      // Add POS Trade-in credit as an OUT transaction
      if (sale.oldGoldTotal && sale.oldGoldTotal > 0) {
        const payoutAmt = sale.grandTotal < 0 ? Math.abs(sale.grandTotal) : 0;
        const tradeInOffset = sale.oldGoldTotal - payoutAmt;
        if (tradeInOffset > 0) {
          salesTransactions.push({
            id: `tradein-${sale.id}`,
            branchId: sale.branchId,
            date: sale.createdAt,
            type: 'OUT',
            category: 'Buyback',
            amount: tradeInOffset,
            paymentMethod: 'Exchange',
            description: `POS Old Gold Trade-in - ${sale.invoiceNumber} (${sale.customerName})`,
            createdBy: sale.createdBy,
            source: 'auto',
            time: new Date(sale.createdAt).getTime()
          });
        }
      }
    });
    
    // C. Parse Girvi (Gold Loan) transactions
    const girviTransactions: any[] = [];
    girvis.forEach(girvi => {
      // Calculate top-ups to find the initial loan amount
      const topUpsAmount = (girvi.payments || [])
        .filter(p => p.type === 'Top-up')
        .reduce((sum, p) => sum + Math.abs(p.amount), 0);
      const initialLoanAmount = girvi.loanAmount - topUpsAmount;

      // 1. Initial Loan Outflow (Disbursement)
      girviTransactions.push({
        id: `loan-${girvi.id}`,
        branchId: (girvi as any).branchId || activeBranchId || 'main',
        date: girvi.loanDate,
        type: 'OUT',
        category: 'Gold Loan',
        amount: initialLoanAmount,
        paymentMethod: girvi.payoutMethod || 'Cash',
        description: `Loan Disbursed (${girvi.girviNumber || 'Legacy'}) - ${girvi.customerName}`,
        createdBy: girvi.createdBy || settings.ownerName,
        source: 'auto',
        time: new Date(girvi.loanDate).getTime()
      });

      // 2. Loan Payments & Top-ups
      (girvi.payments || []).forEach(p => {
        const isTopUp = p.type === 'Top-up';
        girviTransactions.push({
          id: `payment-${p.id}`,
          branchId: (girvi as any).branchId || activeBranchId || 'main',
          date: p.date,
          type: isTopUp ? 'OUT' : 'IN',
          category: 'Gold Loan',
          amount: Math.abs(p.amount),
          paymentMethod: p.method || 'Cash', // Support recorded payment channel, fallback to cash
          description: isTopUp
            ? `Loan Principal Top-up (${girvi.girviNumber || 'Legacy'}) - ${girvi.customerName}`
            : `Loan ${p.type} Return (${girvi.girviNumber || 'Legacy'}) - ${girvi.customerName}`,
          createdBy: settings.ownerName,
          source: 'auto',
          time: new Date(p.date).getTime()
        });
      });
    });

    // C2. Parse Owner Loans (Borrowed Loans) transactions
    const ownerLoanTransactions: any[] = [];
    ownerLoans.forEach(loan => {
      const topUpsAmount = (loan.payments || [])
        .filter(p => p.type === 'Top-up')
        .reduce((sum, p) => sum + Math.abs(p.amount), 0);
      const initialLoanAmount = loan.loanAmount - topUpsAmount;

      // 1. Loan disbursement received
      ownerLoanTransactions.push({
        id: `owner-loan-${loan.id}`,
        branchId: loan.branchId || activeBranchId || 'main',
        date: loan.loanDate,
        type: 'IN',
        category: 'Owner Loan',
        amount: initialLoanAmount,
        paymentMethod: loan.payoutMethod || 'Cash',
        description: `Owner Loan Received (${loan.loanNumber || 'Legacy'}) - Lender: ${loan.lenderName}`,
        createdBy: loan.createdBy || settings.ownerName,
        source: 'auto',
        time: new Date(loan.loanDate).getTime()
      });

      // 2. Payments
      (loan.payments || []).forEach(p => {
        const isTopUp = p.type === 'Top-up';
        ownerLoanTransactions.push({
          id: `owner-payment-${p.id}`,
          branchId: loan.branchId || activeBranchId || 'main',
          date: p.date,
          type: isTopUp ? 'IN' : 'OUT',
          category: 'Owner Loan',
          amount: Math.abs(p.amount),
          paymentMethod: p.method || 'Cash',
          description: isTopUp
            ? `Owner Loan Top-up Borrowed (${loan.loanNumber || 'Legacy'}) - Lender: ${loan.lenderName}`
            : `Owner Loan Repayment: ${p.type} (${loan.loanNumber || 'Legacy'}) - Lender: ${loan.lenderName}`,
          createdBy: settings.ownerName,
          source: 'auto',
          time: new Date(p.date).getTime()
        });
      });
    });

    // D. Parse Standalone Old Gold purchases
    const standalonePurchases: any[] = [];
    purchases.forEach(p => {
      if (p.kycNumber !== 'POS Trade-in') {
        standalonePurchases.push({
          id: p.id,
          branchId: p.branchId,
          date: p.createdAt,
          type: 'OUT',
          category: 'Buyback',
          amount: p.payoutAmount,
          paymentMethod: p.paymentMethod,
          description: `Direct Old Gold Purchase Payout (${p.purchaseNumber}) - Seller: ${p.customerName}`,
          createdBy: p.createdBy,
          source: 'auto',
          time: new Date(p.createdAt).getTime()
        });
      }
    });

    const allTx = [...mappedEntries, ...salesTransactions, ...girviTransactions, ...ownerLoanTransactions, ...standalonePurchases].filter(t => {
      // Filter by Branch
      if (activeBranchId && t.branchId !== activeBranchId) return false;
      
      // Filter by Date (using local timezone formatting to avoid timezone offset shifts)
      const d = new Date(t.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const tLocalDate = `${year}-${month}-${day}`;
      if (tLocalDate !== filterDate) return false;
      
      // Filter by Search
      const s = searchTerm.toLowerCase();
      if (s) {
        return t.description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s) || t.amount.toString().includes(s);
      }
      
      return true;
    });

    // Sort chronologically descending
    return allTx.sort((a, b) => b.time - a.time);
  }, [entries, sales, girvis, purchases, filterDate, activeBranchId, searchTerm, settings.ownerName]);

  // Compute daily totals
  const { totalIn, totalOut, cashFlow } = useMemo(() => {
    let _in = 0;
    let _out = 0;
    let _cashFlow = 0;
    
    dailyTransactions.forEach(t => {
      if (t.type === 'IN') {
        _in += t.amount;
        if (t.paymentMethod === 'Cash') _cashFlow += t.amount;
      } else {
        _out += t.amount;
        if (t.paymentMethod === 'Cash') _cashFlow -= t.amount;
      }
    });
    
    return { totalIn: _in, totalOut: _out, cashFlow: _cashFlow };
  }, [dailyTransactions]);

  // Extract all metal types dynamically
  const metalTypes = useMemo(() => {
    const fromRates = settings?.metalRates ? Object.keys(settings.metalRates) : [];
    const defaults = ['Gold', 'Silver', 'Platinum'];
    const merged = Array.from(new Set([...fromRates, ...defaults]));
    return merged.filter(m => m.toLowerCase() !== 'diamond');
  }, [settings?.metalRates]);

  // Calculate daily metal weights sold, purchased, and net balance
  const dailyMetalStats = useMemo(() => {
    const stats: Record<string, { sold: number; purchased: { tradeIn: number; standalone: number; supplier: number; total: number }; balance: number }> = {};
    
    metalTypes.forEach(metal => {
      stats[metal] = {
        sold: 0,
        purchased: { tradeIn: 0, standalone: 0, supplier: 0, total: 0 },
        balance: 0
      };
    });

    // Sales on selected date
    const dailySales = sales.filter(sale => {
      if (activeBranchId && sale.branchId !== activeBranchId) return false;
      const d = new Date(sale.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}` === filterDate;
    });

    // Standalone Purchases on selected date
    const dailyPurchases = purchases.filter(p => {
      if (activeBranchId && p.branchId !== activeBranchId) return false;
      const d = new Date(p.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}` === filterDate;
    });

    // Supplier POs marked as Received on selected date
    const dailySupplierPOs = purchaseOrders.filter(po => {
      if (po.status !== 'Received') return false;
      if (activeBranchId && (po as any).branchId && (po as any).branchId !== activeBranchId) return false;
      const receiveDate = po.updatedAt || po.createdAt || po.orderDate;
      const d = new Date(receiveDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}` === filterDate;
    });

    // 1. Calculate Sold Weight
    dailySales.forEach(sale => {
      sale.items.forEach(item => {
        const itemMetal = item.product.metalType || '';
        metalTypes.forEach(metal => {
          if (itemMetal.toLowerCase() === metal.toLowerCase()) {
            stats[metal].sold += (item.product.weight || 0) * (item.quantity || 0);
          }
        });
      });

      // 2. Calculate Trade-in Weight (Customer Old Gold trade-in in POS sales)
      if (sale.oldGoldItems) {
        sale.oldGoldItems.forEach(item => {
          const itemMetal = item.metalType || '';
          metalTypes.forEach(metal => {
            if (itemMetal.toLowerCase() === metal.toLowerCase()) {
              stats[metal].purchased.tradeIn += item.grossWeight || 0;
            }
          });
        });
      }
    });

    // 3. Calculate Standalone Purchase Weight
    dailyPurchases.forEach(p => {
      if (p.items) {
        p.items.forEach(item => {
          const itemMetal = item.metalType || '';
          metalTypes.forEach(metal => {
            if (itemMetal.toLowerCase() === metal.toLowerCase()) {
              stats[metal].purchased.standalone += item.grossWeight || 0;
            }
          });
        });
      }
    });

    // 4. Calculate Supplier PO Purchase Weight (Only count received POs)
    dailySupplierPOs.forEach(po => {
      po.items.forEach(item => {
        const itemMetal = item.metalType || '';
        metalTypes.forEach(metal => {
          if (itemMetal.toLowerCase() === metal.toLowerCase()) {
            stats[metal].purchased.supplier += (item.weight || 0) * (item.quantity || 0);
          }
        });
      });
    });

    // Calculate totals and net balance for each metal (Purchased - Sold)
    metalTypes.forEach(metal => {
      const p = stats[metal].purchased;
      p.total = p.tradeIn + p.standalone + p.supplier;
      stats[metal].balance = p.total - stats[metal].sold; // Positive means net accumulation, negative means net sold
    });

    return stats;
  }, [sales, purchases, purchaseOrders, filterDate, activeBranchId, metalTypes]);

  const columns = [
    { 
      header: 'Time', 
      accessor: (row: any) => (
        <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">
          {new Date(row.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    { 
      header: 'Transaction Details', 
      accessor: (row: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-luxury-text text-sm">{row.description}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest",
              row.source === 'auto' ? "bg-gold-400/20 text-gold-400" : "bg-luxury-surface text-luxury-text-dim"
            )}>{row.category}</span>
            <span className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim/60">by {row.createdBy}</span>
          </div>
        </div>
      )
    },
    { 
      header: 'Payment Channel', 
      accessor: (row: any) => (
        <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border border-luxury-border px-2 py-1 rounded-md">
          {row.paymentMethod}
        </span>
      )
    },
    { 
      header: 'Amount', 
      accessor: (row: any) => (
        <div className="flex items-center gap-2 justify-end">
          {row.type === 'IN' ? (
            <ArrowDownRight size={14} className="text-green-500" />
          ) : (
            <ArrowUpRight size={14} className="text-red-500" />
          )}
          <span className={cn(
            "text-base font-mono font-black",
            row.type === 'IN' ? 'text-green-500' : 'text-red-500'
          )}>
            {row.type === 'IN' ? '+' : '-'}{formatCurrency(row.amount)}
          </span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Log */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookText size={16} className="text-gold-400" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-muted">Master Ledger</p>
          </div>
          <h1 className="text-4xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase">
            Rojmel <span className="text-gold-400">Daybook</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-14 bg-luxury-charcoal border border-luxury-border px-4 rounded-xl text-luxury-text uppercase tracking-widest text-xs font-black outline-none focus:border-gold-400"
            />
            <Button
              variant="ghost"
              className="h-14 px-6 border border-luxury-border text-luxury-text hover:border-gold-400 hover:text-gold-400 uppercase font-black tracking-widest bg-luxury-charcoal"
              onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          </div>
          <Button 
            variant="gold" 
            className="h-14 px-8 uppercase font-black tracking-widest items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} /> Add Entry
          </Button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-luxury-charcoal border border-luxury-border rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <ArrowDownRight size={64} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-2">Total Inflow (All Modes)</p>
          <p className="text-3xl font-serif font-black text-green-500">{formatCurrency(totalIn)}</p>
        </div>
        
        <div className="p-6 bg-luxury-charcoal border border-luxury-border rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <ArrowUpRight size={64} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-2">Total Outflow (All Modes)</p>
          <p className="text-3xl font-serif font-black text-red-500">{formatCurrency(totalOut)}</p>
        </div>

        <div className="p-6 bg-gold-400/5 border border-gold-400/20 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-gold-400 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Wallet size={64} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-gold-400/60 mb-2">Net Cash Movement (Cash Only)</p>
          <p className="text-3xl font-serif font-black text-gold-400">{cashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow)}</p>
        </div>
      </div>

      {/* Daily Metal Weight Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metal Sold Card */}
        <div className="p-6 bg-luxury-charcoal border border-luxury-border rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Scale size={64} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-4">Daily Metal Sold (Gross Weight)</p>
          <div className="space-y-3">
            {metalTypes.map(metal => {
              const weight = dailyMetalStats[metal]?.sold || 0;
              return (
                <div key={metal} className="flex justify-between items-center border-b border-luxury-border-dim/20 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-xs font-bold text-luxury-text-muted uppercase tracking-wider">{metal}</span>
                  <span className="text-lg font-mono font-black text-luxury-text">{weight.toFixed(3)} g</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metal Purchased Card */}
        <div className="p-6 bg-luxury-charcoal border border-luxury-border rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Scale size={64} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-4">Daily Metal Purchased (Gross Weight)</p>
          <div className="space-y-3">
            {metalTypes.map(metal => {
              const stats = dailyMetalStats[metal]?.purchased || { total: 0, tradeIn: 0, standalone: 0, supplier: 0 };
              return (
                <div key={metal} className="flex flex-col border-b border-luxury-border-dim/25 last:border-0 pb-2 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-luxury-text-muted uppercase tracking-wider">{metal}</span>
                    <span className="text-lg font-mono font-black text-luxury-text">{stats.total.toFixed(3)} g</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] uppercase font-black text-luxury-text-dim/60 mt-1">
                      {stats.tradeIn > 0 && <span>In-Store: {stats.tradeIn.toFixed(2)}g</span>}
                      {stats.standalone > 0 && <span>Direct: {stats.standalone.toFixed(2)}g</span>}
                      {stats.supplier > 0 && <span>Supplier: {stats.supplier.toFixed(2)}g</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Net Metal Balance Card */}
        <div className="p-6 bg-gold-400/5 border border-gold-400/20 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-gold-400 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Scale size={64} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-gold-400/60 mb-4">Net Metal Balance (g)</p>
          <div className="space-y-3">
            {metalTypes.map(metal => {
              const balance = dailyMetalStats[metal]?.balance || 0;
              const isPositive = balance > 0;
              return (
                <div key={metal} className="flex justify-between items-center border-b border-gold-400/10 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-xs font-bold text-gold-400/70 uppercase tracking-wider">{metal}</span>
                  <span className={cn(
                    "text-lg font-mono font-black",
                    balance === 0 ? "text-luxury-text-muted" : isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {balance === 0 ? '' : isPositive ? '+' : ''}{balance.toFixed(3)} g
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim" size={18} />
            <input 
              type="text"
              placeholder="Search descriptions, amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-luxury-black border border-luxury-border rounded-xl pl-12 pr-4 text-sm text-luxury-text focus:border-gold-400 outline-none placeholder:text-luxury-text-dim/50"
            />
          </div>
          <Filter className="text-luxury-text-dim" size={20} />
        </div>
        
        <Table 
          columns={columns} 
          data={dailyTransactions} 
          onRowClick={() => {}} 
        />
        
        {dailyTransactions.length === 0 && (
          <div className="p-12 text-center text-luxury-text-dim italic">
            No register activities documented for this date.
          </div>
        )}
      </div>

      <ManualEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={async (entry: { type: 'IN' | 'OUT'; category: 'Expense' | 'Capital' | 'Withdrawal' | 'Other'; amount: number; paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank'; description: string }) => {
          await addEntry({
            ...entry,
            id: uuidv4(),
            branchId: activeBranchId || undefined,
            date: new Date().toISOString(),
            createdBy: profile?.name || settings.ownerName
          });
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

const ManualEntryModal = ({ isOpen, onClose, onSave }: any) => {
  const [type, setType] = useState<'IN' | 'OUT'>('OUT');
  const [category, setCategory] = useState<'Expense' | 'Capital' | 'Withdrawal' | 'Other'>('Expense');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank'>('Cash');
  const [description, setDescription] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Manual Entry" size="md">
      <div className="p-6 space-y-8 bg-luxury-charcoal">
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => { setType('OUT'); setCategory('Expense'); }}
            className={cn(
              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
              type === 'OUT' ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-luxury-black border-luxury-border text-luxury-text-dim"
            )}
          >
            <ArrowUpRight size={24} />
            <span className="text-[10px] uppercase font-black tracking-widest">Money Out (Expense)</span>
          </button>
          <button 
            type="button"
            onClick={() => { setType('IN'); setCategory('Capital'); }}
            className={cn(
              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
              type === 'IN' ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-luxury-black border-luxury-border text-luxury-text-dim"
            )}
          >
            <ArrowDownRight size={24} />
            <span className="text-[10px] uppercase font-black tracking-widest">Money In (Capital)</span>
          </button>
        </div>

        <div className="space-y-6 pt-4 border-t border-luxury-border">
          <Input 
            label="Amount" 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className="text-2xl font-black font-mono h-14"
            autoFocus
          />
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-12 bg-luxury-black border border-luxury-border rounded-xl px-4 text-sm text-luxury-text outline-none"
            >
              {type === 'OUT' ? (
                <>
                  <option value="Expense">Shop Expense (Tea, Food, Repairs)</option>
                  <option value="Withdrawal">Owner Withdrawal</option>
                  <option value="Other">Other Outflow</option>
                </>
              ) : (
                <>
                  <option value="Capital">Owner Capital In</option>
                  <option value="Other">Other Inflow</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Payment Channel</label>
            <div className="grid grid-cols-4 gap-2">
              {['Cash', 'Bank', 'UPI', 'Card'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m as any)}
                  className={cn(
                    "py-2 rounded-lg border text-[10px] uppercase font-black tracking-widest transition-all",
                    paymentMethod === m ? "bg-gold-400 border-gold-400 text-luxury-black" : "bg-luxury-black border-luxury-border text-luxury-text-dim"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Description / Note</label>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="E.g. Paid plumber, Added float cash..."
              className="w-full h-12 bg-luxury-black border border-luxury-border rounded-xl px-4 text-sm text-luxury-text outline-none"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" className="flex-1 py-4 border-luxury-border text-luxury-text-dim uppercase font-black tracking-widest" onClick={onClose}>Cancel</Button>
          <Button 
            variant="gold" 
            className="flex-1 py-4 uppercase font-black tracking-widest" 
            onClick={() => onSave({ type, category, amount: Number(amount), paymentMethod, description })}
            disabled={!amount || !description}
          >
            Log {type === 'IN' ? 'Inflow' : 'Outflow'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
