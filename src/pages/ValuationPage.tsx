import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, HelpCircle } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { calcSalePrice, formatCurrency } from '../utils/calculations';
import toast from 'react-hot-toast';

export const ValuationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobOrders, updateJobOrder } = useKarigarStore();

  const order = jobOrders.find(o => o.id === id);
  const isTypeB = order?.metalSource === 'karigar';

  const [metalRate, setMetalRate] = useState('');
  const [makingChargeType, setMakingChargeType] = useState<'flat' | 'perGram'>('flat');
  const [makingChargeAmount, setMakingChargeAmount] = useState('');

  const finishedWeight = order?.metalReturn?.finishedWeight || 0;

  // Live preview calculations
  const valuationDetails = useMemo(() => {
    const rate = Number(metalRate) || 0;
    const making = Number(makingChargeAmount) || 0;
    const salePrice = calcSalePrice(finishedWeight, rate, makingChargeType, making);
    const metalPurchaseAmount = isTypeB ? (finishedWeight * rate) : 0;

    return {
      salePrice,
      metalPurchaseAmount
    };
  }, [finishedWeight, metalRate, makingChargeType, makingChargeAmount, isTypeB]);

  if (!order) {
    return <div className="p-8 text-center text-luxury-text-muted">Job Order Not Found</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateNum = Number(metalRate);
    if (!rateNum || rateNum <= 0) {
      toast.error('Please enter a valid metal rate');
      return;
    }

    const makingNum = Number(makingChargeAmount);
    if (!makingNum || makingNum < 0) {
      toast.error('Please enter a valid making charge amount');
      return;
    }

    try {
      await updateJobOrder(order.id, {
        status: 'valued',
        valuation: {
          metalRate: rateNum,
          makingChargeType,
          makingChargeAmount: makingNum,
          salePrice: valuationDetails.salePrice,
          metalPurchaseAmount: isTypeB ? valuationDetails.metalPurchaseAmount : undefined,
          valuationDate: new Date().toISOString()
        }
      });

      toast.success('Valuation submitted. Ready for final payment settlement.');
      navigate('/karigars?tab=orders');
    } catch (error) {
      toast.error('Failed to submit valuation');
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
            Order <span className="text-gold-400">Valuation</span>
          </h1>
        </div>
      </div>

      {/* Weight Summary Box */}
      <div className="bg-luxury-black border border-luxury-border-dim rounded-2xl p-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-luxury-text-muted text-xs">Finished Jewelry Weight</p>
          <p className="text-2xl font-serif font-black text-gold-400">{finishedWeight.toFixed(3)}g</p>
        </div>
        <div>
          <p className="text-luxury-text-muted text-xs">Artisan / Item</p>
          <p className="font-bold text-luxury-text">{order.karigarName}</p>
          <p className="text-xs text-luxury-text-muted">{order.itemType} x {order.quantity}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Current Metal Rate (per gram, INR)"
            type="number"
            placeholder="e.g. 7200"
            value={metalRate}
            onChange={(e) => setMetalRate(e.target.value)}
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Making Charge Type</label>
            <select
              value={makingChargeType}
              onChange={(e) => setMakingChargeType(e.target.value as 'flat' | 'perGram')}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            >
              <option value="flat">Flat Charge (Total)</option>
              <option value="perGram">Per Gram Rate</option>
            </select>
          </div>

          <Input
            label={`Making Charge Amount (INR)`}
            type="number"
            placeholder="e.g. 500"
            value={makingChargeAmount}
            onChange={(e) => setMakingChargeAmount(e.target.value)}
            required
          />
        </div>

        {/* Live Calculation Preview Box */}
        <div className="p-6 bg-luxury-black rounded-2xl border border-luxury-border-dim space-y-3">
          <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Live Valuation Preview</p>
          
          <div className="flex justify-between text-sm text-luxury-text-muted">
            <span>Metal Value (Weight × Rate)</span>
            <span>{formatCurrency(finishedWeight * (Number(metalRate) || 0))}</span>
          </div>

          <div className="flex justify-between text-sm text-luxury-text-muted">
            <span>Making Charges</span>
            <span>
              {makingChargeType === 'perGram'
                ? `${formatCurrency(Number(makingChargeAmount) || 0)}/g × ${finishedWeight.toFixed(2)}g = `
                : ''}
              {formatCurrency(
                makingChargeType === 'perGram'
                  ? finishedWeight * (Number(makingChargeAmount) || 0)
                  : Number(makingChargeAmount) || 0
              )}
            </span>
          </div>

          {isTypeB && (
            <div className="flex justify-between text-sm text-yellow-400/80 pt-2 border-t border-luxury-border-dim/50">
              <span className="flex items-center gap-1 cursor-help" title="Karigar used own gold, so we buy this metal weight at current rate.">
                Purchase metal from Karigar
                <HelpCircle size={12} />
              </span>
              <span>{formatCurrency(valuationDetails.metalPurchaseAmount)}</span>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-luxury-border-dim items-center">
            <span className="text-xs uppercase font-black text-luxury-text">Computed Sale Price</span>
            <span className="text-2xl font-serif font-black text-luxury-text">
              {formatCurrency(valuationDetails.salePrice)}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          variant="gold"
          className="w-full h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2"
        >
          <Calculator size={16} /> Confirm Valuation
        </Button>
      </form>
    </div>
  );
};
