import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, RefreshCw, XCircle, ShieldCheck } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { localDB } from '../lib/localDB';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import type { JobOrder } from '../types';

export const QualityCheckPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobOrders, karigars, updateJobOrder, updateKarigar } = useKarigarStore();

  const order = jobOrders.find(o => o.id === id);

  const [qcResult, setQcResult] = useState<'pass' | 'rework' | 'reject'>('pass');
  const [reason, setReason] = useState('');
  const [reassignedKarigarId, setReassignedKarigarId] = useState('');
  const [debitAmount, setDebitAmount] = useState('');

  if (!order) {
    return <div className="p-8 text-center text-luxury-text-muted">Job Order Not Found</div>;
  }

  const activeKarigars = karigars.filter(k => k.isActive !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (qcResult === 'rework' && !reason.trim()) {
      toast.error('Please specify a rework reason');
      return;
    }
    if (qcResult === 'reject') {
      if (!reason.trim()) {
        toast.error('Please specify a rejection reason');
        return;
      }
      if (!debitAmount || Number(debitAmount) < 0) {
        toast.error('Please enter a valid debit amount (>= 0)');
        return;
      }
    }

    try {
      const qcDate = new Date().toISOString();

      if (qcResult === 'pass') {
        // Pass -> status: 'qc'
        await updateJobOrder(order.id, {
          status: 'qc',
          qc: {
            result: 'pass',
            qcDate
          }
        });
        toast.success('Quality Check passed successfully');
      } else if (qcResult === 'rework') {
        // Rework -> status: 'wip', reworkCount++
        const updates: Partial<JobOrder> = {
          status: 'wip',
          reworkCount: (order.reworkCount || 0) + 1,
          reworkReason: reason,
          qc: {
            result: 'rework',
            reason,
            reassignedKarigarId: reassignedKarigarId || undefined,
            qcDate
          }
        };

        if (reassignedKarigarId) {
          const newK = karigars.find(k => k.id === reassignedKarigarId);
          if (newK) {
            updates.karigarId = reassignedKarigarId;
            updates.karigarName = newK.name;
          }
        }

        await updateJobOrder(order.id, updates);
        toast.success('Order status reverted to WIP for Rework');
      } else if (qcResult === 'reject') {
        // Reject -> status: 'completed' with reject flag, debit karigar
        const debitNum = Number(debitAmount) || 0;

        await updateJobOrder(order.id, {
          status: 'completed',
          rejectFlag: true,
          rejectReason: reason,
          debitAmount: debitNum,
          qc: {
            result: 'reject',
            reason,
            debitAmount: debitNum,
            qcDate
          }
        });

        // Debit the Karigar: add to their advance balance
        const currentK = karigars.find(k => k.id === order.karigarId);
        if (currentK) {
          const currentAdvance = currentK.advanceBalance || 0;
          await updateKarigar(order.karigarId, {
            advanceBalance: currentAdvance + debitNum
          });

          // Insert transaction ledger record
          await localDB.addDocument('karigar_transactions', {
            id: uuidv4(),
            karigarId: order.karigarId,
            type: 'LABOR_PAYMENT',
            date: new Date().toISOString(),
            amount: debitNum, // positive amount shows as liability/advance they owe us
            description: `Job Order #${order.id.slice(-6)} Rejected - Material damage debit`,
            createdBy: 'Admin'
          });
        }

        toast.error('Order rejected. Debit applied to Karigar advance balance.');
      }

      navigate('/karigars?tab=orders');
    } catch (error) {
      toast.error('Failed to update quality check status');
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
            Quality <span className="text-gold-400">Control</span>
          </h1>
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-luxury-black border border-luxury-border-dim rounded-2xl p-6 space-y-3">
        <p className="text-[10px] uppercase font-black tracking-widest text-gold-400">Order Information</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-luxury-text-muted">Job Order:</span> <span className="font-mono text-luxury-text font-bold">#{order.id.slice(-8).toUpperCase()}</span>
          </div>
          <div>
            <span className="text-luxury-text-muted">Artisan:</span> <span className="text-luxury-text font-bold">{order.karigarName}</span>
          </div>
          <div>
            <span className="text-luxury-text-muted">Returned Jewelry Weight:</span> <span className="text-luxury-text font-bold">{order.metalReturn?.finishedWeight || '0'}g</span>
          </div>
          <div>
            <span className="text-luxury-text-muted">Item Type:</span> <span className="text-luxury-text font-bold">{order.itemType}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Three Choice Cards */}
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setQcResult('pass')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer ${
              qcResult === 'pass'
                ? 'bg-green-500/10 border-green-500 text-green-400 shadow-lg'
                : 'bg-luxury-charcoal border-luxury-border text-luxury-text-muted hover:border-luxury-text-muted'
            }`}
          >
            <CheckCircle size={32} className="mb-2" />
            <span className="text-xs font-black uppercase tracking-wider">Pass QC</span>
          </button>

          <button
            type="button"
            onClick={() => setQcResult('rework')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer ${
              qcResult === 'rework'
                ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400 shadow-lg'
                : 'bg-luxury-charcoal border-luxury-border text-luxury-text-muted hover:border-luxury-text-muted'
            }`}
          >
            <RefreshCw size={32} className="mb-2" />
            <span className="text-xs font-black uppercase tracking-wider">Rework</span>
          </button>

          <button
            type="button"
            onClick={() => setQcResult('reject')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer ${
              qcResult === 'reject'
                ? 'bg-red-500/10 border-red-500 text-red-400 shadow-lg'
                : 'bg-luxury-charcoal border-luxury-border text-luxury-text-muted hover:border-luxury-text-muted'
            }`}
          >
            <XCircle size={32} className="mb-2" />
            <span className="text-xs font-black uppercase tracking-wider">Reject Job</span>
          </button>
        </div>

        {/* Conditional Field Containers */}
        {qcResult === 'pass' && (
          <div className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 shadow-2xl flex items-center gap-4 text-sm text-green-400/90 font-medium">
            <ShieldCheck size={24} />
            <p>Product passed inspection. Proceeding to valuation calculation stage.</p>
          </div>
        )}

        {qcResult === 'rework' && (
          <div className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in">
            <div className="space-y-2">
              <label className="text-sm font-medium text-luxury-text-muted">Rework Description / Deficiency Details</label>
              <textarea
                rows={3}
                placeholder="Explain what needs to be fixed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg p-4 text-sm text-luxury-text outline-none focus:border-gold-400"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-luxury-text-muted">Reassign Artisan (Optional)</label>
              <select
                value={reassignedKarigarId}
                onChange={(e) => setReassignedKarigarId(e.target.value)}
                className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
              >
                <option value="">Keep current artisan ({order.karigarName})</option>
                {activeKarigars.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {qcResult === 'reject' && (
          <div className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in">
            <div className="space-y-2">
              <label className="text-sm font-medium text-luxury-text-muted">Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="Detail the failure reasons..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg p-4 text-sm text-luxury-text outline-none focus:border-gold-400"
                required
              />
            </div>

            <Input
              label="Debit Amount (INR) charged to Karigar"
              type="number"
              placeholder="0.00"
              value={debitAmount}
              onChange={(e) => setDebitAmount(e.target.value)}
              required
            />
          </div>
        )}

        <Button
          type="submit"
          variant="gold"
          className="w-full h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10"
        >
          Confirm Quality Control Result
        </Button>
      </form>
    </div>
  );
};
