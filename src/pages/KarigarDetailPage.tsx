import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Banknote, 
  History as HistoryIcon,
  Phone,
  MapPin,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/calculations';
import type { KarigarTransaction } from '../types';
import toast from 'react-hot-toast';

export const KarigarDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { karigars, transactions, jobOrders, giveAdvance, updateKarigar } = useKarigarStore();
  
  const karigar = karigars.find(k => k.id === id);
  const karigarTransactions = useMemo(() => {
    return transactions.filter(t => t.karigarId === id);
  }, [transactions, id]);

  const activeOrders = useMemo(() => {
    return jobOrders.filter(o => o.karigarId === id && o.status !== 'completed');
  }, [jobOrders, id]);

  const historyOrders = useMemo(() => {
    return jobOrders.filter(o => o.karigarId === id && o.status === 'completed');
  }, [jobOrders, id]);

  const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'payments'>('orders');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');

  if (!karigar) {
    return <div className="p-8 text-center text-luxury-text-dim uppercase tracking-widest font-black">Artisan Not Found</div>;
  }

  const handleGiveAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(advanceAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await giveAdvance(karigar.id, amountNum);
      toast.success('Advance given and ledger updated');
      setAdvanceAmount('');
      setIsAdvanceModalOpen(false);
    } catch (err) {
      toast.error('Failed to issue advance');
    }
  };

  const handleToggleActiveStatus = async () => {
    try {
      const newStatus = karigar.isActive !== false ? false : true;
      await updateKarigar(karigar.id, { isActive: newStatus });
      toast.success(`Artisan marked as ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadgeVariant = (status: string, rejectFlag?: boolean) => {
    if (rejectFlag) return 'error';
    switch (status) {
      case 'draft': return 'outline';
      case 'metalIssued': return 'warning';
      case 'wip': return 'info';
      case 'returned': return 'warning';
      case 'qc': return 'gold';
      case 'valued': return 'gold';
      case 'completed': return 'success';
      default: return 'info';
    }
  };

  const getStatusLabel = (status: string, rejectFlag?: boolean) => {
    if (rejectFlag) return 'REJECTED';
    switch (status) {
      case 'draft': return 'DRAFT';
      case 'metalIssued': return 'METAL ISSUED';
      case 'wip': return 'WIP';
      case 'returned': return 'RETURNED';
      case 'qc': return 'QC PASS';
      case 'valued': return 'VALUED';
      case 'completed': return 'COMPLETED';
      default: return status.toUpperCase();
    }
  };

  // Columns for Order Row
  const orderColumns = [
    {
      header: 'Order ID',
      accessor: (row: any) => (
        <span className="font-mono text-xs font-bold text-luxury-text">
          #{row.id.slice(-8).toUpperCase()}
        </span>
      )
    },
    {
      header: 'Item Category',
      accessor: (row: any) => (
        <div>
          <p className="font-bold text-luxury-text text-xs">{row.itemType} x {row.quantity}</p>
          <p className="text-[10px] text-luxury-text-muted italic max-w-xs truncate">{row.description || 'No description'}</p>
        </div>
      )
    },
    {
      header: 'Metal Source',
      accessor: (row: any) => (
        <Badge variant={row.metalSource === 'shop' ? 'gold' : 'outline'} className="text-[10px]">
          {row.metalSource === 'shop' ? 'Shop Metal' : 'Own Metal'}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: (row: any) => (
        <Badge variant={getStatusBadgeVariant(row.status, row.rejectFlag)} className="text-[10px]">
          {getStatusLabel(row.status, row.rejectFlag)}
        </Badge>
      )
    },
    {
      header: 'Due Date',
      accessor: (row: any) => {
        const isOverdue = new Date(row.dueDate).getTime() < Date.now() && row.status !== 'completed';
        return (
          <span className={isOverdue ? 'text-red-400 font-bold text-xs' : 'text-luxury-text-muted text-xs'}>
            {new Date(row.dueDate).toLocaleDateString()}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (row: any) => {
        if (row.rejectFlag) return <span className="text-red-400/60 text-[10px] uppercase font-black tracking-widest">Cancelled</span>;
        if (row.status === 'completed') return <span className="text-luxury-text-muted text-[10px] uppercase font-bold tracking-widest">Done</span>;

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (row.status === 'draft') {
                if (row.metalSource === 'shop') {
                  navigate(`/order/${row.id}/issue-metal`);
                } else {
                  // Type B start work
                  useKarigarStore.getState().updateJobOrder(row.id, { status: 'wip' })
                    .then(() => toast.success('Order started'))
                    .catch(() => toast.error('Error starting order'));
                }
              } else if (row.status === 'metalIssued' || row.status === 'wip') {
                navigate(`/order/${row.id}/return`);
              } else if (row.status === 'returned') {
                navigate(`/order/${row.id}/qc`);
              } else if (row.status === 'qc') {
                navigate(`/order/${row.id}/valuation`);
              } else if (row.status === 'valued') {
                navigate(`/order/${row.id}/payment`);
              }
            }}
            className="h-8 border-gold-400/20 text-gold-400 text-[9px] font-black uppercase tracking-widest hover:bg-gold-400 hover:text-luxury-black"
          >
            Next Step
          </Button>
        );
      }
    }
  ];

  // Columns for Ledger Transactions
  const ledgerColumns = [
    {
      header: 'Date & Type',
      accessor: (row: KarigarTransaction) => (
        <div>
          <p className="text-[10px] text-luxury-text-muted uppercase tracking-widest font-bold">{new Date(row.date).toLocaleDateString()}</p>
          <Badge variant={row.type === 'ISSUE' ? 'error' : row.type === 'RECEIVE' ? 'success' : 'info'} className="text-[9px] mt-0.5">
            {row.type}
          </Badge>
        </div>
      )
    },
    {
      header: 'Remarks',
      accessor: (row: KarigarTransaction) => (
        <p className="text-xs text-luxury-text font-medium italic">{row.description}</p>
      )
    },
    {
      header: 'Details',
      accessor: (row: KarigarTransaction) => (
        row.grossWeight ? (
          <div className="text-xs">
            <span className="text-luxury-text font-bold">{row.grossWeight.toFixed(3)}g</span>
            <span className="text-luxury-text-muted text-[10px] ml-1">({row.purity})</span>
          </div>
        ) : '-'
      )
    },
    {
      header: 'Ledger Impact',
      accessor: (row: KarigarTransaction) => (
        <div className="text-right">
          {row.fineWeight ? (
            <p className={`text-xs font-bold ${row.type === 'ISSUE' ? 'text-red-400' : 'text-green-400'}`}>
              {row.type === 'ISSUE' ? '+' : '-'}{row.fineWeight.toFixed(3)}g Fine
            </p>
          ) : null}
          {row.amount ? (
            <p className="text-xs font-bold text-red-400">
              {formatCurrency(row.amount)} Paid
            </p>
          ) : null}
        </div>
      )
    }
  ];

  const initials = karigar.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-8 space-y-8 animate-fade-in pb-16">
      
      {/* Navigation */}
      <div className="flex items-center justify-between border-b border-luxury-border-dim pb-6">
        <button 
          onClick={() => navigate('/karigars')} 
          className="flex items-center gap-2 text-luxury-text-muted hover:text-gold-400 transition-colors uppercase tracking-[0.2em] text-[10px] font-black"
        >
          <ArrowLeft size={16} /> Back to Artisans
        </button>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/karigar/edit/${karigar.id}`)}
            className="h-11 px-6 border-luxury-border hover:bg-luxury-surface/50 text-[10px] font-black uppercase tracking-widest"
          >
            Edit Profile
          </Button>
          <Button
            variant={karigar.isActive !== false ? 'outline' : 'gold'}
            onClick={handleToggleActiveStatus}
            className={`h-11 px-6 text-[10px] font-black uppercase tracking-widest ${
              karigar.isActive !== false ? 'border-red-400/20 text-red-400 hover:bg-red-400/5' : ''
            }`}
          >
            {karigar.isActive !== false ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {/* Profile Header & Advance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-6 shadow-xl col-span-2 flex gap-6 items-center">
          <div className="w-20 h-20 bg-gold-400/10 border border-gold-400/20 rounded-2xl flex items-center justify-center font-serif text-2xl font-black text-gold-400 shrink-0">
            {initials}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-black text-luxury-text leading-tight">{karigar.name}</h2>
            <div className="flex gap-2">
              <Badge variant="gold" className="text-[10px] font-black uppercase tracking-wider">
                {karigar.skill || karigar.specialization || 'Goldsmith'}
              </Badge>
              <Badge variant={karigar.isActive !== false ? 'success' : 'outline'} className="text-[10px]">
                {karigar.isActive !== false ? 'Active Status' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex gap-4 text-xs text-luxury-text-muted font-medium pt-1">
              <span className="flex items-center gap-1"><Phone size={12} /> {karigar.phone || karigar.contact}</span>
              <span className="flex items-center gap-1"><MapPin size={12} /> {karigar.address || 'No address details'}</span>
            </div>
            <p className="text-[10px] text-luxury-text-muted font-black uppercase tracking-widest">
              Aadhaar: **** **** {karigar.aadhaarLast4 || 'N/A'}
            </p>
          </div>
        </div>

        {/* Advance Balance Card */}
        <div className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-gold-400/20 transition-all">
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Outstanding Advance Balance</p>
            <p className="text-3xl font-serif font-black text-red-400 mt-2">
              {formatCurrency(karigar.advanceBalance || 0)}
            </p>
            <p className="text-[10px] text-luxury-text-muted mt-1">
              Wage: {formatCurrency(karigar.wageRate || 0)} / {karigar.wageType === 'perGram' ? 'gram' : karigar.wageType === 'perPiece' ? 'piece' : 'day'}
            </p>
          </div>

          <Button
            variant="gold"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="w-full h-11 text-[10px] font-black uppercase tracking-widest mt-4 shadow-lg shadow-gold-500/10 flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Give Advance Cash
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-luxury-charcoal/40 border border-luxury-border-dim p-1 rounded-xl shadow-lg w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'orders' ? 'bg-gold-400 text-luxury-black shadow-lg' : 'text-luxury-text-muted hover:text-luxury-text'
          }`}
        >
          <Briefcase size={12} />
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'history' ? 'bg-gold-400 text-luxury-black shadow-lg' : 'text-luxury-text-muted hover:text-luxury-text'
          }`}
        >
          <HistoryIcon size={12} />
          Order History ({historyOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'payments' ? 'bg-gold-400 text-luxury-black shadow-lg' : 'text-luxury-text-muted hover:text-luxury-text'
          }`}
        >
          <Banknote size={12} />
          Payments & Ledger ({karigarTransactions.length})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="bg-luxury-charcoal rounded-3xl border border-luxury-border overflow-hidden shadow-2xl">
        {activeTab === 'orders' && (
          <div>
            <Table columns={orderColumns} data={activeOrders} />
            {activeOrders.length === 0 && (
              <div className="p-16 text-center text-luxury-text-dim text-[11px] uppercase font-black tracking-[0.3em]">
                No active job orders for this artisan
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <Table columns={orderColumns.filter(c => c.header !== 'Actions')} data={historyOrders} />
            {historyOrders.length === 0 && (
              <div className="p-16 text-center text-luxury-text-dim text-[11px] uppercase font-black tracking-[0.3em]">
                No completed orders in history
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <Table columns={ledgerColumns} data={karigarTransactions} />
            {karigarTransactions.length === 0 && (
              <div className="p-16 text-center text-luxury-text-dim text-[11px] uppercase font-black tracking-[0.3em]">
                No transactions recorded in ledger
              </div>
            )}
          </div>
        )}
      </div>

      {/* Give Advance Modal */}
      <Modal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} title="Issue Advance Cash" size="sm">
        <form onSubmit={handleGiveAdvanceSubmit} className="p-6 space-y-6 bg-luxury-charcoal">
          <Input
            label="Advance Amount (INR)"
            type="number"
            placeholder="0.00"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            required
            autoFocus
          />
          <div className="p-4 bg-red-400/5 border border-red-400/10 rounded-xl flex gap-3 items-start">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-luxury-text-muted">
              Issuing advance cash will increase the outstanding advance balance of this Karigar, which can be deducted from future labor wages.
            </p>
          </div>
          <Button type="submit" variant="gold" className="w-full h-12 uppercase font-black tracking-widest">
            Confirm & Issue Advance
          </Button>
        </form>
      </Modal>

    </div>
  );
};
