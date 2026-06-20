import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Download,
  FileText,
  CheckCircle2,
  Scale,
  Search,
  Eye,
  TrendingDown,
  Coins,
  ShieldCheck,
  Send,
  PackageCheck,
  ArrowRight,
  Factory,
  Package
} from 'lucide-react';
import { useCustomerStore } from '../store/customerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOldGoldPurchaseStore } from '../store/oldGoldPurchaseStore';
import { useProductStore } from '../store/productStore';
import { useAuthStore } from '../store/authStore';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, getAutomatedHSN } from '../utils/calculations';
import { generateBuybackVoucher } from '../utils/invoiceGenerator';
import { v4 as uuidv4 } from 'uuid';
import type { OldGoldPurchase, OldGoldItem, RefinedItem } from '../types';
import toast from 'react-hot-toast';

export const OldGoldPurchasePage = () => {
  const { customers } = useCustomerStore();
  const { settings } = useSettingsStore();
  const { purchases, addPurchase, sendToRefinery, receiveFromRefinery, markAddedToStock } = useOldGoldPurchaseStore();
  const { products, addProduct, updateStock } = useProductStore();
  const { activeBranchId, user } = useAuthStore();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<OldGoldPurchase | null>(null);

  // Refinery Pipeline Modal State
  const [isRefineryModalOpen, setIsRefineryModalOpen] = useState(false);
  const [refineryModalPurchase, setRefineryModalPurchase] = useState<OldGoldPurchase | null>(null);
  const [refineryName, setRefineryName] = useState('');

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveModalPurchase, setReceiveModalPurchase] = useState<OldGoldPurchase | null>(null);
  const [refinedItemsForm, setRefinedItemsForm] = useState<Record<string, { receivedWeight: string; finalPurity: string; fineWeight: string }>>({});
  const [refineryNotes, setRefineryNotes] = useState('');

  // Standalone Purchase Creation State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customCustomer, setCustomCustomer] = useState({ name: '', phone: '' });
  const [kycType, setKycType] = useState('Aadhar');
  const [kycNumber, setKycNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');
  const [notes, setNotes] = useState('');
  const [declarationSigned, setDeclarationSigned] = useState(false);

  // Buyback Item Evaluation Form State
  const [itemForm, setItemForm] = useState({
    description: '',
    metalType: 'Gold',
    purity: '22K',
    grossWeight: '',
    stoneWeight: '0',
    melting: '92',
    rate: settings.goldRate?.toString() || '6200',
  });

  const [addedItems, setAddedItems] = useState<OldGoldItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Live item valuation computations
  const itemValuation = useMemo(() => {
    const gross = parseFloat(itemForm.grossWeight) || 0;
    const stones = parseFloat(itemForm.stoneWeight) || 0;
    const netWeight = Math.max(0, gross - stones);
    const melting = parseFloat(itemForm.melting) || 0;
    const rate = parseFloat(itemForm.rate) || 0;

    const fineWeight = (netWeight * melting) / 100;
    const value = fineWeight * rate;

    return { netWeight, fineWeight, value };
  }, [itemForm]);

  // Overall Purchase totals
  const purchaseTotals = useMemo(() => {
    const subtotal = addedItems.reduce((sum, item) => sum + item.value, 0);
    return { subtotal };
  }, [addedItems]);

  // Pipeline Stats
  const pipelineStats = useMemo(() => {
    const branchPurchases = purchases.filter(p => !activeBranchId || p.branchId === activeBranchId);
    return {
      purchased: branchPurchases.filter(p => !p.status || p.status === 'Purchased').length,
      atRefinery: branchPurchases.filter(p => p.status === 'Sent to Refinery').length,
      refined: branchPurchases.filter(p => p.status === 'Refined').length,
      inStock: branchPurchases.filter(p => p.status === 'Added to Stock').length,
    };
  }, [purchases, activeBranchId]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.description || !itemForm.grossWeight || !itemForm.rate) {
      toast.error('Please enter all item metrics');
      return;
    }

    const newItem: OldGoldItem = {
      id: uuidv4(),
      description: itemForm.description,
      metalType: itemForm.metalType,
      purity: itemForm.purity,
      grossWeight: parseFloat(itemForm.grossWeight),
      netWeight: itemValuation.netWeight,
      melting: parseFloat(itemForm.melting),
      fineWeight: itemValuation.fineWeight,
      rate: parseFloat(itemForm.rate),
      value: itemValuation.value,
    };

    setAddedItems([...addedItems, newItem]);
    setItemForm({
      description: '',
      metalType: 'Gold',
      purity: '22K',
      grossWeight: '',
      stoneWeight: '0',
      melting: '92',
      rate: (itemForm.metalType === 'Gold' ? settings.goldRate : settings.silverRate)?.toString() || '6200',
    });
    toast.success('Asset added to purchase list');
  };

  const handleRemoveItem = (id: string) => {
    setAddedItems(addedItems.filter(item => item.id !== id));
    toast.error('Asset removed');
  };

  const handleCompletePurchase = async () => {
    // Validations
    if (addedItems.length === 0) {
      toast.error('Add at least one gold/silver asset to purchase');
      return;
    }

    let customerName = 'Walk-in Customer';
    let customerPhone = '';
    let customerId: string | null = null;

    if (isNewCustomer) {
      if (!customCustomer.name || !customCustomer.phone) {
        toast.error('Enter custom seller name and contact number');
        return;
      }
      customerName = customCustomer.name;
      customerPhone = customCustomer.phone;
    } else {
      if (!selectedCustomer) {
        toast.error('Please select an active customer profile');
        return;
      }
      const custObj = customers.find(c => c.id === selectedCustomer);
      if (custObj) {
        customerName = custObj.name;
        customerPhone = custObj.phone;
        customerId = custObj.id;
      }
    }

    if (!kycNumber) {
      toast.error('Please enter a valid KYC identification number');
      return;
    }

    if (!declarationSigned) {
      toast.error('Legal owner declaration signature required');
      return;
    }

    const uniquePurchaseNum = `OGP-${Date.now().toString().slice(-6)}`;
    const purchaseObj: OldGoldPurchase = {
      id: uuidv4(),
      purchaseNumber: uniquePurchaseNum,
      customerId,
      customerName,
      customerPhone,
      kycType,
      kycNumber,
      items: addedItems,
      subtotal: purchaseTotals.subtotal,
      payoutAmount: purchaseTotals.subtotal,
      paymentMethod,
      goldRate: settings.goldRate || 0,
      silverRate: settings.silverRate || 0,
      platinumRate: settings.platinumRate || 0,
      declarationSigned: true,
      notes,
      branchId: activeBranchId || 'main',
      createdAt: new Date().toISOString(),
      createdBy: user?.uid || 'admin',
      status: 'Purchased',
    };

    try {
      await addPurchase(purchaseObj);

      toast.success('Old Gold Buyback completed! Send to Refinery when ready.');

      // Reset transaction form state
      setAddedItems([]);
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      setCustomCustomer({ name: '', phone: '' });
      setKycNumber('');
      setDeclarationSigned(false);
      setNotes('');

    } catch (err) {
      console.error(err);
      toast.error('Failed to complete buyback purchase');
    }
  };

  // --- Refinery Pipeline Handlers ---
  const handleSendToRefinery = async () => {
    if (!refineryModalPurchase) return;
    try {
      await sendToRefinery(refineryModalPurchase.id, refineryName);
      toast.success('Sent to refinery successfully!');
      setIsRefineryModalOpen(false);
      setRefineryModalPurchase(null);
      setRefineryName('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send to refinery');
    }
  };

  const handleOpenReceiveModal = (purchase: OldGoldPurchase) => {
    const formDefaults: Record<string, { receivedWeight: string; finalPurity: string; fineWeight: string }> = {};
    purchase.items.forEach(item => {
      formDefaults[item.id] = {
        receivedWeight: item.grossWeight.toString(),
        finalPurity: item.purity,
        fineWeight: item.fineWeight.toFixed(3),
      };
    });
    setRefinedItemsForm(formDefaults);
    setRefineryNotes('');
    setReceiveModalPurchase(purchase);
    setIsReceiveModalOpen(true);
  };

  const handleReceiveFromRefinery = async () => {
    if (!receiveModalPurchase) return;

    const refinedItems: RefinedItem[] = receiveModalPurchase.items.map(item => {
      const form = refinedItemsForm[item.id];
      const receivedWeight = parseFloat(form?.receivedWeight || '0');
      const fineWeight = parseFloat(form?.fineWeight || '0');
      return {
        originalItemId: item.id,
        receivedWeight,
        wastageWeight: Math.max(0, item.grossWeight - receivedWeight),
        finalPurity: form?.finalPurity || item.purity,
        fineWeight,
      };
    });

    try {
      await receiveFromRefinery(receiveModalPurchase.id, refinedItems, refineryNotes);
      toast.success('Refinery receipt recorded! Ready to add to raw stock.');
      setIsReceiveModalOpen(false);
      setReceiveModalPurchase(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to record refinery receipt');
    }
  };

  const handleAddToRawStock = async (purchase: OldGoldPurchase) => {
    if (!purchase.refineryDetails?.refinedItems) {
      toast.error('No refinery data found. Please receive from refinery first.');
      return;
    }

    try {
      for (const refinedItem of purchase.refineryDetails.refinedItems) {
        const originalItem = purchase.items.find(i => i.id === refinedItem.originalItemId);
        if (!originalItem) continue;

        const matchingRawMaterial = products.find(
          p => p.category === 'Raw Material' &&
            p.metalType.toLowerCase() === originalItem.metalType.toLowerCase() &&
            p.purity === refinedItem.finalPurity
        );

        if (matchingRawMaterial) {
          await updateStock(matchingRawMaterial.id, refinedItem.receivedWeight);
        } else {
          const rawMaterialName = `Raw ${originalItem.metalType} ${refinedItem.finalPurity}`;
          await addProduct({
            name: rawMaterialName,
            sku: `RAW-${originalItem.metalType.toUpperCase()}-${refinedItem.finalPurity.toUpperCase()}-${Date.now().toString().slice(-4)}`,
            category: 'Raw Material',
            metalType: originalItem.metalType,
            purity: refinedItem.finalPurity as any,
            weight: 0,
            makingCharges: 0,
            makingChargePercent: 0,
            isPercentageMakingCharge: false,
            stoneCharges: 0,
            wastagePercent: 0,
            basePrice: 0,
            sellingPrice: 0,
            stock: refinedItem.receivedWeight,
            lowStockThreshold: 10,
            barcode: `RAW${Date.now().toString().slice(-8)}`,
            images: [],
            description: `Refined metal from ${purchase.purchaseNumber}`,
            hsnCode: getAutomatedHSN('Raw Material', originalItem.metalType),
            isActive: true,
            isRateSensitive: true,
            stockType: 'Raw',
            branchId: activeBranchId || 'main'
          });
        }
      }

      await markAddedToStock(purchase.id);
      toast.success('Refined metal added to raw material inventory!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to raw stock');
    }
  };

  // --- Status helpers ---
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Sent to Refinery': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
      case 'Refined': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
      case 'Added to Stock': return 'bg-green-500/15 text-green-400 border-green-500/20';
      default: return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'Sent to Refinery': return 'At Refinery';
      case 'Refined': return 'Refined';
      case 'Added to Stock': return 'In Stock';
      default: return 'Purchased';
    }
  };

  // Filter past purchases for ledger
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const search = searchTerm.toLowerCase();
      const matchesBranch = !activeBranchId || p.branchId === activeBranchId;
      if (!matchesBranch) return false;

      return (
        p.purchaseNumber.toLowerCase().includes(search) ||
        p.customerName.toLowerCase().includes(search) ||
        p.customerPhone.includes(search)
      );
    });
  }, [purchases, searchTerm, activeBranchId]);

  const pastPurchasesColumns = [
    {
      header: 'Voucher',
      accessor: (row: OldGoldPurchase) => (
        <div className="flex flex-col">
          <span className="font-bold text-luxury-text tracking-widest text-xs">{row.purchaseNumber}</span>
          <span className="text-[9px] text-luxury-text-muted uppercase font-black tracking-wider">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      header: 'Seller',
      accessor: (row: OldGoldPurchase) => (
        <div className="flex flex-col">
          <span className="font-bold text-luxury-text text-xs">{row.customerName}</span>
          <span className="text-[10px] text-luxury-text-dim">{row.customerPhone}</span>
        </div>
      )
    },
    {
      header: 'Items',
      accessor: (row: OldGoldPurchase) => (
        <span className="text-xs font-bold text-luxury-text">
          {row.items.length} ({row.items.reduce((sum, i) => sum + i.grossWeight, 0).toFixed(2)}g)
        </span>
      )
    },
    {
      header: 'Payout',
      accessor: (row: OldGoldPurchase) => (
        <span className="text-xs font-serif font-black text-gold-400">
          {formatCurrency(row.payoutAmount)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row: OldGoldPurchase) => (
        <span className={cn(
          "text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border inline-block",
          getStatusColor(row.status)
        )}>
          {getStatusLabel(row.status)}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: (row: OldGoldPurchase) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Details */}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPurchase(row);
              setIsDetailOpen(true);
            }}
            className="p-2 h-8 w-8 flex items-center justify-center rounded-lg bg-luxury-black/40 hover:bg-gold-400/10 hover:text-gold-400 transition-colors"
            title="View Details"
          >
            <Eye size={13} />
          </Button>

          {/* Download Voucher */}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              generateBuybackVoucher(row, settings);
              toast.success('Voucher PDF generated');
            }}
            className="p-2 h-8 w-8 flex items-center justify-center rounded-lg bg-luxury-black/40 hover:bg-gold-400/10 hover:text-gold-400 transition-colors"
            title="Download Voucher"
          >
            <Download size={13} />
          </Button>

          {/* Send to Refinery — only for Purchased status */}
          {(!row.status || row.status === 'Purchased') && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setRefineryModalPurchase(row);
                setRefineryName(row.refineryDetails?.refineryName || '');
                setIsRefineryModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
            >
              <Send size={11} /> Refinery
            </Button>
          )}

          {/* Receive from Refinery — only for Sent to Refinery status */}
          {row.status === 'Sent to Refinery' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReceiveModal(row);
              }}
              className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5"
            >
              <PackageCheck size={11} /> Receive
            </Button>
          )}

          {/* Add to Stock — only for Refined status */}
          {row.status === 'Refined' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToRawStock(row);
              }}
              className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1.5"
            >
              <Package size={11} /> Add to Stock
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-luxury-black min-h-screen text-luxury-text space-y-6 sm:space-y-8 lg:space-y-10">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-luxury-border-dim pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-400/10 border border-gold-400/20 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-400/5">
            <Scale size={24} className="text-gold-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-black tracking-wide text-gold-400">Old Gold Acquisitions</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-muted">
              Precious Metal Purchases &amp; Refinery Pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Refinery Pipeline Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-orange-500/5 border border-orange-500/15 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
            <Scale size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-serif font-black text-orange-400">{pipelineStats.purchased}</p>
            <p className="text-[9px] uppercase font-black tracking-widest text-orange-400/60">Purchased</p>
          </div>
        </div>
        <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Factory size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-serif font-black text-amber-400">{pipelineStats.atRefinery}</p>
            <p className="text-[9px] uppercase font-black tracking-widest text-amber-400/60">At Refinery</p>
          </div>
        </div>
        <div className="p-5 bg-blue-500/5 border border-blue-500/15 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <PackageCheck size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-serif font-black text-blue-400">{pipelineStats.refined}</p>
            <p className="text-[9px] uppercase font-black tracking-widest text-blue-400/60">Refined</p>
          </div>
        </div>
        <div className="p-5 bg-green-500/5 border border-green-500/15 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-serif font-black text-green-400">{pipelineStats.inStock}</p>
            <p className="text-[9px] uppercase font-black tracking-widest text-green-400/60">In Stock</p>
          </div>
        </div>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        <span className="text-[9px] uppercase font-black tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">Purchased</span>
        <ArrowRight size={14} className="text-luxury-text-dim" />
        <span className="text-[9px] uppercase font-black tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">Send to Refinery</span>
        <ArrowRight size={14} className="text-luxury-text-dim" />
        <span className="text-[9px] uppercase font-black tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">Receive Refined</span>
        <ArrowRight size={14} className="text-luxury-text-dim" />
        <span className="text-[9px] uppercase font-black tracking-widest text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">Add to Raw Stock</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left 2 Columns: Add Buyback Form & Items */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Asset Evaluation Form */}
          <div className="p-4 sm:p-6 lg:p-8 bg-luxury-charcoal rounded-3xl border border-luxury-border space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gold-400 flex items-center gap-2 border-b border-luxury-border pb-3">
              <TrendingDown size={16} /> Asset Valuation Calculator
            </h3>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <Input
                  label="Asset Description"
                  placeholder="e.g. Broken Gold Chain, 22K Old Ring"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Metal Type</label>
                <select
                  value={itemForm.metalType}
                  onChange={(e) => setItemForm({
                    ...itemForm,
                    metalType: e.target.value,
                    rate: (e.target.value === 'Gold' ? settings.goldRate : settings.silverRate)?.toString() || '6200'
                  })}
                  className="w-full h-12 bg-luxury-input border border-luxury-border rounded-xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Karat Purity</label>
                <select
                  value={itemForm.purity}
                  onChange={(e) => setItemForm({ ...itemForm, purity: e.target.value })}
                  className="w-full h-12 bg-luxury-input border border-luxury-border rounded-xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
                >
                  {itemForm.metalType === 'Gold' ? (
                    <>
                      <option value="24K">24K (Pure)</option>
                      <option value="22K">22K (Standard)</option>
                      <option value="18K">18K (Luxury)</option>
                      <option value="14K">14K</option>
                    </>
                  ) : itemForm.metalType === 'Silver' ? (
                    <>
                      <option value="999">999 Pure Silver</option>
                      <option value="925">925 Sterling Silver</option>
                    </>
                  ) : (
                    <option value="950">950 Platinum</option>
                  )}
                </select>
              </div>

              <Input
                label="Gross Weight (g)"
                type="number"
                step="0.001"
                placeholder="0.000"
                value={itemForm.grossWeight}
                onChange={(e) => setItemForm({ ...itemForm, grossWeight: e.target.value })}
                required
              />

              <Input
                label="Stone/Bead Weight (g)"
                type="number"
                step="0.001"
                placeholder="0.000"
                value={itemForm.stoneWeight}
                onChange={(e) => setItemForm({ ...itemForm, stoneWeight: e.target.value })}
              />

              <Input
                label="Touch / Melting (%)"
                type="number"
                step="0.1"
                placeholder="92.0"
                value={itemForm.melting}
                onChange={(e) => setItemForm({ ...itemForm, melting: e.target.value })}
                required
              />

              <Input
                label="Active Rate (per g)"
                type="number"
                placeholder="6200"
                value={itemForm.rate}
                onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })}
                required
              />

              {/* Valuation Preview */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 p-4 bg-luxury-black/40 rounded-2xl border border-luxury-border-dim">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-luxury-text-muted">Net Gold Weight</span>
                  <span className="text-md font-bold text-luxury-text">{itemValuation.netWeight.toFixed(3)} g</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-luxury-text-muted">Fine Metal Weight</span>
                  <span className="text-md font-bold text-luxury-text">{itemValuation.fineWeight.toFixed(3)} g</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-gold-400">Buyback Valuation</span>
                  <span className="text-md font-serif font-black text-gold-400">{formatCurrency(itemValuation.value)}</span>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-end">
                <Button type="submit" variant="gold" className="px-6 py-3 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <Plus size={14} /> Add Asset to List
                </Button>
              </div>
            </form>
          </div>

          {/* Added Items Valuation Grid */}
          <div className="p-4 sm:p-6 lg:p-8 bg-luxury-charcoal rounded-3xl border border-luxury-border space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-luxury-text flex items-center gap-2">
              <Coins size={16} className="text-gold-400" /> Valuation Assets Ledger
            </h3>

            {addedItems.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center border border-dashed border-luxury-border rounded-2xl text-luxury-text-muted">
                <Scale size={32} className="opacity-20 mb-2" />
                <p className="text-xs uppercase font-bold tracking-widest opacity-40">No valuation assets added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-luxury-border-dim rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-luxury-black text-[9px] uppercase font-black tracking-widest text-luxury-text-dim border-b border-luxury-border-dim">
                        <th className="p-4">Description</th>
                        <th className="p-4">Gross/Net (g)</th>
                        <th className="p-4">Melting Touch</th>
                        <th className="p-4">Fine Weight (g)</th>
                        <th className="p-4">Value</th>
                        <th className="p-4 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-border-dim">
                      {addedItems.map(item => (
                        <tr key={item.id} className="text-xs font-bold text-luxury-text hover:bg-luxury-black/20">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span>{item.description}</span>
                              <span className="text-[8px] text-gold-400/60 uppercase">{item.metalType} • {item.purity}</span>
                            </div>
                          </td>
                          <td className="p-4">{item.grossWeight.toFixed(2)}g / {item.netWeight.toFixed(2)}g</td>
                          <td className="p-4">{item.melting}%</td>
                          <td className="p-4">{item.fineWeight.toFixed(3)}g</td>
                          <td className="p-4 font-serif text-gold-400">{formatCurrency(item.value)}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-2"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Seller profile & Payout */}
        <div className="space-y-6 lg:space-y-8">
          {/* Seller profile Panel */}
          <div className="p-4 sm:p-6 lg:p-8 bg-luxury-charcoal rounded-3xl border border-luxury-border space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gold-400 border-b border-luxury-border pb-3 flex items-center gap-2">
              <ShieldCheck size={16} /> Seller KYC & Verification
            </h3>

            {/* Custom / Existing Toggle */}
            <div className="flex bg-luxury-black rounded-xl p-1 border border-luxury-border-dim">
              <button
                type="button"
                onClick={() => setIsNewCustomer(false)}
                className={cn(
                  'flex-1 py-2 px-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all',
                  !isNewCustomer ? 'bg-gold-400 text-luxury-black shadow' : 'text-luxury-text-dim hover:text-luxury-text'
                )}
              >
                Registered Profile
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className={cn(
                  'flex-1 py-2 px-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all',
                  isNewCustomer ? 'bg-gold-400 text-luxury-black shadow' : 'text-luxury-text-dim hover:text-luxury-text'
                )}
              >
                New Walk-In Seller
              </button>
            </div>

            {isNewCustomer ? (
              <div className="space-y-4">
                <Input
                  label="Seller Full Name"
                  placeholder="e.g. John Doe"
                  value={customCustomer.name}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, name: e.target.value })}
                  required
                />
                <Input
                  label="Seller Contact Number"
                  placeholder="e.g. 9876543210"
                  value={customCustomer.phone}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, phone: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Select Registered Seller</label>
                <select
                  value={selectedCustomer || ''}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full h-12 bg-luxury-input border border-luxury-border rounded-xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
                >
                  <option value="">Choose customer profile...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
            )}

            {/* KYC Reference details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">ID Doc Type</label>
                <select
                  value={kycType}
                  onChange={(e) => setKycType(e.target.value)}
                  className="w-full h-12 bg-luxury-input border border-luxury-border rounded-xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
                >
                  <option value="Aadhar">Aadhar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="License">Driver License</option>
                  <option value="VoterID">Voter ID Card</option>
                </select>
              </div>
              <Input
                label="KYC Number / ID"
                placeholder="e.g. 5234 1234 9876"
                value={kycNumber}
                onChange={(e) => setKycNumber(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Payout & Checkout panel */}
          <div className="p-4 sm:p-6 lg:p-8 bg-luxury-charcoal rounded-3xl border border-luxury-border space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-luxury-text">Payout & Checkout</h3>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Payout Mode</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-12 bg-luxury-input border border-luxury-border rounded-xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
              >
                <option value="Cash">Cash Outflow</option>
                <option value="UPI">UPI Transfer</option>
                <option value="Bank">Direct Bank payout</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Acquisition Notes</label>
              <textarea
                placeholder="Describe condition of assets or verification details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-24 bg-luxury-input border border-luxury-border rounded-xl p-4 text-xs font-bold text-luxury-text focus:border-gold-400 outline-none resize-none transition-all"
              />
            </div>

            {/* Overall totals */}
            <div className="p-6 bg-luxury-black/40 rounded-2xl border border-luxury-border-dim space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-muted">Total Credit Payout</span>
                <span className="text-2xl font-serif font-black text-gold-400">{formatCurrency(purchaseTotals.subtotal)}</span>
              </div>
            </div>

            {/* Legal Declaration */}
            <label className="flex gap-3 cursor-pointer items-start p-3 bg-red-500/5 border border-red-500/10 rounded-2xl select-none group">
              <input
                type="checkbox"
                checked={declarationSigned}
                onChange={(e) => setDeclarationSigned(e.target.checked)}
                className="mt-0.5 rounded border-luxury-border bg-luxury-input text-gold-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[9px] font-bold text-luxury-text-muted leading-tight group-hover:text-luxury-text transition-colors">
                I hereby declare that I am the sole owner of the gold assets and verify the valuation assays.
              </span>
            </label>

            <Button
              onClick={handleCompletePurchase}
              variant="gold"
              className="w-full py-4 uppercase font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10 active:scale-95 transition-all"
            >
              <CheckCircle2 size={16} /> Submit Buyback Payout
            </Button>
          </div>
        </div>
      </div>

      {/* Standalone Purchases Ledger history list */}
      <div className="p-4 sm:p-6 lg:p-8 bg-luxury-charcoal rounded-3xl border border-luxury-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-luxury-border-dim pb-4">
          <div>
            <h3 className="text-md font-serif font-black text-gold-400">Buyback Acquisition Vouchers</h3>
            <p className="text-[9px] uppercase font-bold tracking-widest text-luxury-text-muted">
              Purchase ledger with refinery pipeline tracking
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-luxury-text-dim">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search by Voucher / Seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-luxury-black border border-luxury-border rounded-xl pl-10 pr-4 text-xs font-bold text-luxury-text placeholder-luxury-text-muted focus:border-gold-400 outline-none transition-all"
            />
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-luxury-text-dim text-center">
            <FileText size={40} className="opacity-10 mb-3" />
            <p className="text-xs uppercase font-bold tracking-widest opacity-40">No purchase records found</p>
          </div>
        ) : (
          <Table columns={pastPurchasesColumns} data={filteredPurchases} />
        )}
      </div>

      {/* Detail Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => {
            setSelectedPurchase(null);
            setIsDetailOpen(false);
          }}
          title={`Buyback Voucher Details - ${selectedPurchase.purchaseNumber}`}
          size="lg"
        >
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 bg-luxury-charcoal">
            {/* Status Banner */}
            <div className={cn(
              "flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-6 rounded-3xl border",
              selectedPurchase.status === 'Added to Stock'
                ? "border-green-500/20 bg-green-500/5 text-green-400"
                : selectedPurchase.status === 'Refined'
                  ? "border-blue-500/20 bg-blue-500/5 text-blue-400"
                  : selectedPurchase.status === 'Sent to Refinery'
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                    : "border-orange-500/20 bg-orange-500/5 text-orange-400"
            )}>
              <div className="flex items-center gap-4">
                <CheckCircle2 size={32} />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest leading-none mb-1">Authenticated Acquisition</h3>
                  <p className="text-[9px] uppercase tracking-wider opacity-60">
                    Processed on {new Date(selectedPurchase.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xl font-serif font-black uppercase">{getStatusLabel(selectedPurchase.status)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-xs font-bold">
              {/* Seller details */}
              <div className="p-6 bg-luxury-black border border-luxury-border rounded-3xl space-y-4">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400 border-b border-luxury-border-dim pb-2">
                  Seller Portfolio
                </h4>
                <div className="space-y-2 text-luxury-text">
                  <p>Name: <span className="text-luxury-text-muted">{selectedPurchase.customerName}</span></p>
                  <p>Contact: <span className="text-luxury-text-muted">{selectedPurchase.customerPhone}</span></p>
                  <p>KYC Reference: <span className="text-luxury-text-muted">{selectedPurchase.kycType} - {selectedPurchase.kycNumber}</span></p>
                </div>
              </div>

              {/* Settlement details */}
              <div className="p-6 bg-luxury-black border border-luxury-border rounded-3xl space-y-4">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400 border-b border-luxury-border-dim pb-2">
                  Settlement & Payout
                </h4>
                <div className="space-y-2 text-luxury-text">
                  <p>Payment Method: <span className="text-luxury-text-muted">{selectedPurchase.paymentMethod}</span></p>
                  <p>Grand Valuation Total: <span className="text-gold-400 font-serif">{formatCurrency(selectedPurchase.subtotal)}</span></p>
                  <p>Payout Net Amount: <span className="text-gold-400 font-serif">{formatCurrency(selectedPurchase.payoutAmount)}</span></p>
                </div>
              </div>
            </div>

            {/* Refinery Info (if available) */}
            {selectedPurchase.refineryDetails && (
              <div className="p-6 bg-luxury-black border border-luxury-border rounded-3xl space-y-4">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-gold-400 border-b border-luxury-border-dim pb-2">
                  Refinery Details
                </h4>
                <div className="grid grid-cols-3 gap-4 text-xs font-bold text-luxury-text">
                  <div>
                    <span className="text-luxury-text-muted block text-[9px] uppercase tracking-wider">Refinery Name</span>
                    {selectedPurchase.refineryDetails.refineryName || '—'}
                  </div>
                  <div>
                    <span className="text-luxury-text-muted block text-[9px] uppercase tracking-wider">Sent Date</span>
                    {selectedPurchase.refineryDetails.sentDate ? new Date(selectedPurchase.refineryDetails.sentDate).toLocaleDateString() : '—'}
                  </div>
                  <div>
                    <span className="text-luxury-text-muted block text-[9px] uppercase tracking-wider">Received Date</span>
                    {selectedPurchase.refineryDetails.receivedDate ? new Date(selectedPurchase.refineryDetails.receivedDate).toLocaleDateString() : '—'}
                  </div>
                </div>
                {selectedPurchase.refineryDetails.notes && (
                  <p className="text-xs text-luxury-text-muted mt-2">Notes: {selectedPurchase.refineryDetails.notes}</p>
                )}
              </div>
            )}

            {/* Refined Items Comparison (if available) */}
            {selectedPurchase.refineryDetails?.refinedItems && (
              <div className="border border-luxury-border rounded-3xl overflow-x-auto bg-luxury-black">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-luxury-charcoal text-[9px] uppercase font-black tracking-widest text-luxury-text-dim border-b border-luxury-border-dim">
                      <th className="p-4">Item</th>
                      <th className="p-4">Original Weight</th>
                      <th className="p-4">Received Weight</th>
                      <th className="p-4">Wastage</th>
                      <th className="p-4">Final Purity</th>
                      <th className="p-4">Fine Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-border-dim text-xs font-bold text-luxury-text">
                    {selectedPurchase.refineryDetails.refinedItems.map((ri, idx) => {
                      const original = selectedPurchase.items.find(i => i.id === ri.originalItemId);
                      return (
                        <tr key={idx} className="hover:bg-luxury-charcoal/40">
                          <td className="p-4">{original?.description || '—'}</td>
                          <td className="p-4">{original?.grossWeight.toFixed(2) || '—'}g</td>
                          <td className="p-4 text-blue-400">{ri.receivedWeight.toFixed(2)}g</td>
                          <td className="p-4 text-red-400">-{ri.wastageWeight.toFixed(2)}g</td>
                          <td className="p-4">{ri.finalPurity}</td>
                          <td className="p-4 text-gold-400">{ri.fineWeight.toFixed(3)}g</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Original Items Table (when no refined data) */}
            {!selectedPurchase.refineryDetails?.refinedItems && (
              <div className="border border-luxury-border rounded-3xl overflow-x-auto bg-luxury-black">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-luxury-charcoal text-[9px] uppercase font-black tracking-widest text-luxury-text-dim border-b border-luxury-border-dim">
                      <th className="p-4">Description</th>
                      <th className="p-4">Gross Weight</th>
                      <th className="p-4">Touch</th>
                      <th className="p-4">Fine Weight</th>
                      <th className="p-4">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-border-dim text-xs font-bold text-luxury-text">
                    {selectedPurchase.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-luxury-charcoal/40">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span>{item.description}</span>
                            <span className="text-[8px] text-gold-400/60 uppercase">{item.metalType} • {item.purity}</span>
                          </div>
                        </td>
                        <td className="p-4">{item.grossWeight.toFixed(2)} g</td>
                        <td className="p-4">{item.melting} %</td>
                        <td className="p-4">{item.fineWeight.toFixed(3)} g</td>
                        <td className="p-4 text-gold-400 font-serif">{formatCurrency(item.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes */}
            {selectedPurchase.notes && (
              <div className="p-4 bg-luxury-black/30 border border-luxury-border-dim rounded-2xl text-xs font-medium text-luxury-text-muted">
                <span className="font-bold text-luxury-text block mb-1">Acquisition Notes:</span>
                {selectedPurchase.notes}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-luxury-border-dim">
              <Button
                variant="gold"
                onClick={() => generateBuybackVoucher(selectedPurchase, settings)}
                className="px-6 py-3 font-bold uppercase tracking-widest text-xs flex items-center gap-2"
              >
                <Download size={14} /> Download PDF Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Send to Refinery Modal */}
      {refineryModalPurchase && (
        <Modal
          isOpen={isRefineryModalOpen}
          onClose={() => {
            setIsRefineryModalOpen(false);
            setRefineryModalPurchase(null);
          }}
          title="Send to Refinery"
          size="md"
        >
          <div className="p-6 space-y-6 bg-luxury-charcoal">
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl">
              <p className="text-xs font-bold text-amber-400 mb-2">
                Sending {refineryModalPurchase.items.length} item(s) from {refineryModalPurchase.purchaseNumber} to refinery
              </p>
              <p className="text-[10px] text-luxury-text-muted">
                Total gross weight: {refineryModalPurchase.items.reduce((sum, i) => sum + i.grossWeight, 0).toFixed(2)}g
              </p>
            </div>

            {/* Items Summary */}
            <div className="space-y-2">
              {refineryModalPurchase.items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-luxury-black border border-luxury-border rounded-xl text-xs font-bold">
                  <span className="text-luxury-text">{item.description}</span>
                  <span className="text-luxury-text-muted">{item.metalType} • {item.purity} • {item.grossWeight.toFixed(2)}g</span>
                </div>
              ))}
            </div>

            <Input
              label="Refinery Name"
              placeholder="e.g. Shree Gold Refinery, MMTC..."
              value={refineryName}
              onChange={(e) => setRefineryName(e.target.value)}
            />

            <div className="flex gap-4 pt-4 border-t border-luxury-border">
              <Button
                variant="outline"
                className="flex-1 py-3 border-luxury-border text-luxury-text-dim uppercase font-black tracking-widest text-xs"
                onClick={() => { setIsRefineryModalOpen(false); setRefineryModalPurchase(null); }}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1 py-3 uppercase font-black tracking-widest text-xs flex items-center justify-center gap-2"
                onClick={handleSendToRefinery}
              >
                <Send size={14} /> Send to Refinery
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receive from Refinery Modal */}
      {receiveModalPurchase && (
        <Modal
          isOpen={isReceiveModalOpen}
          onClose={() => {
            setIsReceiveModalOpen(false);
            setReceiveModalPurchase(null);
          }}
          title={`Receive from Refinery — ${receiveModalPurchase.purchaseNumber}`}
          size="lg"
        >
          <div className="p-6 space-y-6 bg-luxury-charcoal">
            <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
              <p className="text-xs font-bold text-blue-400 mb-1">
                Enter the refined weight details for each item received back from refinery
              </p>
              {receiveModalPurchase.refineryDetails?.refineryName && (
                <p className="text-[10px] text-luxury-text-muted">
                  Refinery: {receiveModalPurchase.refineryDetails.refineryName}
                </p>
              )}
            </div>

            {/* Per-item refinery results form */}
            <div className="space-y-4">
              {receiveModalPurchase.items.map(item => {
                const form = refinedItemsForm[item.id] || { receivedWeight: '', finalPurity: item.purity, fineWeight: '' };
                const receivedWt = parseFloat(form.receivedWeight) || 0;
                const wastage = Math.max(0, item.grossWeight - receivedWt);

                return (
                  <div key={item.id} className="p-5 bg-luxury-black border border-luxury-border rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-luxury-border-dim pb-3">
                      <div>
                        <p className="text-sm font-bold text-luxury-text">{item.description}</p>
                        <p className="text-[9px] uppercase text-gold-400/60 font-black tracking-wider">{item.metalType} • {item.purity} • Sent: {item.grossWeight.toFixed(2)}g</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] uppercase text-luxury-text-muted font-black tracking-wider">Wastage</p>
                        <p className="text-sm font-black text-red-400">-{wastage.toFixed(2)}g</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Received Weight (g)"
                        type="number"
                        step="0.001"
                        value={form.receivedWeight}
                        onChange={(e) => setRefinedItemsForm(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], receivedWeight: e.target.value }
                        }))}
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Final Purity</label>
                        <select
                          value={form.finalPurity}
                          onChange={(e) => setRefinedItemsForm(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], finalPurity: e.target.value }
                          }))}
                          className="w-full h-12 bg-luxury-input border border-luxury-border rounded-xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
                        >
                          <option value="24K">24K (Pure)</option>
                          <option value="22K">22K</option>
                          <option value="18K">18K</option>
                          <option value="14K">14K</option>
                          <option value="999">999</option>
                          <option value="925">925</option>
                          <option value="950">950</option>
                        </select>
                      </div>
                      <Input
                        label="Fine Weight (g)"
                        type="number"
                        step="0.001"
                        value={form.fineWeight}
                        onChange={(e) => setRefinedItemsForm(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], fineWeight: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim">Refinery Notes</label>
              <textarea
                placeholder="Any notes from the refinery about the batch..."
                value={refineryNotes}
                onChange={(e) => setRefineryNotes(e.target.value)}
                className="w-full h-20 bg-luxury-input border border-luxury-border rounded-xl p-4 text-xs font-bold text-luxury-text focus:border-gold-400 outline-none resize-none transition-all"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-luxury-border">
              <Button
                variant="outline"
                className="flex-1 py-3 border-luxury-border text-luxury-text-dim uppercase font-black tracking-widest text-xs"
                onClick={() => { setIsReceiveModalOpen(false); setReceiveModalPurchase(null); }}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1 py-3 uppercase font-black tracking-widest text-xs flex items-center justify-center gap-2"
                onClick={handleReceiveFromRefinery}
              >
                <PackageCheck size={14} /> Confirm Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
