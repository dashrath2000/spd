import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
   Search,
   Filter,
   Calendar,
   ChevronRight,
   FileText,
   ArrowLeftRight,
   Download,
   Eye,
   RotateCcw,
   CheckCircle2,
   XCircle,
   Gem,
   Scale
} from 'lucide-react';
import { useSalesStore } from '../store/salesStore';
import { useAuthStore } from '../store/authStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import { generateInvoice } from '../utils/invoiceGenerator';
import { useSettingsStore } from '../store/settingsStore';
import { useCustomerStore } from '../store/customerStore';
import type { Sale, CartItem, OldGoldItem } from '../types';

export const SalesHistoryPage = () => {
   const { sales } = useSalesStore();
   const { settings } = useSettingsStore();
   const { customers } = useCustomerStore();
   const { activeBranchId } = useAuthStore();
   const [searchTerm, setSearchTerm] = useState('');
   const [isDetailOpen, setIsDetailOpen] = useState(false);
   const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

   const currentSale = useMemo(() => {
      if (!selectedSale) return null;
      return sales.find(s => s.id === selectedSale.id) || selectedSale;
   }, [sales, selectedSale]);

   const currentBranchName = useMemo(() => {
      if (!activeBranchId) return 'Global Ledger';
      return settings.branches?.find(b => b.id === activeBranchId)?.name || 'Branch Record';
   }, [activeBranchId, settings.branches]);

   const filteredSales = useMemo(() => {
      return sales.filter(s => {
         // 1. Branch Filter
         const matchesBranch = !activeBranchId || s.branchId === activeBranchId;
         if (!matchesBranch) return false;

         // 2. Search Filter
         const search = searchTerm.toLowerCase();
         return (
            s.invoiceNumber.toLowerCase().includes(search) ||
            s.customerName.toLowerCase().includes(search) ||
            s.customerPhone.includes(search)
         );
      });
   }, [sales, searchTerm, activeBranchId]);

   const columns = [
      {
         header: 'Certificate ID',
         accessor: (row: Sale) => (
            <div className="flex flex-col transition-colors">
               <span className="font-bold text-luxury-text tracking-widest transition-colors">{row.invoiceNumber}</span>
               <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-[0.2em] transition-colors">{new Date(row.createdAt).toLocaleString()}</span>
            </div>
         )
      },
      {
         header: 'Client Portfolio',
         accessor: (row: Sale) => (
            <div className="flex flex-col transition-colors">
               <span className="font-bold text-luxury-text transition-colors">{row.customerName}</span>
               <span className="text-[10px] text-luxury-text-muted font-mono italic transition-colors">{row.customerPhone}</span>
            </div>
         )
      },
      {
         header: 'Transaction Flow',
         accessor: (row: Sale) => (
            <div className="flex items-center gap-3 transition-colors">
               <div className={cn(
                  'p-2 rounded-lg transition-colors',
                  row.paymentMethod === 'Cash' ? 'bg-green-500/10 text-green-500' : 'bg-gold-400/10 text-gold-400'
               )}>
                  {row.paymentMethod === 'Cash' ? <ArrowLeftRight size={14} /> : <FileText size={14} />}
               </div>
               <span className="text-xs font-bold uppercase tracking-widest text-luxury-text-muted transition-colors">{row.paymentMethod}</span>
            </div>
         )
      },
      {
         header: 'Total Value',
         accessor: (row: Sale) => (
            <div className="flex flex-col transition-colors">
               <span className="text-sm font-black text-gold-400 font-mono tracking-tight">{formatCurrency(row.grandTotal)}</span>
               <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest transition-colors">{row.items.length} Items</span>
            </div>
         )
      },
      {
         header: 'Validation',
         accessor: (row: Sale) => (
            <Badge
               variant={row.grandTotal < 0 ? 'warning' : (row.status === 'Completed' ? 'success' : 'error')}
               className="text-[10px] uppercase font-black tracking-widest px-3 py-1"
            >
               {row.grandTotal < 0 ? 'BUYBACK' : row.status}
            </Badge>
         )
      },
      {
         header: '',
         accessor: (row: Sale) => (
            <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity pr-4">
               <button onClick={(e) => { e.stopPropagation(); setSelectedSale(row); setIsDetailOpen(true); }} className="p-2 hover:bg-gold-400/10 rounded-lg text-luxury-text hover:text-gold-400 transition-all transition-colors"><Eye size={16} /></button>
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     const customer = customers.find(c => c.id === row.customerId) || null;
                     generateInvoice(row, settings, customer);
                  }}
                  className="p-2 hover:bg-luxury-surface rounded-lg text-luxury-text transition-all transition-colors"
               >
                  <Download size={16} />
               </button>
            </div>
         )
      }
   ];

   return (
      <div className="space-y-8 animate-fade-in transition-colors duration-500">
         <div className="flex items-end justify-between">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <ChevronRight size={16} className="text-gold-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-luxury-text-muted transition-colors">Archive Records</p>
               </div>
               <h1 className="text-4xl font-serif font-bold text-luxury-text tracking-tight leading-none uppercase transition-colors">
                  {currentBranchName.split(' ')[0]} <span className="text-gold-400">{currentBranchName.split(' ').slice(1).join(' ') || 'Ledger'}</span>
               </h1>
            </div>
            <div className="flex gap-4">
               <div className="bg-luxury-charcoal border border-luxury-border px-6 py-4 rounded-2xl flex items-center gap-4 transition-colors">
                  <Calendar className="text-gold-400" size={20} />
                  <div className="flex flex-col">
                     <p className="text-xs font-black text-luxury-text uppercase tracking-widest transition-colors">March 2024 - Present</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 flex flex-col gap-6">
               <div className="relative group transition-colors">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
                  <input
                     type="text"
                     placeholder="Enter Certificate ID, Member Name, or Reference Number..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-16 bg-luxury-input border-2 border-luxury-border-dim rounded-3xl pl-12 pr-6 text-lg focus:border-gold-400/40 outline-none transition-all placeholder:text-luxury-text-dim shadow-inner text-luxury-text"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                     <div className="h-8 w-[1px] bg-luxury-border-dim" />
                     <Filter className="text-luxury-text-dim hover:text-gold-400 transition-colors cursor-pointer" size={20} />
                  </div>
               </div>

               <Table columns={columns} data={filteredSales} onRowClick={(row) => { setSelectedSale(row); setIsDetailOpen(true); }} />
            </div>
         </div>

         {isDetailOpen && (
            <SaleDetailModal
               isOpen={isDetailOpen}
               onClose={() => setIsDetailOpen(false)}
               sale={currentSale}
            />
         )}
      </div>
   );
};

