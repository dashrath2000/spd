import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, PlusCircle, ArrowUpRight } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button, cn } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';

interface OrderListPageProps {
  hideHeader?: boolean;
}

export const OrderListPage = ({ hideHeader = false }: OrderListPageProps) => {
  const navigate = useNavigate();
  const { jobOrders, karigars, updateJobOrder } = useKarigarStore();

  const [activeTab, setActiveTab] = useState<'all' | 'wip' | 'returned' | 'qc' | 'completed'>('all');
  const [metalFilter, setMetalFilter] = useState<'all' | 'shop' | 'karigar'>('all');
  const [selectedKarigarId, setSelectedKarigarId] = useState('');

  // 1. Filter orders based on status, metal source, and karigar
  const filteredOrders = useMemo(() => {
    return jobOrders.filter(order => {
      // Status tab filter
      if (activeTab === 'wip') {
        if (order.status !== 'wip' && order.status !== 'metalIssued' && order.status !== 'draft') return false;
      } else if (activeTab === 'returned') {
        if (order.status !== 'returned') return false;
      } else if (activeTab === 'qc') {
        if (order.status !== 'qc' && order.status !== 'valued') return false;
      } else if (activeTab === 'completed') {
        if (order.status !== 'completed') return false;
      }

      // Metal source filter
      if (metalFilter !== 'all' && order.metalSource !== metalFilter) return false;

      // Karigar filter
      if (selectedKarigarId && order.karigarId !== selectedKarigarId) return false;

      return true;
    });
  }, [jobOrders, activeTab, metalFilter, selectedKarigarId]);

  const handleStartTypeBOrder = async (orderId: string) => {
    try {
      await updateJobOrder(orderId, { status: 'wip' });
      toast.success('Order started. Status updated to WIP.');
    } catch (e) {
      toast.error('Failed to start order');
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

  const columns = [
    {
      header: 'Order ID',
      accessor: (row: any) => (
        <span className="font-mono text-xs font-bold text-luxury-text hover:text-gold-400 cursor-pointer">
          #{row.id.slice(-8).toUpperCase()}
        </span>
      )
    },
    {
      header: 'Artisan Name',
      accessor: (row: any) => (
        <span className="font-bold text-luxury-text">{row.karigarName}</span>
      )
    },
    {
      header: 'Item details',
      accessor: (row: any) => (
        <div>
          <p className="font-bold text-luxury-text text-xs">{row.itemType} x {row.quantity}</p>
          <p className="text-[10px] text-luxury-text-muted italic max-w-xs truncate">{row.description || 'No description'}</p>
        </div>
      )
    },
    {
      header: 'Provision',
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
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar size={12} className={isOverdue ? 'text-red-400' : 'text-luxury-text-muted'} />
            <span className={isOverdue ? 'text-red-400 font-bold' : 'text-luxury-text-muted'}>
              {new Date(row.dueDate).toLocaleDateString()}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Action / Flow',
      accessor: (row: any) => {
        if (row.rejectFlag) return <span className="text-red-400/60 text-[10px] uppercase font-black tracking-widest">Cancelled</span>;

        switch (row.status) {
          case 'draft':
            if (row.metalSource === 'shop') {
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/order/${row.id}/issue-metal`)}
                  className="h-8 border-gold-400/20 text-gold-400 text-[10px] font-black uppercase tracking-widest hover:bg-gold-400 hover:text-luxury-black"
                >
                  Issue Metal <ArrowUpRight size={12} className="ml-1" />
                </Button>
              );
            } else {
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartTypeBOrder(row.id)}
                  className="h-8 border-green-400/20 text-green-400 text-[10px] font-black uppercase tracking-widest hover:bg-green-400/10"
                >
                  Start Work
                </Button>
              );
            }
          case 'metalIssued':
          case 'wip':
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/order/${row.id}/return`)}
                className="h-8 border-yellow-400/20 text-yellow-400 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400/10"
              >
                Return Jewelry
              </Button>
            );
          case 'returned':
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/order/${row.id}/qc`)}
                className="h-8 border-blue-400/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-400/10"
              >
                QC Inspection
              </Button>
            );
          case 'qc':
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/order/${row.id}/valuation`)}
                className="h-8 border-gold-400/20 text-gold-400 text-[10px] font-black uppercase tracking-widest hover:bg-gold-400/10"
              >
                Value Order
              </Button>
            );
          case 'valued':
            return (
              <Button
                variant="gold"
                size="sm"
                onClick={() => navigate(`/order/${row.id}/payment`)}
                className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md"
              >
                Pay & Settle
              </Button>
            );
          case 'completed':
          default:
            return <span className="text-luxury-text-muted text-[10px] uppercase font-bold tracking-widest">Reconciled</span>;
        }
      }
    }
  ];

  return (
    <div className={cn("space-y-8 animate-fade-in pb-16", !hideHeader && "p-8")}>
      
      {/* Header */}
      {!hideHeader && (
        <div className="flex justify-between items-end border-b border-luxury-border-dim pb-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-luxury-text mb-2 tracking-tight">Karigar Job Orders</h1>
            <p className="text-luxury-text-dim uppercase tracking-[0.3em] text-[10px] font-black">Production & Metal Issuance Tracking</p>
          </div>
          <Button
            variant="gold"
            size="lg"
            onClick={() => navigate('/order/new')}
            className="h-14 px-8 shadow-xl shadow-gold-400/20"
          >
            <PlusCircle size={20} className="mr-3" /> Create Job Order
          </Button>
        </div>
      )}

      {/* Tabs and Filters section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Status Tab selectors */}
        <div className="flex bg-luxury-charcoal/50 border border-luxury-border-dim p-1 rounded-xl shadow-lg w-full md:w-auto overflow-x-auto">
          {(['all', 'wip', 'returned', 'qc', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gold-400 text-luxury-black shadow-lg'
                  : 'text-luxury-text-muted hover:text-luxury-text'
              }`}
            >
              {tab === 'wip' ? 'WIP / Draft' : tab}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={metalFilter}
            onChange={(e) => setMetalFilter(e.target.value as any)}
            className="h-11 bg-luxury-input border border-luxury-border-dim rounded-xl px-4 text-xs font-bold text-luxury-text outline-none focus:border-gold-400"
          >
            <option value="all">All Metal Sources</option>
            <option value="shop">Shop Issues Metal</option>
            <option value="karigar">Karigar's Own Metal</option>
          </select>

          <select
            value={selectedKarigarId}
            onChange={(e) => setSelectedKarigarId(e.target.value)}
            className="h-11 bg-luxury-input border border-luxury-border-dim rounded-xl px-4 text-xs font-bold text-luxury-text outline-none focus:border-gold-400"
          >
            <option value="">All Artisans</option>
            {karigars.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table list */}
      <div className="bg-luxury-charcoal rounded-3xl border border-luxury-border overflow-hidden shadow-2xl">
        <Table
          columns={columns}
          data={filteredOrders}
          onRowClick={(row) => navigate(`/karigars/${row.karigarId}`)}
        />
        {filteredOrders.length === 0 && (
          <div className="p-16 text-center text-luxury-text-dim text-[11px] uppercase font-black tracking-[0.3em]">
            No job orders found matching criteria
          </div>
        )}
      </div>
    </div>
  );
};
