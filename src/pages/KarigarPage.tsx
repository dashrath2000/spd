import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Phone, 
  UserPlus, 
  DollarSign, 
  Briefcase,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button, cn } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/calculations';
import { OrderListPage } from './OrderListPage';

export const KarigarPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'orders' ? 'orders' : 'karigars';

  const setActiveTab = (tab: 'karigars' | 'orders') => {
    setSearchParams({ tab });
  };

  const { karigars, jobOrders, isLoading } = useKarigarStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter karigars
  const filteredKarigars = useMemo(() => {
    return karigars.filter(k => {
      const matchesSearch = k.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isActive = k.isActive !== false;
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [karigars, searchTerm, statusFilter]);

  // Compute active job orders count per karigar
  const karigarStats = useMemo(() => {
    const stats: Record<string, { activeOrders: number }> = {};
    
    karigars.forEach(k => {
      stats[k.id] = { activeOrders: 0 };
    });

    jobOrders.forEach(o => {
      if (o.status !== 'completed' && stats[o.karigarId]) {
        stats[o.karigarId].activeOrders++;
      }
    });

    return stats;
  }, [karigars, jobOrders]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-luxury-text-muted text-xs uppercase font-black tracking-widest animate-pulse">
        Loading Artisans Database...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in pb-24 relative min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-luxury-border-dim pb-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-luxury-text mb-2 tracking-tight">
            {activeTab === 'karigars' ? 'Artisans Ledger' : 'Karigar Job Orders'}
          </h1>
          <p className="text-luxury-text-dim uppercase tracking-[0.3em] text-[10px] font-black">
            {activeTab === 'karigars' ? 'Karigar Profiles & Wage Ledger' : 'Production & Metal Issuance Tracking'}
          </p>
        </div>

        <div className="flex gap-4 items-center">
          {/* Tab Selector */}
          <div className="flex bg-luxury-charcoal/50 border border-luxury-border-dim p-1 rounded-xl mr-4 shadow-lg">
            <button 
              onClick={() => setActiveTab('karigars')}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                activeTab === 'karigars' ? "bg-gold-400 text-luxury-black shadow-lg font-black" : "text-luxury-text-muted hover:text-luxury-text"
              )}
            >
              Artisans
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                activeTab === 'orders' ? "bg-gold-400 text-luxury-black shadow-lg font-black" : "text-luxury-text-muted hover:text-luxury-text"
              )}
            >
              Job Orders
            </button>
          </div>

          {activeTab === 'karigars' ? (
            <Button 
              variant="gold" 
              size="lg" 
              onClick={() => navigate('/karigar/add')} 
              className="h-14 px-8 shadow-xl shadow-gold-400/20"
            >
              <UserPlus size={20} className="mr-3" /> Add New Artisan
            </Button>
          ) : (
            <Button
              variant="gold"
              size="lg"
              onClick={() => navigate('/order/new')}
              className="h-14 px-8 shadow-xl shadow-gold-400/20"
            >
              <PlusCircle size={20} className="mr-3" /> Create Job Order
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'karigars' ? (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-luxury-charcoal/30 p-4 rounded-2xl border border-luxury-border-dim">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim" size={18} />
              <input
                type="text"
                placeholder="Search artisans by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-luxury-black border border-luxury-border rounded-xl pl-12 pr-6 text-sm focus:border-gold-400 outline-none transition-all text-luxury-text"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex bg-luxury-charcoal border border-luxury-border-dim p-1 rounded-xl shadow-lg">
              {(['all', 'active', 'inactive'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    statusFilter === filter
                      ? 'bg-gold-400 text-luxury-black shadow-lg font-black'
                      : 'text-luxury-text-muted hover:text-luxury-text'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKarigars.map(k => {
              const initials = k.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const activeOrders = karigarStats[k.id]?.activeOrders || 0;
              const advBal = k.advanceBalance || 0;

              return (
                <div 
                  key={k.id}
                  onClick={() => navigate(`/karigars/${k.id}`)}
                  className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-6 shadow-xl hover:border-gold-400/40 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between h-72"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-gold-400/10 rounded-2xl flex items-center justify-center text-gold-400 font-serif font-bold text-lg group-hover:scale-110 transition-transform">
                        {initials}
                      </div>
                      <Badge variant={k.isActive !== false ? 'success' : 'outline'} className="text-[9px]">
                        {k.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-serif font-bold text-luxury-text group-hover:text-gold-400 transition-colors">
                      {k.name}
                    </h3>
                    
                    <div className="mt-2">
                      <Badge variant="gold" className="text-[9px] font-black uppercase tracking-wider">
                        {k.skill || k.specialization || 'Goldsmith'}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-luxury-border-dim/50 my-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-luxury-text-muted" />
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-luxury-text-muted font-bold">Active Jobs</p>
                        <p className="text-sm font-bold text-luxury-text">{activeOrders} Orders</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-red-400" />
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-luxury-text-muted font-bold">Advance Bal</p>
                        <p className="text-sm font-bold text-red-400">{formatCurrency(advBal)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer row */}
                  <div className="flex justify-between items-center text-xs text-luxury-text-muted">
                    <span className="flex items-center gap-1"><Phone size={12} /> {k.phone || k.contact}</span>
                    <span className="font-black uppercase tracking-wider text-[9px] text-gold-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Ledger <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredKarigars.length === 0 && (
              <div className="col-span-full py-16 text-center text-luxury-text-dim text-[11px] uppercase font-black tracking-[0.3em] bg-luxury-charcoal rounded-3xl border border-luxury-border">
                No artisans found matching search criteria
              </div>
            )}
          </div>
        </>
      ) : (
        <OrderListPage hideHeader />
      )}

      {/* Floating Action Button (FAB) */}
      {activeTab === 'karigars' && (
        <button
          onClick={() => navigate('/karigar/add')}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 text-luxury-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-gold-400/20 z-50 group"
        >
          <UserPlus size={26} className="transition-transform group-hover:rotate-12" />
        </button>
      )}

    </div>
  );
};
