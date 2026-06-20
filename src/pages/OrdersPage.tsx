import { useState } from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import { SalesOrderPage } from './SalesOrderPage';
import { PurchaseOrderPage } from './PurchaseOrderPage';
import { cn } from '../components/ui/Button';

export const OrdersPage = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-luxury-border-dim pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {activeTab === 'sales' ? (
              <ShoppingBag size={16} className="text-gold-400" />
            ) : (
              <Truck size={16} className="text-gold-400" />
            )}
            <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-muted">
              Order Management
            </p>
          </div>
          <h1 className="text-4xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase">
            {activeTab === 'sales' ? 'Sales' : 'Purchase'}{' '}
            <span className="text-gold-400">Orders</span>
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-luxury-charcoal/50 border border-luxury-border-dim p-1 rounded-xl shadow-lg">
          <button
            onClick={() => setActiveTab('sales')}
            className={cn(
              "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
              activeTab === 'sales' ? "bg-gold-400 text-luxury-black shadow-lg" : "text-luxury-text-muted hover:text-luxury-text"
            )}
          >
            <ShoppingBag size={12} />
            Sales Orders
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={cn(
              "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
              activeTab === 'purchase' ? "bg-gold-400 text-luxury-black shadow-lg" : "text-luxury-text-muted hover:text-luxury-text"
            )}
          >
            <Truck size={12} />
            Purchase Orders
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div>
        {activeTab === 'sales' ? (
          <SalesOrderPage />
        ) : (
          <PurchaseOrderPage />
        )}
      </div>
    </div>
  );
};
