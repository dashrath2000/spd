import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  TrendingUp,
  Wallet,
  ArrowRight,
  Package,
  Calendar,
  Edit2,
  Banknote,
  CreditCard as CreditCardIcon,
  Smartphone,
  Gem,
  ArrowDownCircle,
  Printer
} from 'lucide-react';
import { useSalesOrderStore } from '../store/salesOrderStore';
import { useCustomerStore } from '../store/customerStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePOSStore } from '../store/posStore';
import { generateOrderReceipt } from '../utils/invoiceGenerator';
import { Table } from '../components/ui/Table';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/calculations';
import { Modal } from '../components/ui/Modal';
import type { SalesOrder, Sale } from '../types';

export const SalesOrderPage = () => {
  const navigate = useNavigate();
  const { orders, convertToSale } = useSalesOrderStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [finalizingOrder, setFinalizingOrder] = useState<SalesOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || o.orderStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const active = orders.filter(o => o.orderStatus !== 'Completed' && o.orderStatus !== 'Cancelled');
    const totalAdvance = active.reduce((sum, o) => sum + o.advancePaid, 0);
    const totalBalance = active.reduce((sum, o) => sum + o.balanceDue, 0);
    return {
      activeCount: active.length,
      totalAdvance,
      totalBalance
    };
  }, [orders]);

  const columns = [
    {
      header: 'Order Details',
      accessor: (row: SalesOrder) => (
        <div className="flex flex-col">
          <span className="font-bold text-luxury-text uppercase tracking-tight leading-none mb-1">{row.orderNumber}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-luxury-text-muted uppercase font-black tracking-widest">{row.customerName}</span>
            <span className="text-[10px] text-gold-400/60 uppercase font-black tracking-widest">• {new Date(row.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Due Date',
      accessor: (row: SalesOrder) => (
        <div className="flex items-center gap-2 text-luxury-text-dim">
          <Calendar size={12} className="text-gold-400" />
          <span className="text-xs font-bold">{new Date(row.dueDate).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      header: 'Financial Status',
      accessor: (row: SalesOrder) => (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-[10px] uppercase font-black text-luxury-text-dim">Paid</span>
            <span className="text-[10px] font-bold text-green-500">{formatCurrency(row.advancePaid)}</span>
          </div>
          <div className="w-full h-1 bg-luxury-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-gold-400 transition-all" 
              style={{ width: `${(row.advancePaid / row.grandTotal) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] uppercase font-black text-luxury-text-muted">Balance</span>
            <span className="text-[9px] font-black text-luxury-text">{formatCurrency(row.balanceDue)}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (row: SalesOrder) => (
        <Badge 
          variant={
            row.orderStatus === 'Completed' ? 'success' : 
            row.orderStatus === 'Cancelled' ? 'error' : 
            row.orderStatus === 'Ready' ? 'info' : 'warning'
          }
          className="text-[10px] uppercase font-black tracking-widest px-3 py-1"
        >
          {row.orderStatus}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: (row: SalesOrder) => (
        <div className="flex justify-end gap-2">
          {row.orderStatus !== 'Completed' && row.orderStatus !== 'Cancelled' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-luxury-border-dim hover:border-gold-400/40 text-luxury-text-dim hover:text-gold-400"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const { settings } = useSettingsStore.getState();
                  generateOrderReceipt(row, settings, null);
                }}
              >
                <Printer size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-luxury-border-dim hover:border-gold-400/40 text-luxury-text-dim hover:text-gold-400"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  usePOSStore.getState().loadOrder(row);
                  navigate('/pos?mode=order');
                }}
              >
                <Edit2 size={14} />
              </Button>
              <Button 
                variant="gold" 
                size="sm" 
                className="h-9 px-4 text-[9px] font-black uppercase tracking-widest"
                onClick={(e) => { e.stopPropagation(); setFinalizingOrder(row); }}
              >
                Finalize Sale <ArrowRight size={12} className="ml-2" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <Package size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Pending Orders</p>
          <p className="text-3xl font-serif font-black text-luxury-text">{stats.activeCount}</p>
        </div>

        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <Wallet size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Advance Deposits</p>
          <p className="text-3xl font-serif font-black text-green-500">{formatCurrency(stats.totalAdvance)}</p>
        </div>

        <div className="card-luxury p-6 bg-luxury-charcoal border-luxury-border relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-15 transition-opacity">
            <TrendingUp size={48} />
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-luxury-text-dim mb-2">Remaining Receivables</p>
          <p className="text-3xl font-serif font-black text-gold-400">{formatCurrency(stats.totalBalance)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim group-focus-within:text-gold-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by Order ID or Customer Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 bg-luxury-charcoal border-2 border-luxury-border-dim rounded-2xl pl-12 pr-6 text-sm focus:border-gold-400 outline-none transition-all text-luxury-text"
          />
        </div>
        <Button 
          variant="gold" 
          size="lg" 
          className="h-14 px-8 font-bold text-[11px] tracking-widest uppercase shadow-lg shadow-gold-400/20 shrink-0"
          onClick={() => navigate('/pos?mode=order')}
        >
          <Plus size={20} className="mr-3" /> Create New Order
        </Button>
        <div className="flex gap-2">
          {['all', 'Pending', 'Processing', 'Ready'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest border transition-all",
                filterStatus === s ? "bg-gold-400 border-gold-400 text-luxury-black" : "bg-luxury-charcoal border-luxury-border text-luxury-text-dim hover:border-gold-400/40"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredOrders}
        onRowClick={() => {}}
      />
      <FinalizeOrderModal 
        order={finalizingOrder}
        isOpen={!!finalizingOrder}
        onClose={() => setFinalizingOrder(null)}
        onConfirm={async (saleData) => {
          if (finalizingOrder) {
            await convertToSale(finalizingOrder.id, saleData);
            setFinalizingOrder(null);
          }
        }}
      />
    </div>
  );
};

const FinalizeOrderModal = ({ order, isOpen, onClose, onConfirm }: { 
  order: SalesOrder | null, 
  isOpen: boolean, 
  onClose: () => void,
  onConfirm: (saleData: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>
}) => {
  const [method, setMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Split'>('Cash');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '', upi: '' });
  const { updateCustomer } = useCustomerStore();

  const balanceDue = order ? order.balanceDue : 0;
  
  const totalReceived = method === 'Split' 
    ? (Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.upi))
    : Number(receivedAmount) || balanceDue;

  const handleFinalize = async () => {
    if (!order) return;

    const finalAmountPaid = order.advancePaid + totalReceived;
    const outstanding = Math.max(0, order.grandTotal - finalAmountPaid);
    
    const saleData: Omit<Sale, 'id' | 'createdAt'> = {
      ...order,
      invoiceNumber: order.orderNumber.replace('SO', 'INV'),
      status: (outstanding > 0 ? 'Partially Paid' : 'Completed') as Sale['status'],
      amountPaid: finalAmountPaid,
      outstandingBalance: outstanding,
      change: Math.max(0, totalReceived - balanceDue),
      paymentMethod: method as Sale['paymentMethod'],
      paymentDetails: method === 'Split' ? {
        cash: (Number(order.paymentDetails?.cash) || 0) + (Number(splitAmounts.cash) || 0),
        card: (Number(order.paymentDetails?.card) || 0) + (Number(splitAmounts.card) || 0),
        upi: (Number(order.paymentDetails?.upi) || 0) + (Number(splitAmounts.upi) || 0)
      } : { 
        ...order.paymentDetails,
        [method.toLowerCase()]: (Number(order.paymentDetails?.[method.toLowerCase() as keyof typeof order.paymentDetails]) || 0) + totalReceived 
      },
      paymentHistory: [
        ...(order.paymentHistory || []),
        {
          date: new Date().toISOString(),
          amount: totalReceived,
          method: method,
          note: 'Final settlement'
        }
      ]
    };

    if (order.customerId && outstanding > 0) {
      await updateCustomer(order.customerId, {
        outstandingBalance: (order.outstandingBalance || 0) + outstanding
      });
    }

    await onConfirm(saleData);
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Finalize Order: ${order.orderNumber}`} size="md">
      <div className="p-6 space-y-8 bg-luxury-charcoal">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[9px] uppercase font-bold text-luxury-text-dim mb-1">Total Value</p>
            <p className="text-lg font-serif font-bold text-luxury-text">{formatCurrency(order.grandTotal)}</p>
          </div>
          <div className="p-4 bg-luxury-black rounded-2xl border border-luxury-border">
            <p className="text-[9px] uppercase font-bold text-luxury-text-dim mb-1">Advance Paid</p>
            <p className="text-lg font-serif font-bold text-green-500">{formatCurrency(order.advancePaid)}</p>
          </div>
          <div className="p-4 bg-luxury-surface rounded-2xl border border-gold-400/20">
            <p className="text-[9px] uppercase font-bold text-gold-400 mb-1">Balance Due</p>
            <p className="text-xl font-serif font-bold text-gold-400">{formatCurrency(balanceDue)}</p>
          </div>
        </div>

        <div className="space-y-6">
           <div className="flex bg-luxury-black/40 p-1.5 rounded-2xl border border-luxury-border-dim">
            {[
              { id: 'Cash', icon: Banknote },
              { id: 'Card', icon: CreditCardIcon },
              { id: 'UPI', icon: Smartphone },
              { id: 'Split', icon: Gem }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id as 'Cash' | 'Card' | 'UPI' | 'Split')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all',
                  method === m.id ? 'bg-gold-400 text-luxury-black shadow-lg font-bold' : 'text-luxury-text-muted hover:bg-luxury-surface'
                )}
              >
                <m.icon size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{m.id}</span>
              </button>
            ))}
          </div>

          {method === 'Split' ? (
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Cash" type="number" placeholder="0"
                value={splitAmounts.cash} onChange={(e) => setSplitAmounts(s => ({ ...s, cash: e.target.value }))}
                className="text-lg font-bold h-12 bg-luxury-black border-luxury-border"
              />
              <Input
                label="Card" type="number" placeholder="0"
                value={splitAmounts.card} onChange={(e) => setSplitAmounts(s => ({ ...s, card: e.target.value }))}
                className="text-lg font-bold h-12 bg-luxury-black border-luxury-border"
              />
              <Input
                label="UPI" type="number" placeholder="0"
                value={splitAmounts.upi} onChange={(e) => setSplitAmounts(s => ({ ...s, upi: e.target.value }))}
                className="text-lg font-bold h-12 bg-luxury-black border-luxury-border"
              />
            </div>
          ) : (
            <div className="relative">
              <ArrowDownCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-text-dim" size={20} />
              <Input
                label={`Remaining Payment via ${method}`}
                type="number"
                placeholder={balanceDue.toString()}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="text-2xl font-bold h-16 pl-12 bg-luxury-black border-luxury-border"
              />
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-luxury-border-dim">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-[10px] uppercase font-black text-luxury-text-dim">Closing Settlement</p>
              <p className="text-sm font-bold text-luxury-text">Total Received: {formatCurrency(totalReceived)}</p>
            </div>
            {totalReceived < balanceDue && (
              <div className="text-right">
                <p className="text-[10px] uppercase font-black text-red-400">Add to Credit</p>
                <p className="text-lg font-serif font-black text-red-400">{formatCurrency(balanceDue - totalReceived)}</p>
              </div>
            )}
          </div>
          <div className="flex gap-4">
             <Button variant="outline" className="flex-1 py-4 uppercase font-black tracking-widest border-luxury-border" onClick={onClose}>Cancel</Button>
             <Button 
               variant="gold" 
               className="flex-[2] py-4 uppercase font-black tracking-widest shadow-xl shadow-gold-400/30" 
               onClick={handleFinalize}
             >
               Confirm & Issue Invoice
             </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

