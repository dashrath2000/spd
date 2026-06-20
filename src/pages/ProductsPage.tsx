import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
   Plus,
   Search,
   Filter,
   Download,
   Edit2,
   Trash2,
   Copy,
   Gem,
   ChevronRight,
   ChevronDown,
   Sparkles,
   Zap,
   History,
   ArrowUpCircle,
   ArrowDownCircle,
   FileSpreadsheet,
   Upload,
   CheckCircle2,
   XCircle,
   AlertTriangle
} from 'lucide-react';
import { useProductStore } from '../store/productStore';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useOwnerLoanStore } from '../store/ownerLoanStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, calculateProductPrice, getAutomatedHSN, generateAutoSKU } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import type { Product } from '../types';

export const ProductsPage = () => {
   const { products, addProduct, updateProduct, deleteProduct, updateStock } = useProductStore();
   const { settings } = useSettingsStore();
   const { ownerLoans } = useOwnerLoanStore();
   const [searchTerm, setSearchTerm] = useState('');
   const [activeTab, setActiveTab] = useState<'Fine' | 'Raw' | 'Wholesale'>('Fine');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
   const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
   const [isWholesaleModalOpen, setIsWholesaleModalOpen] = useState(false);
   const [isRegistrationModeModalOpen, setIsRegistrationModeModalOpen] = useState(false);
   const [isWholesaleSelectionModalOpen, setIsWholesaleSelectionModalOpen] = useState(false);
   const [selectedRegistrationMode, setSelectedRegistrationMode] = useState<'retail' | 'wholesale' | null>(null);
   const [selectedWholesaleItem, setSelectedWholesaleItem] = useState<Product | null>(null);
   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
   const [productToDelete, setProductToDelete] = useState<Product | null>(null);
   const [expandedMetals, setExpandedMetals] = useState<Record<string, boolean>>({});
   const [selectedCategory, setSelectedCategory] = useState<string>('All');
   const [showFilters, setShowFilters] = useState(false);

   useEffect(() => {
      setSelectedCategory('All');
   }, [activeTab]);

   const availableCategories = useMemo(() => {
      const set = new Set<string>();
      if (activeTab === 'Fine') {
         (settings.categories || []).forEach(c => {
            if (c !== 'Raw Material' && c !== 'Wholesale Metal') set.add(c);
         });
      } else if (activeTab === 'Raw') {
         set.add('Raw Material');
      } else if (activeTab === 'Wholesale') {
         set.add('Wholesale Metal');
      }
      products.forEach(p => {
         if (activeTab === 'Fine' && p.category !== 'Raw Material' && p.category !== 'Wholesale Metal') {
            set.add(p.category);
         } else if (activeTab === 'Raw' && p.category === 'Raw Material') {
            set.add(p.category);
         } else if (activeTab === 'Wholesale' && p.category === 'Wholesale Metal') {
            set.add(p.category);
         }
      });
      return Array.from(set);
   }, [settings.categories, products, activeTab]);

   const filteredProducts = useMemo(() => {
      return products
         .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               p.sku.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTab = activeTab === 'Raw' ? p.category === 'Raw Material' : activeTab === 'Wholesale' ? p.category === 'Wholesale Metal' : (p.category !== 'Raw Material' && p.category !== 'Wholesale Metal');
            const matchesCategory = (activeTab === 'Raw' || activeTab === 'Wholesale') ? true : (selectedCategory === 'All' || p.category === selectedCategory);
            return matchesSearch && matchesTab && matchesCategory;
         })
         .sort((a, b) => {
            const skuCompare = b.sku.localeCompare(a.sku, undefined, { numeric: true, sensitivity: 'base' });
            if (skuCompare !== 0) return skuCompare;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
         });
   }, [products, searchTerm, activeTab, selectedCategory]);

   const metalDataBreakdown = useMemo(() => {
      const breakdown: Record<string, {
         totalWeight: number;
         totalUnits: number;
         purities: Record<string, number>;
         purityUnits: Record<string, number>;
         categories: Record<string, number>;
         categoryUnits: Record<string, number>;
      }> = {};

      products.forEach(p => {
         const isWholesale = p.category === 'Wholesale Metal';
         const weight = isWholesale ? (p.weight || 0) : (p.weight || 0) * (p.stock || 0);
         const units = isWholesale ? 0 : (p.stock || 0);
         if (weight > 0 || units > 0) {
            if (!breakdown[p.metalType]) {
               breakdown[p.metalType] = {
                  totalWeight: 0,
                  totalUnits: 0,
                  purities: {},
                  purityUnits: {},
                  categories: {},
                  categoryUnits: {}
               };
            }
            const metalObj = breakdown[p.metalType];
            metalObj.totalWeight += weight;
            metalObj.totalUnits += units;
            metalObj.purities[p.purity] = (metalObj.purities[p.purity] || 0) + weight;
            metalObj.purityUnits[p.purity] = (metalObj.purityUnits[p.purity] || 0) + units;
            metalObj.categories[p.category] = (metalObj.categories[p.category] || 0) + weight;
            metalObj.categoryUnits[p.category] = (metalObj.categoryUnits[p.category] || 0) + units;
         }
      });
      return breakdown;
   }, [products]);

   const columns = [
      {
         header: 'Product Details',
         accessor: (row: Product) => (
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-luxury-black rounded-xl flex items-center justify-center p-2 border border-luxury-border-dim order-first transition-colors">
                  {row.images?.[0] ? <img src={row.images[0]} alt={row.name} /> : <Gem className="text-luxury-text-dim" size={20} />}
               </div>
               <div>
                  <p className="font-bold text-luxury-text uppercase tracking-wide leading-none mb-1">{row.name}</p>
                  <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{row.sku}</p>
               </div>
            </div>
         ),
         className: 'w-[30%]'
      },
      {
         header: 'Category & Metal',
         accessor: (row: Product) => (
            <div className="flex flex-col gap-1.5">
               <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0 border-luxury-border-dim">{row.category}</Badge>
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-luxury-text-muted tracking-widest transition-colors">
                  <span className="text-gold-400">{row.metalType}</span>
                  <span>•</span>
                  <span>{row.purity}</span>
               </div>
            </div>
         )
      },
      {
         header: 'Dimensions',
         accessor: (row: Product) => (
            <div className="flex flex-col">
               <span className="text-sm font-bold text-luxury-text/80">{row.weight}g</span>
               <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Gross Weight</span>
            </div>
         )
      },
      {
         header: 'Pricing',
         accessor: (row: Product) => {
            const { finalPrice } = calculateProductPrice(row, settings);
            return (
               <div className="flex flex-col">
                  <span className="text-sm font-bold text-gold-400">{formatCurrency(finalPrice)}</span>
                  <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Incl. GST</span>
               </div>
            );
         }
      },
      {
         header: 'Availability',
         accessor: (row: Product) => {
            const isPledged = ownerLoans.some(loan =>
               loan.status === 'Active' &&
               (loan.items || []).some(item => item.sourceType === 'inventory' && item.productId === row.id)
            );
            return (
               <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-luxury-text">{row.stock} Units</span>
                  {isPledged && (
                     <Badge variant="error" className="animate-pulse bg-red-600/90 text-white border-transparent px-2 py-0.5 text-[8px] uppercase font-black tracking-widest font-bold w-fit">Pledged</Badge>
                  )}
               </div>
            );
         }
      },
      {
         header: 'Vault Valuation',
         accessor: (row: Product) => {
            const { finalPrice } = calculateProductPrice(row, settings);
            return (
               <div className="flex flex-col">
                  <span className="text-sm font-bold text-luxury-text">{formatCurrency(finalPrice * row.stock)}</span>
                  <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Total Asset</span>
               </div>
            );
         }
      },
      {
         header: '',
         accessor: (row: Product) => {
            const isPledged = ownerLoans.some(loan =>
               loan.status === 'Active' &&
               (loan.items || []).some(item => item.sourceType === 'inventory' && item.productId === row.id)
            );
            return (
               <div className="flex justify-end gap-2 pr-4">
                  <button
                     onClick={(e) => {
                        e.stopPropagation();
                        if (isPledged) {
                           toast.error('Cannot adjust stock of a product that is currently pledged as collateral.');
                           return;
                        }
                        setEditingProduct(row);
                        setIsAdjustmentModalOpen(true);
                     }}
                     className={cn("px-2 py-1 flex items-center gap-1 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all border border-transparent hover:border-gold-400/20", isPledged && "opacity-30 cursor-not-allowed")}
                  >
                     <History size={14} />
                     <span className="text-[10px] uppercase font-black tracking-widest hidden xl:block">Adjust</span>
                  </button>
                  <button
                     onClick={(e) => {
                        e.stopPropagation();
                        if (isPledged) {
                           toast.error('Cannot edit a product that is currently pledged as collateral.');
                           return;
                        }
                        setEditingProduct(row);
                        setIsModalOpen(true);
                     }}
                     className={cn("p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all", isPledged && "opacity-30 cursor-not-allowed")}
                  >
                     <Edit2 size={16} />
                  </button>
                  <button
                     onClick={(e) => {
                        e.stopPropagation();
                        if (isPledged) {
                           toast.error('Cannot delete a product that is currently pledged as collateral.');
                           return;
                        }
                        setProductToDelete(row);
                     }}
                     className={cn("p-2 hover:bg-red-400/10 rounded-lg text-luxury-text hover:text-red-400 transition-all", isPledged && "opacity-30 cursor-not-allowed")}
                  >
                     <Trash2 size={16} />
                  </button>
               </div>
            );
         },
         className: 'w-[20%]'
      }
   ];

   const wholesaleColumns = [
      {
         header: 'Metal Type',
         accessor: (row: Product) => (
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-luxury-black rounded-xl flex items-center justify-center p-2 border border-luxury-border-dim order-first transition-colors">
                  <Gem className="text-gold-400" size={20} />
               </div>
               <div>
                  <p className="font-bold text-luxury-text uppercase tracking-wide leading-none mb-1">{row.metalType}</p>
                  <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{row.category}</p>
               </div>
            </div>
         ),
         className: 'w-[40%]'
      },
      {
         header: 'Karat / Purity',
         accessor: (row: Product) => (
            <div className="flex flex-col gap-1.5">
               <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0 border-luxury-border-dim">{row.purity}</Badge>
            </div>
         )
      },
      {
         header: 'Available Weight',
         accessor: (row: Product) => (
            <div className="flex flex-col">
               <span className="text-sm font-bold text-gold-400">{row.weight}g</span>
               <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">Total Stock</span>
            </div>
         )
      },
      {
         header: '',
         accessor: (row: Product) => {
            const isPledged = ownerLoans.some(loan =>
               loan.status === 'Active' &&
               (loan.items || []).some(item => item.sourceType === 'inventory' && item.productId === row.id)
            );
            return (
               <div className="flex justify-end gap-2 pr-4">
                  {/* Removed Adjust button from wholesale options */}
                  <button
                     onClick={(e) => {
                        e.stopPropagation();
                        if (isPledged) {
                           toast.error('Cannot edit a product that is currently pledged as collateral.');
                           return;
                        }
                        setEditingProduct(row);
                        setIsWholesaleModalOpen(true);
                     }}
                     className={cn("p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all", isPledged && "opacity-30 cursor-not-allowed")}
                  >
                     <Edit2 size={16} />
                  </button>
                  <button
                     onClick={(e) => {
                        e.stopPropagation();
                        if (isPledged) {
                           toast.error('Cannot delete a product that is currently pledged as collateral.');
                           return;
                        }
                        setProductToDelete(row);
                     }}
                     className={cn("p-2 hover:bg-red-400/10 rounded-lg text-luxury-text hover:text-red-400 transition-all", isPledged && "opacity-30 cursor-not-allowed")}
                  >
                     <Trash2 size={16} />
                  </button>
               </div>
            );
         },
         className: 'w-[20%]'
      }
   ];

   return (
      <div className="space-y-8 animate-fade-in">
         <div className="flex items-end justify-between">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <ChevronRight size={16} className="text-gold-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-muted transition-colors">Vault Inventory</p>
               </div>
               <h1 className="text-4xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase">
                  Product <span className="text-gold-400">Registry</span>
               </h1>
            </div>
            <div className="flex gap-4">
               <Button variant="outline" size="lg" className="h-14 font-bold text-[10px] tracking-wide uppercase border-luxury-border hover:border-gold-400 transition-all">
                  <Download size={18} className="mr-3" /> Export to CSV
               </Button>
               <Button variant="outline" size="lg" className="h-14 font-bold text-[10px] tracking-wide uppercase border-dashed border-luxury-border hover:border-gold-400 transition-all" onClick={() => setIsBulkImportOpen(true)}>
                  <Copy size={18} className="mr-3" /> Bulk Import
               </Button>
               {activeTab === 'Wholesale' ? (
                  <Button variant="gold" size="lg" className="h-14 font-black text-[10px] tracking-widest uppercase shadow-[0_10px_30px_rgba(201,168,76,0.3)]" onClick={() => setIsWholesaleModalOpen(true)}>
                     <Plus size={20} className="mr-3" /> Add Wholesale Stock
                  </Button>
               ) : (
                  <Button variant="gold" size="lg" className="h-14 font-black text-[10px] tracking-widest uppercase shadow-[0_10px_30px_rgba(201,168,76,0.3)]" onClick={() => {
                     setEditingProduct(null);
                     if (activeTab === 'Fine' && products.some(p => p.category === 'Wholesale Metal')) {
                        setIsRegistrationModeModalOpen(true);
                     } else {
                        setSelectedRegistrationMode('retail');
                        setIsModalOpen(true);
                     }
                  }}>
                     <Plus size={20} className="mr-3" /> Register New Piece
                  </Button>
               )}
            </div>
         </div>


         {/* Vault Summary - Horizontal Layout */}
         <div className="grid grid-cols-4 gap-6">
            {[
               {
                  label: 'Total Valuation',
                  value: formatCurrency(products.reduce((s, p) => s + (calculateProductPrice(p, settings).finalPrice * p.stock), 0)),
                  color: 'text-gold-400'
               },
               { label: 'Active SKUs', value: products.length, color: 'text-luxury-text' },
               { label: 'Low Stock Alerts', value: products.filter(p => p.category !== 'Wholesale Metal' && p.stock <= p.lowStockThreshold).length, color: 'text-red-400' },
               { label: 'Categories Covered', value: new Set(products.map(p => p.category)).size, color: 'text-luxury-text-muted' }
            ].map((stat, i) => (
               <div key={i} className="card-luxury p-5 bg-luxury-charcoal border-gold-400/10 relative overflow-hidden group transition-colors flex flex-col justify-center">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-400/5 blur-3xl rounded-full" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-1">{stat.label}</span>
                  <span className={cn('text-2xl font-serif font-bold', stat.color)}>{stat.value}</span>
               </div>
            ))}
         </div>

         {/* Actuarial Metal & Category Ledger */}
         <div className="card-luxury p-8 bg-luxury-charcoal border-luxury-border space-y-6">
            <div className="flex items-center justify-between border-b border-luxury-border-dim pb-4">
               <div>
                  <h3 className="text-xl font-serif font-black text-gold-400 uppercase tracking-tight">Stock Detail</h3>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {Object.entries(metalDataBreakdown).map(([metal, data]) => {
                  const isExpanded = !!expandedMetals[metal];
                  return (
                     <div key={metal} className="p-6 bg-luxury-surface border border-luxury-border rounded-3xl transition-all hover:border-gold-400/30 flex flex-col justify-between h-fit space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">{metal}</p>
                              <p className="text-2xl font-bold text-luxury-text mt-1">
                                 {data.totalWeight >= 1000 ? (data.totalWeight / 1000).toFixed(3) : data.totalWeight.toFixed(2)}
                                 <span className="text-sm text-luxury-text-muted font-normal ml-1">
                                    {data.totalWeight >= 1000 ? 'kg' : 'g'}
                                 </span>
                              </p>
                              {data.totalUnits > 0 && (
                                 <p className="text-[10px] text-luxury-text-dim font-black uppercase tracking-widest mt-0.5">
                                    {data.totalUnits} units
                                 </p>
                              )}
                           </div>
                           <button
                              type="button"
                              onClick={() => setExpandedMetals(prev => ({ ...prev, [metal]: !prev[metal] }))}
                              className="p-3 hover:bg-gold-400/10 rounded-2xl text-gold-400 border border-gold-400/20 hover:border-gold-400/40 transition-all cursor-pointer"
                           >
                              <ChevronDown className={cn("transition-transform duration-300", isExpanded && "rotate-180")} size={18} />
                           </button>
                        </div>

                        {isExpanded && (
                           <div className="border-t border-luxury-border-dim pt-4 space-y-6 animate-fade-in">
                              {/* Karat / Purity Breakdown */}
                              <div className="space-y-3">
                                 <p className="text-xs uppercase font-black tracking-widest text-gold-400 border-b border-luxury-border-dim pb-2">Karat/Purity breakdown</p>
                                 <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(data.purities).map(([purity, weight]) => (
                                       <div key={purity} className="p-4 bg-luxury-black/30 rounded-2xl border border-luxury-border-dim/50 flex justify-between items-center">
                                          <div>
                                             <span className="text-xs uppercase font-black tracking-wider text-luxury-text-muted">{purity}</span>
                                             {data.purityUnits[purity] > 0 && (
                                                <p className="text-[9px] text-luxury-text-dim font-bold mt-0.5">{data.purityUnits[purity]} units</p>
                                             )}
                                          </div>
                                          <span className="text-sm font-serif font-black text-luxury-text">
                                             {weight >= 1000 ? (weight / 1000).toFixed(3) + 'kg' : weight.toFixed(1) + 'g'}
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              {/* Category Breakdown */}
                              <div className="space-y-3">
                                 <p className="text-xs uppercase font-black tracking-widest text-gold-400 border-b border-luxury-border-dim pb-2">Category breakdown</p>
                                 <div className="space-y-3">
                                    {Object.entries(data.categories).map(([category, weight]) => (
                                       <div key={category} className="flex justify-between items-center text-sm group/item">
                                          <div>
                                             <span className="text-xs uppercase font-black tracking-wider text-luxury-text-muted group-hover/item:text-luxury-text transition-colors">{category}</span>
                                             {category !== 'Wholesale Metal' && (
                                                <p className="text-[9px] text-luxury-text-dim font-bold">{data.categoryUnits[category] || 0} units</p>
                                             )}
                                          </div>
                                          <span className="font-serif font-black text-sm text-luxury-text">
                                             {weight >= 1000 ? (weight / 1000).toFixed(3) + 'kg' : weight.toFixed(1) + 'g'}
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  );
               })}
               {Object.keys(metalDataBreakdown).length === 0 && (
                  <p className="text-xs text-luxury-text-muted col-span-3 text-center py-8">No stock weights registered.</p>
               )}
            </div>
         </div>

         <div className="flex flex-col gap-6">
            <div className="flex gap-2 bg-luxury-black/40 p-1.5 rounded-2xl border border-luxury-border w-fit self-start">
               <button
                  onClick={() => setActiveTab('Fine')}
                  className={cn(
                     "px-8 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-3",
                     activeTab === 'Fine' ? "bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20" : "text-luxury-text-dim hover:text-gold-400"
                  )}
               >
                  Fine Collection <Badge variant={activeTab === 'Fine' ? 'gold' : 'outline'} className="bg-luxury-black/20 border-none">{products.filter(p => p.category !== 'Raw Material' && p.category !== 'Wholesale Metal').length}</Badge>
               </button>
               <button
                  onClick={() => setActiveTab('Wholesale')}
                  className={cn(
                     "px-8 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-3",
                     activeTab === 'Wholesale' ? "bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20" : "text-luxury-text-dim hover:text-gold-400"
                  )}
               >
                  Wholesale Metal <Badge variant={activeTab === 'Wholesale' ? 'gold' : 'outline'} className="bg-luxury-black/20 border-none">{products.filter(p => p.category === 'Wholesale Metal').length}</Badge>
               </button>
               <button
                  onClick={() => setActiveTab('Raw')}
                  className={cn(
                     "px-8 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-3",
                     activeTab === 'Raw' ? "bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20" : "text-luxury-text-dim hover:text-gold-400"
                  )}
               >
                  Raw Manufacturing <Badge variant={activeTab === 'Raw' ? 'gold' : 'outline'} className="bg-luxury-black/20 border-none">{products.filter(p => p.category === 'Raw Material').length}</Badge>
               </button>
            </div>

            <div className="relative group transition-colors">
               <Input
                  type="text"
                  placeholder="Query by Name, SKU, Category, or Signature..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search size={20} />}
                  className="h-16 text-lg rounded-3xl border-2"
               />
               <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  <div className="h-8 w-[1px] bg-luxury-border-dim" />
                  <Filter
                     onClick={() => setShowFilters(!showFilters)}
                     className={cn(
                        "transition-colors cursor-pointer",
                        showFilters ? "text-gold-400" : "text-luxury-text-dim hover:text-gold-400"
                     )}
                     size={20}
                  />
               </div>
            </div>

            {showFilters && activeTab === 'Fine' && (
               <div className="flex flex-wrap gap-2.5 p-4 bg-luxury-black/40 border border-luxury-border rounded-3xl animate-fade-in">
                  <button
                     onClick={() => setSelectedCategory('All')}
                     className={cn(
                        "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                        selectedCategory === 'All'
                           ? "border-gold-400 bg-gold-400/10 text-gold-400 shadow-md shadow-gold-400/5"
                           : "border-luxury-border bg-luxury-charcoal text-luxury-text-dim hover:border-gold-400/40 hover:text-gold-400"
                     )}
                  >
                     All Categories
                  </button>
                  {availableCategories.map(cat => (
                     <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                           "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                           selectedCategory === cat
                              ? "border-gold-400 bg-gold-400/10 text-gold-400 shadow-md shadow-gold-400/5"
                              : "border-luxury-border bg-luxury-charcoal text-luxury-text-dim hover:border-gold-400/40 hover:text-gold-400"
                        )}
                     >
                        {cat}
                     </button>
                  ))}
               </div>
            )}

            <Table columns={activeTab === 'Wholesale' ? wholesaleColumns : columns} data={filteredProducts} onRowClick={(row) => {
               setEditingProduct(row);
               if (activeTab === 'Wholesale') {
                  setIsWholesaleModalOpen(true);
               } else {
                  setIsModalOpen(true);
               }
            }} />
         </div>

         <BulkImportModal
            isOpen={isBulkImportOpen}
            onClose={() => setIsBulkImportOpen(false)}
            onImport={async (products) => {
               let successCount = 0;
               for (const p of products) {
                  try {
                     await addProduct(p);
                     successCount++;
                  } catch (err) {
                     console.error('Failed to import product:', err);
                  }
               }
               toast.success(`${successCount} product(s) imported to vault!`);
               setIsBulkImportOpen(false);
            }}
            categories={settings.categories || []}
         />

         <WholesaleEntryModal
            isOpen={isWholesaleModalOpen}
            onClose={() => {
               setIsWholesaleModalOpen(false);
               setEditingProduct(null);
            }}
            product={editingProduct}
         />

         <RegistrationModeModal
            isOpen={isRegistrationModeModalOpen}
            onClose={() => setIsRegistrationModeModalOpen(false)}
            onSelect={(mode: 'retail' | 'wholesale') => {
               setSelectedRegistrationMode(mode);
               setIsRegistrationModeModalOpen(false);
               if (mode === 'wholesale') {
                  const wholesaleMetals = products.filter(p => p.category === 'Wholesale Metal');
                  if (wholesaleMetals.length === 1) {
                     setSelectedWholesaleItem(wholesaleMetals[0]);
                     setIsModalOpen(true);
                  } else if (wholesaleMetals.length > 1) {
                     setIsWholesaleSelectionModalOpen(true);
                  } else {
                     setIsModalOpen(true);
                  }
               } else {
                  setSelectedWholesaleItem(null);
                  setIsModalOpen(true);
               }
            }}
         />

         <WholesaleSelectionModal
            isOpen={isWholesaleSelectionModalOpen}
            onClose={() => {
               setIsWholesaleSelectionModalOpen(false);
               setSelectedRegistrationMode(null);
            }}
            products={products.filter(p => p.category === 'Wholesale Metal')}
            onSelect={(item: Product) => {
               setSelectedWholesaleItem(item);
               setIsWholesaleSelectionModalOpen(false);
               setIsModalOpen(true);
            }}
         />

         <ProductModal
            isOpen={isModalOpen}
            onClose={() => {
               setIsModalOpen(false);
               setEditingProduct(null);
               setSelectedWholesaleItem(null);
            }}
            product={editingProduct}
            activeTab={activeTab}
            selectedRegistrationMode={selectedRegistrationMode}
            selectedWholesaleItem={selectedWholesaleItem}
            onSave={async (data: any) => {
               const sourceBulkProductId = data.sourceBulkProductId;
               delete data.sourceBulkProductId;

               const savePromise = editingProduct
                  ? updateProduct(editingProduct.id, data)
                  : addProduct(data);

               toast.promise(savePromise, {
                  loading: 'Saving to vault...',
                  success: 'Product secured successfully!',
                  error: (err) => `Failed to save: ${err.message}`
               });

               try {
                  await savePromise;
                  if (!editingProduct && sourceBulkProductId) {
                     const bulkProduct = products.find(p => p.id === sourceBulkProductId);
                     if (bulkProduct) {
                        await updateProduct(sourceBulkProductId, {
                           weight: Math.max(0, bulkProduct.weight - data.weight),
                           stock: 1
                        });
                        toast.success(`Deducted ${data.weight}g from bulk stock`);
                     }
                  }
                  setIsModalOpen(false);
               } catch (error) {
                  console.error('Failed to save product:', error);
               }
            }}
         />

         <StockAdjustmentModal
            isOpen={isAdjustmentModalOpen}
            onClose={() => setIsAdjustmentModalOpen(false)}
            product={editingProduct}
            onUpdate={(id: string, qty: number) => {
               updateStock(id, qty);
               setIsAdjustmentModalOpen(false);
            }}
         />

         <Modal
            isOpen={!!productToDelete}
            onClose={() => setProductToDelete(null)}
            title="Confirm Deletion"
            size="sm"
         >
            <div className="space-y-6 text-center py-4">
               <div className="mx-auto w-16 h-16 bg-red-400/10 text-red-400 rounded-full flex items-center justify-center mb-4">
                  <Trash2 size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-lg font-serif font-bold text-luxury-text">Remove Product?</h3>
                  <p className="text-xs text-luxury-text-dim leading-relaxed">
                     Are you sure you want to delete <span className="text-gold-400 font-bold">{productToDelete?.name}</span>? This action cannot be undone and will permanently erase this item from the vault.
                  </p>
               </div>
               <div className="flex gap-4 pt-4 border-t border-luxury-border-dim">
                  <Button
                     variant="outline"
                     className="flex-1 h-12 border-luxury-border uppercase font-black tracking-widest text-[10px] text-luxury-text-muted"
                     onClick={() => setProductToDelete(null)}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="gold"
                     className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-luxury-black font-black uppercase tracking-widest text-[10px]"
                     onClick={() => {
                        if (productToDelete) {
                           deleteProduct(productToDelete.id);
                           setProductToDelete(null);
                        }
                     }}
                  >
                     Delete
                  </Button>
               </div>
            </div>
         </Modal>
      </div>
   );
};


const RegistrationModeModal = ({ isOpen, onClose, onSelect }: any) => {
   return (
      <Modal isOpen={isOpen} onClose={onClose} title="Select Registration Mode" size="sm">
         <div className="p-6 bg-luxury-charcoal flex flex-col gap-4">
            <button
               onClick={() => onSelect('retail')}
               className="w-full py-4 rounded-xl border border-luxury-border text-luxury-text hover:bg-luxury-surface hover:border-gold-400 transition-all font-black uppercase tracking-widest text-sm"
            >
               Retail
            </button>
            <button
               onClick={() => onSelect('wholesale')}
               className="w-full py-4 rounded-xl border border-gold-400/50 bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 transition-all font-black uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(201,168,76,0.15)]"
            >
               Wholesale to Retail
            </button>
         </div>
      </Modal>
   );
};

const WholesaleSelectionModal = ({ isOpen, onClose, products, onSelect }: any) => {
   return (
      <Modal isOpen={isOpen} onClose={onClose} title="Select Source Metal" size="md">
         <div className="p-4 bg-luxury-charcoal flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {products.map((p: any) => (
               <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full p-4 rounded-xl border border-luxury-border bg-luxury-black/40 hover:bg-luxury-surface hover:border-gold-400/50 transition-all text-left flex justify-between items-center group"
               >
                  <div>
                     <p className="text-sm font-bold text-luxury-text group-hover:text-gold-400 transition-colors">{p.name}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-luxury-text-dim mt-1">{p.purity} {p.metalType}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-gold-400">{p.weight}g</p>
                  </div>
               </button>
            ))}
         </div>
      </Modal>
   );
};

const ProductModal = ({ isOpen, onClose, product, onSave, activeTab, selectedRegistrationMode, selectedWholesaleItem }: any) => {
   const { products } = useProductStore();
   const [formData, setFormData] = useState<Partial<Product>>(product || {
      name: '',
      sku: '',
      category: activeTab === 'Raw' ? 'Raw Material' : 'Ring',
      metalType: selectedWholesaleItem ? selectedWholesaleItem.metalType : 'Gold',
      purity: selectedWholesaleItem ? selectedWholesaleItem.purity : '22K',
      weight: 0,
      makingCharges: 0,
      makingChargePercent: 0,
      isPercentageMakingCharge: false,
      stoneCharges: 0,
      wastagePercent: 0,
      sellingPrice: 0,
      stock: 1,
      lowStockThreshold: 2,
      hsnCode: '71131910',
      huid: '',
      images: [],
      isActive: true,
      isRateSensitive: true,
   });

   const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
   const [autoDeductBulk, setAutoDeductBulk] = useState<boolean>(false);

   const { settings } = useSettingsStore();
   const isSkuManuallyEdited = useRef(false);

   useEffect(() => {
      isSkuManuallyEdited.current = false;
      if (product) setFormData({ ...product, huid: product.huid || '' });
      else setFormData({
         name: '',
         sku: '',
         category: activeTab === 'Raw' ? 'Raw Material' : 'Ring',
         metalType: selectedWholesaleItem ? selectedWholesaleItem.metalType : 'Gold',
         purity: selectedWholesaleItem ? selectedWholesaleItem.purity : '22K',
         weight: 0,
         makingCharges: 0,
         makingChargePercent: 0,
         isPercentageMakingCharge: false,
         stoneCharges: 0,
         wastagePercent: 0,
         sellingPrice: 0,
         stock: 1,
         lowStockThreshold: 2,
         hsnCode: '71131910',
         huid: '',
         images: [],
         isActive: true,
         isRateSensitive: true,
      });
      if (product) {
         setAutoDeductBulk(false);
      } else {
         setAutoDeductBulk(selectedRegistrationMode === 'wholesale');
      }
   }, [product, isOpen, activeTab, selectedRegistrationMode, selectedWholesaleItem]);

   // Handle automated SKU generation for new products
   useEffect(() => {
      if (!product && !isSkuManuallyEdited.current) {
         const newSKU = generateAutoSKU(formData.category, formData.metalType, formData.purity, products);
         if (newSKU !== formData.sku) {
            setFormData(prev => ({ ...prev, sku: newSKU }));
         }
      }
   }, [formData.category, formData.metalType, formData.purity, product, products]);

   // Handle dynamic price calculation
   useEffect(() => {
      if (formData.isRateSensitive) {
         // Create a dummy product for calculation
         const dummyProduct: Product = {
            ...formData,
            id: 'dummy',
            createdAt: '',
            updatedAt: '',
            name: formData.name || '',
            sku: formData.sku || '',
            images: [],
            description: '',
            barcode: '',
            isActive: true,
         } as Product;

         const results = calculateProductPrice(dummyProduct, settings);
         setPriceBreakdown(results);
         if (results.finalPrice !== formData.sellingPrice) {
            setFormData(prev => ({ ...prev, sellingPrice: results.finalPrice }));
         }
      } else {
         setPriceBreakdown(null);
      }
   }, [
      formData.isRateSensitive,
      formData.weight,
      formData.makingCharges,
      formData.makingChargePercent,
      formData.isPercentageMakingCharge,
      formData.stoneCharges,
      formData.wastagePercent,
      formData.metalType,
      formData.purity,
      settings.metalRates,
      settings.cgstPercent,
      settings.sgstPercent
   ]);

   // Handle automated HSN Code calculation
   useEffect(() => {
      const calculatedHSN = getAutomatedHSN(formData.category, formData.metalType);
      const standardHSNs = ['71131910', '71131120', '71131950', '7113', '7108', '7106', '7110', '7102', ''];
      const currentHSN = formData.hsnCode || '';
      if (standardHSNs.includes(currentHSN) && currentHSN !== calculatedHSN) {
         setFormData(prev => ({ ...prev, hsnCode: calculatedHSN }));
      }
   }, [formData.category, formData.metalType]);

   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => {
            setFormData(prev => ({ ...prev, images: [reader.result as string] }));
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      let matchedBulkId = '';
      if (autoDeductBulk && formData.category !== 'Raw Material' && formData.category !== 'Wholesale Metal') {
         const bulkItem = products.find(p => p.category === 'Wholesale Metal' && p.metalType === formData.metalType && p.purity === formData.purity);
         if (!bulkItem) {
            toast.error(`Cannot auto-deduct: No wholesale stock found for ${formData.purity} ${formData.metalType}.`);
            return;
         }
         matchedBulkId = bulkItem.id;
      }

      onSave({
         ...formData,
         sourceBulkProductId: matchedBulkId,
         weight: Number(formData.weight) || 0,
         wastagePercent: Number(formData.wastagePercent) || 0,
         makingCharges: Number(formData.makingCharges) || 0,
         makingChargePercent: Number(formData.makingChargePercent) || 0,
         stoneCharges: Number(formData.stoneCharges) || 0,
         sellingPrice: Number(formData.sellingPrice) || 0,
         stock: Number(formData.stock) || 0,
         lowStockThreshold: Number(formData.lowStockThreshold) || 0,
      });
   };

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Edit Piece' : 'Register New Piece'} size="xl">
         <form onSubmit={handleSubmit} className="p-4 space-y-12 bg-luxury-charcoal transition-colors">
            {/* Section 1: Visual & Identity */}
            <div className="grid grid-cols-12 gap-12">
               <div
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="col-span-4 aspect-square bg-luxury-black rounded-3xl border-2 border-dashed border-luxury-border flex flex-col items-center justify-center relative group cursor-pointer hover:border-gold-400/30 transition-all overflow-hidden"
               >
                  {formData.images?.[0] ? (
                     <>
                        <img src={formData.images[0]} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-luxury-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                           <Plus className="text-gold-400 mb-2" size={32} />
                           <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Replace Image</p>
                        </div>
                     </>
                  ) : (
                     <>
                        <div className="p-6 bg-luxury-surface rounded-full mb-4 text-luxury-text-dim group-hover:text-gold-400 group-hover:bg-gold-400/5 transition-all">
                           <Plus size={48} />
                        </div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim group-hover:text-gold-400">Upload Signature Image</p>
                     </>
                  )}
                  <input
                     type="file"
                     id="image-upload"
                     className="hidden"
                     accept="image/*"
                     onChange={handleImageUpload}
                  />
               </div>

               <div className="col-span-8 grid grid-cols-2 gap-8">
                  <Input
                     label="Display Name"
                     value={formData.name}
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                     placeholder="e.g. Royal Heritage Necklace"
                     className="h-14 font-serif text-lg text-gold-400 bg-luxury-black border-luxury-border"
                     required
                  />
                  <Input
                     label="Vault SKU"
                     value={formData.sku}
                     onChange={(e) => {
                        isSkuManuallyEdited.current = true;
                        setFormData({ ...formData, sku: e.target.value });
                     }}
                     placeholder="e.g. AUR-RG-001"
                     className="h-14 font-black uppercase tracking-widest text-sm bg-luxury-black border-luxury-border pr-24"
                     required
                     rightIcon={
                        <button
                           type="button"
                           onClick={() => {
                              isSkuManuallyEdited.current = false;
                              const newSKU = generateAutoSKU(formData.category, formData.metalType, formData.purity, products);
                              setFormData(prev => ({ ...prev, sku: newSKU }));
                              toast.success('SKU auto-generated!');
                           }}
                           className="px-2.5 py-1.5 rounded bg-gold-400/10 text-gold-400 border border-gold-400/20 text-[9px] font-black uppercase tracking-wider hover:bg-gold-400/20 transition-all cursor-pointer pointer-events-auto shadow-sm"
                        >
                           ✨ Auto
                        </button>
                     }
                     helperText="Unique identifier for inventory tracking"
                  />
                  {autoDeductBulk && (
                     <div className="space-y-2">
                        {(() => {
                           const bItem = products.find(p => p.category === 'Wholesale Metal' && p.metalType === formData.metalType && p.purity === formData.purity);
                           return bItem ? (
                              <div className="p-3 bg-luxury-black/40 border border-luxury-border-dim rounded-xl text-[9px] font-bold text-luxury-text-muted flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                 Auto-Deduct Linked to: {bItem.name} (Available: {bItem.weight}g)
                              </div>
                           ) : (
                              <div className="p-3 bg-luxury-black/40 border border-luxury-border-dim rounded-xl text-[9px] font-bold text-red-400 flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                 Warning: No {formData.purity} {formData.metalType} wholesale item found.
                              </div>
                           );
                        })()}
                     </div>
                  )}

                  <div className="space-y-1.5">
                     <label className="text-[10px] uppercase font-black tracking-widest text-gold-200/60">Category</label>
                     <select
                        className="w-full h-14 bg-luxury-black border-2 border-luxury-border-dim rounded-2xl px-6 outline-none focus:border-gold-400/40 text-luxury-text font-bold uppercase tracking-widest text-xs transition-colors"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        disabled={formData.category === 'Raw Material' || formData.category === 'Wholesale Metal'}
                     >
                        {['Wholesale Metal', 'Raw Material', ...(settings.categories || [])].map(cat => (
                           <option key={cat} value={cat} className="bg-luxury-black">{cat}</option>
                        ))}
                     </select>
                  </div>
                  <Input
                     label="HSN Code"
                     value={formData.hsnCode}
                     onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                     helperText="Auto-filled based on Material & Category"
                     className="h-14 font-black tracking-widest text-xs bg-luxury-black border-luxury-border"
                  />
                  <Input
                     label="HUID"
                     value={formData.huid || ''}
                     onChange={(e) => setFormData({ ...formData, huid: e.target.value })}
                     placeholder="e.g. ABC123456"
                     helperText="Hallmark Unique ID (Optional)"
                     className="h-14 font-black tracking-widest text-xs bg-luxury-black border-luxury-border"
                  />
               </div>
            </div>

            <div className="h-[1px] w-full bg-luxury-border-dim" />

            {/* Section 2: Technical Specs & Pricing */}
            <div className="grid grid-cols-3 gap-12">
               <div className="space-y-8">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Specifications</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Metal / Material</label>
                        <select
                           className="w-full h-12 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-xs font-bold text-luxury-text uppercase tracking-widest transition-colors"
                           value={formData.metalType}
                           onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
                        >
                           {Object.keys(settings.metalRates || {}).map(m => <option key={m} value={m} className="bg-luxury-black">{m}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Purity</label>
                        <select
                           className="w-full h-12 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-xs font-bold text-luxury-text uppercase tracking-widest transition-colors"
                           value={formData.purity}
                           onChange={(e) => setFormData({ ...formData, purity: e.target.value as any })}
                        >
                           {['24K', '22K', '21K', '20K', '18K', '14K', '9K', '925', '950', 'Other'].map(p => <option key={p} value={p} className="bg-luxury-black">{p}</option>)}
                        </select>
                     </div>
                     <Input
                        label="Weight (in Gram)"
                        type="number" step="0.01"
                        value={formData.weight ?? ''}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value as any })}
                        onFocus={(e) => e.target.select()}
                        className="bg-luxury-black border-luxury-border"
                     />
                     <Input
                        label="Wastage (%)"
                        type="number" step="0.1"
                        value={formData.wastagePercent ?? ''}
                        onChange={(e) => setFormData({ ...formData, wastagePercent: e.target.value as any })}
                        onFocus={(e) => e.target.select()}
                        className="bg-luxury-black border-luxury-border"
                     />

                  </div>
               </div>

               <div className="space-y-8">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Charges</h4>
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-gold-200/60">Making Charge Mode</label>
                        <div className="flex bg-luxury-black p-1.5 rounded-xl border border-luxury-border">
                           <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isPercentageMakingCharge: false })}
                              className={cn(
                                 'flex-1 py-2.5 rounded-lg flex items-center justify-center transition-all uppercase font-black text-[9px] tracking-widest',
                                 !formData.isPercentageMakingCharge ? 'bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20' : 'text-luxury-text-muted hover:bg-luxury-surface/40'
                              )}
                           >
                              Per Gram (₹/g)
                           </button>
                           <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isPercentageMakingCharge: true })}
                              className={cn(
                                 'flex-1 py-2.5 rounded-lg flex items-center justify-center transition-all uppercase font-black text-[9px] tracking-widest',
                                 formData.isPercentageMakingCharge ? 'bg-gold-400 text-luxury-black shadow-lg shadow-gold-400/20' : 'text-luxury-text-muted hover:bg-luxury-surface/40'
                              )}
                           >
                              Percentage (%)
                           </button>
                        </div>
                     </div>

                     {!formData.isPercentageMakingCharge ? (
                        <Input
                           label="Making Charges (₹/per gram)"
                           type="number"
                           value={formData.makingCharges ?? ''}
                           onChange={(e) => setFormData({ ...formData, makingCharges: e.target.value as any })}
                           onFocus={(e) => e.target.select()}
                           className="bg-luxury-black border-luxury-border"
                        />
                     ) : (
                        <Input
                           label="Making Charges (%)"
                           type="number"
                           value={formData.makingChargePercent ?? ''}
                           onChange={(e) => setFormData({ ...formData, makingChargePercent: e.target.value as any })}
                           onFocus={(e) => e.target.select()}
                           className="bg-luxury-black border-luxury-border"
                        />
                     )}

                     <Input
                        label="Stone / Diamond Charges (₹)"
                        type="number"
                        value={formData.stoneCharges ?? ''}
                        onChange={(e) => setFormData({ ...formData, stoneCharges: e.target.value as any })}
                        onFocus={(e) => e.target.select()}
                        className="bg-luxury-black border-luxury-border"
                     />
                     <div className="p-4 bg-luxury-surface rounded-2xl flex items-center justify-between border border-luxury-border-dim transition-colors">
                        <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Is Item Active?</span>
                        <button
                           type="button"
                           onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                           className={cn(
                              'w-12 h-6 rounded-full transition-all relative',
                              formData.isActive ? 'bg-gold-400' : 'bg-luxury-text-dim'
                           )}
                        >
                           <div className={cn('absolute top-1 w-4 h-4 bg-luxury-black rounded-full transition-all', formData.isActive ? 'right-1' : 'left-1')} />
                        </button>
                     </div>
                  </div>
               </div>

               <div className="p-8 bg-gold-400/5 rounded-3xl border border-gold-400/20 space-y-8 relative overflow-hidden transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={48} /></div>
                  <div className="flex items-center justify-between mb-2">
                     <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Final Valuation</h4>
                     <div className="flex items-center gap-3">
                        <span className="text-[8px] uppercase font-bold text-luxury-text-muted">Dynamic Pricing</span>
                        <button
                           type="button"
                           onClick={() => setFormData({ ...formData, isRateSensitive: !formData.isRateSensitive })}
                           className={cn(
                              'w-10 h-5 rounded-full transition-all relative',
                              formData.isRateSensitive ? 'bg-gold-400' : 'bg-luxury-text-dim'
                           )}
                        >
                           <div className={cn('absolute top-0.5 w-4 h-4 bg-luxury-black rounded-full transition-all', formData.isRateSensitive ? 'right-0.5' : 'left-0.5')} />
                        </button>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="relative">
                        <Input
                           label={formData.isRateSensitive ? "Calculated MRP (₹)" : "Fixed MRP (₹)"}
                           type="number"
                           value={formData.sellingPrice ?? ''}
                           onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value as any })}
                           onFocus={(e) => e.target.select()}
                           disabled={formData.isRateSensitive}
                           className={cn(
                              "text-3xl h-16 bg-luxury-black/60 font-serif text-gold-400 border-gold-400/40 transition-all",
                              formData.isRateSensitive && "opacity-80 border-gold-400/10 cursor-not-allowed"
                           )}
                        />
                        {formData.isRateSensitive && (
                           <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Zap className="text-gold-400 animate-pulse" size={16} />
                           </div>
                        )}
                     </div>
                     {formData.isRateSensitive && priceBreakdown && (
                        <div className="space-y-3 pt-4 border-t border-gold-400/10">
                           <p className="text-[8px] uppercase font-black tracking-widest text-gold-400/60 mb-2">Live Actuarial Breakdown</p>
                           <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">
                              <span>Base Metal Value</span>
                              <span className="text-luxury-text">{formatCurrency(priceBreakdown.metalValue)}</span>
                           </div>
                           <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">
                              <span>Wastage/Loss Evaluation</span>
                              <span className="text-luxury-text">{formatCurrency(priceBreakdown.wastageValue)}</span>
                           </div>
                           <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">
                              <span>Making & Stones Charges</span>
                              <span className="text-luxury-text">{formatCurrency(priceBreakdown.makingCharges + (formData.stoneCharges || 0))}</span>
                           </div>
                           <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">
                              <span>Statutory Taxes (GST)</span>
                              <span className="text-luxury-text">{formatCurrency(priceBreakdown.totalGst)}</span>
                           </div>
                        </div>
                     )}
                     <div className="space-y-4 pt-4 border-t border-gold-400/10">
                        <Input
                           label="Initial Stock Quantity"
                           type="number"
                           value={formData.stock ?? ''}
                           onChange={(e) => setFormData({ ...formData, stock: e.target.value as any })}
                           onFocus={(e) => e.target.select()}
                           className="bg-luxury-black border-luxury-border"
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 pt-8">
               <Button type="button" variant="outline" className="h-14 px-12 border-luxury-border uppercase font-black tracking-widest" onClick={onClose}>Cancel</Button>
               <Button type="submit" variant="gold" className="h-14 flex-1 uppercase font-black tracking-widest text-lg">Commit To Vault</Button>
            </div>
         </form>
      </Modal>
   );
};

