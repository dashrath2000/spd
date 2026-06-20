import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FilePlus, AlertCircle } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { karigars, addJobOrder } = useKarigarStore();

  const [searchKarigar, setSearchKarigar] = useState('');
  const [selectedKarigarId, setSelectedKarigarId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [itemType, setItemType] = useState('Ring');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [metalSource, setMetalSource] = useState<'shop' | 'karigar'>('shop');

  // Filter active karigars by name search
  const filteredKarigars = useMemo(() => {
    const activeKarigars = karigars.filter(k => k.isActive !== false);
    if (!searchKarigar) return activeKarigars;
    return activeKarigars.filter(k =>
      k.name.toLowerCase().includes(searchKarigar.toLowerCase())
    );
  }, [karigars, searchKarigar]);

  const selectedKarigarName = useMemo(() => {
    const found = karigars.find(k => k.id === selectedKarigarId);
    return found ? found.name : '';
  }, [karigars, selectedKarigarId]);

  const handleSelectKarigar = (id: string, name: string) => {
    setSelectedKarigarId(id);
    setSearchKarigar(name);
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedKarigarId) {
      toast.error('Please select a Karigar');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!estimatedWeight || Number(estimatedWeight) <= 0) {
      toast.error('Please enter a valid estimated weight');
      return;
    }
    if (!dueDate) {
      toast.error('Please select a due date');
      return;
    }

    try {
      await addJobOrder({
        karigarId: selectedKarigarId,
        karigarName: selectedKarigarName,
        itemType,
        description,
        quantity: Number(quantity),
        estimatedWeight: Number(estimatedWeight),
        dueDate,
        priority,
        metalSource
      });
      toast.success('Job Order created as Draft');
      navigate('/karigars?tab=orders');
    } catch (error) {
      toast.error('Failed to create Job Order');
      console.error(error);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-luxury-border-dim pb-6">
        <button
          onClick={() => navigate('/karigars?tab=orders')}
          className="flex items-center gap-2 text-luxury-text-muted hover:text-gold-400 transition-colors uppercase tracking-[0.2em] text-[10px] font-black"
        >
          <ArrowLeft size={16} /> Back to Job Orders
        </button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-luxury-text tracking-tight uppercase">
            Create <span className="text-gold-400">Job Order</span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl">
        
        {/* Karigar Search Select */}
        <div className="space-y-2 relative">
          <label className="text-sm font-medium text-luxury-text-muted">Search & Select Karigar</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Type to search artisans..."
              value={searchKarigar}
              onChange={(e) => {
                setSearchKarigar(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            />
            {selectedKarigarId && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-green-400">
                Selected
              </span>
            )}
          </div>
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-luxury-black border border-luxury-border rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
              {filteredKarigars.length > 0 ? (
                filteredKarigars.map(k => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => handleSelectKarigar(k.id, k.name)}
                    className="w-full px-4 py-3 text-left text-sm text-luxury-text hover:bg-gold-400 hover:text-luxury-black transition-colors border-b border-luxury-border-dim last:border-0 flex justify-between items-center"
                  >
                    <span className="font-bold">{k.name}</span>
                    <span className="text-xs opacity-80 uppercase tracking-widest">{k.skill || k.specialization || 'Goldsmith'}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-luxury-text-muted">
                  No active karigars found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metal Source Toggle - Prominently Displayed */}
        <div className="space-y-3 p-6 bg-luxury-black border border-luxury-border-dim rounded-2xl">
          <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Metal Provisioning Type</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMetalSource('shop')}
              className={`h-14 rounded-xl font-bold uppercase tracking-widest text-[10px] border transition-all ${
                metalSource === 'shop'
                  ? 'bg-gold-500/10 text-gold-400 border-gold-400'
                  : 'bg-transparent text-luxury-text-muted border-luxury-border hover:border-luxury-text'
              }`}
            >
              Shop Issues Metal (Type A)
            </button>
            <button
              type="button"
              onClick={() => setMetalSource('karigar')}
              className={`h-14 rounded-xl font-bold uppercase tracking-widest text-[10px] border transition-all ${
                metalSource === 'karigar'
                  ? 'bg-gold-500/10 text-gold-400 border-gold-400'
                  : 'bg-transparent text-luxury-text-muted border-luxury-border hover:border-luxury-text'
              }`}
            >
              Karigar's Own Metal (Type B)
            </button>
          </div>

          {/* Info Alert Box for Type B */}
          {metalSource === 'karigar' && (
            <div className="flex gap-3 items-start bg-gold-400/5 border border-gold-400/20 rounded-xl p-4 mt-2 animate-fade-in">
              <AlertCircle size={18} className="text-gold-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-luxury-text">No metal issue required</p>
                <p className="text-[10px] text-luxury-text-muted mt-0.5">
                  Karigar will use their own gold/silver. The shop will purchase the metal from the karigar during final valuation.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Item Category</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            >
              <option value="Ring">Ring</option>
              <option value="Necklace">Necklace</option>
              <option value="Bangles">Bangles</option>
              <option value="Bracelet">Bracelet</option>
              <option value="Chain">Chain</option>
              <option value="Earrings">Earrings</option>
              <option value="Pendant">Pendant</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <Input
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={1}
            required
          />

          <Input
            label="Estimated Metal Weight (grams)"
            type="number"
            step="0.001"
            placeholder="0.000"
            value={estimatedWeight}
            onChange={(e) => setEstimatedWeight(e.target.value)}
            required
          />

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-luxury-text-muted">Design Instructions / Remarks</label>
          <textarea
            rows={3}
            placeholder="Describe design specifications, dimensions, reference HUIDs etc..."
            className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg p-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="pt-4 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/karigars?tab=orders')}
            className="w-1/2 h-12 border-luxury-border hover:bg-luxury-surface/50 text-[11px] font-black uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            className="w-1/2 h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2"
          >
            <FilePlus size={16} /> Create Draft Order
          </Button>
        </div>
      </form>
    </div>
  );
};
