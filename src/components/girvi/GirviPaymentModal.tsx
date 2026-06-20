import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Receipt,
  Plus,
  Scale
} from 'lucide-react';
import { useGirviStore } from '../../store/girviStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useOldGoldPurchaseStore } from '../../store/oldGoldPurchaseStore';
import { v4 as uuidv4 } from 'uuid';
import { Button, cn } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { calculateGirviInterest, formatCurrency } from '../../utils/calculations';
import type { Girvi, GirviPayment, OldGoldItem, OldGoldPurchase } from '../../types';
import toast from 'react-hot-toast';

interface GirviPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  girvi: Girvi;
}

export const GirviPaymentModal = ({ isOpen, onClose, girvi }: GirviPaymentModalProps) => {
  const { updateGirvi } = useGirviStore();
  const { settings } = useSettingsStore();
  const [mode, setMode] = useState<'Repay' | 'Topup' | 'Settle' | 'Settlement'>('Repay');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [displayInterestAmount, setDisplayInterestAmount] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [displayPrincipalAmount, setDisplayPrincipalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'UPI' | 'Card'>('Cash');

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

  const principalPaid = (girvi.payments || [])
    .filter(p => p.type === 'Principal')
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingPrincipal = girvi.loanAmount - principalPaid;

  const interestPaid = (girvi.payments || [])
    .filter(p => p.type === 'Interest')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalInterestDue = calculateGirviInterest(
    girvi.loanAmount,
    girvi.interestRate,
    girvi.loanDate,
    girvi.isCompoundInterest,
    interestPaid
  );

  const calculateItemValue = (weight: number, purity: string) => {
    const baseRate = settings.metalRates?.['Gold'] || 0; // Default Gold rate for Girvi
    let purityModifier = 1;
    switch (purity) {
      case '22K': purityModifier = 22 / 24; break;
      case '21K': purityModifier = 21 / 24; break;
      case '20K': purityModifier = 20 / 24; break;
      case '18K': purityModifier = 18 / 24; break;
      case '14K': purityModifier = 14 / 24; break;
      case '9K': purityModifier = 9 / 24; break;
      case '24K':
      default: purityModifier = 1; break;
    }
    return weight * baseRate * purityModifier;
  };

  const itemValuations = useMemo(() => {
    if (!girvi || !Array.isArray(girvi.items)) return [];
    return girvi.items.map(item => ({
      ...item,
      value: calculateItemValue(item.weight, item.purity)
    }));
  }, [girvi, settings.metalRates]);

  const totalCollateralValuation = useMemo(() => {
    return itemValuations.reduce((sum, item) => sum + item.value, 0);
  }, [itemValuations]);

  const netSettlementBalance = useMemo(() => {
    const totalDues = totalInterestDue + remainingPrincipal;
    return totalCollateralValuation - totalDues;
  }, [totalCollateralValuation, totalInterestDue, remainingPrincipal]);

  useEffect(() => {
    if (mode === 'Settle') {
      const defaultSettle = Math.abs(netSettlementBalance);
      setAmount(defaultSettle.toString());
      setDisplayAmount(new Intl.NumberFormat('en-IN').format(defaultSettle));
    } else if (mode === 'Settlement') {
      const defaultSettlement = totalInterestDue + remainingPrincipal;
      setAmount(defaultSettlement.toString());
      setDisplayAmount(new Intl.NumberFormat('en-IN').format(defaultSettlement));
    } else {
      setAmount('');
      setDisplayAmount('');
    }
    setInterestAmount('');
    setDisplayInterestAmount('');
    setPrincipalAmount('');
    setDisplayPrincipalAmount('');
  }, [mode, netSettlementBalance, totalInterestDue, remainingPrincipal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const paymentDate = new Date(date);
    paymentDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    if (mode === 'Repay') {
      const numericInterest = parseFloat(interestAmount) || 0;
      const numericPrincipal = parseFloat(principalAmount) || 0;

      if (numericInterest <= 0 && numericPrincipal <= 0) {
        toast.error('Please enter an amount for interest or principal');
        return;
      }

      if (numericInterest > totalInterestDue) {
        toast.error(`Interest payment exceeds outstanding interest (${formatCurrency(totalInterestDue)})`);
        return;
      }

      if (numericPrincipal > remainingPrincipal) {
        toast.error(`Principal payment exceeds outstanding principal (${formatCurrency(remainingPrincipal)})`);
        return;
      }

      const paymentsToAdd: GirviPayment[] = [];
      if (numericInterest > 0) {
        paymentsToAdd.push({
          id: uuidv4(),
          amount: numericInterest,
          date: paymentDate.toISOString(),
          type: 'Interest',
          note: note ? `${note} (Interest Collection)` : 'Interest Collection',
          method: paymentMethod,
        });
      }

      if (numericPrincipal > 0) {
        paymentsToAdd.push({
          id: uuidv4(),
          amount: numericPrincipal,
          date: paymentDate.toISOString(),
          type: 'Principal',
          note: note ? `${note} (Principal Collection)` : 'Principal Collection',
          method: paymentMethod,
        });
      }

      const updatedPayments = [...(girvi.payments || []), ...paymentsToAdd];
      const isClosed = (principalPaid + numericPrincipal) >= girvi.loanAmount && (interestPaid + numericInterest) >= totalInterestDue;

      try {
        await updateGirvi(girvi.id, {
          payments: updatedPayments,
          status: isClosed ? 'Closed' : girvi.status,
          updatedAt: new Date().toISOString()
        });

        if (isClosed) {
          toast.success('Pawn loan fully repaid and closed!');
        } else {
          toast.success('Repayment recorded successfully');
        }

        setInterestAmount('');
        setDisplayInterestAmount('');
        setPrincipalAmount('');
        setDisplayPrincipalAmount('');
        setNote('');
        onClose();
      } catch (err) {
        console.error(err);
        toast.error('Failed to record repayment');
      }
      return;
    }

    const numericAmount = parseFloat(amount);

    if (!amount || isNaN(numericAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (mode !== 'Settle' && numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (mode === 'Settle') {
      const paymentsToAdd: GirviPayment[] = [];

      // Record interest payoff
      if (totalInterestDue > 0) {
        paymentsToAdd.push({
          id: uuidv4(),
          amount: totalInterestDue,
          date: paymentDate.toISOString(),
          type: 'Interest',
          note: note ? `${note} (Settlement Interest clearing)` : 'Settlement Interest clearing',
          method: paymentMethod,
        });
      }

      // Record principal payoff
      if (remainingPrincipal > 0) {
        paymentsToAdd.push({
          id: uuidv4(),
          amount: remainingPrincipal,
          date: paymentDate.toISOString(),
          type: 'Principal',
          note: note ? `${note} (Settlement Principal clearing)` : 'Settlement Principal clearing',
          method: paymentMethod,
        });
      }

      // Record surplus disburse as cash outflow or deficit payment as cash inflow
      const finalPayoutAmount = !isNaN(numericAmount) ? numericAmount : Math.abs(netSettlementBalance);
      if (finalPayoutAmount > 0) {
        paymentsToAdd.push({
          id: uuidv4(),
          amount: netSettlementBalance >= 0 ? -finalPayoutAmount : finalPayoutAmount,
          date: paymentDate.toISOString(),
          type: 'Principal',
          note: note ? note : (netSettlementBalance >= 0 ? 'Settlement Surplus Payout to Customer' : 'Settlement Deficit Payment from Customer'),
          method: paymentMethod,
        });
      }

      const updatedPayments = [...(girvi.payments || []), ...paymentsToAdd];

      // Move items to Old Gold Purchases
      const oldGoldItems: OldGoldItem[] = itemValuations.map(item => {
        const rate = settings.metalRates?.['Gold'] || 0;
        let purityModifier = 1;
        switch (item.purity) {
          case '22K': purityModifier = 22 / 24; break;
          case '21K': purityModifier = 21 / 24; break;
          case '20K': purityModifier = 20 / 24; break;
          case '18K': purityModifier = 18 / 24; break;
          case '14K': purityModifier = 14 / 24; break;
          case '9K': purityModifier = 9 / 24; break;
          case '24K':
          default: purityModifier = 1; break;
        }

        return {
          id: uuidv4(),
          description: `Collateral: ${item.description} (Girvi #${girvi.girviNumber || 'Legacy'})`,
          metalType: 'Gold',
          purity: item.purity,
          grossWeight: item.weight,
          netWeight: item.weight,
          melting: purityModifier * 100,
          fineWeight: item.weight * purityModifier,
          rate: rate,
          value: item.value,
        };
      });

      const oldGoldPurchase: OldGoldPurchase = {
        id: uuidv4(),
        purchaseNumber: `OG-G-${Date.now().toString().slice(-6)}`,
        customerId: girvi.customerId || null,
        customerName: girvi.customerName,
        customerPhone: girvi.customerPhone,
        kycType: 'Aadhaar',
        kycNumber: 'N/A',
        items: oldGoldItems,
        subtotal: totalCollateralValuation,
        payoutAmount: finalPayoutAmount,
        paymentMethod: (paymentMethod === 'Card' ? 'Cash' : paymentMethod) as any,
        goldRate: settings.metalRates?.['Gold'] || 0,
        silverRate: settings.metalRates?.['Silver'] || 0,
        platinumRate: settings.metalRates?.['Platinum'] || 0,
        declarationSigned: true,
        notes: note ? `${note} (Pawn Loan #${girvi.girviNumber || 'Legacy'} Settlement)` : `Auto-generated from pawn loan #${girvi.girviNumber || 'Legacy'} settlement`,
        createdAt: paymentDate.toISOString(),
        createdBy: girvi.createdBy || 'Admin',
        status: 'Purchased'
      };

      try {
        await updateGirvi(girvi.id, {
          payments: updatedPayments,
          status: 'Closed',
          updatedAt: new Date().toISOString()
        });

        // Save Old Gold Purchase
        await useOldGoldPurchaseStore.getState().addPurchase(oldGoldPurchase);

        toast.success('Pawn loan settled via collateral sale & closed successfully!');
        setAmount('');
        setDisplayAmount('');
        setNote('');
        onClose();
      } catch (err) {
        console.error(err);
        toast.error('Failed to settle loan');
      }
    } else if (mode === 'Settlement') {
      const newPayment: GirviPayment = {
        id: uuidv4(),
        amount: numericAmount,
        type: 'Settlement',
        note: note ? note : 'Final settlement to close account',
        method: paymentMethod,
        date: paymentDate.toISOString()
      };

      const updatedPayments = [...(girvi.payments || []), newPayment];

      try {
        await updateGirvi(girvi.id, {
          payments: updatedPayments,
          status: 'Closed',
          updatedAt: new Date().toISOString()
        });

        toast.success('Pawn loan settled and closed successfully!');
        setAmount('');
        setDisplayAmount('');
        setNote('');
        onClose();
      } catch (err) {
        console.error(err);
        toast.error('Failed to settle loan');
      }
    } else {
      // mode === 'Topup'
      const newPayment: GirviPayment = {
        id: uuidv4(),
        amount: -numericAmount, // Stored as negative for Daybook cash outflow
        type: 'Top-up',
        note: note ? `${note} (Principal Addition)` : 'Principal top-up',
        method: paymentMethod,
        date: paymentDate.toISOString()
      };

      const updatedPayments = [...(girvi.payments || []), newPayment];
      const newLoanAmount = girvi.loanAmount + numericAmount;

      try {
        await updateGirvi(girvi.id, {
          loanAmount: newLoanAmount,
          payments: updatedPayments,
          updatedAt: new Date().toISOString()
        });

        toast.success('Top-up amount added successfully');
        setAmount('');
        setDisplayAmount('');
        setNote('');
        onClose();
      } catch (err) {
        console.error(err);
        toast.error('Failed to add top-up');
      }
    }
  };

  const loanDate = new Date(girvi.loanDate);
  const now = new Date();
  const monthsElapsed = Math.max(0, (now.getFullYear() - loanDate.getFullYear()) * 12 + (now.getMonth() - loanDate.getMonth()));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Transaction: ${girvi.customerName} (${girvi.girviNumber || 'Legacy'})`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
        {/* Mode Selector */}
        <div className="flex bg-luxury-black/20 p-1.5 rounded-xl border border-luxury-border-dim">
          {[
            { id: 'Repay', icon: Receipt, label: 'Repay Dues' },
            { id: 'Topup', icon: Plus, label: 'Top-up' },
            { id: 'Settlement', icon: CheckCircle2, label: 'Settlement & Close' },
            { id: 'Settle', icon: Scale, label: 'Settle via Sale' }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id as any);
                setAmount('');
                setDisplayAmount('');
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 py-3 rounded-lg transition-all',
                mode === m.id ? 'bg-gold-400 text-luxury-black shadow-lg font-black' : 'text-luxury-text-muted hover:bg-luxury-surface'
              )}
            >
              <m.icon size={18} />
              <span className="text-[10px] uppercase font-black tracking-widest">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Loan Summary */}
          {mode === 'Topup' ? (
            <div className="p-5 bg-gold-400/5 border border-gold-400/10 rounded-2xl space-y-6">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-gold-400 mb-4">Top-Up Summary</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-luxury-surface/50 rounded-xl border border-luxury-border-dim">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-black text-luxury-text-muted">Current Principal</span>
                      <span className="text-xs text-luxury-text-dim mt-0.5">Original Loan Amount</span>
                    </div>
                    <span className="text-base font-serif font-black text-luxury-text">{formatCurrency(girvi.loanAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-luxury-surface/50 rounded-xl border border-luxury-border-dim">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-black text-luxury-text-muted">Top-Up Amount</span>
                      <span className="text-xs text-luxury-text-dim mt-0.5">Additional cash to disburse</span>
                    </div>
                    <span className="text-base font-serif font-black text-red-400">+{amount ? formatCurrency(parseFloat(amount)) : 'Rs. 0'}</span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gold-400/10 rounded-xl border border-gold-400/20">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-black text-gold-400">New Loan Principal</span>
                      <span className="text-[9px] uppercase font-black text-luxury-text-dim mt-0.5">Total principal after top-up</span>
                    </div>
                    <span className="text-xl font-serif font-black text-gold-400">
                      {formatCurrency(girvi.loanAmount + (parseFloat(amount) || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : mode === 'Settle' ? (
            <div className="p-5 bg-gold-400/5 border border-gold-400/10 rounded-2xl space-y-6">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-gold-400 mb-4">Collateral Valuation & Settlement</p>
                
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-gold">
                  {itemValuations.map((item, idx) => (
                     <div key={item.id || idx} className="flex justify-between items-center p-2.5 bg-luxury-surface/50 rounded-xl border border-luxury-border-dim text-[11px]">
                      <div className="flex flex-col">
                        <span className="font-bold text-luxury-text uppercase">{item.description}</span>
                        <span className="text-[9px] text-luxury-text-muted font-black">{item.weight.toFixed(3)}g ({item.purity})</span>
                      </div>
                      <span className="font-mono text-luxury-text">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-luxury-border-dim mt-4">
                  <div className="flex justify-between items-center text-[10px] font-bold text-luxury-text-dim">
                    <span>Total Valuation</span>
                    <span className="text-sm font-black text-luxury-text font-mono">{formatCurrency(totalCollateralValuation)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-luxury-text-dim">
                    <span>Total Loan Dues</span>
                    <span className="text-sm font-black text-red-400 font-mono">-{formatCurrency(totalInterestDue + remainingPrincipal)}</span>
                  </div>

                  <div className={cn(
                    "flex justify-between items-center p-4 rounded-xl border",
                    netSettlementBalance >= 0 
                      ? "bg-green-500/10 border-green-500/20 text-green-400" 
                      : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-black">
                        {netSettlementBalance >= 0 ? "Shop Pays Customer" : "Customer Pays Shop"}
                      </span>
                      <span className="text-[9px] uppercase font-black opacity-60">Settlement Balance</span>
                    </div>
                    <span className="text-lg font-serif font-black">
                      {formatCurrency(Math.abs(netSettlementBalance))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-gold-400/5 border border-gold-400/10 rounded-2xl space-y-6">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-gold-400 mb-4">Dues Summary</p>
                
                <div className="space-y-4">
                  <div className={cn(
                    "flex justify-between items-center p-3 bg-luxury-surface/50 rounded-xl border transition-all duration-300",
                    (mode === 'Repay' && parseFloat(interestAmount) > 0) ? "border-gold-400 bg-gold-400/5 scale-[1.02] shadow-[0_0_15px_rgba(201,168,76,0.1)]" : "border-luxury-border-dim"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-black text-luxury-text-muted">Accrued Interest</span>
                      <span className="text-xs text-luxury-text-dim mt-0.5">{monthsElapsed} months elapsed ({girvi.interestRate}%/m)</span>
                    </div>
                    <span className="text-base font-serif font-black text-red-400">{formatCurrency(totalInterestDue)}</span>
                  </div>

                  <div className={cn(
                    "flex justify-between items-center p-3 bg-luxury-surface/50 rounded-xl border transition-all duration-300",
                    (mode === 'Repay' && parseFloat(principalAmount) > 0) ? "border-gold-400 bg-gold-400/5 scale-[1.02] shadow-[0_0_15px_rgba(201,168,76,0.1)]" : "border-luxury-border-dim"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-black text-luxury-text-muted">Outstanding Principal</span>
                      <span className="text-xs text-luxury-text-dim mt-0.5">Original: {formatCurrency(girvi.loanAmount)}</span>
                    </div>
                    <span className="text-base font-serif font-black text-gold-400">{formatCurrency(remainingPrincipal)}</span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gold-400/10 rounded-xl border border-gold-400/20">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-black text-gold-400">Total Outstanding</span>
                      <span className="text-[9px] uppercase font-black text-luxury-text-dim mt-0.5">Interest + Principal</span>
                    </div>
                    <span className="text-xl font-serif font-black text-gold-400">{formatCurrency(totalInterestDue + remainingPrincipal)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-luxury-border-dim space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-luxury-text-dim">
                  <span>Total Principal Repaid</span>
                  <span>{formatCurrency(principalPaid)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-luxury-text-dim">
                  <span>Total Interest Paid</span>
                  <span>{formatCurrency(interestPaid)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Dynamic Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mode === 'Repay' ? (
                <>
                  <Input
                    label="Interest Payment"
                    type="text"
                    value={displayInterestAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numericValue = val.replace(/[^0-9.]/g, '');
                      if (numericValue === '') {
                        setInterestAmount('');
                        setDisplayInterestAmount('');
                        return;
                      }
                      const numberValue = parseFloat(numericValue);
                      if (!isNaN(numberValue)) {
                        setInterestAmount(numericValue);
                        setDisplayInterestAmount(new Intl.NumberFormat('en-IN').format(numberValue));
                      }
                    }}
                    placeholder={new Intl.NumberFormat('en-IN').format(totalInterestDue)}
                    className="h-12"
                  />
                  <Input
                    label="Principal Payment"
                    type="text"
                    value={displayPrincipalAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numericValue = val.replace(/[^0-9.]/g, '');
                      if (numericValue === '') {
                        setPrincipalAmount('');
                        setDisplayPrincipalAmount('');
                        return;
                      }
                      const numberValue = parseFloat(numericValue);
                      if (!isNaN(numberValue)) {
                        setPrincipalAmount(numericValue);
                        setDisplayPrincipalAmount(new Intl.NumberFormat('en-IN').format(numberValue));
                      }
                    }}
                    placeholder={new Intl.NumberFormat('en-IN').format(remainingPrincipal)}
                    className="h-12"
                  />
                  <div className="col-span-1 sm:col-span-2">
                    <Input
                      label="Transaction Date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label={
                      mode === 'Topup'
                        ? 'Top-Up Amount'
                        : mode === 'Settle'
                        ? 'Settlement Payout'
                        : 'Settlement Amount'
                    }
                    type="text"
                    value={displayAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={
                      mode === 'Topup'
                        ? 'Enter amount...'
                        : new Intl.NumberFormat('en-IN').format(totalInterestDue + remainingPrincipal)
                    }
                    required
                    autoFocus
                    className="h-12"
                  />
                  <Input
                    label="Transaction Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-12"
                  />
                </>
              )}
            </div>

            <div className="space-y-2 col-span-1 sm:col-span-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim">
                {mode === 'Topup' ? 'Disbursement Channel' : mode === 'Settle' ? 'Settlement Channel' : mode === 'Settlement' ? 'Settlement Channel' : 'Payment Channel'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['Cash', 'Bank', 'UPI', 'Card'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m as any)}
                    className={cn(
                      "py-2 rounded-lg border text-[10px] uppercase font-black tracking-widest transition-all",
                      paymentMethod === m ? "bg-gold-400 border-gold-400 text-luxury-black font-black" : "bg-luxury-black border-luxury-border-dim text-luxury-text-dim hover:border-gold-400/40"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Remarks / Transaction Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-24 bg-luxury-input border border-luxury-border-dim rounded-xl px-4 py-2 text-xs text-luxury-text focus:border-gold-400 outline-none resize-none placeholder:text-luxury-text-dim/30 shadow-inner"
                placeholder="Optional internal notes..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-luxury-border-dim mt-4">
          <Button type="button" variant="outline" className="flex-1 h-12 border-luxury-border text-[10px] uppercase font-black tracking-widest" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" className="flex-1 h-12 uppercase font-black tracking-widest flex items-center justify-center gap-3 text-[10px]">
            <CheckCircle2 size={16} /> {
              mode === 'Topup'
                ? 'Disburse Top-up Cash'
                : mode === 'Settle'
                ? 'Finalize Asset Sale & Settle'
                : mode === 'Settlement'
                ? 'Finalize Settlement & Close'
                : mode === 'Repay'
                ? 'Collect Dues Payment'
                : 'Finalize Repayment'
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
};
