import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Scale } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { calcWastage } from '../utils/calculations';
import type { PurityType } from '../types';
import toast from 'react-hot-toast';

export const MetalReturnPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobOrders, updateJobOrder, receiveItem } = useKarigarStore();

  const order = jobOrders.find(o => o.id === id);
  const isTypeA = order?.metalSource === 'shop';

  const [finishedWeight, setFinishedWeight] = useState('');
  const [scrapWeight, setScrapWeight] = useState('');

  // Wastage calculations live
  const wastageDetails = useMemo(() => {
    if (!order || !isTypeA || !order.metalIssue) return null;
    const issued = order.metalIssue.issuedWeight || 0;
    const finished = Number(finishedWeight) || 0;
    const scrap = Number(scrapWeight) || 0;

    if (issued <= 0) return { wastageGrams: 0, wastagePercent: 0, flag: false };
    return calcWastage(issued, finished, scrap);
  }, [order, isTypeA, finishedWeight, scrapWeight]);

  if (!order) {
    return <div className="p-8 text-center text-luxury-text-muted">Job Order Not Found</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finishedNum = Number(finishedWeight);
    if (!finishedNum || finishedNum <= 0) {
      toast.error('Please enter a valid finished weight');
      return;
    }

    const scrapNum = isTypeA ? (Number(scrapWeight) || 0) : 0;

    try {
      // 1. Update order record with Return Details
      await updateJobOrder(order.id, {
        status: 'returned',
        metalReturn: {
          finishedWeight: finishedNum,
          scrapWeight: isTypeA ? scrapNum : undefined,
          wastageGrams: isTypeA ? wastageDetails?.wastageGrams : undefined,
          wastagePercent: isTypeA ? wastageDetails?.wastagePercent : undefined,
          returnDate: new Date().toISOString()
        }
      });

      // 2. If Type A (Shop Metal), we received back issued metal, so credit/reconcile karigar ledger balance
      if (isTypeA && order.metalIssue) {
        // Compute total weight returned (finished + scrap + wastage) which reconciles the outstanding balance
        const totalCreditedWeight = finishedNum + scrapNum + (wastageDetails?.wastageGrams || 0);

        await receiveItem({
          karigarId: order.karigarId,
          metalType: order.metalIssue.metalType,
          purity: order.metalIssue.purity as PurityType,
          grossWeight: totalCreditedWeight,
          wastagePercent: wastageDetails?.wastagePercent || 0,
          description: `Metal return & reconciliation for Order #${order.id.slice(-6)}`,
          date: new Date().toISOString(),
          createdBy: 'Admin'
        });
      } else {
        // Type B RECEIVE record without metal balance updates, just log in ledger
        await receiveItem({
          karigarId: order.karigarId,
          metalType: 'Gold',
          purity: '22K',
          grossWeight: finishedNum,
          description: `Finished item returned for Order #${order.id.slice(-6)} (Own Metal Type B)`,
          date: new Date().toISOString(),
          createdBy: 'Admin'
        });
      }

      toast.success('Product returned successfully. Moving to QC.');
      navigate('/karigars?tab=orders');
    } catch (error) {
      toast.error('Failed to register metal return');
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
            Product <span className="text-gold-400">Return</span>
          </h1>
        </div>
      </div>

      {/* Order & Issue Summary */}
      <div className="bg-luxury-black border border-luxury-border-dim rounded-2xl p-6 space-y-4">
        <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Order & Metal Details</p>
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
            <p className="text-luxury-text-muted text-xs">Item Description</p>
            <p className="font-bold text-luxury-text">{order.itemType} x {order.quantity}</p>
          </div>
          <div>
            <p className="text-luxury-text-muted text-xs">Metal Source</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-400/10 text-gold-400 border border-gold-400/20">
              {isTypeA ? 'Shop Metal (Type A)' : "Karigar's Metal (Type B)"}
            </span>
          </div>

          {isTypeA && order.metalIssue && (
            <div className="col-span-2 pt-2 border-t border-luxury-border-dim grid grid-cols-2 gap-4">
              <div>
                <p className="text-luxury-text-muted text-xs">Original Issued Weight</p>
                <p className="font-bold text-red-400">{order.metalIssue.issuedWeight.toFixed(3)}g</p>
              </div>
              <div>
                <p className="text-luxury-text-muted text-xs">Issued Purity / Metal</p>
                <p className="font-bold text-luxury-text">{order.metalIssue.purity} {order.metalIssue.metalType}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Finished Jewelry Weight (grams)"
            type="number"
            step="0.001"
            placeholder="0.000"
            value={finishedWeight}
            onChange={(e) => setFinishedWeight(e.target.value)}
            required
          />

          {isTypeA && (
            <Input
              label="Scrap Metal Returned (grams)"
              type="number"
              step="0.001"
              placeholder="0.000"
              value={scrapWeight}
              onChange={(e) => setScrapWeight(e.target.value)}
            />
          )}
        </div>

        {/* Live wastage preview & Warnings for Type A */}
        {isTypeA && wastageDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-luxury-black rounded-xl border border-luxury-border-dim">
              <div>
                <p className="text-[10px] uppercase font-black text-luxury-text-muted">Computed Wastage</p>
                <p className="text-lg font-serif font-black text-luxury-text">
                  {wastageDetails.wastageGrams.toFixed(3)}g
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-luxury-text-muted">Wastage Percent</p>
                <p className="text-lg font-serif font-black text-luxury-text">
                  {isNaN(wastageDetails.wastagePercent) ? '0.00' : wastageDetails.wastagePercent.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Amber warning alert if wastage > 2% */}
            {wastageDetails.flag && (
              <div className="flex gap-3 items-center bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-pulse">
                <AlertTriangle className="text-red-400 shrink-0" size={24} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-red-400">Wastage exceeds threshold!</p>
                  <p className="text-[10px] text-luxury-text-muted">
                    The calculated wastage of {wastageDetails.wastagePercent.toFixed(2)}% exceeds the standard allowance of 2.00%.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="gold"
          className="w-full h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2"
        >
          <Scale size={16} /> Confirm Receipt
        </Button>
      </form>
    </div>
  );
};
