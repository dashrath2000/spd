import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { calcWage, formatCurrency } from '../utils/calculations';
import toast from 'react-hot-toast';

export const PaymentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobOrders, karigars, updateJobOrder, updateKarigar, payLabor } = useKarigarStore();

  const order = jobOrders.find(o => o.id === id);
  const karigar = useMemo(() => {
    return order ? karigars.find(k => k.id === order.karigarId) : null;
  }, [order, karigars]);

  const [daysWorked, setDaysWorked] = useState('1');
  const [advanceDeduction, setAdvanceDeduction] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [transactionRef, setTransactionRef] = useState('');

  const isTypeB = order?.metalSource === 'karigar';
  const metalPurchaseAmount = order?.valuation?.metalPurchaseAmount || 0;

  // Auto-deduct advance if available
  useEffect(() => {
    if (karigar && karigar.advanceBalance) {
      // Suggest deducting advance up to the wage/total value
      setAdvanceDeduction(String(Math.min(karigar.advanceBalance, 1000000)));
    }
  }, [karigar]);

  const paymentDetails = useMemo(() => {
    if (!order || !karigar) return null;

    const wage = calcWage(karigar, order, Number(daysWorked) || 1);
    const total = wage + metalPurchaseAmount;
    const deduction = Number(advanceDeduction) || 0;
    const netPayable = Math.max(0, total - deduction);

    return {
      wage,
      total,
      deduction,
      netPayable
    };
  }, [order, karigar, daysWorked, advanceDeduction, metalPurchaseAmount]);

  if (!order || !karigar || !paymentDetails) {
    return <div className="p-8 text-center text-luxury-text-muted">Order or Karigar Not Found</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMode !== 'Cash' && !transactionRef.trim()) {
      toast.error('Transaction reference is required for digital payments');
      return;
    }

    const maxDeduction = karigar.advanceBalance || 0;
    if (paymentDetails.deduction > maxDeduction) {
      toast.error(`Deduction cannot exceed Karigar's outstanding advance balance of ${formatCurrency(maxDeduction)}`);
      return;
    }

    try {
      // 1. Update order status -> completed
      await updateJobOrder(order.id, {
        status: 'completed',
        payment: {
          wageAmount: paymentDetails.wage,
          metalPurchaseAmount: isTypeB ? metalPurchaseAmount : undefined,
          advanceDeduction: paymentDetails.deduction,
          netPayable: paymentDetails.netPayable,
          paymentMode,
          transactionRef: transactionRef || undefined,
          paymentDate: new Date().toISOString()
        }
      });

      // 2. Deduct from Karigar advance balance in database
      const newAdvanceBalance = Math.max(0, (karigar.advanceBalance || 0) - paymentDetails.deduction);
      await updateKarigar(karigar.id, {
        advanceBalance: newAdvanceBalance
      });

      // 3. Record labor payment & debit from cashBalance/ledger
      // In the ledger we record the final cash paid out
      await payLabor({
        karigarId: karigar.id,
        amount: paymentDetails.netPayable,
        description: `Final payout for Order #${order.id.slice(-6)}: ${order.itemType} (${paymentMode})`,
        date: new Date().toISOString(),
        createdBy: 'Admin'
      });

      toast.success('Job Order completed and payment registered');
      navigate('/karigars?tab=orders');
    } catch (error) {
      toast.error('Failed to process payment');
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
            Process <span className="text-gold-400">Payment</span>
          </h1>
        </div>
      </div>

      {/* Settlement Summary Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-luxury-black border border-luxury-border-dim p-4 rounded-xl">
          <p className="text-luxury-text-muted text-[10px] uppercase font-black tracking-widest">Karigar Wage Type</p>
          <p className="text-sm font-bold text-luxury-text capitalize">
            {karigar.wageType === 'perGram' ? 'Per Gram' : karigar.wageType === 'perPiece' ? 'Per Piece' : 'Daily'}
          </p>
          <p className="text-[10px] text-gold-400">Rate: {formatCurrency(karigar.wageRate || 0)}</p>
        </div>

        <div className="bg-luxury-black border border-luxury-border-dim p-4 rounded-xl">
          <p className="text-luxury-text-muted text-[10px] uppercase font-black tracking-widest">Job Metrics</p>
          <p className="text-sm font-bold text-luxury-text">{order.itemType} x {order.quantity}</p>
          <p className="text-[10px] text-luxury-text-muted">Weight: {order.estimatedWeight}g</p>
        </div>

        <div className="bg-luxury-black border border-luxury-border-dim p-4 rounded-xl">
          <p className="text-luxury-text-muted text-[10px] uppercase font-black tracking-widest">Advance Balance</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(karigar.advanceBalance || 0)}</p>
          <p className="text-[10px] text-luxury-text-muted">Outstanding Debit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl">
        
        {karigar.wageType === 'daily' && (
          <Input
            label="Days Worked"
            type="number"
            value={daysWorked}
            onChange={(e) => setDaysWorked(e.target.value)}
            min={1}
            required
          />
        )}

        <Input
          label={`Deduct from Advance Balance (Max: ${formatCurrency(karigar.advanceBalance || 0)})`}
          type="number"
          step="0.01"
          placeholder="0.00"
          value={advanceDeduction}
          onChange={(e) => setAdvanceDeduction(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank Transfer</option>
            </select>
          </div>

          {paymentMode !== 'Cash' && (
            <Input
              label="Transaction Reference ID"
              placeholder="e.g. UPI Ref, IMPS No"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              required
            />
          )}
        </div>

        {/* Breakdown Card */}
        <div className="p-6 bg-luxury-black rounded-2xl border border-luxury-border-dim space-y-3">
          <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Payment Breakdown</p>
          
          <div className="flex justify-between text-sm text-luxury-text-muted">
            <span>Labor Charges (Wage)</span>
            <span>{formatCurrency(paymentDetails.wage)}</span>
          </div>

          {isTypeB && (
            <div className="flex justify-between text-sm text-luxury-text-muted">
              <span>Metal Purchase Value</span>
              <span>{formatCurrency(metalPurchaseAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm text-red-400/80 pt-2 border-t border-luxury-border-dim/50">
            <span>Advance Deducted</span>
            <span>- {formatCurrency(paymentDetails.deduction)}</span>
          </div>

          <div className="flex justify-between pt-3 border-t border-luxury-border-dim items-center">
            <span className="text-xs uppercase font-black text-luxury-text">Net Payout Amount</span>
            <span className="text-2xl font-serif font-black text-green-400">
              {formatCurrency(paymentDetails.netPayable)}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          variant="gold"
          className="w-full h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2"
        >
          <Banknote size={16} /> Complete Payment & Order
        </Button>
      </form>
    </div>
  );
};