// Removed local cn

const StockAdjustmentModal = ({ isOpen, onClose, product, onUpdate }: any) => {
   const [adjustment, setAdjustment] = useState<number>(0);
   const [reason, setReason] = useState<string>('Inventory Correction');
   const [type, setType] = useState<'Addition' | 'Subtraction'>('Addition');

   if (!product) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="Vault Stock Protocol" size="md">
         <div className="p-4 space-y-12 bg-luxury-charcoal transition-colors">
            <div className="flex gap-4 p-8 bg-luxury-black rounded-3xl border border-luxury-border">
               <div className="w-16 h-16 bg-luxury-surface rounded-2xl flex items-center justify-center text-luxury-text-dim border border-luxury-border-dim">
                  <Gem size={32} />
               </div>
               <div>
                  <p className="text-lg font-serif font-black text-gold-400 uppercase tracking-tight">{product.name}</p>
                  <p className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest mt-1">Current Balance: {product.stock} Unit(s)</p>
               </div>
            </div>

            <div className="space-y-8">
               <div className="flex bg-luxury-black p-2 rounded-2xl border border-luxury-border">
                  <button
                     onClick={() => setType('Addition')}
                     className={cn(
                        'flex-1 py-4 rounded-xl flex items-center justify-center gap-3 transition-all uppercase font-black text-[10px] tracking-widest',
                        type === 'Addition' ? 'bg-green-500 text-luxury-black shadow-lg shadow-green-500/20' : 'text-luxury-text-muted hover:bg-luxury-surface'
                     )}
                  >
                     <ArrowUpCircle size={20} /> Vault Stocking
                  </button>
                  <button
                     onClick={() => setType('Subtraction')}
                     className={cn(
                        'flex-1 py-4 rounded-xl flex items-center justify-center gap-3 transition-all uppercase font-black text-[10px] tracking-widest',
                        type === 'Subtraction' ? 'bg-red-500 text-luxury-black shadow-lg shadow-red-500/20' : 'text-luxury-text-muted hover:bg-luxury-surface'
                     )}
                  >
                     <ArrowDownCircle size={20} /> Stock Departure
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <Input
                     label="Quantity Unit(s)"
                     type="number"
                     value={adjustment}
                     onChange={(e) => setAdjustment(Math.max(0, Number(e.target.value)))}
                     className="text-4xl h-20 text-center font-black font-serif text-luxury-text border-2 border-luxury-border bg-luxury-black"
                  />
                  <div className="space-y-1.5">
                     <label className="text-[10px] uppercase font-black tracking-widest text-gold-200/60">Registry Comment</label>
                     <select
                        className="w-full h-20 bg-luxury-black border-2 border-luxury-border rounded-2xl px-6 outline-none focus:border-gold-400 text-luxury-text font-bold uppercase tracking-widest text-xs"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                     >
                        {type === 'Addition' ? (
                           <>
                              <option className="bg-luxury-black">Inbound Shipment</option>
                              <option className="bg-luxury-black">Return Acquisition</option>
                              <option className="bg-luxury-black">Inventory Audit Plus</option>
                           </>
                        ) : (
                           <>
                              <option className="bg-luxury-black">Extract from Bulk (Split)</option>
                              <option className="bg-luxury-black">Damage Withdrawal</option>
                              <option className="bg-luxury-black">Theft/Loss Archive</option>
                              <option className="bg-luxury-black">Audit Correction</option>
                           </>
                        )}
                     </select>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 pt-8">
               <Button type="button" variant="outline" className="h-14 px-12 border-luxury-border uppercase font-black tracking-widest" onClick={onClose}>Abort Protocol</Button>
               <Button
                  variant="gold"
                  className={cn('h-14 flex-1 uppercase font-black tracking-widest text-lg', type === 'Subtraction' ? 'from-red-600 to-red-400 bg-gradient-to-r' : '')}
                  onClick={() => onUpdate(product.id, type === 'Addition' ? adjustment : -adjustment)}
               >
                  Commit Adjustment
               </Button>
            </div>
         </div>
      </Modal>
   );
};


