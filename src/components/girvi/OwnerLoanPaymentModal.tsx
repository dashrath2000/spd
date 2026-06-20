import { useState, useMemo, useEffect } from 'react';
import { useOwnerLoanStore } from '../../store/ownerLoanStore';
import { formatCurrency, calculateDailyInterest } from '../../utils/calculations';
import { Input } from '../ui/Input';
import { Button, cn } from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { OwnerLoan, OwnerLoanPayment } from '../../types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface OwnerLoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: OwnerLoan;
}

export const OwnerLoanPaymentModal = ({ isOpen, onClose, loan }: OwnerLoanPaymentModalProps) => {
  const { addOwnerLoanPayment, updateOwnerLoan } = useOwnerLoanStore();
  const [mode, setMode] = useState<'Repay' | 'Topup'>('Repay');
  
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'UPI' | 'Card'>('Cash');
  const [note, setNote] = useState('');

  const handleAmountChange = (val: string) => {
    const numericValue = val.replace(/[^0-9.]/g, '');
    if (numericValue === '') {
      setAmount('');
      setDisplayAmount('');
      return;
    }

    const numberValue = parseFloat(numericValue);
    if (!isNaN(numberValue)) {
      const formatted = new Intl.NumberFormat('en-IN').format(numberValue);
      setAmount(numericValue);
      setDisplayAmount(formatted);
    }
  };

  // 1. Calculate historical payments
  const paymentsSummary = useMemo(() => {
    const pHistory = loan.payments || [];
    const interestPaid = pHistory.filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
    const principalPaid = pHistory.filter(p => p.type === 'Principal').reduce((sum, p) => sum + p.amount, 0);
    const topUpsAmount = pHistory.filter(p => p.type === 'Top-up').reduce((sum, p) => sum + p.amount, 0);
    return { interestPaid, principalPaid, topUpsAmount };
  }, [loan]);

  // 2. Calculate daily accrued interest as of today
  const accruedInterest = useMemo(() => {
    return Math.round(calculateDailyInterest(
      loan.loanAmount,
      loan.interestRate,
      loan.loanDate,
      loan.isCompoundInterest,
      paymentsSummary.interestPaid
    ));
  }, [loan, paymentsSummary.interestPaid]);

  const remainingPrincipal = useMemo(() => {
    return Math.round(Math.max(0, loan.loanAmount - paymentsSummary.principalPaid));
  }, [loan.loanAmount, paymentsSummary.principalPaid]);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDisplayAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setNote('');
      setMode('Repay');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (mode === 'Repay') {
      const totalDues = accruedInterest + remainingPrincipal;
      // Use a small tolerance for floating point errors
      if (parsedAmount > totalDues + 0.01) {
        toast.error(`Repayment exceeds total outstanding dues (${formatCurrency(totalDues)})`);
        return;
      }
    }

    const now = new Date();
    const paymentDateTime = new Date(date);
    paymentDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const paymentsToLog: OwnerLoanPayment[] = [];

    if (mode === 'Topup') {
      paymentsToLog.push({
        id: uuidv4(),
        amount: parsedAmount,
        date: paymentDateTime.toISOString(),
        type: 'Top-up',
        method: paymentMethod,
        note: note || undefined
      });
    } else {
      // mode === 'Repay' - Allocate to interest first, then principal
      let tempAmount = parsedAmount;
      
      if (accruedInterest > 0) {
        const allocatedInterest = Math.min(tempAmount, accruedInterest);
        paymentsToLog.push({
          id: uuidv4(),
          amount: allocatedInterest,
          date: paymentDateTime.toISOString(),
          type: 'Interest',
          method: paymentMethod,
          note: note ? `Interest portion - ${note}` : 'Interest Payment'
        });
        tempAmount -= allocatedInterest;
      }

      if (tempAmount > 0) {
        paymentsToLog.push({
          id: uuidv4(),
          amount: tempAmount,
          date: paymentDateTime.toISOString(),
          type: 'Principal',
          method: paymentMethod,
          note: note ? `Principal portion - ${note}` : 'Principal Repayment'
        });
      }
    }

    try {
      await addOwnerLoanPayment(loan.id, paymentsToLog);
      
      // If we made a repayment that clears both principal and interest completely, close it
      const principalPaidThisTransaction = paymentsToLog
        .filter(p => p.type === 'Principal')
        .reduce((sum, p) => sum + p.amount, 0);

      const interestPaidThisTransaction = paymentsToLog
        .filter(p => p.type === 'Interest')
        .reduce((sum, p) => sum + p.amount, 0);

      const remainingPrincipalAfter = remainingPrincipal - principalPaidThisTransaction;
      const remainingInterestAfter = accruedInterest - interestPaidThisTransaction;

      // Use a small tolerance for floating point errors
      const isSettled = remainingPrincipalAfter <= 0.01 && remainingInterestAfter <= 0.01;
      
      if (isSettled && mode === 'Repay') {
        await updateOwnerLoan(loan.id, { status: 'Closed', updatedAt: new Date().toISOString() });
        toast.success('Loan fully repaid! Status updated to Closed.');
      } else {
        toast.success(mode === 'Topup' ? 'Top-up recorded successfully' : 'Repayment logged successfully');
      }
      
      onClose();
    } catch (err) {
      toast.error('Failed to log payment transaction');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Loan Transaction" size="md">
      <div className="p-6 bg-luxury-charcoal space-y-6">
        
        {/* Toggle Mode */}
        <div className="flex bg-luxury-black/60 border border-luxury-border p-1 rounded-xl">
           <button
              type="button"
              onClick={() => {
                 setMode('Repay');
                 setAmount('');
                 setDisplayAmount('');
              }}
              className={cn(
                 "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                 mode === 'Repay' ? "bg-gold-400 text-luxury-black shadow-md" : "text-luxury-text-dim hover:text-luxury-text"
              )}
           >
              Make Repayment
           </button>
           <button
              type="button"
              onClick={() => {
                 setMode('Topup');
                 setAmount('');
                 setDisplayAmount('');
              }}
              className={cn(
                 "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                 mode === 'Topup' ? "bg-gold-400 text-luxury-black shadow-md" : "text-luxury-text-dim hover:text-luxury-text"
              )}
           >
              Borrow Top-up
           </button>
        </div>

        {/* Info card */}
        <div className="bg-luxury-surface border border-luxury-border-dim rounded-2xl p-4 flex flex-col gap-3">
           <div className="flex justify-between items-center border-b border-luxury-border-dim/40 pb-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Lender</span>
              <span className="text-xs font-bold text-luxury-text">{loan.lenderName}</span>
           </div>
           <div className="grid grid-cols-3 gap-4 pt-1">
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-black text-luxury-text-muted mb-1">Interest</span>
                 <span className="text-lg font-black text-red-400 font-mono">{formatCurrency(accruedInterest)}</span>
              </div>
              <div className="flex flex-col text-center border-x border-luxury-border-dim/40 px-2">
                 <span className="text-[10px] uppercase font-black text-luxury-text-muted mb-1">Principal</span>
                 <span className="text-lg font-black text-gold-400 font-mono">{formatCurrency(remainingPrincipal)}</span>
              </div>
              <div className="flex flex-col text-right">
                 <span className="text-[10px] uppercase font-black text-luxury-text-muted mb-1">Total Due</span>
                 <span className="text-lg font-black text-luxury-text font-mono">{formatCurrency(accruedInterest + remainingPrincipal)}</span>
              </div>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
           
           <div className="grid grid-cols-2 gap-4">
              <Input
                 label={mode === 'Topup' ? 'Top-up Borrow Amount' : 'Repayment Amount'}
                 type="text"
                 value={displayAmount}
                 onChange={(e) => handleAmountChange(e.target.value)}
                 placeholder={mode === 'Topup' ? 'Enter amount...' : new Intl.NumberFormat('en-IN').format(accruedInterest + remainingPrincipal)}
                 required
                 className="text-lg font-mono font-black"
                 autoFocus
              />
              <Input
                 label="Transaction Date"
                 type="date"
                 value={date}
                 onChange={(e) => setDate(e.target.value)}
                 required
              />
           </div>

           {/* Payment Method */}
           <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">Payment Channel</label>
              <div className="grid grid-cols-4 gap-2">
                 {['Cash', 'Bank', 'UPI', 'Card'].map(m => (
                    <button
                       key={m}
                       type="button"
                       onClick={() => setPaymentMethod(m as any)}
                       className={cn(
                          "py-2 rounded-lg border text-[10px] uppercase font-black tracking-widest transition-all",
                          paymentMethod === m ? "bg-gold-400 border-gold-400 text-luxury-black shadow-md" : "bg-luxury-black border-luxury-border text-luxury-text-dim"
                       )}
                    >
                       {m}
                    </button>
                 ))}
              </div>
           </div>

           <Input
              label="Transaction Remarks"
              placeholder="e.g. Regular monthly interest installment, principal topup..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
           />

           <div className="flex gap-4 pt-4 border-t border-luxury-border-dim">
              <Button type="button" variant="outline" className="flex-1 py-4 border-luxury-border text-luxury-text-dim font-black uppercase tracking-widest" onClick={onClose}>
                 Cancel
              </Button>
              <Button type="submit" variant="gold" className="flex-1 py-4 font-black uppercase tracking-widest shadow-lg shadow-gold-500/20">
                 {mode === 'Topup' ? 'Record Borrowing' : 'Submit Repayment'}
              </Button>
           </div>

        </form>
      </div>
    </Modal>
  );
};
