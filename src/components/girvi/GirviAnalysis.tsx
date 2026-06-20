import { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Scale, 
  Activity, 
  Gem,
  Clock,
  TrendingDown,
  Package
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { formatCurrency, calculateGirviInterest, calculateDailyInterest } from '../../utils/calculations';
import { useSettingsStore } from '../../store/settingsStore';
import { useGirviStore } from '../../store/girviStore';
import { useOwnerLoanStore } from '../../store/ownerLoanStore';
import { cn } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table } from '../ui/Table';

const getOrNameCategory = (item: { category?: string; description: string }, categories: string[]) => {
  if (item.category) return item.category;
  
  const desc = (item.description || '').toLowerCase();
  for (const cat of categories) {
    if (cat.toLowerCase() !== 'other' && cat.toLowerCase() !== 'raw material' && desc.includes(cat.toLowerCase())) {
      return cat;
    }
  }
  
  if (desc.includes('ring')) return 'Ring';
  if (desc.includes('necklace') || desc.includes('haar')) return 'Necklace';
  if (desc.includes('chain')) return 'Chain';
  if (desc.includes('bangle') || desc.includes('kada')) return 'Bangles';
  if (desc.includes('earring') || desc.includes('jhumka')) return 'Earring';
  if (desc.includes('pendant')) return 'Pendant';
  if (desc.includes('bracelet')) return 'Bracelet';
  
  return 'Other';
};

interface GirviAnalysisProps {
  view: 'customer' | 'owner';
}

