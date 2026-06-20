import { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, 
  Search,
  CheckCircle2,
  X,
  History,
  Scale,
  Plus,
  Trash2,
  Paperclip,
  Upload
} from 'lucide-react';
import { useCustomerStore } from '../../store/customerStore';
import { useGirviStore } from '../../store/girviStore';
import { useSettingsStore } from '../../store/settingsStore';
import { v4 as uuidv4 } from 'uuid';
import { Button, cn } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { CustomerModal } from '../../pages/CustomersPage';
import type { Customer, Girvi, GirviItem, PurityType } from '../../types';
import toast from 'react-hot-toast';

interface GirviModalProps {
  isOpen: boolean;
  onClose: () => void;
  girvi?: Girvi | null;
}

export const GirviModal = ({ isOpen, onClose, girvi }: GirviModalProps) => {
  const { customers, addCustomer } = useCustomerStore();
  const { addGirvi, updateGirvi } = useGirviStore();
  const { settings } = useSettingsStore();
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [items, setItems] = useState<GirviItem[]>([
    { id: uuidv4(), description: '', weight: 0, purity: '22K' }
  ]);

  const [loanData, setLoanData] = useState({
    loanAmount: '',
    displayLoanAmount: '',
    interestRate: '2', // Default 2%
    isCompoundInterest: false,
    enableLiveValuation: false,
    loanDate: new Date().toISOString().split('T')[0],
  });
  const [payoutMethod, setPayoutMethod] = useState<'Cash' | 'Bank' | 'UPI' | 'Card'>('Cash');
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (girvi) {
        const customer = customers.find(c => c.id === girvi.customerId) || {
          id: girvi.customerId,
          name: girvi.customerName,
          phone: girvi.customerPhone,
        } as Customer;
        setSelectedCustomer(customer);
        setSearchTerm('');
        setItems(girvi.items || []);
        setLoanData({
          loanAmount: girvi.loanAmount.toString(),
          displayLoanAmount: new Intl.NumberFormat('en-IN').format(girvi.loanAmount),
          interestRate: girvi.interestRate.toString(),
          isCompoundInterest: girvi.isCompoundInterest,
          enableLiveValuation: girvi.enableLiveValuation || false,
          loanDate: girvi.loanDate.split('T')[0],
        });
        setPayoutMethod(girvi.payoutMethod || 'Cash');
        setAttachments(girvi.images || []);
      } else {
        setSearchTerm('');
        setSelectedCustomer(null);
        setItems([{ id: uuidv4(), description: '', weight: 0, purity: '22K' }]);
        setLoanData({
          loanAmount: '',
          displayLoanAmount: '',
          interestRate: '2',
          isCompoundInterest: false,
          enableLiveValuation: false,
          loanDate: new Date().toISOString().split('T')[0],
        });
        setPayoutMethod('Cash');
        setAttachments([]);
      }
    }
  }, [isOpen, girvi, customers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoanAmountChange = (val: string) => {
    // Remove non-numeric characters except decimal
    const numericValue = val.replace(/[^0-9.]/g, '');
    if (numericValue === '') {
      setLoanData({ ...loanData, loanAmount: '', displayLoanAmount: '' });
      return;
    }

    const numberValue = parseFloat(numericValue);
    if (!isNaN(numberValue)) {
      const formatted = new Intl.NumberFormat('en-IN').format(numberValue);
      setLoanData({ 
        ...loanData, 
        loanAmount: numericValue, 
        displayLoanAmount: formatted 
      });
    }
  };

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.weight || 0), 0);
  }, [items]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const addItem = () => {
    setItems([...items, { id: uuidv4(), description: '', weight: 0, purity: '22K' }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof GirviItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('At least one item is required');
      return;
    }

    if (items.some(item => !item.description || item.weight <= 0)) {
      toast.error('Please fill in all item details correctly');
      return;
    }

    const now = new Date();
    const loanDateTime = new Date(loanData.loanDate);
    // Combine selected date with current time
    loanDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    if (girvi) {
      const updatedGirvi: Partial<Girvi> = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        items: items,
        totalWeight: totalWeight,
        loanAmount: parseFloat(loanData.loanAmount),
        interestRate: parseFloat(loanData.interestRate),
        isCompoundInterest: loanData.isCompoundInterest,
        enableLiveValuation: loanData.enableLiveValuation,
        loanDate: loanDateTime.toISOString(),
        payoutMethod: payoutMethod,
        images: attachments,
        updatedAt: new Date().toISOString(),
      };

      try {
        await updateGirvi(girvi.id, updatedGirvi);
        toast.success('Girvi asset updated successfully');
        onClose();
      } catch (err) {
        toast.error('Failed to update Girvi asset');
      }
    } else {
      const newGirvi: Girvi = {
        id: uuidv4(),
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        girviNumber: `GV-${Date.now().toString().slice(-6)}`,
        items: items,
        totalWeight: totalWeight,
        loanAmount: parseFloat(loanData.loanAmount),
        interestRate: parseFloat(loanData.interestRate),
        isCompoundInterest: loanData.isCompoundInterest,
        enableLiveValuation: loanData.enableLiveValuation,
        loanDate: loanDateTime.toISOString(),
        status: 'Active',
        payoutMethod: payoutMethod,
        payments: [],
        images: attachments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await addGirvi(newGirvi);
        toast.success('Girvi asset registered successfully');
        setItems([{ id: uuidv4(), description: '', weight: 0, purity: '22K' }]);
        setAttachments([]);
        setLoanData({
          loanAmount: '',
          displayLoanAmount: '',
          interestRate: '2',
          isCompoundInterest: false,
          enableLiveValuation: false,
          loanDate: new Date().toISOString().split('T')[0],
        });
        setSelectedCustomer(null);
        onClose();
      } catch (err) {
        toast.error('Failed to register Girvi asset');
      }
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={girvi ? "Edit Girvi Asset" : "Register New Girvi Asset"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 scrollbar-gold">
          {/* Customer Selection */}
          <div className="space-y-4">
             <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Asset Ownership</h4>
             {selectedCustomer ? (
                <div className="flex items-center justify-between p-4 bg-gold-400/5 border border-gold-400/20 rounded-2xl group transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center text-luxury-black font-bold">
                       {selectedCustomer.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-luxury-text leading-tight">{selectedCustomer.name}</p>
                      <p className="text-xs text-luxury-text-muted font-medium">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button 
                     type="button"
                     onClick={() => setSelectedCustomer(null)}
                     className="p-1 hover:bg-luxury-surface rounded-full text-luxury-text-dim hover:text-luxury-text transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search Customer Portfolio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 bg-luxury-input border-2 border-luxury-border-dim rounded-2xl pl-12 pr-6 text-sm focus:border-gold-400/40 outline-none transition-all placeholder:text-luxury-text-dim font-bold uppercase tracking-wide text-luxury-text"
                  />
                  {searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-luxury-charcoal backdrop-blur-2xl border border-luxury-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up">
                       <div className="max-h-64 overflow-y-auto scrollbar-gold">
                          {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                            <button 
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedCustomer(c); setSearchTerm(''); }}
                              className="w-full p-4 flex items-center justify-between hover:bg-luxury-surface transition-colors border-b border-luxury-border-dim last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-luxury-surface flex items-center justify-center text-luxury-text-dim text-xs font-bold">{c.name[0]}</div>
                                 <div className="text-left">
                                   <p className="text-sm font-bold text-luxury-text">{c.name}</p>
                                   <p className="text-[10px] text-luxury-text-dim font-medium">{c.phone}</p>
                                 </div>
                              </div>
                              <CheckCircle2 size={16} className="text-gold-400" />
                            </button>
                          )) : (
                            <div className="p-8 text-center">
                               <p className="text-sm text-luxury-text-dim mb-3 font-medium">No portfolio available.</p>
                               <Button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setIsCustomerModalOpen(true); }}
                                  size="sm" variant="outline" className="h-8 border-gold-400/30 text-gold-400 text-[10px] uppercase font-bold tracking-wide"
                                >
                                   <UserPlus size={12} className="mr-2" /> Create Portfolio
                                </Button>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Ornaments Specification</h4>
              <div className="flex items-center gap-4">
                <span className="text-[10px] uppercase font-bold text-luxury-text-dim">Total Weight: <span className="text-gold-400">{totalWeight.toFixed(3)}g</span></span>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-8 border-gold-400/20 text-gold-400 hover:bg-gold-400/10">
                  <Plus size={14} className="mr-2" /> Add Ornament
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-6 bg-luxury-surface border border-luxury-border-dim rounded-2xl relative group animate-fade-in">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <Input 
                        label={`Item #${index + 1} Description`}
                        placeholder="e.g. 1 Gold Chain"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-3">
                       <div className="space-y-1.5">
                        <label className="text-sm font-medium text-luxury-text-muted">Category</label>
                        <select 
                          value={item.category || 'Other'}
                          onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                          className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg px-4 py-2.5 text-luxury-text focus:border-gold-400 outline-none text-xs font-bold uppercase tracking-wider"
                        >
                          {(settings.categories || ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant', 'Bangles', 'Chain', 'Anklet', 'Brooch', 'Watch', 'Other'])
                            .filter(cat => cat !== 'Raw Material')
                            .map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Input 
                        label="Weight (g)"
                        type="number"
                        step="0.001"
                        value={item.weight || ''}
                        onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                       <div className="space-y-1.5">
                        <label className="text-sm font-medium text-luxury-text-muted">Purity</label>
                        <select 
                          value={item.purity}
                          onChange={(e) => updateItem(item.id, 'purity', e.target.value as PurityType)}
                          className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg px-4 py-2.5 text-luxury-text focus:border-gold-400 outline-none text-xs font-bold"
                        >
                          <option value="24K">24K</option>
                          <option value="22K">22K</option>
                          <option value="18K">18K</option>
                          <option value="14K">14K</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end pb-1.5">
                      <button 
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2.5 text-luxury-text-dim hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-6">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Loan Agreement</h4>
              <div className="grid grid-cols-3 gap-6">
                <Input 
                  label="Loan Amount (Principal)" 
                  type="text"
                  value={loanData.displayLoanAmount}
                  onChange={(e) => handleLoanAmountChange(e.target.value)}
                  placeholder="e.g. 50,000"
                  required
                />
                <Input 
                  label="Monthly Interest (%)" 
                  type="number"
                  step="0.1"
                  value={loanData.interestRate}
                  onChange={(e) => setLoanData({...loanData, interestRate: e.target.value})}
                  required
                />
                <Input 
                  label="Creation Date" 
                  type="date"
                  value={loanData.loanDate}
                  onChange={(e) => setLoanData({...loanData, loanDate: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Payout Channel</h4>
               <div className="grid grid-cols-4 gap-4">
                  {['Cash', 'Bank', 'UPI', 'Card'].map((m) => (
                     <button
                        key={m}
                        type="button"
                        onClick={() => setPayoutMethod(m as any)}
                        className={cn(
                           "py-3 rounded-xl border-2 text-[10px] uppercase font-black tracking-widest transition-all",
                           payoutMethod === m ? "bg-gold-400 border-gold-400 text-luxury-black shadow-lg" : "bg-luxury-black border-luxury-border text-luxury-text-dim hover:border-gold-400/30"
                        )}
                     >
                        {m}
                     </button>
                  ))}
               </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400">Asset Documentation</h4>
                <span className="text-[10px] uppercase font-bold text-luxury-text-dim">{attachments.length} Files Attached</span>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <div 
                   onClick={() => document.getElementById('girvi-attachments')?.click()}
                   className="p-8 bg-luxury-black border-2 border-dashed border-luxury-border-dim rounded-3xl flex flex-col items-center justify-center group cursor-pointer hover:border-gold-400/40 transition-all"
                >
                   <input 
                      id="girvi-attachments"
                      type="file" 
                      multiple 
                      accept="image/*,application/pdf"
                      className="hidden" 
                      onChange={handleFileUpload}
                   />
                   <div className="w-12 h-12 bg-gold-400/10 rounded-2xl flex items-center justify-center text-gold-400 mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                   </div>
                   <p className="text-xs font-bold text-luxury-text mb-1">Click to Upload Attachments</p>
                   <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim italic">ID Proofs, Item Photos, Valuation Certs</p>
                </div>

                {attachments.length > 0 && (
                   <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-gold">
                      {attachments.map((base64, index) => (
                         <div key={index} className="relative flex-shrink-0 group">
                            <div className="w-24 h-24 bg-luxury-surface border border-luxury-border rounded-2xl overflow-hidden shadow-lg">
                               {base64.startsWith('data:image') ? (
                                  <img src={base64} alt={`Attachment ${index}`} className="w-full h-full object-cover" />
                               ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-luxury-text-dim">
                                     <Paperclip size={24} className="mb-1" />
                                     <span className="text-[8px] font-black uppercase">Document</span>
                                  </div>
                                )}
                            </div>
                            <button
                               type="button"
                               onClick={() => removeAttachment(index)}
                               className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                            >
                               <X size={12} />
                            </button>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </div>

          {/* Advanced Toggles */}
          <div className="p-6 bg-luxury-black rounded-3xl border border-luxury-border flex items-center justify-around">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={loanData.isCompoundInterest}
                  onChange={(e) => setLoanData({...loanData, isCompoundInterest: e.target.checked})}
                />
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                  loanData.isCompoundInterest ? "bg-gold-400 border-gold-400 text-luxury-black" : "bg-luxury-surface border-luxury-border-dim text-luxury-text-dim"
                )}>
                  <History size={20} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-luxury-text group-hover:text-gold-400 transition-colors">Compound Interest</p>
                <p className="text-[8px] uppercase font-black tracking-widest text-luxury-text-dim">Interest on Interest</p>
              </div>
            </label>

            <div className="w-[1px] h-10 bg-luxury-border-dim" />

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={loanData.enableLiveValuation}
                  onChange={(e) => setLoanData({...loanData, enableLiveValuation: e.target.checked})}
                />
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                  loanData.enableLiveValuation ? "bg-gold-400 border-gold-400 text-luxury-black" : "bg-luxury-surface border-luxury-border-dim text-luxury-text-dim"
                )}>
                  <Scale size={20} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-luxury-text group-hover:text-gold-400 transition-colors">Live Valuation</p>
                <p className="text-[8px] uppercase font-black tracking-widest text-luxury-text-dim">Market Rate Tracking</p>
              </div>
            </label>
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-luxury-charcoal py-4 border-t border-luxury-border">
            <Button type="button" variant="outline" className="flex-1 h-14 border-luxury-border" onClick={onClose}>
              {girvi ? "Cancel Editing" : "Cancel Registration"}
            </Button>
            <Button type="submit" variant="gold" className="flex-1 h-14 uppercase font-black tracking-widest shadow-lg shadow-gold-500/20">
              {girvi ? "Update & Save Asset" : "Authenticate & Save Asset"}
            </Button>
          </div>
        </form>
      </Modal>

      <CustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)} 
        onSave={(data: any) => {
          const newCustomer = { 
            ...data, 
            id: uuidv4(), 
            createdAt: new Date().toISOString(),
            totalSpent: 0,
            totalPurchases: 0,
            loyaltyPoints: 0
          };
          addCustomer(newCustomer);
          setSelectedCustomer(newCustomer);
          setIsCustomerModalOpen(false);
          setSearchTerm('');
        }}
      />
    </>
  );
};
