import { useMemo, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Gem,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Layers,
  Wallet,
  Scale,
} from 'lucide-react';
import { useSalesStore } from '../store/salesStore';
import { useProductStore } from '../store/productStore';
import { useCustomerStore } from '../store/customerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useOldGoldPurchaseStore } from '../store/oldGoldPurchaseStore';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { formatCurrency, calculateProductPrice } from '../utils/calculations';
import { cn } from '../components/ui/Button';
import {
  isSameDay,
  isSameMonth,
  isSameYear,
  subDays,
  isAfter
} from 'date-fns';

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'overall';

export const DashboardPage = () => {
  const { sales } = useSalesStore();
  const { products } = useProductStore();
  const { customers } = useCustomerStore();
  const { settings } = useSettingsStore();
  const { activeBranchId } = useAuthStore();
  const { purchases } = useOldGoldPurchaseStore();
  const { purchaseOrders } = usePurchaseOrderStore();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('overall');
  const [chartMode, setChartMode] = useState<'metal' | 'category'>('metal');

  // Metrics calculation
  const metrics = useMemo(() => {
    const now = new Date();

    const filteredSales = sales.filter(s => {
      if (activeBranchId && s.branchId !== activeBranchId) return false;
      const saleDate = new Date(s.createdAt);
      switch (timeFrame) {
        case 'daily': return isSameDay(saleDate, now);
        case 'weekly': return isAfter(saleDate, subDays(now, 7));
        case 'monthly': return isSameMonth(saleDate, now);
        case 'yearly': return isSameYear(saleDate, now);
        case 'overall': return true;
        default: return true;
      }
    });

    let totalRevenue = 0;
    let totalMakingCharges = 0;

    filteredSales.forEach(s => {
      totalRevenue += s.grandTotal;
      s.items.forEach(item => {
        const saleSettings = {
          ...settings,
          metalRates: {
            'Gold': s.goldRate,
            'Silver': s.silverRate,
            'Platinum': s.platinumRate
          }
        };
        const prices = calculateProductPrice(item.product, saleSettings as any);
        totalMakingCharges += (prices.makingCharges * item.quantity);
      });
    });

    const branchProducts = products.filter(p => !activeBranchId || p.branchId === activeBranchId);
    const lowStockCount = branchProducts.filter(p => p.stock <= p.lowStockThreshold).length;
    const inventoryValuation = branchProducts.reduce((sum, p) => {
      return sum + (calculateProductPrice(p, settings).finalPrice * p.stock);
    }, 0);

    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

    return {
      totalRevenue,
      totalMakingCharges,
      totalSalesCount: filteredSales.length,
      totalCustomers: customers.length,
      totalOutstanding,
      lowStockCount,
      inventoryValuation,
      avgOrderValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
    };
  }, [sales, products, customers, timeFrame, settings, activeBranchId]);

  // Extract all metal types dynamically
  const metalTypes = useMemo(() => {
    const fromRates = settings?.metalRates ? Object.keys(settings.metalRates) : [];
    const defaults = ['Gold', 'Silver', 'Platinum'];
    const merged = Array.from(new Set([...fromRates, ...defaults]));
    return merged.filter(m => m.toLowerCase() !== 'diamond');
  }, [settings?.metalRates]);

  // Calculate timeframe-specific metal weights sold, purchased, and net balance
  const dailyMetalStats = useMemo(() => {
    const stats: Record<string, { sold: number; purchased: { tradeIn: number; standalone: number; supplier: number; total: number }; balance: number }> = {};

    metalTypes.forEach(metal => {
      stats[metal] = {
        sold: 0,
        purchased: { tradeIn: 0, standalone: 0, supplier: 0, total: 0 },
        balance: 0
      };
    });

    const now = new Date();

    // 1. Filter Sales by Timeframe & Branch
    const filteredSales = sales.filter(s => {
      if (activeBranchId && s.branchId !== activeBranchId) return false;
      const saleDate = new Date(s.createdAt);
      switch (timeFrame) {
        case 'daily': return isSameDay(saleDate, now);
        case 'weekly': return isAfter(saleDate, subDays(now, 7));
        case 'monthly': return isSameMonth(saleDate, now);
        case 'yearly': return isSameYear(saleDate, now);
        case 'overall': return true;
        default: return true;
      }
    });

    // 2. Filter Standalone Old Gold Purchases by Timeframe & Branch
    const filteredPurchases = purchases.filter(p => {
      if (activeBranchId && p.branchId !== activeBranchId) return false;
      const purchaseDate = new Date(p.createdAt);
      switch (timeFrame) {
        case 'daily': return isSameDay(purchaseDate, now);
        case 'weekly': return isAfter(purchaseDate, subDays(now, 7));
        case 'monthly': return isSameMonth(purchaseDate, now);
        case 'yearly': return isSameYear(purchaseDate, now);
        case 'overall': return true;
        default: return true;
      }
    });

    // 3. Filter Supplier POs by Timeframe & status 'Received'
    const filteredSupplierPOs = purchaseOrders.filter(po => {
      if (po.status !== 'Received') return false;
      if (activeBranchId && (po as any).branchId && (po as any).branchId !== activeBranchId) return false;
      const receiveDate = new Date(po.updatedAt || po.createdAt || po.orderDate);
      switch (timeFrame) {
        case 'daily': return isSameDay(receiveDate, now);
        case 'weekly': return isAfter(receiveDate, subDays(now, 7));
        case 'monthly': return isSameMonth(receiveDate, now);
        case 'yearly': return isSameYear(receiveDate, now);
        case 'overall': return true;
        default: return true;
      }
    });

    // A. Sum Sold Weights & Trade-in Weights from Sales
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const itemMetal = item.product.metalType || '';
        metalTypes.forEach(metal => {
          if (itemMetal.toLowerCase() === metal.toLowerCase()) {
            stats[metal].sold += (item.product.weight || 0) * (item.quantity || 0);
          }
        });
      });

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

    // B. Sum Standalone Purchases
    filteredPurchases.forEach(p => {
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

    // C. Sum Supplier PO Weights
    filteredSupplierPOs.forEach(po => {
      po.items.forEach(item => {
        const itemMetal = item.metalType || '';
        metalTypes.forEach(metal => {
          if (itemMetal.toLowerCase() === metal.toLowerCase()) {
            stats[metal].purchased.supplier += (item.weight || 0) * (item.quantity || 0);
          }
        });
      });
    });

    // Compute Net Balance
    metalTypes.forEach(metal => {
      const p = stats[metal].purchased;
      p.total = p.tradeIn + p.standalone + p.supplier;
      stats[metal].balance = p.total - stats[metal].sold; // positive = net gain, negative = net sold
    });

    return stats;
  }, [sales, purchases, purchaseOrders, timeFrame, activeBranchId, metalTypes]);

  // Chart Data: Sales by Day (Last 14 days)
  const salesData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last14Days.map(date => {
      const daySales = sales.filter(s => s.createdAt.startsWith(date) && (!activeBranchId || s.branchId === activeBranchId));
      return {
        name: new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        revenue: daySales.reduce((sum, s) => sum + s.grandTotal, 0),
        count: daySales.length
      };
    });
  }, [sales, activeBranchId]);

  // Chart Data: Metal Distribution
  const metalData = useMemo(() => {
    const distribution: Record<string, number> = {};
    const branchProducts = products.filter(p => !activeBranchId || p.branchId === activeBranchId);

    branchProducts.forEach(p => {
      const { finalPrice } = calculateProductPrice(p, settings);
      distribution[p.metalType] = (distribution[p.metalType] || 0) + (p.stock * finalPrice);
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [products, activeBranchId]);

  // Chart Data: Category Distribution (Useful from Reports)
  const categoryData = useMemo(() => {
    const distribution: Record<string, number> = {};
    const branchSales = sales.filter(s => !activeBranchId || s.branchId === activeBranchId);

    branchSales.forEach(s => {
      s.items.forEach(item => {
        const cat = item.product.category;
        distribution[cat] = (distribution[cat] || 0) + (item.finalPrice);
      });
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [sales, activeBranchId]);

  const accentColor = settings.theme === 'light' ? '#2563eb' : '#C9A84C';
  const GOLD_COLORS = settings.theme === 'light'
    ? ['#2563eb', '#1d4ed8', '#1e40af', '#3b82f6', '#93c5fd']
    : ['#C9A84C', '#ba943a', '#a37c31', '#85612a', '#e9deba'];

  const COLORS = settings.theme === 'light'
    ? ['#2563eb', '#E5E7EB', '#60A5FA', '#F87171', '#34D399']
    : ['#C9A84C', '#E5E7EB', '#60A5FA', '#F87171', '#34D399'];

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Welcome Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ChevronRight size={18} className="text-gold-400" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-luxury-text-muted">Executive Oversight</p>
          </div>
          <h1 className="text-4xl font-serif font-black text-luxury-text tracking-tight leading-none">
            Shop <span className="text-gold-400">Intelligence</span>
          </h1>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 bg-luxury-charcoal/50 border border-luxury-border-dim p-1.5 rounded-xl">
            {(['daily', 'weekly', 'monthly', 'yearly', 'overall'] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={cn(
                  "px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] rounded-lg transition-all",
                  timeFrame === tf
                    ? "bg-gold-400 text-luxury-black shadow-lg"
                    : "text-luxury-text-muted hover:text-luxury-text"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 bg-luxury-charcoal/50 border border-luxury-border-dim rounded-2xl px-6 py-4">
            <Clock size={18} className="text-gold-400" />
            <p className="text-xs uppercase font-black tracking-widest text-luxury-text-muted">
              Real-time Analytics Active • {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: DollarSign, label: 'Gross Total', value: formatCurrency(metrics.totalRevenue), change: '+12.5%', isPositive: true },
          { icon: Wallet, label: 'Outstanding', value: formatCurrency(metrics.totalOutstanding), change: metrics.totalOutstanding > 0 ? 'RISK' : 'SAFE', isPositive: metrics.totalOutstanding === 0 },
          { icon: TrendingUp, label: 'Orders Sold', value: metrics.totalSalesCount, change: '+5.2%', isPositive: true },
        ].map((kpi, i) => (
          <div key={i} className="card-luxury p-8 bg-luxury-input border-luxury-border-dim group hover:border-gold-400/20 transition-all relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
              <kpi.icon size={100} />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-luxury-black/60 rounded-xl border border-luxury-border-dim text-gold-400">
                <kpi.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full",
                kpi.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {kpi.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpi.change}
              </div>
            </div>
            <span className="text-[13px] uppercase font-black tracking-[0.2em] text-gold-400/50 mb-1 block">{timeFrame}</span>
            <h4 className="text-xs uppercase font-black tracking-widest text-luxury-text opacity-80 mb-2">{kpi.label}</h4>
            <p className="text-4xl font-serif font-black text-luxury-text">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Timeframe Metal Weight Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metal Sold Card */}
        <div className="card-luxury p-8 bg-luxury-input border-luxury-border-dim group hover:border-gold-400/20 transition-all relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
            <Scale size={100} />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-luxury-black/60 rounded-xl border border-luxury-border-dim text-gold-400">
              <Scale size={24} />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-gold-400/10 text-gold-400">
              OUTFLOW
            </div>
          </div>
          <span className="text-[13px] uppercase font-black tracking-[0.2em] text-gold-400/50 mb-1 block">{timeFrame} Sold</span>
          <h4 className="text-xs uppercase font-black tracking-widest text-luxury-text opacity-80 mb-4">Metal Sold Weight</h4>
          <div className="space-y-3 relative z-10">
            {metalTypes.map(metal => {
              const weight = dailyMetalStats[metal]?.sold || 0;
              return (
                <div key={metal} className="flex justify-between items-center border-b border-luxury-border-dim/20 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-xs font-bold text-luxury-text-muted uppercase tracking-wider">{metal}</span>
                  <span className="text-base font-mono font-black text-luxury-text">{weight.toFixed(3)} g</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metal Purchased Card */}
        <div className="card-luxury p-8 bg-luxury-input border-luxury-border-dim group hover:border-gold-400/20 transition-all relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
            <Scale size={100} />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-luxury-black/60 rounded-xl border border-luxury-border-dim text-gold-400">
              <Scale size={24} />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-gold-400/10 text-gold-400">
              INFLOW
            </div>
          </div>
          <span className="text-[13px] uppercase font-black tracking-[0.2em] text-gold-400/50 mb-1 block">{timeFrame} Purchased</span>
          <h4 className="text-xs uppercase font-black tracking-widest text-luxury-text opacity-80 mb-4">Metal Purchased Weight</h4>
          <div className="space-y-3 relative z-10">
            {metalTypes.map(metal => {
              const stats = dailyMetalStats[metal]?.purchased || { total: 0, tradeIn: 0, standalone: 0, supplier: 0 };
              return (
                <div key={metal} className="flex flex-col border-b border-luxury-border-dim/25 last:border-0 pb-2 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-luxury-text-muted uppercase tracking-wider">{metal}</span>
                    <span className="text-base font-mono font-black text-luxury-text">{stats.total.toFixed(3)} g</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] uppercase font-black text-luxury-text-dim/60 mt-1">
                      {stats.tradeIn > 0 && <span>In-Store: {stats.tradeIn.toFixed(1)}g</span>}
                      {stats.standalone > 0 && <span>Direct: {stats.standalone.toFixed(1)}g</span>}
                      {stats.supplier > 0 && <span>Supplier: {stats.supplier.toFixed(1)}g</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Net Metal Balance Card */}
        <div className="card-luxury p-8 bg-gold-400/5 border border-gold-400/20 group transition-all relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
            <Scale size={100} className="text-gold-400" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-luxury-black/60 rounded-xl border border-luxury-border-dim text-gold-400">
              <Scale size={24} />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-gold-400/10 text-gold-400">
              BALANCE
            </div>
          </div>
          <span className="text-[13px] uppercase font-black tracking-[0.2em] text-gold-400/50 mb-1 block">{timeFrame} Net</span>
          <h4 className="text-xs uppercase font-black tracking-widest text-gold-400/80 mb-4">Net Metal Balance</h4>
          <div className="space-y-3 relative z-10">
            {metalTypes.map(metal => {
              const balance = dailyMetalStats[metal]?.balance || 0;
              const isPositive = balance > 0;
              return (
                <div key={metal} className="flex justify-between items-center border-b border-gold-400/10 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-xs font-bold text-gold-400/70 uppercase tracking-wider">{metal}</span>
                  <span className={cn(
                    "text-base font-mono font-black",
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

      <div className="grid grid-cols-12 gap-8 h-[500px]">
        {/* Main Revenue Chart */}
        <div className="col-span-12 lg:col-span-8 card-luxury bg-luxury-surface/30 border-luxury-border-dim p-8 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-serif font-black text-luxury-text leading-tight mb-2 uppercase tracking-tight">Revenue Velocity</h3>
              <p className="text-xs uppercase font-black tracking-widest text-luxury-text-dim">Historical map • Last 14 days</p>
            </div>
            <div className="flex gap-2">
              <div className="px-5 py-2.5 bg-luxury-black rounded-xl border border-luxury-border-dim text-xs font-black uppercase text-gold-400">Weekly</div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#666', fontSize: 10, fontWeight: 900 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#666', fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(val: number) => `₹${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ background: settings.theme === 'light' ? '#ffffff' : '#121212', border: `1px solid ${settings.theme === 'light' ? 'rgba(37,99,235,0.2)' : 'rgba(201,168,76,0.2)'}`, borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: accentColor, fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={accentColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metal/Category Pie Chart */}
        <div className="col-span-12 lg:col-span-4 card-luxury bg-luxury-surface/30 border-luxury-border-dim p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-serif font-black text-luxury-text leading-tight mb-2 uppercase tracking-tight">
                {chartMode === 'metal' ? 'Vault' : 'Market'}
              </h3>
              <p className="text-xs uppercase font-black tracking-widest text-luxury-text-dim">
                {chartMode === 'metal' ? 'Asset by metal' : 'Segment distribution'}
              </p>
            </div>
            <div className="flex bg-luxury-black/40 p-1 rounded-xl border border-luxury-border-dim">
              <button
                onClick={() => setChartMode('metal')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  chartMode === 'metal' ? "bg-gold-400 text-luxury-black" : "text-luxury-text-muted hover:text-luxury-text"
                )}
              >
                <Gem size={14} />
              </button>
              <button
                onClick={() => setChartMode('category')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  chartMode === 'category' ? "bg-gold-400 text-luxury-black" : "text-luxury-text-muted hover:text-luxury-text"
                )}
              >
                <Layers size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartMode === 'metal' ? metalData : categoryData}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(chartMode === 'metal' ? metalData : categoryData).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartMode === 'metal' ? COLORS[index % COLORS.length] : GOLD_COLORS[index % GOLD_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: settings.theme === 'light' ? '#ffffff' : '#121212', border: `1px solid ${settings.theme === 'light' ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '12px', fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {chartMode === 'metal' ? <Gem className="text-gold-400 mb-1 opacity-20" size={32} /> : <Layers className="text-gold-400 mb-1 opacity-20" size={32} />}
              <p className="text-[8px] uppercase font-black text-luxury-text opacity-40">{chartMode === 'metal' ? 'Equity' : 'Segments'}</p>
            </div>
          </div>
          <div className="mt-8 space-y-2 overflow-y-auto max-h-[140px] pr-2 scrollbar-thin">
            {(chartMode === 'metal' ? metalData : categoryData).map((entry: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-luxury-black/20 p-2.5 rounded-xl border border-luxury-border-dim">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: chartMode === 'metal' ? COLORS[i % COLORS.length] : GOLD_COLORS[i % GOLD_COLORS.length] }} />
                  <span className="text-[10px] font-black uppercase text-luxury-text-muted">{entry.name}</span>
                </div>
                <span className="text-[10px] font-bold text-luxury-text">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Insights */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 card-luxury bg-luxury-surface/30 border-luxury-border-dim p-10 flex flex-col justify-center">
          <h3 className="text-3xl font-serif font-black text-luxury-text mb-4 leading-none lowercase">Total Shop Valuation</h3>
          <div className="flex items-baseline gap-4 mb-8">
            <p className="text-5xl font-serif font-black text-gold-400 leading-none">
              {formatCurrency(products.reduce((s, p) => s + (calculateProductPrice(p, settings).finalPrice * p.stock), 0))}
            </p>
            <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black animate-pulse">
              Appreciating
            </div>
          </div>
          <div className="w-full h-2 bg-luxury-black rounded-full overflow-hidden mb-4">
            <div className="w-[65%] h-full bg-gold-400" style={{ boxShadow: `0 0 10px ${settings.theme === 'light' ? 'rgba(37,99,235,0.5)' : 'rgba(201,168,76,0.5)'}` }} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">65% of portfolio is highly liquid assets (Gold & Silver)</p>
        </div>
      </div>

      {/* Debt Ledger Section (Imported from Reports) */}
      <div className="space-y-8 animate-slide-up">
        <div className="flex items-center gap-3">
          <ChevronRight size={18} className="text-gold-400" />
          <h3 className="text-xl font-serif font-bold text-luxury-text uppercase tracking-tight leading-none">Top Outstanding Liabilities</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers
            .filter(c => (c.outstandingBalance || 0) > 0)
            .sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0))
            .slice(0, 3)
            .map((c, i) => (
              <div key={i} className="p-6 bg-luxury-charcoal/50 border border-luxury-border-dim rounded-3xl flex items-center justify-between group hover:border-red-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-luxury-black rounded-xl flex items-center justify-center font-bold text-luxury-text-dim group-hover:text-red-400 transition-colors">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-luxury-text text-sm uppercase tracking-wide">{c.name}</p>
                    <p className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest">{c.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-500">{formatCurrency(c.outstandingBalance || 0)}</p>
                  <p className="text-[8px] uppercase font-black tracking-widest text-luxury-text-dim">Liability</p>
                </div>
              </div>
            ))}
          {customers.filter(c => (c.outstandingBalance || 0) > 0).length === 0 && (
            <div className="col-span-full p-12 text-center bg-luxury-surface/20 rounded-3xl border border-dashed border-luxury-border-dim opacity-40">
              <p className="text-xs uppercase font-black tracking-widest leading-none">No active shop liabilities detected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