interface SaleDetailModalProps {
   isOpen: boolean;
   onClose: () => void;
   sale: Sale | null;
}

const SaleDetailModal = ({ isOpen, onClose, sale }: SaleDetailModalProps) => {
   const { settings } = useSettingsStore();
   const { customers } = useCustomerStore();
   const { updateSale } = useSalesStore();
   const [isEditingDate, setIsEditingDate] = useState(false);
   const [editDate, setEditDate] = useState(() => {
      if (!sale) return '';
      const d = new Date(sale.createdAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
   });

   if (!sale) return null;

   const handleSaveDate = async () => {
      try {
         const newDateISO = new Date(editDate).toISOString();
         await updateSale(sale.id, { createdAt: newDateISO });
         toast.success('Transaction Date updated successfully!');
         setIsEditingDate(false);
      } catch (error) {
         console.error('Failed to update sale date:', error);
         toast.error('Failed to update transaction date.');
      }
   };

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Certificate No. ${sale.invoiceNumber}`} size="lg">
         <div className="p-4 space-y-12 bg-luxury-charcoal transition-colors duration-500">
            {/* Status Banner */}
            <div className={cn(
               'flex items-center justify-between p-6 rounded-3xl border animate-slide-up transition-colors',
               sale.status === 'Completed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            )}>
               <div className="flex items-center gap-4">
                  {sale.status === 'Completed' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-widest line-clamp-1 truncate pr-2 leading-none mb-1">Authenticated Transaction</h3>
                     {isEditingDate ? (
                        <div className="flex items-center gap-2 mt-1">
                           <input
                              type="datetime-local"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="bg-luxury-black border border-gold-400/40 rounded px-2 py-1 text-xs text-luxury-text outline-none focus:border-gold-400"
                           />
                           <button
                              onClick={handleSaveDate}
                              className="px-2 py-1 bg-gold-400 text-luxury-black rounded text-[10px] font-bold uppercase tracking-wider hover:bg-gold-300 transition-colors"
                           >
                              Save
                           </button>
                           <button
                              onClick={() => setIsEditingDate(false)}
                              className="px-2 py-1 bg-luxury-surface border border-luxury-border rounded text-[10px] font-bold uppercase tracking-wider text-luxury-text hover:bg-luxury-black transition-colors"
                           >
                              Cancel
                           </button>
                        </div>
                     ) : (
                        <div className="flex items-center gap-2 mt-1">
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                              Verified by Admin on {new Date(sale.createdAt).toLocaleString()}
                           </p>
                           <button
                              onClick={() => setIsEditingDate(true)}
                              className="p-1 hover:bg-luxury-surface rounded text-gold-400 hover:text-gold-300 transition-colors"
                              title="Edit Date"
                           >
                              <Calendar size={12} />
                           </button>
                        </div>
                     )}
                  </div>
               </div>
               <p className="text-2xl font-serif font-black">{sale.status}</p>
            </div>

            <div className="grid grid-cols-2 gap-12">
               <div className="space-y-8">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Customer Portfolio</h4>
                  <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-6 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gold-400/10 rounded-2xl flex items-center justify-center text-gold-400 font-serif font-black text-2xl border border-gold-400/20 transition-colors">
                           {sale.customerName[0]}
                        </div>
                        <div>
                           <p className="font-bold text-luxury-text text-lg uppercase tracking-tight transition-colors">{sale.customerName}</p>
                           <p className="text-xs text-luxury-text-muted font-mono transition-colors">{sale.customerPhone}</p>
                        </div>
                     </div>
                     <div className="pt-6 border-t border-luxury-border-dim space-y-4 transition-colors">
                        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                           <span>Payment Profile</span>
                           <span className="text-luxury-text transition-colors">{sale.paymentMethod}</span>
                        </div>
                        {sale.paymentDetails.upiRef && (
                           <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                              <span>Ref ID</span>
                              <span className="text-luxury-text font-mono transition-colors">{sale.paymentDetails.upiRef}</span>
                           </div>
                        )}
                        {sale.paymentDetails.cardLast4 && (
                           <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                              <span>Ending At</span>
                              <span className="text-luxury-text font-mono transition-colors">**** {sale.paymentDetails.cardLast4}</span>
                           </div>
                        )}
                        {sale.paymentMethod === 'Split' && (
                           <div className="pt-2 border-t border-luxury-border-dim mt-2 space-y-2">
                              {(sale.paymentDetails.cash || 0) > 0 && (
                                 <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                                    <span>Cash Split</span>
                                    <span className="text-luxury-text transition-colors">{formatCurrency(sale.paymentDetails.cash || 0)}</span>
                                 </div>
                              )}
                              {(sale.paymentDetails.card || 0) > 0 && (
                                 <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                                    <span>Card Split</span>
                                    <span className="text-luxury-text transition-colors">{formatCurrency(sale.paymentDetails.card || 0)}</span>
                                 </div>
                              )}
                              {(sale.paymentDetails.upi || 0) > 0 && (
                                 <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim transition-colors">
                                    <span>UPI Split</span>
                                    <span className="text-luxury-text transition-colors">{formatCurrency(sale.paymentDetails.upi || 0)}</span>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Internal Log</h4>
                  <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-4 transition-colors">
                     {[
                        { label: 'Sub-Total Flow', value: formatCurrency(sale.subtotal) },
                        { label: 'Appreciation Credit', value: `-${formatCurrency(sale.discountTotal)}`, color: 'text-green-500' },
                        { label: 'CGST', value: formatCurrency(sale.cgst) },
                        { label: 'SGST', value: formatCurrency(sale.sgst) }
                     ].map((item: { label: string; value: string; color?: string }, i) => (
                        <div key={i} className="flex justify-between text-[10px] uppercase font-black tracking-widest text-luxury-text-dim italic transition-colors">
                           <span>{item.label}</span>
                           <span className={item.color || 'text-luxury-text'}>{item.value}</span>
                        </div>
                     ))}
                     <div className="pt-6 mt-6 border-t border-gold-400/10 flex justify-between items-end transition-colors">
                        <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Net Portfolio Transfer</p>
                        <p className="text-3xl font-serif font-black text-gold-400 transition-colors">{formatCurrency(sale.grandTotal)}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="space-y-8">
               <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Vault Interaction Map</h4>
               <div className="grid grid-cols-1 gap-4">
                  {sale.items.map((item: CartItem, i: number) => (
                     <div key={i} className="p-6 bg-luxury-surface rounded-2xl flex items-center justify-between group hover:bg-luxury-black/30 transition-all border border-luxury-border">
                        <div className="flex items-center gap-4 transition-colors">
                           <div className="w-12 h-12 bg-luxury-black rounded-xl border border-luxury-border-dim flex items-center justify-center text-luxury-text-dim group-hover:text-gold-400 transition-colors">
                              <Gem size={24} />
                           </div>
                           <div>
                              <p className="font-bold text-luxury-text uppercase tracking-wide leading-none mb-1 transition-colors">{item.product.name}</p>
                              <p className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest transition-colors">{item.product.sku} • {item.quantity} Unit(s)</p>
                           </div>
                        </div>
                        <div className="text-right transition-colors">
                           <p className="text-sm font-bold text-luxury-text mb-1 transition-colors">{formatCurrency(item.product.sellingPrice * item.quantity)}</p>
                           <p className="text-[8px] uppercase font-black tracking-widest text-gold-400/40 transition-colors">Inscribed: {item.product.purity} / {item.product.weight}g</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {sale.oldGoldItems && sale.oldGoldItems.length > 0 && (
               <div className="space-y-8">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Buyback Assets (Old Gold)</h4>
                  <div className="grid grid-cols-1 gap-4">
                     {sale.oldGoldItems.map((item: OldGoldItem, i: number) => (
                        <div key={i} className="p-6 bg-gold-400/5 rounded-2xl flex items-center justify-between group hover:bg-gold-400/10 transition-all border border-gold-400/20">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-luxury-black rounded-xl border border-luxury-border-dim flex items-center justify-center text-gold-400">
                                 <Scale size={24} />
                              </div>
                              <div>
                                 <p className="font-bold text-luxury-text uppercase tracking-wide leading-none mb-1">{item.description}</p>
                                 <p className="text-[10px] text-luxury-text-dim uppercase font-black tracking-widest">
                                    {item.grossWeight}g • {item.melting}% Touch • {formatCurrency(item.rate)}/g
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-bold text-gold-400 mb-1">{formatCurrency(item.value)}</p>
                              <p className="text-[8px] uppercase font-black tracking-widest text-gold-400/40">Fine: {item.fineWeight.toFixed(3)}g</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            <div className="flex gap-4 pt-12 transition-colors">
               <Button
                  variant="outline"
                  className="h-16 px-12 border-luxury-border uppercase font-black tracking-widest flex items-center gap-3 transition-colors"
                  onClick={() => {
                     const customer = customers.find(c => c.id === sale.customerId) || null;
                     generateInvoice(sale, settings, customer);
                  }}
               >
                  <Download size={20} /> Export Certificate
               </Button>
               <Button variant="gold" className="h-16 flex-1 flex items-center justify-center gap-4 uppercase font-black tracking-widest text-lg shadow-[0_10px_30_rgba(201,168,76,0.2)] transition-colors">
                  <RotateCcw size={24} /> Initiate Reverse Acquisition (Refund)
               </Button>
            </div>
         </div>
      </Modal>
   );
};

// Removed local cn
