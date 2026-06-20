import { Activity, Paperclip, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/Button';
import { formatCurrency, calculateGirviInterest } from '../../utils/calculations';
import type { Girvi } from '../../types';

interface GirviDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  girvi: Girvi | null;
}

export const GirviDetailModal = ({ isOpen, onClose, girvi }: GirviDetailModalProps) => {
  if (!girvi) return null;

  const interestPaid = (girvi.payments || []).filter(p => p.type === 'Interest').reduce((sum, p) => sum + p.amount, 0);
  const principalPaid = (girvi.payments || [])
    .filter(p => p.type === 'Principal' || p.type === 'Settlement')
    .reduce((sum, p) => sum + p.amount, 0);

  const interestDue = girvi.status === 'Closed' ? 0 : calculateGirviInterest(
    girvi.loanAmount,
    girvi.interestRate,
    girvi.loanDate,
    girvi.isCompoundInterest,
    interestPaid
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Girvi Asset: ${girvi.customerName} (${girvi.girviNumber || 'Legacy'})`} size="xl">
      <div className="space-y-12 max-h-[85vh] overflow-y-auto pr-2 scrollbar-gold">
        <div className={cn(
          'flex items-center justify-between p-6 rounded-3xl border',
          girvi.status === 'Active' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
            girvi.status === 'Closed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
        )}>
          <div className="flex items-center gap-4">
            <Activity size={32} />
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest leading-none mb-1">Asset Status</h3>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Last updated on {new Date(girvi.updatedAt).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-2xl font-serif font-black">{girvi.status}</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 bg-luxury-black p-8 rounded-3xl border border-luxury-border space-y-6">
            <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Collateral Inventory</h4>
            <div className="overflow-hidden bg-luxury-surface rounded-2xl border border-luxury-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-luxury-border-dim bg-luxury-surface">
                    <th className="p-4 text-xs uppercase font-black text-luxury-text-dim">Description</th>
                    <th className="p-4 text-xs uppercase font-black text-luxury-text-dim">Weight</th>
                    <th className="p-4 text-xs uppercase font-black text-luxury-text-dim text-right">Purity</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(girvi.items) ? girvi.items.map((item) => (
                    <tr key={item.id} className="border-b border-luxury-border-dim last:border-0 hover:bg-luxury-surface/50 transition-colors">
                      <td className="p-4 text-xs font-bold text-luxury-text">{item.description}</td>
                      <td className="p-4 text-xs font-medium text-luxury-text">{item.weight}g</td>
                      <td className="p-4 text-xs font-black text-gold-400 text-right">{item.purity}</td>
                    </tr>
                  )) : (
                    <tr className="border-b border-luxury-border-dim last:border-0">
                      <td className="p-4 text-xs font-bold text-luxury-text">{typeof girvi.items === 'string' ? girvi.items : 'Unknown'}</td>
                      <td className="p-4 text-xs font-medium text-luxury-text">{(girvi as any).weight || 0}g</td>
                      <td className="p-4 text-xs font-black text-gold-400 text-right">{(girvi as any).purity || 'N/A'}</td>
                    </tr>
                  )}
                  <tr className="bg-gold-400/5">
                    <td className="p-4 text-xs uppercase font-black text-gold-400">Total Calculation</td>
                    <td className="p-4 text-xs font-black text-gold-400" colSpan={2}>
                      {(girvi.totalWeight || (girvi as any).weight || 0).toFixed(3)}g Total Weight
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {girvi.enableLiveValuation && (
              <div className="p-4 bg-gold-400/5 border border-gold-400/10 rounded-2xl text-center">
                <p className="text-[10px] uppercase font-black text-gold-400/80 mb-1 tracking-[0.2em]">Market Valuation Active</p>
                <p className="text-xs text-luxury-text-muted italic">Value tracks current gold portal rates</p>
              </div>
            )}
          </div>

          <div className="bg-luxury-black p-8 rounded-3xl border border-luxury-border space-y-6">
            <h4 className="text-xs uppercase font-black tracking-widest text-gold-400">Loan Ledger</h4>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-xs text-luxury-text-muted uppercase font-bold tracking-tighter">Principal</span>
                <span className="text-sm font-black text-luxury-text font-mono">{formatCurrency(girvi.loanAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-luxury-text-muted uppercase font-bold tracking-tighter">Int. Rate</span>
                <span className="text-xs font-bold text-luxury-text">{girvi.interestRate}% / m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-luxury-text-muted uppercase font-bold tracking-tighter">Formula</span>
                <Badge variant="outline" className="text-[10px] uppercase font-black">{girvi.isCompoundInterest ? 'Compound' : 'Simple'}</Badge>
              </div>

              <div className="pt-6 border-t border-luxury-border-dim space-y-6">
                <div>
                  <p className="text-[10px] uppercase font-black text-red-400/60 mb-1 tracking-widest">Est. Interest Due</p>
                  <p className="text-xl font-mono font-black text-red-400">{formatCurrency(Math.max(0, interestDue))}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-green-400/60 mb-1 tracking-widest">Principal Repaid</p>
                  <p className="text-xl font-mono font-black text-green-400">{formatCurrency(principalPaid)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pb-6">
          <h4 className="text-xs uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Transaction History</h4>
          <div className="bg-luxury-black rounded-3xl border border-luxury-border overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-border-dim bg-luxury-surface">
                  <th className="p-6 text-xs uppercase font-black text-luxury-text-dim">Date</th>
                  <th className="p-6 text-xs uppercase font-black text-luxury-text-dim">Allocation</th>
                  <th className="p-6 text-xs uppercase font-black text-luxury-text-dim text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(girvi.payments || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-xs text-luxury-text-muted italic">No transactions detected.</td>
                  </tr>
                ) : (
                  girvi.payments.map((p) => (
                    <tr key={p.id} className="border-b border-luxury-border-dim hover:bg-luxury-surface/50 transition-colors">
                      <td className="p-6 text-xs text-luxury-text font-bold">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="p-6">
                        <Badge variant={p.type === 'Principal' || p.type === 'Settlement' ? 'success' : 'warning'} className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5">
                          {p.type}
                        </Badge>
                      </td>
                      <td className="p-6 text-xs font-mono text-luxury-text text-right font-black">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {girvi.images && girvi.images.length > 0 && (
          <div className="space-y-6 pb-12">
            <h4 className="text-xs uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Asset Documentation</h4>
            <div className="grid grid-cols-4 gap-6">
               {girvi.images.map((base64, index) => (
                  <div 
                    key={index} 
                    className="relative group cursor-pointer"
                    onClick={() => {
                      const win = window.open();
                      win?.document.write(`<img src="${base64}" style="max-width: 100%; height: auto;"/>`);
                    }}
                  >
                    <div className="aspect-square bg-luxury-black border border-luxury-border rounded-2xl overflow-hidden shadow-lg group-hover:border-gold-400/40 transition-all">
                      {base64.startsWith('data:image') ? (
                        <img src={base64} alt={`Attachment ${index}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-luxury-text-dim">
                          <Paperclip size={32} className="mb-2" />
                          <span className="text-xs font-black uppercase">Document Asset</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gold-400/0 group-hover:bg-gold-400/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink size={24} className="text-gold-400" />
                      </div>
                    </div>
                  </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