// ─── CSV Bulk Import Modal ────────────────────────────────────────────────────

const CSV_COLUMNS = [
   'name', 'sku', 'category', 'metalType', 'purity', 'weight',
   'makingCharges', 'makingChargePercent', 'isPercentageMakingCharge',
   'stoneCharges', 'wastagePercent', 'sellingPrice', 'stock',
   'lowStockThreshold', 'hsnCode', 'isRateSensitive', 'isActive', 'description', 'barcode'
] as const;

const CSV_HEADER = CSV_COLUMNS.join(',');

const TEMPLATE_ROWS = [
   'Royal Heritage Necklace,AUR-NK-001,Necklace,Gold,22K,15.5,250,0,FALSE,500,2,0,10,2,71131910,TRUE,TRUE,22K gold necklace with intricate design,',
   'Diamond Solitaire Ring,AUR-RG-002,Ring,Gold,18K,4.2,300,0,FALSE,15000,1.5,0,5,1,71131910,TRUE,TRUE,18K gold ring with 0.5ct diamond,',
   'Silver Bangle Set,AUR-BN-003,Bangles,Silver,925,25,80,0,FALSE,0,3,0,20,5,71131920,TRUE,TRUE,Set of 6 925 silver bangles,',
];

function downloadTemplate() {
   const csv = [CSV_HEADER, ...TEMPLATE_ROWS].join('\n');
   const blob = new Blob([csv], { type: 'text/csv' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'jewl-product-import-template.csv';
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
}

interface ParsedRow {
   rowNumber: number;
   raw: Record<string, string>;
   product?: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
   errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
   const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
   if (lines.length < 2) return [];

   // Parse header (handle optional BOM)
   const headerLine = lines[0].replace(/^\uFEFF/, '');
   const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

   return lines.slice(1).map((line, i) => {
      const rowNumber = i + 2;
      // Handle quoted CSV fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
         const ch = line[c];
         if (ch === '"') { inQuotes = !inQuotes; }
         else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
         else { current += ch; }
      }
      values.push(current.trim());

      const raw: Record<string, string> = {};
      headers.forEach((h, idx) => { raw[h] = (values[idx] ?? '').replace(/^"|"$/g, '').trim(); });

      const errors: string[] = [];

      // Validate required fields
      if (!raw.name) errors.push('Name is required');
      if (!raw.sku) errors.push('SKU is required');
      if (!raw.category) errors.push('Category is required');
      if (!raw.metalType) errors.push('Metal Type is required');

      const validPurities = ['24K', '22K', '21K', '20K', '18K', '14K', '9K', '925', '950', 'Other'];
      if (!validPurities.includes(raw.purity)) errors.push(`Purity must be one of: ${validPurities.join(', ')}`);

      const weight = parseFloat(raw.weight);
      if (isNaN(weight) || weight < 0) errors.push('Weight must be a non-negative number');

      const stock = parseInt(raw.stock);
      if (isNaN(stock) || stock < 0) errors.push('Stock must be a non-negative integer');

      if (errors.length > 0) return { rowNumber, raw, errors };

      const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
         name: raw.name,
         sku: raw.sku,
         category: raw.category,
         metalType: raw.metalType,
         purity: (raw.purity as any) || '22K',
         weight: parseFloat(raw.weight) || 0,
         makingCharges: parseFloat(raw.makingCharges) || 0,
         makingChargePercent: parseFloat(raw.makingChargePercent) || 0,
         isPercentageMakingCharge: raw.isPercentageMakingCharge?.toUpperCase() === 'TRUE',
         stoneCharges: parseFloat(raw.stoneCharges) || 0,
         wastagePercent: parseFloat(raw.wastagePercent) || 0,
         basePrice: 0,
         sellingPrice: parseFloat(raw.sellingPrice) || 0,
         stock: parseInt(raw.stock) || 0,
         lowStockThreshold: parseInt(raw.lowStockThreshold) || 2,
         hsnCode: raw.hsnCode || getAutomatedHSN(raw.category, raw.metalType),
         isRateSensitive: raw.isRateSensitive?.toUpperCase() !== 'FALSE',
         isActive: raw.isActive?.toUpperCase() !== 'FALSE',
         description: raw.description || '',
         barcode: raw.barcode || '',
         images: [],
         stockType: raw.category === 'Raw Material' ? 'Raw' : 'Fine',
      };

      return { rowNumber, raw, product, errors };
   });
}

