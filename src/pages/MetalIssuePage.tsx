import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Scale, Save } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { useProductStore } from '../store/productStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { calculateFineWeight } from '../utils/calculations';
import type { MetalType, PurityType } from '../types';
import toast from 'react-hot-toast';

export const MetalIssuePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobOrders, updateJobOrder, issueMetal } = useKarigarStore();
  const { products } = useProductStore();

  const order = jobOrders.find(o => o.id === id);

  const [metalType, setMetalType] = useState<MetalType>('Gold');
  const [purity, setPurity] = useState<PurityType>('24K');
  const [issuedWeight, setIssuedWeight] = useState('');
  const [sourceProductId, setSourceProductId] = useState('');

  const rawMaterials = products.filter(p => p.category === 'Raw Material');

  useEffect(() => {
    if (order && order.metalSource !== 'shop') {
      toast.error('Metal issue is only required for Shop Metal (Type A) orders');
      navigate('/karigars?tab=orders');
    }
  }, [order, navigate]);

  if (!order) {
    return <div className="p-8 text-center text-luxury-text-muted">Job Order Not Found</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weightNum = Number(issuedWeight);
    if (!weightNum || weightNum <= 0) {
      toast.error('Please enter a valid issued weight');
      return;
    }

    try {
      const fineWeight = calculateFineWeight(weightNum, purity);

      // 1. Update order record
      await updateJobOrder(order.id, {
        status: 'metalIssued',
        metalIssue: {
          metalType,
          purity,
          issuedWeight: weightNum,
          issuedDate: new Date().toISOString()
        }
      });

      // 2. Add Karigar ledger transaction & update metal balances
      await issueMetal({
        karigarId: order.karigarId,
        metalType,
        purity,
        grossWeight: weightNum,
        fineWeight,
        description: `Issued metal for Order #${order.id.slice(-6)}: ${order.itemType} (${order.description || 'No remarks'})`,
        sourceProductId: sourceProductId || undefined,
        date: new Date().toISOString(),
        createdBy: 'Admin'
      });

      toast.success('Metal issued and order marked as WIP');
      navigate('/karigars?tab=orders');
    } catch (error) {
      toast.error('Failed to issue metal');
      console.error(error);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-2xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-luxury-border-dim pb-6">
        <button
          onClick={() => navigate('/karigars?tab=orders')}
          className="flex items-center gap-2 text-luxury-text-muted hover:text-gold-400 transition-colors uppercase tracking-[0.2em] text-[10px] font-black"
        >
          <ArrowLeft size={16} /> Cancel
        </button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-luxury-text tracking-tight uppercase">
            Issue <span className="text-gold-400">Metal</span>
          </h1>
        </div>
      </div>

      {/* Order Summary Card */}
      <div className="bg-luxury-black border border-luxury-border-dim rounded-2xl p-6 space-y-4">
        <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Order Summary</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-luxury-text-muted text-xs">Job ID</p>
            <p className="font-mono font-bold text-luxury-text">{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-luxury-text-muted text-xs">Karigar Name</p>
            <p className="font-bold text-luxury-text">{order.karigarName}</p>
          </div>
          <div>
            <p className="text-luxury-text-muted text-xs">Item Type / Quantity</p>
            <p className="font-bold text-luxury-text">{order.itemType} x {order.quantity}</p>
          </div>
          <div>
            <p className="text-luxury-text-muted text-xs">Estimated Weight Needed</p>
            <p className="font-bold text-luxury-text">{order.estimatedWeight}g</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Metal Type</label>
            <select
              value={metalType}
              onChange={(e) => setMetalType(e.target.value as MetalType)}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            >
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Purity</label>
            <select
              value={purity}
              onChange={(e) => setPurity(e.target.value as PurityType)}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            >
              <option value="24K">24K (Pure)</option>
              <option value="22K">22K</option>
              <option value="18K">18K</option>
              <option value="14K">14K</option>
              <option value="925">92.5% (Sterling)</option>
            </select>
          </div>
        </div>

        {/* Deduct from Raw Material */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-luxury-text-muted">Deduct from Shop Stock (Optional)</label>
          <select
            value={sourceProductId}
            onChange={(e) => {
              const p = products.find(prod => prod.id === e.target.value);
              setSourceProductId(e.target.value);
              if (p) {
                setMetalType(p.metalType as MetalType);
                setPurity(p.purity as PurityType);
                setIssuedWeight(String(p.weight || ''));
              }
            }}
            className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
          >
            <option value="">No Automatic Stock Deduction (Manual Record)</option>
            {rawMaterials.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.purity} Gold) - Avl: {p.stock}g
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Issued Weight (grams)"
          type="number"
          step="0.001"
          placeholder="0.000"
          value={issuedWeight}
          onChange={(e) => setIssuedWeight(e.target.value)}
          required
        />

        <div className="flex items-center gap-3 p-4 bg-gold-400/5 border border-gold-400/20 rounded-xl">
          <Scale className="text-gold-400 shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-luxury-text">Estimated Fine Weight Conversion</p>
            <p className="text-lg font-serif font-black text-gold-400">
              {calculateFineWeight(Number(issuedWeight) || 0, purity).toFixed(3)}g Fine
            </p>
          </div>
        </div>

        <Button
          type="submit"
          variant="gold"
          className="w-full h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2"
        >
          <Save size={16} /> Confirm & Issue Metal
        </Button>
      </form>
    </div>
  );
};
