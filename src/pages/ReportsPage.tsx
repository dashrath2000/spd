import { useMemo } from 'react';
import {
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
   PieChart,
   Pie,
   Cell,
   AreaChart,
   Area
} from 'recharts';
import {
   TrendingUp,
   Layers,
   Users,
   FileDown,
   Sparkles,
   ChevronRight,
   CircleDot,
   Wallet
} from 'lucide-react';
import { useSalesStore } from '../store/salesStore';
import { useProductStore } from '../store/productStore';
import { useCustomerStore } from '../store/customerStore';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/calculations';
import { useSettingsStore } from '../store/settingsStore';
import { subDays, format } from 'date-fns';



export const ReportsPage = () => {
   const { sales } = useSalesStore();
   useProductStore();
   const { customers } = useCustomerStore();
   const { settings } = useSettingsStore();
   const accentColor = settings.theme === 'light' ? '#2563eb' : '#C9A84C';
   const GOLD_COLORS = settings.theme === 'light'
      ? ['#2563eb', '#1d4ed8', '#1e40af', '#3b82f6', '#93c5fd']
      : ['#C9A84C', '#ba943a', '#a37c31', '#85612a', '#e9deba'];
   const stats = useMemo(() => {
      const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);
      const totalTransactions = sales.length;
      const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((i, item) => i + item.quantity, 0), 0);
      const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

      return { totalRevenue, totalTransactions, avgOrderValue, itemsSold, totalOutstanding };
   }, [sales, customers]);

   const salesData = useMemo(() => {
      // Last 14 days
      const days = Array.from({ length: 14 }).map((_, i) => {
         const date = subDays(new Date(), 13 - i);
         const dateStr = format(date, 'yyyy-MM-dd');
         const daySales = sales.filter(s => format(new Date(s.createdAt), 'yyyy-MM-dd') === dateStr);
         return {
            name: format(date, 'MMM dd'),
            revenue: daySales.reduce((sum, s) => sum + s.grandTotal, 0),
            count: daySales.length
         };
      });
      return days;
   }, [sales]);

   const categoryData = useMemo(() => {
      const categories: Record<string, number> = {};
      sales.forEach(s => {
         s.items.forEach(item => {
            const cat = item.product.category;
            categories[cat] = (categories[cat] || 0) + (item.finalPrice);
         });
      });
      return Object.entries(categories).map(([name, value]) => ({ name, value }));
   }, [sales]);

   return (
      <div className="space-y-12 animate-fade-in pb-20 transition-colors duration-500">
         <div className="flex items-end justify-between">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <ChevronRight size={16} className="text-gold-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-muted transition-colors">Analytics Suite</p>
               </div>
               <h1 className="text-4xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase">
                  Business <span className="text-gold-400">Intelligence</span>
               </h1>
            </div>
            <Button variant="gold" className="h-14 font-black text-[10px] tracking-widest uppercase shadow-[0_10px_30px_rgba(201,168,76,0.3)]">
               <FileDown size={20} className="mr-3" /> System Report PDF
            </Button>
         </div>

         {/* High Level Metrics */}
         <div className="grid grid-cols-4 gap-8">
            {[
               { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, delta: '+8.2%', detail: 'Previous Month Portfolio' },
               { label: 'Outstanding Receivables', value: formatCurrency(stats.totalOutstanding), icon: Wallet, delta: stats.totalOutstanding > 0 ? 'RISK' : 'SAFE', detail: 'Statutory Debt Exposure', color: stats.totalOutstanding > 0 ? 'text-red-500' : 'text-green-500' },
               { label: 'Average Value', value: formatCurrency(stats.avgOrderValue), icon: CircleDot, delta: '-2.1%', detail: 'Per Transaction Depth' },
               { label: 'Active Clients', value: customers.length, icon: Users, delta: '+5.0%', detail: 'Retention Horizon' }
            ].map((stat, i) => (
               <div key={i} className="card-luxury p-8 relative overflow-hidden group hover:border-gold-400/30 transition-all bg-luxury-charcoal border-luxury-border">
                  <div className="flex justify-between items-start relative z-10 transition-colors">
                     <div className="p-3 bg-luxury-surface rounded-2xl text-gold-400 group-hover:bg-gold-400 group-hover:text-luxury-black transition-all">
                        <stat.icon size={24} />
                     </div>
                     <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 font-black text-[10px]">
                        {stat.delta}
                     </div>
                  </div>
                  <div className="mt-8 relative z-10 transition-colors">
                     <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-2">{stat.label}</p>
                     <p className="text-4xl font-serif font-black text-luxury-text mb-2 transition-colors">{stat.value}</p>
                     <p className="text-[9px] uppercase font-bold text-luxury-text-dim tracking-widest">{stat.detail}</p>
                  </div>
                  {/* Background Glow */}
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gold-400/5 blur-3xl rounded-full" />
               </div>
            ))}
         </div>

         <div className="grid grid-cols-12 gap-8">
            {/* Main Revenue Chart */}
            <div className="col-span-8 card-luxury p-10 bg-luxury-charcoal border-luxury-border space-y-10 transition-colors">
               <div className="flex justify-between items-end">
                  <div>
                     <h3 className="text-2xl font-serif font-black text-gold-400 mb-2 uppercase">Revenue Velocity</h3>
                     <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Temporal Performance Map • Last 14 Periods</p>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-2 transition-colors"><div className="w-2 h-2 rounded-full bg-gold-400" /> <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-text-muted">Portfolio (₹)</span></div>
                     <div className="flex items-center gap-2 transition-colors"><div className="w-2 h-2 rounded-full bg-luxury-border" /> <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-text-dim">Volume Index</span></div>
                  </div>
               </div>

               <div className="h-[400px] w-full transition-colors">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={salesData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={accentColor} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--luxury-border-dim)" vertical={false} />
                        <XAxis
                           dataKey="name"
                           stroke="var(--luxury-text-muted)"
                           tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--luxury-text-dim)' }}
                           axisLine={false}
                           tickLine={false}
                        />
                        <YAxis
                           yAxisId="revenue"
                           stroke="var(--luxury-text-muted)"
                           tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--luxury-text-dim)' }}
                           axisLine={false}
                           tickLine={false}
                           tickFormatter={(value) => `₹${value / 1000}k`}
                        />
                        <YAxis
                           yAxisId="count"
                           orientation="right"
                           stroke="var(--luxury-text-muted)"
                           tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--luxury-text-dim)' }}
                           axisLine={false}
                           tickLine={false}
                        />
                        <Tooltip
                           contentStyle={{ backgroundColor: 'var(--luxury-charcoal)', border: '1px solid var(--luxury-border)', borderRadius: '16px' }}
                           itemStyle={{ color: accentColor, fontWeight: 900 }}
                           labelStyle={{ color: 'var(--luxury-text)', fontWeight: 900, marginBottom: '8px' }}
                        />
                        <Area
                           yAxisId="revenue"
                           type="monotone"
                           dataKey="revenue"
                           stroke={accentColor}
                           strokeWidth={4}
                           fillOpacity={1}
                           fill="url(#goldGradient)"
                        />
                        <Area
                           yAxisId="count"
                           type="monotone"
                           dataKey="count"
                           stroke="rgba(255,255,255,0.2)"
                           strokeWidth={2}
                           fillOpacity={0.1}
                           fill="rgba(255,255,255,0.05)"
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>

               <div className="grid grid-cols-3 gap-8 pt-8 border-t border-luxury-border-dim transition-colors">
                  <div className="p-6 bg-luxury-surface rounded-3xl border border-luxury-border transition-colors">
                     <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-2">Cycle Peak</p>
                     <p className="text-2xl font-serif font-black text-luxury-text transition-colors">{formatCurrency(Math.max(...salesData.map(d => d.revenue)))}</p>
                  </div>
                  <div className="p-6 bg-luxury-surface rounded-3xl border border-luxury-border transition-colors">
                     <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-2">Growth Vector</p>
                     <p className="text-1xl font-serif font-black text-green-500 uppercase tracking-tight">Accelerating</p>
                  </div>
                  <div className="p-6 bg-luxury-surface rounded-3xl border border-luxury-border transition-colors">
                     <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-2">Confidence Index</p>
                     <p className="text-2xl font-serif font-black text-gold-400">98.4%</p>
                  </div>
               </div>
            </div>

            {/* Pie Charts and Secondary Info */}
            <div className="col-span-4 space-y-8">
               <div className="card-luxury p-10 flex flex-col items-center bg-luxury-charcoal border-luxury-border transition-colors">
                  <h3 className="text-2xl font-serif font-black text-gold-400 mb-2 w-full text-left uppercase">Vertical Affinity</h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-10 w-full text-left">Category Absorption Map</p>

                  <div className="h-[280px] w-full relative transition-colors">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={120}
                              paddingAngle={8}
                              dataKey="value"
                           >
                              {categoryData.map((_entry, index) => (
                                 <Cell key={`cell-${index}`} fill={GOLD_COLORS[index % GOLD_COLORS.length]} stroke="rgba(0,0,0,0)" />
                              ))}
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-colors">
                        <Layers size={32} className="text-gold-400/20 mb-2" />
                        <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim leading-none">Market</p>
                        <p className="text-lg font-serif font-black text-luxury-text leading-tight uppercase transition-colors">Segments</p>
                     </div>
                  </div>

                  <div className="w-full space-y-4 mt-8 transition-colors">
                     {categoryData.slice(0, 4).map((cat, i) => (
                        <div key={i} className="flex justify-between items-center group cursor-default transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GOLD_COLORS[i % GOLD_COLORS.length] }} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-luxury-text-muted group-hover:text-luxury-text transition-colors">{cat.name}</span>
                           </div>
                           <span className="text-xs font-serif font-bold text-luxury-text transition-colors">{Math.round((cat.value / stats.totalRevenue) * 100)}%</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="card-luxury p-10 bg-gradient-to-br from-gold-600 to-gold-400 text-luxury-black border-transparent shadow-gold-500/20 shadow-2xl overflow-hidden relative group transition-colors">
                  <div className="absolute -top-10 -right-10 p-4 opacity-10 rotate-12 transition-transform group-hover:scale-110 group-hover:-rotate-12"><Sparkles size={160} /></div>
                  <h4 className="text-2xl font-serif font-black mb-6 flex items-center gap-3 uppercase">
                     <TrendingUp size={24} /> Elite Insight
                  </h4>
                  <p className="text-xs uppercase font-black tracking-widest leading-relaxed mb-8 opacity-80">
                     Your "Necklace" Collection represents 58.2% of your high-yield portfolio this quarter. Consider amplifying the marketing for your upcoming "Rose Gold" collection as current retention index is surging.
                  </p>
                  <Button variant="ghost" className="w-full bg-luxury-black/10 hover:bg-luxury-black/20 text-luxury-black border border-luxury-black/20 font-black text-[10px] tracking-[0.3em] uppercase py-4 transition-all">Generate Personalized Strategy</Button>
               </div>
            </div>
         </div>

         {/* Debt Ledger Section */}
         <div className="space-y-8 animate-slide-up transition-colors">
            <div className="flex items-center gap-3 transition-colors">
               <ChevronRight size={16} className="text-gold-400" />
               <h3 className="text-xl font-serif font-bold text-luxury-text uppercase tracking-tight transition-colors">Statutory Debt Ledger</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-colors">
               {customers.filter(c => (c.outstandingBalance || 0) > 0).sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0)).slice(0, 6).map((c, i) => (
                  <div key={i} className="p-6 bg-luxury-surface border border-luxury-border rounded-3xl flex items-center justify-between group hover:border-red-500/20 transition-all">
                     <div className="flex items-center gap-4 transition-colors">
                        <div className="w-10 h-10 bg-luxury-black rounded-xl flex items-center justify-center font-bold text-luxury-text-dim group-hover:text-red-400 transition-colors">
                           {c.name[0]}
                        </div>
                        <div>
                           <p className="font-bold text-luxury-text text-sm uppercase tracking-wide transition-colors">{c.name}</p>
                           <p className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest transition-colors">{c.phone}</p>
                        </div>
                     </div>
                     <div className="text-right transition-colors">
                        <p className="text-lg font-bold text-red-500 transition-colors">{formatCurrency(c.outstandingBalance || 0)}</p>
                        <p className="text-[8px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">Outstanding Liability</p>
                     </div>
                  </div>
               ))}
               {customers.filter(c => (c.outstandingBalance || 0) > 0).length === 0 && (
                  <div className="col-span-full p-12 text-center bg-luxury-surface rounded-3xl border border-dashed border-luxury-border opacity-40 transition-colors">
                     <p className="text-sm uppercase font-black tracking-widest transition-colors">No outstanding boutique liabilities detected.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};
