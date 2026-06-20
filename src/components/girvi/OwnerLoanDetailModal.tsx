import { useMemo } from 'react';
import { 
  Phone, 
  FileText, 
  Gem,
  Package
} from 'lucide-react';
import { formatCurrency, calculateDailyInterest } from '../../utils/calculations';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button, cn } from '../ui/Button';
import type { OwnerLoan } from '../../types';

interface OwnerLoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: OwnerLoan | null;
}

export const OwnerLoanDetailModal = ({ isOpen, onClose, loan }: OwnerLoanDetailModalProps) => {
  // 1. Calculate historical payments
  const paymentsSummary = useMemo(() => {
    if (!loan) return { interestPaid: 0, principalPaid: 0, topUpsAmount: 0 };
    const pHistory = loan.payments || [];
    const interestPaid = pHistory.filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
    const principalPaid = pHistory.filter(p => p.type === 'Principal').reduce((sum, p) => sum + p.amount, 0);
    const topUpsAmount = pHistory.filter(p => p.type === 'Top-up').reduce((sum, p) => sum + p.amount, 0);
    return { interestPaid, principalPaid, topUpsAmount };
  }, [loan]);

  // 2. Accrued interest
  const accruedInterest = useMemo(() => {
    if (!loan) return 0;
    return calculateDailyInterest(
      loan.loanAmount,
      loan.interestRate,
      loan.loanDate,
      loan.isCompoundInterest,
      paymentsSummary.interestPaid
    );
  }, [loan, paymentsSummary.interestPaid]);

  const remainingPrincipal = useMemo(() => {
    if (!loan) return 0;
    return Math.max(0, loan.loanAmount - paymentsSummary.principalPaid);
  }, [loan, paymentsSummary.principalPaid]);

  const timelineEvents = useMemo(() => {
    if (!loan) return [];
    const events: Array<{
      date: string;
      label: string;
      details: string;
      amount?: number;
      type: 'inflow' | 'outflow' | 'info';
    }> = [];

    // Add disbursement
    events.push({
      date: loan.loanDate,
      label: 'Loan Disbursed',
      details: `Received principal amount of ${formatCurrency(loan.loanAmount - paymentsSummary.topUpsAmount)} via ${loan.payoutMethod || 'Cash'}`,
      amount: loan.loanAmount - paymentsSummary.topUpsAmount,
      type: 'inflow'
    });

    // Add payments
    if (loan.payments) {
      loan.payments.forEach(p => {
        if (p.type === 'Top-up') {
          events.push({
            date: p.date,
            label: 'Principal Top-up Borrowed',
            details: p.note ? `Additional borrow: ${p.note}` : 'Borrowed extra principal from lender',
            amount: p.amount,
            type: 'inflow'
          });
        } else {
          events.push({
            date: p.date,
            label: `Repayment: ${p.type}`,
            details: `Repaid via ${p.method || 'Cash'}${p.note ? ` - Note: ${p.note}` : ''}`,
            amount: p.amount,
            type: 'outflow'
          });
        }
      });
    }

    // Sort chronologically descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loan, paymentsSummary.topUpsAmount]);

  if (!loan) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Owner Loan Profile: ${loan.loanNumber}`} size="lg">
      <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 scrollbar-gold bg-luxury-charcoal p-2 rounded-2xl">
        
        {/* Status card banner */}
        <div className="flex justify-between items-center p-6 bg-luxury-black/60 border border-luxury-border-dim rounded-3xl">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center text-gold-400 font-serif font-bold text-lg">
                 L
              </div>
              <div>
                 <h2 className="text-xl font-serif font-black text-luxury-text uppercase tracking-tight leading-none mb-1">{loan.lenderName}</h2>
                 <p className="text-xs text-luxury-text-dim/80 font-bold flex items-center gap-1">
                    <Phone size={12} /> {loan.lenderPhone || 'No Phone Registered'}
                 </p>
              </div>
           </div>
           
           <div className="flex flex-col items-end gap-1.5">
              <Badge 
                 variant={loan.status === 'Active' ? 'warning' : 'success'} 
                 className="text-[10px] uppercase font-black tracking-widest px-3.5 py-1"
              >
                 {loan.status}
              </Badge>
              <span className="text-xs uppercase font-black tracking-wider text-luxury-text-dim">
                 Lent since {new Date(loan.loanDate).toLocaleDateString()}
              </span>
           </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4">
           {[
             { label: 'Current Principal', value: formatCurrency(loan.loanAmount), sub: 'Total principal borrowed', color: 'text-luxury-text' },
             { label: 'Daily Accrued Interest', value: formatCurrency(accruedInterest), sub: `Interest rate: ${loan.interestRate}%/M`, color: 'text-red-400' },
             { label: 'Outstanding Balance', value: formatCurrency(remainingPrincipal + accruedInterest), sub: 'Principal + Accrued Int', color: 'text-gold-400' },
             { label: 'Total Repaid', value: formatCurrency(paymentsSummary.principalPaid + paymentsSummary.interestPaid), sub: `${formatCurrency(paymentsSummary.principalPaid)} Principal • ${formatCurrency(paymentsSummary.interestPaid)} Interest`, color: 'text-green-500' }
           ].map((stat, idx) => (
              <div key={idx} className="bg-luxury-surface border border-luxury-border-dim p-5 rounded-2xl flex flex-col justify-between">
                 <div>
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim mb-1">{stat.label}</h4>
                    <p className={`text-lg font-mono font-black ${stat.color}`}>{stat.value}</p>
                 </div>
                 <p className="text-[10px] font-bold text-luxury-text-dim mt-2 leading-tight">{stat.sub}</p>
              </div>
           ))}
        </div>

        {/* Collateral Ornaments List */}
        <div className="space-y-3">
           <div className="flex justify-between items-center">
              <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Pledged Collateral Ornaments</h4>
              <span className="text-xs font-black uppercase text-gold-400">{loan.totalWeight.toFixed(3)}g Total</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loan.items && loan.items.map((item, idx) => (
                 <div key={item.id || idx} className="bg-luxury-surface border border-luxury-border-dim p-4 rounded-xl flex flex-col justify-between gap-3 relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-sm font-bold text-luxury-text uppercase">{item.description}</p>
                          <p className="text-[10px] uppercase font-bold text-luxury-text-dim tracking-wider mt-1">Purity: {item.purity} • Cat: {item.category || 'Other'}</p>
                       </div>
                       <span className="text-sm font-mono font-black text-gold-400">{item.weight.toFixed(3)}g</span>
                    </div>

                    {/* Source badges */}
                    {item.sourceType === 'inventory' && (
                      <div className="pt-2 border-t border-luxury-border-dim/40 flex items-center gap-1.5 text-[10px] uppercase font-black text-green-400">
                         <Package size={10} />
                         <span>Sourced from Inventory ({item.productSku})</span>
                      </div>
                    )}

                    {item.sourceType === 'customer_girvi' && (
                      <div className="pt-2 border-t border-luxury-border-dim/40 flex items-center gap-1.5 text-[10px] uppercase font-black text-yellow-500">
                         <Gem size={10} />
                         <span>Vault: {item.customerName} ({item.customerGirviNumber})</span>
                      </div>
                    )}

                    {item.sourceType === 'manual' && (
                      <div className="pt-2 border-t border-luxury-border-dim/40 flex items-center gap-1.5 text-[10px] uppercase font-black text-luxury-text-dim/60">
                         <FileText size={10} />
                         <span>Custom Registered Collateral</span>
                      </div>
                    )}
                 </div>
              ))}
              {(!loan.items || loan.items.length === 0) && (
                 <div className="col-span-2 text-center py-6 bg-luxury-surface border border-dashed border-luxury-border-dim rounded-2xl text-xs uppercase font-black text-luxury-text-dim">
                    No collateral items pledged for this loan
                 </div>
              )}
           </div>
        </div>

        {/* Repayment Timeline & Scanned Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Repayment timeline */}
           <div className="space-y-4">
              <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Transaction Timeline Ledger</h4>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-gold border border-luxury-border-dim/40 p-4 rounded-2xl bg-luxury-black/30">
                 {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="flex gap-4 items-start relative border-l-2 border-luxury-border-dim/40 pb-4 last:pb-0 pl-4 ml-2">
                       <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-luxury-charcoal border-2 border-luxury-border flex items-center justify-center">
                          <div className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             evt.type === 'inflow' ? 'bg-green-500' : evt.type === 'outflow' ? 'bg-red-500' : 'bg-gold-400'
                          )} />
                       </div>
                       
                       <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                             <p className="text-xs font-bold text-luxury-text leading-none">{evt.label}</p>
                             <span className="text-[10px] font-mono text-luxury-text-dim">{new Date(evt.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-luxury-text-dim leading-snug">{evt.details}</p>
                          {evt.amount && (
                            <p className={cn(
                               "text-xs font-mono font-black mt-1",
                               evt.type === 'inflow' ? 'text-green-500' : 'text-red-500'
                            )}>
                               {evt.type === 'inflow' ? '+' : '-'}{formatCurrency(evt.amount)}
                            </p>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Attachments */}
           <div className="space-y-4">
              <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Borrowing Documentation</h4>
              
              <div className="border border-luxury-border-dim/40 p-4 rounded-2xl bg-luxury-black/30 max-h-[300px] overflow-y-auto scrollbar-gold flex flex-wrap gap-4">
                 {loan.images && loan.images.map((base64, index) => (
                    <div key={index} className="w-20 h-20 bg-luxury-surface border border-luxury-border-dim rounded-xl overflow-hidden shadow-lg relative group">
                       {base64.startsWith('data:image') ? (
                          <img src={base64} alt={`Attachment ${index}`} className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-luxury-text-dim">
                             <FileText size={20} className="mb-1" />
                             <span className="text-[10px] font-black uppercase">PDF</span>
                          </div>
                        )}
                        <a 
                          href={base64} 
                          download={`Agreement-${loan.loanNumber}-${index}`}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase text-gold-400 tracking-wider"
                        >
                           Download
                        </a>
                    </div>
                 ))}
                 {(!loan.images || loan.images.length === 0) && (
                    <div className="w-full text-center py-12 text-luxury-text-dim text-xs uppercase font-black italic">
                       No scanned contracts or docs uploaded
                    </div>
                 )}
              </div>
           </div>

        </div>

        {/* Office Notes section */}
        {loan.notes && (
           <div className="p-4 bg-gold-400/5 border border-gold-400/10 rounded-2xl mt-4">
              <p className="text-[10px] uppercase font-black text-gold-400/80 tracking-widest mb-1">Office Remarks / Notes</p>
              <p className="text-xs text-luxury-text-muted italic leading-relaxed">"{loan.notes}"</p>
           </div>
        )}

        <div className="flex gap-4 pt-4 border-t border-luxury-border mt-6">
          <Button type="button" variant="outline" className="w-full h-12 border-luxury-border uppercase font-black tracking-widest text-xs" onClick={onClose}>
            Close Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
};