export const GirviAnalysis = ({ view }: GirviAnalysisProps) => {
  const { girvis } = useGirviStore();
  const { ownerLoans } = useOwnerLoanStore();
  const { settings } = useSettingsStore();

  // ── CUSTOMER PAWN PORTFOLIO METRICS ──────────────────────────────────────────
  const customerMetrics = useMemo(() => {
    let activePrincipal = 0;
    let totalInterestCollected = 0;
    let totalAccruedInterest = 0;
    let totalWeight = 0;
    let atRiskCount = 0;
    let atRiskPrincipal = 0;

    girvis.forEach(g => {
      if (g.status === 'Active') {
        activePrincipal += g.loanAmount;
        
        const interestPaid = (g.payments || []).filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
        const accrued = calculateGirviInterest(g.loanAmount, g.interestRate, g.loanDate, g.isCompoundInterest, interestPaid);
        totalAccruedInterest += accrued;
        totalWeight += g.totalWeight || 0;

        // Risk detection
        const lastPayment = (g.payments || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const lastActivityDate = lastPayment ? new Date(lastPayment.date) : new Date(g.loanDate);
        const monthsSinceActivity = (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        
        if (monthsSinceActivity >= settings.girviDefaultPeriodMonths) {
          atRiskCount++;
          atRiskPrincipal += g.loanAmount;
        }
      }
      
      const interestPaid = (g.payments || []).filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
      totalInterestCollected += interestPaid;
    });

    return {
      activePrincipal,
      totalInterestCollected,
      totalAccruedInterest,
      overallInterest: totalInterestCollected + totalAccruedInterest,
      totalWeight,
      atRiskCount,
      atRiskPrincipal,
      totalAssets: girvis.length,
      activeAssets: girvis.filter(g => g.status === 'Active').length
    };
  }, [girvis, settings.girviDefaultPeriodMonths]);

  // ── OWNER BORROWED PORTFOLIO METRICS ─────────────────────────────────────────
  const ownerMetrics = useMemo(() => {
    let activePrincipal = 0;
    let totalInterestPaid = 0;
    let totalAccruedInterest = 0;
    let totalWeight = 0;
    let totalPrincipalPaid = 0;

    ownerLoans.forEach(l => {
      const pHistory = l.payments || [];
      const interestPaid = pHistory.filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
      const principalPaid = pHistory.filter(p => p.type === 'Principal').reduce((sum, p) => sum + p.amount, 0);
      
      totalInterestPaid += interestPaid;
      totalPrincipalPaid += principalPaid;

      if (l.status === 'Active') {
        const remaining = Math.max(0, l.loanAmount - principalPaid);
        activePrincipal += remaining;
        
        const accrued = calculateDailyInterest(l.loanAmount, l.interestRate, l.loanDate, l.isCompoundInterest, interestPaid);
        totalAccruedInterest += accrued;
        totalWeight += l.totalWeight || 0;
      }
    });

    return {
      activePrincipal,
      totalInterestPaid,
      totalAccruedInterest,
      totalPrincipalPaid,
      totalWeight,
      totalAssets: ownerLoans.length,
      activeAssets: ownerLoans.filter(l => l.status === 'Active').length
    };
  }, [ownerLoans]);

  // ── Vault Chart Data ─────────────────────────────────────────────────────────
  const customerChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const cats = settings.categories || [];

    girvis.filter(g => g.status === 'Active').forEach(g => {
      if (Array.isArray(g.items)) {
        g.items.forEach(item => {
          const category = getOrNameCategory(item, cats);
          counts[category] = (counts[category] || 0) + item.weight;
        });
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [girvis, settings.categories]);

  // ── Pledged Chart Data ───────────────────────────────────────────────────────
  const ownerChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const cats = settings.categories || [];

    ownerLoans.filter(l => l.status === 'Active').forEach(l => {
      if (Array.isArray(l.items)) {
        l.items.forEach(item => {
          const category = getOrNameCategory(item, cats);
          counts[category] = (counts[category] || 0) + item.weight;
        });
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [ownerLoans, settings.categories]);

  const activeChartData = useMemo(() => {
    return view === 'customer' ? customerChartData : ownerChartData;
  }, [view, customerChartData, ownerChartData]);

  // ── Portfolio Health Statuses ────────────────────────────────────────────────
  const customerStatusData = useMemo(() => {
    const counts = {
      Active: girvis.filter(g => g.status === 'Active').length,
      Closed: girvis.filter(g => g.status === 'Closed').length,
    };
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [girvis]);

  const ownerStatusData = useMemo(() => {
    const counts = {
      Active: ownerLoans.filter(l => l.status === 'Active').length,
      Closed: ownerLoans.filter(l => l.status === 'Closed').length,
    };
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [ownerLoans]);

  const activeStatusData = useMemo(() => {
    return view === 'customer' ? customerStatusData : ownerStatusData;
  }, [view, customerStatusData, ownerStatusData]);

  const totalAssets = useMemo(() => {
    return view === 'customer' ? customerMetrics.totalAssets : ownerMetrics.totalAssets;
  }, [view, customerMetrics.totalAssets, ownerMetrics.totalAssets]);

  const activeAssets = useMemo(() => {
    return view === 'customer' ? customerMetrics.activeAssets : ownerMetrics.activeAssets;
  }, [view, customerMetrics.activeAssets, ownerMetrics.activeAssets]);

  // ── Risk overlap ─────────────────────────────────────────────────────────────
  const atRiskLoans = useMemo(() => {
    return girvis.filter(g => {
      if (g.status !== 'Active') return false;
      const lastPayment = (g.payments || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const lastActivityDate = lastPayment ? new Date(lastPayment.date) : new Date(g.loanDate);
      const monthsSinceActivity = (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return monthsSinceActivity >= settings.girviDefaultPeriodMonths;
    }).sort((a, b) => b.loanAmount - a.loanAmount);
  }, [girvis, settings.girviDefaultPeriodMonths]);

  // ── Collateral Registers ─────────────────────────────────────────────────────
  const allCustomerCollaterals = useMemo(() => {
    const list: any[] = [];
    girvis.forEach(g => {
      if (Array.isArray(g.items)) {
        g.items.forEach((item, idx) => {
          list.push({
            id: `${g.id}-${item.id || idx}`,
            ownerName: g.customerName,
            phone: g.customerPhone,
            number: g.girviNumber || 'Legacy',
            description: item.description,
            weight: item.weight,
            purity: item.purity,
            date: g.loanDate,
            status: g.status,
            source: 'customer'
          });
        });
      }
    });
    return list.sort((a, b) => b.weight - a.weight);
  }, [girvis]);

  const allOwnerCollaterals = useMemo(() => {
    const list: any[] = [];
    ownerLoans.forEach(l => {
      if (Array.isArray(l.items)) {
        l.items.forEach((item, idx) => {
          list.push({
            id: `${l.id}-${item.id || idx}`,
            ownerName: l.lenderName,
            phone: l.lenderPhone,
            number: l.loanNumber || 'Legacy',
            description: item.description,
            weight: item.weight,
            purity: item.purity,
            date: l.loanDate,
            status: l.status,
            source: 'owner',
            sourceType: item.sourceType,
            productSku: item.productSku,
            customerName: item.customerName,
            customerGirviNumber: item.customerGirviNumber
          });
        });
      }
    });
    return list.sort((a, b) => b.weight - a.weight);
  }, [ownerLoans]);

  const activeOrnamentsData = useMemo(() => {
    return view === 'customer' ? allCustomerCollaterals : allOwnerCollaterals;
  }, [view, allCustomerCollaterals, allOwnerCollaterals]);

  // ── Columns for Tables ───────────────────────────────────────────────────────
  const itemColumns = useMemo(() => {
    return [
      {
        header: 'Ornament Detail',
        accessor: (row: any) => (
          <div className="flex flex-col">
            <span className="font-bold text-luxury-text uppercase">{row.description}</span>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Purity: {row.purity}</span>
               {row.source === 'owner' && row.sourceType === 'inventory' && (
                  <Badge variant="success" className="text-[7px] px-1 py-0.2 uppercase font-black flex items-center gap-0.5">
                     <Package size={8} /> Stock: {row.productSku}
                  </Badge>
               )}
               {row.source === 'owner' && row.sourceType === 'customer_girvi' && (
                  <Badge variant="warning" className="text-[7px] px-1 py-0.2 uppercase font-black flex items-center gap-0.5">
                     <Gem size={8} /> Vault: {row.customerName} ({row.customerGirviNumber})
                  </Badge>
               )}
            </div>
          </div>
        )
      },
      {
        header: 'Weight',
        accessor: (row: any) => (
          <span className="text-sm font-bold text-gold-400 font-mono">{row.weight.toFixed(3)}g</span>
        )
      },
      {
        header: view === 'customer' ? 'Depositor / Client' : 'Lender / Financier',
        accessor: (row: any) => (
          <div className="flex flex-col">
            <span className="font-bold text-luxury-text">{row.ownerName}</span>
            <span className="text-[10px] text-luxury-text-muted font-mono">{row.phone || 'No Phone'}</span>
          </div>
        )
      },
      {
        header: view === 'customer' ? 'Girvi Number / Date' : 'Loan Number / Date',
        accessor: (row: any) => (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-black text-luxury-text">{row.number}</span>
            <span className="text-[10px] text-luxury-text-muted">{new Date(row.date).toLocaleDateString()}</span>
          </div>
        )
      },
      {
        header: 'Status',
        accessor: (row: any) => (
          <Badge 
            variant={row.status === 'Active' ? 'warning' : 'success'} 
            className="text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5"
          >
            {row.status}
          </Badge>
        )
      }
    ];
  }, [view]);

  const COLORS = settings.theme === 'light'
    ? ['#2563eb', '#E5E7EB', '#60A5FA', '#F87171', '#34D399']
    : ['#C9A84C', '#E5E7EB', '#60A5FA', '#F87171', '#34D399'];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {view === 'customer' ? (
          // Customer analytics KPIs
          [
            { icon: DollarSign, label: 'Active Principal', value: formatCurrency(customerMetrics.activePrincipal), sub: `${customerMetrics.activeAssets} active loans`, color: 'text-gold-400' },
            { icon: TrendingUp, label: 'Overall Interest', value: formatCurrency(customerMetrics.overallInterest), sub: `${formatCurrency(customerMetrics.totalInterestCollected)} collected • ${formatCurrency(customerMetrics.totalAccruedInterest)} pending`, color: 'text-gold-400' },
            { icon: TrendingUp, label: 'Interest Collected', value: formatCurrency(customerMetrics.totalInterestCollected), sub: 'Historical earnings', color: 'text-green-500' },
            { icon: TrendingDown, label: 'Default Risk', value: formatCurrency(customerMetrics.atRiskPrincipal), sub: `${customerMetrics.atRiskCount} overdue loans`, color: 'text-red-400' },
            { icon: Scale, label: 'Vault Inventory', value: `${customerMetrics.totalWeight.toFixed(2)}g`, sub: 'Total gold weight', color: 'text-luxury-text' },
          ].map((kpi, i) => (
            <div key={i} className="bg-luxury-input border border-luxury-border-dim p-8 rounded-[32px] group hover:border-gold-400/20 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className={cn("p-4 bg-luxury-black/60 rounded-2xl border border-luxury-border-dim", kpi.color)}>
                     <kpi.icon size={24} />
                  </div>
                  <div className="px-3 py-1 bg-luxury-surface rounded-full text-[8px] font-black uppercase tracking-widest text-luxury-text-dim">
                     Real-time
                  </div>
               </div>
               <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-muted mb-1">{kpi.label}</h4>
               <p className="text-3xl font-serif font-black text-luxury-text mb-1">{kpi.value}</p>
               <p className="text-[10px] font-bold text-luxury-text-dim">{kpi.sub}</p>
            </div>
          ))
        ) : (
          // Owner analytics KPIs
          [
            { icon: DollarSign, label: 'Active Borrowings', value: formatCurrency(ownerMetrics.activePrincipal), sub: `${ownerMetrics.activeAssets} active borrowings`, color: 'text-gold-400' },
            { icon: TrendingDown, label: 'Accrued Interest', value: formatCurrency(ownerMetrics.totalAccruedInterest), sub: 'Pending daily interest due', color: 'text-red-400' },
            { icon: TrendingDown, label: 'Interest Repaid', value: formatCurrency(ownerMetrics.totalInterestPaid), sub: 'Paid to financiers', color: 'text-red-400' },
            { icon: TrendingUp, label: 'Principal Repaid', value: formatCurrency(ownerMetrics.totalPrincipalPaid), sub: 'Principal reduction paid', color: 'text-green-500' },
            { icon: Scale, label: 'Pledged Collateral', value: `${ownerMetrics.totalWeight.toFixed(2)}g`, sub: 'Pledged weight in vault/bank', color: 'text-luxury-text' },
          ].map((kpi, i) => (
            <div key={i} className="bg-luxury-input border border-luxury-border-dim p-8 rounded-[32px] group hover:border-gold-400/20 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className={cn("p-4 bg-luxury-black/60 rounded-2xl border border-luxury-border-dim", kpi.color)}>
                     <kpi.icon size={24} />
                  </div>
                  <div className="px-3 py-1 bg-luxury-surface rounded-full text-[8px] font-black uppercase tracking-widest text-luxury-text-dim">
                     Real-time
                  </div>
               </div>
               <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-muted mb-1">{kpi.label}</h4>
               <p className="text-3xl font-serif font-black text-luxury-text mb-1">{kpi.value}</p>
               <p className="text-[10px] font-bold text-luxury-text-dim">{kpi.sub}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Composition Chart */}
        <div className="col-span-12 lg:col-span-7 bg-luxury-surface/30 border border-luxury-border-dim p-8 rounded-[40px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-xl font-serif font-black text-luxury-text uppercase tracking-tight">
                   {view === 'customer' ? 'Vault Ornaments mix' : 'Pledged Ornaments mix'}
                </h3>
                <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">
                  Distribution by category (Weight in grams)
                </p>
             </div>
             <Gem className="text-gold-400 opacity-20" size={32} />
          </div>
          
          <div className="flex-1 flex items-center gap-8">
            <div className="w-1/2 h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {activeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                   <Tooltip 
                      contentStyle={{ background: 'var(--luxury-charcoal)', border: '1px solid var(--luxury-border)', borderRadius: '12px', fontSize: '10px' }}
                   />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <p className="text-[10px] uppercase font-black text-gold-400">Category</p>
                 <p className="text-[8px] uppercase font-black text-luxury-text-dim">Mix</p>
              </div>
            </div>
            
            <div className="w-1/2 space-y-3">
              {activeChartData.map((entry: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-luxury-surface p-4 rounded-2xl border border-luxury-border-dim">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase text-luxury-text-muted">{entry.name}</span>
                  </div>
                  <span className="text-xs font-bold text-luxury-text">{entry.value.toFixed(2)}g</span>
                </div>
              ))}
              {activeChartData.length === 0 && (
                <div className="p-8 text-center bg-luxury-surface rounded-2xl border border-dashed border-luxury-border">
                   <p className="text-[10px] uppercase font-black text-luxury-text-dim">No active pledged data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Health */}
        <div className="col-span-12 lg:col-span-5 bg-luxury-surface/30 border border-luxury-border-dim p-8 rounded-[40px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-xl font-serif font-black text-luxury-text uppercase tracking-tight">Portfolio Health</h3>
                <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Loan status distribution</p>
             </div>
             <Activity className="text-luxury-text opacity-20" size={32} />
          </div>

          <div className="flex-1 space-y-4">
            {activeStatusData.map((entry, _i) => {
              const total = totalAssets || 1;
              const percentage = (entry.value / total) * 100;
              return (
                <div key={entry.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase font-black text-luxury-text transition-colors">{entry.name} Loans</span>
                    <span className="text-xs font-bold text-luxury-text">{entry.value}</span>
                  </div>
                  <div className="w-full h-2 bg-luxury-black rounded-full overflow-hidden border border-luxury-border-dim">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        entry.name === 'Active' ? 'bg-gold-400' : 'bg-green-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-gold-400/5 border border-gold-400/10 rounded-3xl">
             <div className="flex items-center gap-3 mb-2">
                <Clock size={16} className="text-gold-400" />
                <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Aging Insight</p>
             </div>
             <p className="text-xs text-luxury-text-muted italic">
                Currently, {((activeAssets / (totalAssets || 1)) * 100).toFixed(0)}% of the {view === 'customer' ? 'customer' : 'owner'} loan records are active.
             </p>
          </div>
        </div>
      </div>

      {/* High Risk Loans Section (Customers Only) */}
      {view === 'customer' && (
        <div className="bg-luxury-surface/30 border border-luxury-border-dim p-8 rounded-[40px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-xl font-serif font-black text-luxury-text uppercase tracking-tight">High-Risk Accounts</h3>
                <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Loans exceeding the {settings.girviDefaultPeriodMonths}-month inactivity threshold</p>
             </div>
             <Badge variant="error" className="bg-red-500/10 text-red-500 border-red-500/20 px-4 py-1.5 uppercase text-[10px] font-black tracking-widest">Action Required</Badge>
          </div>

          {atRiskLoans.length === 0 ? (
            <div className="p-12 text-center bg-luxury-surface rounded-[32px] border border-dashed border-luxury-border">
               <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
                  <Activity size={32} />
               </div>
               <p className="text-lg font-serif font-medium text-luxury-text mb-1">Portfolio Healthy</p>
               <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">No loans are currently flagged as high-risk.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {atRiskLoans.map((loan) => {
                const lastPayment = (loan.payments || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const lastActivityDate = lastPayment ? new Date(lastPayment.date) : new Date(loan.loanDate);
                const months = Math.floor((new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
                
                return (
                  <div key={loan.id} className="bg-luxury-black/40 border border-luxury-border-dim p-6 rounded-[32px] group hover:border-red-400/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="font-serif font-black text-lg text-luxury-text group-hover:text-red-400 transition-colors uppercase tracking-tight">{loan.customerName}</p>
                          <p className="text-[10px] text-luxury-text-muted font-black tracking-widest">{loan.customerPhone}</p>
                       </div>
                       <p className="text-sm font-black text-luxury-text font-mono">{formatCurrency(loan.loanAmount)}</p>
                    </div>
                    <div className="space-y-3 mb-6">
                       <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                          <span className="text-luxury-text-dim">Last Inactivity</span>
                          <span className="text-red-400">{months} Months</span>
                       </div>
                       <div className="w-full h-1 bg-luxury-surface rounded-full overflow-hidden">
                          <div className="h-full bg-red-400" style={{ width: `${Math.min(100, (months / (settings.girviDefaultPeriodMonths * 2)) * 100)}%` }} />
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <p className="text-[9px] text-luxury-text-dim flex-1">Last activity on {lastActivityDate.toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Collateral Itemized Inventory */}
      <div className="bg-luxury-surface/30 border border-luxury-border-dim p-8 rounded-[40px] flex flex-col space-y-6">
        <div>
          <h3 className="text-xl font-serif font-black text-luxury-text uppercase tracking-tight">
             {view === 'customer' ? 'Vault Ornament Registry' : 'Pledged Asset Registry'}
          </h3>
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">
             Itemized list of all ornaments currently in {view === 'customer' ? 'vault custody' : 'pledged custody'}
          </p>
        </div>
        <Table columns={itemColumns} data={activeOrnamentsData} />
      </div>
    </div>
  );
};
