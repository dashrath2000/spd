import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  X, 
  Upload, 
  Paperclip, 
  History, 
  Search, 
  Package, 
  Gem,
  Keyboard
} from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useGirviStore } from '../../store/girviStore';
import { useOwnerLoanStore } from '../../store/ownerLoanStore';
import { useSettingsStore } from '../../store/settingsStore';
import { v4 as uuidv4 } from 'uuid';
import { Button, cn } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import type { OwnerLoan, OwnerLoanItem, PurityType } from '../../types';
import toast from 'react-hot-toast';

interface OwnerLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan?: OwnerLoan | null;
}

export const OwnerLoanModal = ({ isOpen, onClose, loan }: OwnerLoanModalProps) => {
  const { products } = useProductStore();
  const { girvis } = useGirviStore();
  const { addOwnerLoan, updateOwnerLoan } = useOwnerLoanStore();
  const { settings } = useSettingsStore();

  const [items, setItems] = useState<OwnerLoanItem[]>([
    { id: uuidv4(), description: '', weight: 0, purity: '22K', sourceType: 'manual' }
  ]);

  const [loanData, setLoanData] = useState({
    lenderName: '',
    lenderPhone: '',
    loanNumber: '',
    loanAmount: '',
    displayLoanAmount: '',
    interestRate: '2', // Default 2% monthly interest
    isCompoundInterest: false,
    loanDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  const [payoutMethod, setPayoutMethod] = useState<'Cash' | 'Bank' | 'UPI' | 'Card'>('Cash');
  const [attachments, setAttachments] = useState<string[]>([]);

  // Search states for collateral source selectors
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [vaultSearch, setVaultSearch] = useState<Record<string, string>>({});

  // 1. Get active customer Girvi items
  const activeVaultItems = useMemo(() => {
    const list: Array<{
      girviId: string;
      girviNumber: string;
      customerName: string;
      itemId: string;
      description: string;
      weight: number;
      purity: PurityType;
      category?: string;
    }> = [];
    girvis.forEach(g => {
      if (g.status === 'Active' && Array.isArray(g.items)) {
        g.items.forEach((item, idx) => {
          list.push({
            girviId: g.id,
            girviNumber: g.girviNumber || 'Legacy',
            customerName: g.customerName,
            itemId: item.id || `${g.id}-${idx}`,
            description: item.description,
            weight: item.weight,
            purity: item.purity,
            category: item.category
          });
        });
      }
    });
    return list;
  }, [girvis]);

  useEffect(() => {
    if (isOpen) {
      if (loan) {
        setItems(loan.items || []);
        setLoanData({
          lenderName: loan.lenderName,
          lenderPhone: loan.lenderPhone,
          loanNumber: loan.loanNumber,
          loanAmount: loan.loanAmount.toString(),
          displayLoanAmount: new Intl.NumberFormat('en-IN').format(loan.loanAmount),
          interestRate: loan.interestRate.toString(),
          isCompoundInterest: loan.isCompoundInterest,
          loanDate: loan.loanDate.split('T')[0],
          notes: loan.notes || '',
        });
        setPayoutMethod(loan.payoutMethod || 'Cash');
        setAttachments(loan.images || []);
      } else {
        setItems([{ id: uuidv4(), description: '', weight: 0, purity: '22K', sourceType: 'manual' }]);
        setLoanData({
          lenderName: '',
          lenderPhone: '',
          loanNumber: `OL-${Date.now().toString().slice(-6)}`,
          loanAmount: '',
          displayLoanAmount: '',
          interestRate: '2',
          isCompoundInterest: false,
          loanDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setPayoutMethod('Cash');
        setAttachments([]);
      }
      setProductSearch({});
      setVaultSearch({});
    }
  }, [isOpen, loan]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments(prev => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoanAmountChange = (val: string) => {
    const numericValue = val.replace(/[^0-9.]/g, '');
    if (numericValue === '') {
      setLoanData(prev => ({ ...prev, loanAmount: '', displayLoanAmount: '' }));
      return;
    }
    const numberValue = parseFloat(numericValue);
    if (!isNaN(numberValue)) {
      setLoanData(prev => ({
        ...prev,
        loanAmount: numericValue,
        displayLoanAmount: new Intl.NumberFormat('en-IN').format(numberValue)
      }));
    }
  };

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.weight || 0), 0);
  }, [items]);

  const addItem = () => {
    setItems(prev => [...prev, { id: uuidv4(), description: '', weight: 0, purity: '22K', sourceType: 'manual' }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof OwnerLoanItem, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSourceTypeChange = (id: string, type: 'manual' | 'inventory' | 'customer_girvi') => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          id: item.id,
          sourceType: type,
          description: '',
          weight: 0,
          purity: '22K',
          category: 'Other'
        };
      }
      return item;
    }));
    // Clear item search values
    setProductSearch(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
    setVaultSearch(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
  };

  const selectProduct = (itemId: string, product: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          description: product.name,
          weight: product.weight,
          purity: product.purity as PurityType,
          category: product.category,
          productId: product.id,
          productSku: product.sku
        };
      }
      return item;
    }));
    setProductSearch(prev => ({ ...prev, [itemId]: '' }));
  };

  const selectVaultItem = (itemId: string, vitem: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          description: vitem.description,
          weight: vitem.weight,
          purity: vitem.purity,
          category: vitem.category || 'Other',
          customerGirviId: vitem.girviId,
          customerGirviNumber: vitem.girviNumber,
          customerName: vitem.customerName,
          customerGirviItemId: vitem.itemId
        };
      }
      return item;
    }));
    setVaultSearch(prev => ({ ...prev, [itemId]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanData.lenderName) {
      toast.error('Lender Name is required');
      return;
    }
    if (items.length === 0) {
      toast.error('At least one collateral item is required');
      return;
    }
    if (items.some(item => !item.description || item.weight <= 0)) {
      toast.error('Please configure all collateral items correctly');
      return;
    }

    const now = new Date();
    const loanDateTime = new Date(loanData.loanDate);
    loanDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const payload: OwnerLoan = {
      id: loan ? loan.id : uuidv4(),
      lenderName: loanData.lenderName,
      lenderPhone: loanData.lenderPhone,
      loanNumber: loanData.loanNumber || `OL-${Date.now().toString().slice(-6)}`,
      items: items,
      totalWeight: totalWeight,
      loanAmount: parseFloat(loanData.loanAmount),
      interestRate: parseFloat(loanData.interestRate),
      isCompoundInterest: loanData.isCompoundInterest,
      loanDate: loanDateTime.toISOString(),
      status: loan ? loan.status : 'Active',
      payoutMethod: payoutMethod,
      payments: loan ? loan.payments : [],
      images: attachments,
      notes: loanData.notes,
      createdAt: loan ? loan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (loan) {
        await updateOwnerLoan(loan.id, payload);
        toast.success('Owner loan updated successfully');
      } else {
        await addOwnerLoan(payload);
        toast.success('Owner loan registered successfully');
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save owner loan');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={loan ? "Edit Owner Borrowed Loan" : "Register Owner Borrowed Loan"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 scrollbar-gold">
        
        {/* Lender Info */}
        <div className="space-y-4">
           <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Lender Details</h4>
           <div className="grid grid-cols-2 gap-6">
              <Input 
                 label="Lender / Financier Name"
                 placeholder="e.g. HDFC Bank, Laxmi Financiers"
                 value={loanData.lenderName}
                 onChange={(e) => setLoanData(prev => ({ ...prev, lenderName: e.target.value }))}
                 required
              />
              <Input 
                 label="Lender Contact Phone"
                 placeholder="e.g. 9876543210"
                 value={loanData.lenderPhone}
                 onChange={(e) => setLoanData(prev => ({ ...prev, lenderPhone: e.target.value }))}
              />
           </div>
        </div>

        {/* Collateral Ornaments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Collateral Ornaments Pledged</h4>
            <div className="flex items-center gap-4">
              <span className="text-xs uppercase font-bold text-luxury-text-dim">Total Weight: <span className="text-gold-400">{totalWeight.toFixed(3)}g</span></span>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-8 border-gold-400/20 text-gold-400 hover:bg-gold-400/10">
                <Plus size={14} className="mr-2" /> Add Item
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const pSearchVal = productSearch[item.id] || '';
              const vSearchVal = vaultSearch[item.id] || '';

              const filteredProducts = products.filter(p => 
                p.isActive && p.stock > 0 && (p.name.toLowerCase().includes(pSearchVal.toLowerCase()) || p.sku.toLowerCase().includes(pSearchVal.toLowerCase()))
              ).slice(0, 5);

              const filteredVaultItems = activeVaultItems.filter(v => 
                v.customerName.toLowerCase().includes(vSearchVal.toLowerCase()) || 
                v.girviNumber.toLowerCase().includes(vSearchVal.toLowerCase()) ||
                v.description.toLowerCase().includes(vSearchVal.toLowerCase())
              ).slice(0, 5);

              return (
                <div key={item.id} className="p-6 bg-luxury-surface border border-luxury-border-dim rounded-2xl relative group animate-fade-in">
                  
                  {/* Source Picker */}
                  <div className="flex items-center justify-between mb-4 border-b border-luxury-border-dim/40 pb-3">
                     <span className="text-xs font-black uppercase text-luxury-text-dim">Item #{index + 1} Source</span>
                     <div className="flex bg-luxury-black/60 border border-luxury-border-dim p-0.5 rounded-lg">
                        {[
                          { id: 'manual', label: 'Custom Entry', icon: Keyboard },
                          { id: 'inventory', label: 'Shop Inventory', icon: Package },
                          { id: 'customer_girvi', label: 'Customer Vault', icon: Gem },
                        ].map((src) => (
                           <button
                              key={src.id}
                              type="button"
                              onClick={() => handleSourceTypeChange(item.id, src.id as any)}
                              className={cn(
                                 "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5",
                                 item.sourceType === src.id ? "bg-gold-400 text-luxury-black font-black" : "text-luxury-text-dim hover:text-luxury-text"
                              )}
                           >
                              <src.icon size={10} />
                              {src.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Sourced Item display badges */}
                  {item.sourceType === 'inventory' && item.productId && (
                    <div className="mb-4 px-4 py-2 bg-gold-400/5 border border-gold-400/20 rounded-xl flex items-center justify-between">
                       <span className="text-xs font-bold text-luxury-text-muted">Sourced from Inventory: <strong className="text-gold-400">{item.description} ({item.productSku})</strong></span>
                       <Badge variant="success" className="text-[10px]">Linked Product</Badge>
                    </div>
                  )}

                  {item.sourceType === 'customer_girvi' && item.customerGirviId && (
                    <div className="mb-4 px-4 py-2 bg-gold-400/5 border border-gold-400/20 rounded-xl flex items-center justify-between">
                       <span className="text-xs font-bold text-luxury-text-muted">Re-pledged from Vault: <strong className="text-gold-400">{item.description} (Client: {item.customerName} - {item.customerGirviNumber})</strong></span>
                       <Badge variant="warning" className="text-[10px]">Re-pledged Collateral</Badge>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-4">
                    
                    {/* search block if sourced and not selected yet */}
                    {item.sourceType === 'inventory' && !item.productId && (
                      <div className="col-span-6 relative">
                         <label className="block text-sm font-medium text-luxury-text-muted mb-1.5">Search Shop Inventory</label>
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-text-dim" size={14} />
                            <input
                              type="text"
                              placeholder="Search by product name or SKU..."
                              value={pSearchVal}
                              onChange={(e) => setProductSearch(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg pl-9 pr-4 py-2.5 text-luxury-text focus:border-gold-400 outline-none text-sm font-semibold"
                            />
                         </div>
                         {pSearchVal && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-luxury-charcoal backdrop-blur-2xl border border-luxury-border rounded-lg shadow-xl overflow-hidden z-50">
                               {filteredProducts.map(prod => (
                                 <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => selectProduct(item.id, prod)}
                                    className="w-full text-left p-3 hover:bg-luxury-surface border-b border-luxury-border-dim last:border-0 text-xs flex justify-between items-center"
                                 >
                                    <div>
                                       <p className="font-bold text-luxury-text text-xs">{prod.name}</p>
                                       <p className="text-[10px] text-luxury-text-dim uppercase font-black">{prod.sku} • {prod.purity} • {prod.category}</p>
                                    </div>
                                    <span className="font-bold text-gold-400 font-mono text-xs">{prod.weight.toFixed(3)}g</span>
                                 </button>
                               ))}
                               {filteredProducts.length === 0 && (
                                 <div className="p-3 text-center text-luxury-text-dim text-xs">No active products found</div>
                               )}
                            </div>
                         )}
                      </div>
                    )}

                    {item.sourceType === 'customer_girvi' && !item.customerGirviId && (
                      <div className="col-span-6 relative">
                         <label className="block text-sm font-medium text-luxury-text-muted mb-1.5">Search Customer Vault Ornaments</label>
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-text-dim" size={14} />
                            <input
                              type="text"
                              placeholder="Search client name, Girvi #, ornament..."
                              value={vSearchVal}
                              onChange={(e) => setVaultSearch(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg pl-9 pr-4 py-2.5 text-luxury-text focus:border-gold-400 outline-none text-sm font-semibold"
                            />
                         </div>
                         {vSearchVal && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-luxury-charcoal backdrop-blur-2xl border border-luxury-border rounded-lg shadow-xl overflow-hidden z-50">
                               {filteredVaultItems.map(v => (
                                 <button
                                    key={v.itemId}
                                    type="button"
                                    onClick={() => selectVaultItem(item.id, v)}
                                    className="w-full text-left p-3 hover:bg-luxury-surface border-b border-luxury-border-dim last:border-0 text-xs flex justify-between items-center"
                                 >
                                    <div>
                                       <p className="font-bold text-luxury-text text-xs">{v.description}</p>
                                       <p className="text-[10px] text-luxury-text-dim uppercase font-black">Depositor: {v.customerName} ({v.girviNumber})</p>
                                    </div>
                                    <span className="font-bold text-gold-400 font-mono text-xs">{v.weight.toFixed(3)}g</span>
                                 </button>
                               ))}
                               {filteredVaultItems.length === 0 && (
                                 <div className="p-3 text-center text-luxury-text-dim text-xs">No active ornaments found</div>
                               )}
                            </div>
                         )}
                      </div>
                    )}

                    {/* Standard details (readonly if sourced) */}
                    <div className={cn(
                       item.sourceType === 'manual' ? "col-span-4" : 
                       (item.productId || item.customerGirviId) ? "col-span-4" : "col-span-6"
                    )}>
                      <Input 
                        label="Ornament Description"
                        placeholder="e.g. 1 Gold Chain"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        required
                        disabled={item.sourceType !== 'manual'}
                      />
                    </div>

                    <div className="col-span-3">
                       <div className="space-y-1.5">
                        <label className="text-sm font-medium text-luxury-text-muted">Category</label>
                        <select 
                          value={item.category || 'Other'}
                          onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                          className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg px-4 py-2.5 text-luxury-text focus:border-gold-400 outline-none text-sm font-semibold uppercase tracking-wider"
                          disabled={item.sourceType !== 'manual'}
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
                        disabled={item.sourceType !== 'manual'}
                      />
                    </div>

                    <div className="col-span-2">
                       <div className="space-y-1.5">
                        <label className="text-sm font-medium text-luxury-text-muted">Purity</label>
                        <select 
                          value={item.purity}
                          onChange={(e) => updateItem(item.id, 'purity', e.target.value as PurityType)}
                          className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg px-4 py-2.5 text-luxury-text focus:border-gold-400 outline-none text-sm font-semibold"
                          disabled={item.sourceType !== 'manual'}
                        >
                          <option value="24K">24K</option>
                          <option value="22K">22K</option>
                          <option value="18K">18K</option>
                          <option value="14K">14K</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-1 flex items-end pb-1.5 justify-center">
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
              );
            })}
          </div>
        </div>

        {/* Loan Agreement */}
        <div className="space-y-6">
          <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Loan Agreement</h4>
          <div className="grid grid-cols-4 gap-6">
            <Input 
              label="Loan Reference / Invoice"
              value={loanData.loanNumber}
              onChange={(e) => setLoanData(prev => ({ ...prev, loanNumber: e.target.value }))}
              placeholder="e.g. OL-1002"
              required
            />
            <Input 
              label="Loan Amount (Principal)" 
              type="text"
              value={loanData.displayLoanAmount}
              onChange={(e) => handleLoanAmountChange(e.target.value)}
              placeholder="e.g. 5,00,000"
              required
            />
            <Input 
              label="Monthly Interest Rate (%)" 
              type="number"
              step="0.01"
              value={loanData.interestRate}
              onChange={(e) => setLoanData(prev => ({ ...prev, interestRate: e.target.value }))}
              required
            />
            <Input 
              label="Borrowing Date" 
              type="date"
              value={loanData.loanDate}
              onChange={(e) => setLoanData(prev => ({ ...prev, loanDate: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Payout Channel */}
        <div className="space-y-4">
           <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Received Mode</h4>
           <div className="grid grid-cols-4 gap-4">
              {['Cash', 'Bank', 'UPI', 'Card'].map((m) => (
                 <button
                    key={m}
                    type="button"
                    onClick={() => setPayoutMethod(m as any)}
                    className={cn(
                       "py-3 rounded-xl border-2 text-xs uppercase font-black tracking-widest transition-all",
                       payoutMethod === m ? "bg-gold-400 border-gold-400 text-luxury-black shadow-lg" : "bg-luxury-black border-luxury-border text-luxury-text-dim hover:border-gold-400/30"
                    )}
                 >
                    {m}
                 </button>
              ))}
           </div>
        </div>

        {/* Documentation Upload */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Borrowing Documentation</h4>
              <span className="text-xs uppercase font-bold text-luxury-text-dim">{attachments.length} Files Attached</span>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              <div 
                 onClick={() => document.getElementById('lender-attachments')?.click()}
                 className="p-8 bg-luxury-black border-2 border-dashed border-luxury-border-dim rounded-3xl flex flex-col items-center justify-center group cursor-pointer hover:border-gold-400/40 transition-all"
              >
                 <input 
                    id="lender-attachments"
                    type="file" 
                    multiple 
                    accept="image/*,application/pdf"
                    className="hidden" 
                    onChange={handleFileUpload}
                 />
                 <div className="w-12 h-12 bg-gold-400/10 rounded-2xl flex items-center justify-center text-gold-400 mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                 </div>
                 <p className="text-xs font-bold text-luxury-text mb-1">Click to Upload Scanned Agreement / Promissory Notes</p>
                 <p className="text-xs uppercase font-black tracking-widest text-luxury-text-dim italic">Contracts, Rate Sheets, ID Cards</p>
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
                                   <span className="text-[10px] font-black uppercase">Document</span>
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

        {/* Note / Advanced Toggles */}
        <div className="grid grid-cols-2 gap-6 items-start">
           <div className="p-6 bg-luxury-black rounded-3xl border border-luxury-border flex items-center h-full">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={loanData.isCompoundInterest}
                    onChange={(e) => setLoanData(prev => ({ ...prev, isCompoundInterest: e.target.checked }))}
                  />
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                    loanData.isCompoundInterest ? "bg-gold-400 border-gold-400 text-luxury-black" : "bg-luxury-surface border-luxury-border-dim text-luxury-text-dim"
                  )}>
                    <History size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-luxury-text group-hover:text-gold-400 transition-colors">Daily Compounding</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Compounded daily</p>
                </div>
              </label>
           </div>
           
           <div className="space-y-1.5 h-full">
              <label className="text-sm font-bold text-luxury-text-dim uppercase tracking-widest">Office Notes / Remarks</label>
              <textarea
                 value={loanData.notes}
                 onChange={(e) => setLoanData(prev => ({ ...prev, notes: e.target.value }))}
                 placeholder="E.g. Borrowed to clear pending supplier invoices..."
                 className="w-full bg-luxury-input border border-luxury-border-dim rounded-2xl p-4 text-sm font-bold text-luxury-text focus:border-gold-400 outline-none h-[88px] resize-none"
              />
           </div>
        </div>

        <div className="flex gap-4 pt-4 sticky bottom-0 bg-luxury-charcoal py-4 border-t border-luxury-border">
          <Button type="button" variant="outline" className="flex-1 h-14 border-luxury-border" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" className="flex-1 h-14 uppercase font-black tracking-widest shadow-lg shadow-gold-500/20">
            {loan ? "Save Changes" : "Confirm Borrowing"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
