import { useState, useMemo } from 'react';
import {
   Search,
   Filter,
   ChevronDown,
   CircleDot,
   Zap,
   Tag,
   LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useOwnerLoanStore } from '../store/ownerLoanStore';
import { ProductCard } from '../components/pos/ProductCard';
import { CartPanel } from '../components/pos/CartPanel';

import type { Category, MetalType } from '../types';

// Dynamic categories from settings
const METALS: MetalType[] = ['Gold', 'Silver', 'Platinum', 'Rose Gold', 'White Gold'];

export const POSPage = () => {
   const { products } = useProductStore();
   const { settings } = useSettingsStore();
   const { activeBranchId } = useAuthStore();
   const { ownerLoans } = useOwnerLoanStore();
   const navigate = useNavigate();

   const [searchTerm, setSearchTerm] = useState('');
   const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
   const [selectedMetal, setSelectedMetal] = useState<MetalType | 'All'>('All');

   const queryParams = new URLSearchParams(window.location.search);
   const isOrderMode = queryParams.get('mode') === 'order';


   const filteredProducts = useMemo(() => {
      const branchProducts = products.filter(p =>
         (!activeBranchId || p.branchId === activeBranchId) &&
         p.category !== 'Raw Material'
      );
      return branchProducts.filter((p) => {
         const searchLower = searchTerm.toLowerCase();
         const matchesSearch =
            (p.name?.toLowerCase() || '').includes(searchLower) ||
            (p.sku?.toLowerCase() || '').includes(searchLower) ||
            (p.barcode || '').includes(searchTerm);

         const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
         const matchesMetal = selectedMetal === 'All' || p.metalType === selectedMetal;

         const isPledged = ownerLoans.some(loan => 
            loan.status === 'Active' && 
            (loan.items || []).some(item => item.sourceType === 'inventory' && item.productId === p.id)
         );

         return matchesSearch && matchesCategory && matchesMetal && p.isActive && (p.stock > 0) && !isPledged;
      });
   }, [products, searchTerm, selectedCategory, selectedMetal, activeBranchId, ownerLoans]);

   return (
      <div 
         className="bg-luxury-black font-sans text-luxury-text p-4 pb-0 flex flex-col overflow-hidden"
         style={{ 
            height: 'calc(100vh - var(--banner-height, 0px))',
            marginTop: 'var(--banner-height, 0px)'
         }}
      >
         <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 pb-4">
            {/* Product Selection Left Panel */}
            <div className="lg:col-span-1 flex flex-col min-w-0 h-full min-h-0">
               <div className="flex flex-col gap-6 mb-8 shrink-0">
                  <div className="flex items-center justify-between">
                     <div>
                        <h1 className="text-2xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase">
                           {settings.shopName}
                        </h1>
                        <p className="text-[10px] uppercase tracking-widest font-black text-gold-400 mt-3 flex items-center gap-2">
                           <CircleDot size={12} className="text-green-500 animate-pulse" />
                           {activeBranchId ? settings.branches?.find(b => b.id === activeBranchId)?.name : 'Global Management'} • Terminal POS-01
                        </p>
                     </div>
                     <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
                     >
                        <LogOut size={16} />
                        Exit POS Mode
                     </button>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                     <div className="col-span-8 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
                        <input
                           type="text"
                           placeholder="Search by Name, SKU, or Scan Barcode..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full h-14 bg-luxury-input border-2 border-luxury-border rounded-2xl pl-12 pr-6 text-lg focus:border-gold-400 focus:outline-none transition-all placeholder:text-luxury-text-dim shadow-inner text-luxury-text"
                           autoFocus
                        />

                     </div>

                     <div className="col-span-4 flex gap-4">
                        <div className="flex-1 relative group">
                           <select
                              value={selectedMetal}
                              onChange={(e) => setSelectedMetal(e.target.value as any)}
                              className="w-full h-14 bg-luxury-input border-2 border-luxury-border rounded-2xl px-6 appearance-none text-luxury-text focus:border-gold-400/40 outline-none cursor-pointer hover:bg-luxury-surface transition-all font-black text-sm tracking-widest uppercase"
                           >
                              <option value="All">All Metals</option>
                              {METALS.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                           <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-luxury-text-dim pointer-events-none" size={18} />
                        </div>
                     </div>
                  </div>

                  {/* Category Horizontal Scroll */}
                  <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-gold -mx-2 px-2 no-scrollbar">
                     <button
                        onClick={() => setSelectedCategory('All')}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wide whitespace-nowrap border-2 transition-all ${selectedCategory === 'All'
                           ? 'bg-gold-500/10 border-gold-400 text-gold-400 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                           : 'bg-luxury-surface border-transparent text-luxury-text-muted hover:text-luxury-text hover:bg-luxury-charcoal'
                           }`}
                     >
                        All Pieces
                     </button>
                     {(settings.categories || []).map(cat => (
                        <button
                           key={cat}
                           onClick={() => setSelectedCategory(cat)}
                           className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wide whitespace-nowrap border-2 transition-all ${selectedCategory === cat
                              ? 'bg-gold-500/10 border-gold-400 text-gold-400 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                              : 'bg-luxury-surface border-transparent text-luxury-text-muted hover:text-luxury-text hover:bg-luxury-charcoal'
                              }`}
                        >
                           {cat}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Product Grid */}
               <div className="flex-1 overflow-y-auto scrollbar-gold pr-2 pb-6">
                  {filteredProducts.length > 0 ? (
                     <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                        {filteredProducts.map((product) => (
                           <ProductCard key={product.id} product={product} />
                        ))}
                     </div>
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-luxury-surface rounded-3xl border border-dashed border-luxury-border">
                        <div className="p-8 bg-luxury-black/40 rounded-full border border-luxury-border mb-6 text-luxury-text-dim flex items-center justify-center transition-colors">
                           <Tag size={64} className="animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-serif text-luxury-text-muted mb-2 font-bold uppercase tracking-tight">No Match Found</h3>
                        <p className="text-luxury-text-dim uppercase text-[10px] tracking-widest font-black">Try adjusting your filters or search query</p>
                        <button
                           onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedMetal('All'); }}
                           className="mt-8 px-6 py-2 border-b-2 border-gold-400 text-gold-400 font-black text-xs uppercase tracking-widest hover:text-luxury-text hover:border-luxury-text transition-all"
                        >
                           Reset Gallery
                        </button>
                     </div>
                  )}
               </div>

               {/* Status Bar */}
               <div className="mt-4 flex items-center justify-between px-6 py-3 bg-luxury-surface border border-luxury-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-luxury-text-dim transition-colors">
                  <div className="flex items-center gap-6">
                     <span className="flex items-center gap-2 transition-colors"><Zap size={14} className="text-gold-400" /> Showing {filteredProducts.length} Luxury Pieces</span>
                     <span className="flex items-center gap-2 transition-colors"><Filter size={14} /> Filter: {selectedCategory} • {selectedMetal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     Terminal Online • POS-01
                  </div>
               </div>
            </div>

            <div className="lg:col-span-1 h-full min-h-0 pr-2">
               <CartPanel isOrderMode={isOrderMode} />
            </div>
         </div>
      </div>
   );
};