interface BulkImportModalProps {
   isOpen: boolean;
   onClose: () => void;
   onImport: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
   categories: string[];
}

const BulkImportModal = ({ isOpen, onClose, onImport, categories }: BulkImportModalProps) => {
   const [step, setStep] = useState<'upload' | 'preview'>('upload');
   const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
   const [isDragging, setIsDragging] = useState(false);
   const [fileName, setFileName] = useState('');
   const [isImporting, setIsImporting] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const validRows = parsedRows.filter(r => r.errors.length === 0);
   const errorRows = parsedRows.filter(r => r.errors.length > 0);

   const handleFile = (file: File) => {
      if (!file.name.endsWith('.csv')) {
         alert('Please upload a .csv file');
         return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
         const text = e.target?.result as string;
         const rows = parseCSV(text);
         setParsedRows(rows);
         setStep('preview');
      };
      reader.readAsText(file);
   };

   const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
   };

   const handleConfirmImport = async () => {
      const toImport = validRows.map(r => r.product!);
      if (toImport.length === 0) return;
      setIsImporting(true);
      try {
         await onImport(toImport);
      } finally {
         setIsImporting(false);
         setStep('upload');
         setParsedRows([]);
         setFileName('');
      }
   };

   const handleClose = () => {
      setStep('upload');
      setParsedRows([]);
      setFileName('');
      onClose();
   };

   return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Products" size="xl">
         <div className="p-6 bg-luxury-charcoal space-y-8 max-h-[80vh] flex flex-col">

            {/* Step indicator */}
            <div className="flex items-center gap-4">
               <div className={cn('flex items-center gap-2 text-[10px] uppercase font-black tracking-widest transition-colors', step === 'upload' ? 'text-gold-400' : 'text-luxury-text-dim')}>
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors', step === 'upload' ? 'border-gold-400 bg-gold-400/10 text-gold-400' : 'border-luxury-border text-luxury-text-dim')}>1</div>
                  Upload CSV
               </div>
               <div className="flex-1 h-[1px] bg-luxury-border-dim" />
               <div className={cn('flex items-center gap-2 text-[10px] uppercase font-black tracking-widest transition-colors', step === 'preview' ? 'text-gold-400' : 'text-luxury-text-dim')}>
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors', step === 'preview' ? 'border-gold-400 bg-gold-400/10 text-gold-400' : 'border-luxury-border text-luxury-text-dim')}>2</div>
                  Review & Confirm
               </div>
            </div>

            {step === 'upload' && (
               <div className="space-y-6 flex-1 flex flex-col">
                  {/* Template Download */}
                  <div className="p-5 bg-gold-400/5 border border-gold-400/20 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gold-400/10 rounded-xl flex items-center justify-center text-gold-400">
                           <FileSpreadsheet size={20} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-luxury-text">Step 1: Download Template</p>
                           <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mt-0.5">Fill in the CSV template with your product data</p>
                        </div>
                     </div>
                     <Button variant="outline" className="border-gold-400/30 text-gold-400 hover:bg-gold-400/10 h-10 text-[10px] uppercase font-black tracking-widest" onClick={downloadTemplate}>
                        <Download size={14} className="mr-2" /> Download Template
                     </Button>
                  </div>

                  {/* CSV Column Guide */}
                  <div className="p-4 bg-luxury-black/40 rounded-2xl border border-luxury-border-dim">
                     <p className="text-[9px] uppercase font-black tracking-widest text-gold-400/60 mb-3">Required Columns</p>
                     <div className="flex flex-wrap gap-2">
                        {['name *', 'sku *', 'category *', 'metalType *', 'purity *', 'weight *', 'stock *'].map(col => (
                           <span key={col} className="px-2 py-1 bg-gold-400/10 border border-gold-400/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-gold-400">{col}</span>
                        ))}
                        {['makingCharges', 'makingChargePercent', 'isPercentageMakingCharge', 'stoneCharges', 'wastagePercent', 'sellingPrice', 'lowStockThreshold', 'hsnCode', 'isRateSensitive', 'isActive', 'description', 'barcode'].map(col => (
                           <span key={col} className="px-2 py-1 bg-luxury-surface border border-luxury-border-dim rounded-lg text-[9px] font-black uppercase tracking-widest text-luxury-text-dim">{col}</span>
                        ))}
                     </div>
                     <div className="mt-3 pt-3 border-t border-luxury-border-dim space-y-1">
                        <p className="text-[9px] text-luxury-text-dim font-bold"><span className="text-gold-400">purity:</span> 24K, 22K, 21K, 20K, 18K, 14K, 9K, 925, 950, Other</p>
                        <p className="text-[9px] text-luxury-text-dim font-bold"><span className="text-gold-400">isPercentageMakingCharge / isRateSensitive / isActive:</span> TRUE or FALSE</p>
                        <p className="text-[9px] text-luxury-text-dim font-bold"><span className="text-gold-400">category:</span> {(categories.slice(0, 6).join(', '))}...</p>
                     </div>
                  </div>

                  {/* Drop Zone */}
                  <div
                     onDrop={handleDrop}
                     onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                     onDragLeave={() => setIsDragging(false)}
                     onClick={() => fileInputRef.current?.click()}
                     className={cn(
                        'flex-1 min-h-[180px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group',
                        isDragging ? 'border-gold-400 bg-gold-400/5 scale-[1.01]' : 'border-luxury-border-dim hover:border-gold-400/40 hover:bg-luxury-black/30'
                     )}
                  >
                     <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                     <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all', isDragging ? 'bg-gold-400/20 text-gold-400' : 'bg-luxury-surface text-luxury-text-dim group-hover:bg-gold-400/10 group-hover:text-gold-400')}>
                        <Upload size={28} />
                     </div>
                     <p className="text-sm font-bold text-luxury-text mb-1">
                        {isDragging ? 'Drop your CSV here' : 'Drag & drop your CSV file'}
                     </p>
                     <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">or click to browse • .csv files only</p>
                  </div>
               </div>
            )}

            {step === 'preview' && (
               <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                     <div className="p-4 bg-luxury-black/40 rounded-2xl border border-luxury-border-dim text-center">
                        <p className="text-2xl font-serif font-black text-luxury-text">{parsedRows.length}</p>
                        <p className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim mt-1">Total Rows</p>
                     </div>
                     <div className="p-4 bg-green-400/5 rounded-2xl border border-green-400/20 text-center">
                        <p className="text-2xl font-serif font-black text-green-400">{validRows.length}</p>
                        <p className="text-[9px] uppercase font-black tracking-widest text-green-400/60 mt-1">Ready to Import</p>
                     </div>
                     <div className={cn('p-4 rounded-2xl border text-center', errorRows.length > 0 ? 'bg-red-400/5 border-red-400/20' : 'bg-luxury-black/40 border-luxury-border-dim')}>
                        <p className={cn('text-2xl font-serif font-black', errorRows.length > 0 ? 'text-red-400' : 'text-luxury-text-dim')}>{errorRows.length}</p>
                        <p className={cn('text-[9px] uppercase font-black tracking-widest mt-1', errorRows.length > 0 ? 'text-red-400/60' : 'text-luxury-text-dim')}>Rows with Errors</p>
                     </div>
                  </div>

                  {/* File name */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                     <FileSpreadsheet size={16} className="text-gold-400" />
                     <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">{fileName}</span>
                     <button onClick={() => { setStep('upload'); setParsedRows([]); setFileName(''); }} className="ml-auto text-[9px] uppercase font-black tracking-widest text-luxury-text-dim hover:text-gold-400 transition-colors">
                        ← Change File
                     </button>
                  </div>

                  {/* Preview table */}
                  <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-luxury-border-dim scrollbar-gold">
                     <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-luxury-black z-10">
                           <tr>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim w-12">Row</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Status</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Name</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">SKU</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Category</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Metal</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Weight</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Stock</th>
                              <th className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest text-luxury-text-dim">Issues</th>
                           </tr>
                        </thead>
                        <tbody>
                           {parsedRows.map(row => (
                              <tr key={row.rowNumber} className={cn('border-t border-luxury-border-dim transition-colors', row.errors.length === 0 ? 'hover:bg-green-400/5' : 'hover:bg-red-400/5 bg-red-400/[0.02]')}>
                                 <td className="px-4 py-3 text-luxury-text-dim font-mono text-[10px]">{row.rowNumber}</td>
                                 <td className="px-4 py-3">
                                    {row.errors.length === 0
                                       ? <CheckCircle2 size={16} className="text-green-400" />
                                       : <XCircle size={16} className="text-red-400" />
                                    }
                                 </td>
                                 <td className="px-4 py-3 font-bold text-luxury-text truncate max-w-[140px]">{row.raw.name || <span className="text-red-400 italic">missing</span>}</td>
                                 <td className="px-4 py-3 font-mono text-luxury-text-dim uppercase text-[10px]">{row.raw.sku || <span className="text-red-400 italic">missing</span>}</td>
                                 <td className="px-4 py-3 text-luxury-text-dim">{row.raw.category || '—'}</td>
                                 <td className="px-4 py-3 text-gold-400 font-bold">{row.raw.metalType || '—'} {row.raw.purity || ''}</td>
                                 <td className="px-4 py-3 text-luxury-text-dim">{row.raw.weight ? `${row.raw.weight}g` : '—'}</td>
                                 <td className="px-4 py-3 text-luxury-text-dim">{row.raw.stock ?? '—'}</td>
                                 <td className="px-4 py-3 max-w-[200px]">
                                    {row.errors.length > 0 && (
                                       <div className="flex items-start gap-1">
                                          <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                                          <span className="text-[9px] text-red-400 font-bold leading-tight">{row.errors.join('; ')}</span>
                                       </div>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-2 flex-shrink-0">
                     <Button type="button" variant="outline" className="h-14 px-10 border-luxury-border uppercase font-black tracking-widest" onClick={handleClose}>Cancel</Button>
                     <Button
                        variant="gold"
                        className="h-14 flex-1 uppercase font-black tracking-widest text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleConfirmImport}
                        disabled={validRows.length === 0 || isImporting}
                     >
                        {isImporting ? 'Importing...' : `Import ${validRows.length} Product${validRows.length !== 1 ? 's' : ''} to Vault`}
                     </Button>
                  </div>

                  {errorRows.length > 0 && validRows.length > 0 && (
                     <p className="text-[9px] uppercase font-black tracking-widest text-luxury-text-dim text-center">
                        <AlertTriangle size={10} className="inline mr-1 text-amber-400" />
                        {errorRows.length} row(s) with errors will be skipped
                     </p>
                  )}
               </div>
            )}
         </div>
      </Modal>
   );
};

const WholesaleEntryModal = ({ isOpen, onClose, product }: any) => {
   const { products, addProduct, updateProduct } = useProductStore();
   const { settings } = useSettingsStore();
   const [formData, setFormData] = useState({
      metalType: 'Gold',
      purity: '22K',
      weight: 0,
      quantity: 1
   });

   useEffect(() => {
      if (isOpen) {
         if (product) {
            setFormData({
               metalType: product.metalType,
               purity: product.purity,
               weight: product.weight,
               quantity: product.stock
            });
         } else {
            setFormData({
               metalType: 'Gold',
               purity: '22K',
               weight: 0,
               quantity: 1
            });
         }
      }
   }, [isOpen, product]);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const weight = Number(formData.weight);
      if (weight < 0) {
         toast.error("Weight cannot be negative.");
         return;
      }

      try {
         if (product) {
            await updateProduct(product.id, {
               metalType: formData.metalType,
               purity: formData.purity as any,
               stock: 1,
               weight: weight,
               name: `Wholesale ${formData.metalType} ${formData.purity}`,
               hsnCode: getAutomatedHSN('Wholesale Metal', formData.metalType)
            });
            toast.success(`Updated Wholesale Metal entry`);
         } else {
            const existing = products.find(p => p.category === 'Wholesale Metal' && p.metalType === formData.metalType && p.purity === formData.purity);
            if (existing) {
               await updateProduct(existing.id, {
                  stock: 1,
                  weight: existing.weight + weight
               });
               toast.success(`Added ${weight}g to ${existing.name}`);
            } else {
               const newSKU = generateAutoSKU('Wholesale Metal', formData.metalType, formData.purity, products);
               const calculatedHSN = getAutomatedHSN('Wholesale Metal', formData.metalType);

               await addProduct({
                  name: `Wholesale ${formData.metalType} ${formData.purity}`,
                  sku: newSKU,
                  category: 'Wholesale Metal' as any,
                  metalType: formData.metalType,
                  purity: formData.purity as any,
                  weight: weight,
                  makingCharges: 0,
                  makingChargePercent: 0,
                  isPercentageMakingCharge: false,
                  stoneCharges: 0,
                  wastagePercent: 0,
                  sellingPrice: 0,
                  stock: 1,
                  lowStockThreshold: 10,
                  hsnCode: calculatedHSN,
                  isActive: true,
                  isRateSensitive: false,
                  images: []
               } as any);
               toast.success(`Created new Wholesale Metal entry with ${weight}g`);
            }
         }
         onClose();
      } catch (err: any) {
         toast.error(`Error: ${err.message}`);
      }
   };

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={product ? "Edit Wholesale Stock" : "Add Wholesale Stock"} size="md">
         <form onSubmit={handleSubmit} className="p-6 bg-luxury-charcoal space-y-6">
            <div className="space-y-1.5">
               <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Metal Type</label>
               <select
                  className="w-full h-14 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-xs font-bold text-luxury-text uppercase tracking-widest transition-colors outline-none focus:border-gold-400/40"
                  value={formData.metalType}
                  onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
               >
                  {Object.keys(settings.metalRates || {}).map(m => <option key={m} value={m} className="bg-luxury-black">{m}</option>)}
               </select>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Purity</label>
               <select
                  className="w-full h-14 bg-luxury-black border border-luxury-border-dim rounded-xl px-4 text-xs font-bold text-luxury-text uppercase tracking-widest transition-colors outline-none focus:border-gold-400/40"
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
               >
                  {['24K', '22K', '21K', '20K', '18K', '14K', '9K', '925', '950', 'Other'].map(p => <option key={p} value={p} className="bg-luxury-black">{p}</option>)}
               </select>
            </div>

            <Input
               label="Total Weight (in Grams)"
               type="number" step="0.01"
               value={formData.weight || ''}
               onChange={(e) => setFormData({ ...formData, weight: e.target.value as any })}
               onFocus={(e) => e.target.select()}
               className="bg-luxury-black border-luxury-border h-14"
               required
            />

            <div className="flex gap-4 pt-4 border-t border-luxury-border-dim">
               <Button type="button" variant="outline" className="flex-1 h-14 border-luxury-border uppercase font-black tracking-widest text-[10px] text-luxury-text-muted" onClick={onClose}>Cancel</Button>
               <Button type="submit" variant="gold" className="flex-1 h-14 uppercase font-black tracking-widest text-[10px]">{product ? "Update Vault" : "Add To Vault"}</Button>
            </div>
         </form>
      </Modal>
   );
};
