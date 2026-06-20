import type { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Gem, Plus, Layers, Ruler } from 'lucide-react';
import { formatCurrency, calculateProductPrice } from '../../utils/calculations';
import { usePOSStore } from '../../store/posStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useOwnerLoanStore } from '../../store/ownerLoanStore';
import toast from 'react-hot-toast';
import { cn } from '../ui/Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addToCart = usePOSStore((state) => state.addToCart);
  const { settings } = useSettingsStore();
  const { ownerLoans } = useOwnerLoanStore();

  const isPledged = ownerLoans.some(loan => 
    loan.status === 'Active' && 
    (loan.items || []).some(item => item.sourceType === 'inventory' && item.productId === product.id)
  );

  const { finalPrice } = calculateProductPrice(product, settings);

  const handleAddToCart = () => {
    if (isPledged) {
      toast.error('This product is currently pledged as loan collateral and cannot be sold.');
      return;
    }
    // We update the product's selling price to the calculated one before adding to cart
    addToCart({ ...product, sellingPrice: finalPrice });
  };

  return (
    <div
      onClick={handleAddToCart}
      className={cn(
        "group bg-luxury-charcoal backdrop-blur-sm border border-luxury-border-dim rounded-2xl overflow-hidden hover:border-gold-400/30 transition-all hover:shadow-[0_0_30px_rgba(201,168,76,0.1)] cursor-pointer flex flex-col h-full active:scale-[0.98] min-h-[320px] sm:min-h-[350px]",
        isPledged && "opacity-60 cursor-not-allowed hover:border-luxury-border-dim hover:shadow-none"
      )}
    >
      <div className="relative aspect-square bg-gradient-to-br from-luxury-black to-luxury-surface flex items-center justify-center p-4 group-hover:from-luxury-surface group-hover:to-gold-500/5 transition-all">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-luxury-text-muted group-hover:text-gold-400 transition-colors">
            <div className="p-4 bg-luxury-surface rounded-full border border-luxury-border-dim group-hover:border-gold-400/20">
              <Gem size={32} />
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest">{product.category}</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {isPledged && (
            <Badge variant="error" className="text-[8px] px-1.5 py-0.5 animate-pulse bg-red-600/90 text-white border-transparent uppercase font-bold font-black tracking-widest">
              Pledged
            </Badge>
          )}
          <Badge variant={product.stock > 0 ? (product.stock <= product.lowStockThreshold ? 'warning' : 'gold') : 'error'} className="text-[8px] px-1.5 py-0.5">
            {product.stock > 0 ? `${product.stock} IN STOCK` : 'OUT'}
          </Badge>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex flex-col gap-1 mb-2">
          <p className="text-[10px] font-mono font-bold text-luxury-text-muted tracking-widest uppercase">{product.sku}</p>
          <h3 className="font-serif text-sm sm:text-base font-bold text-luxury-text group-hover:text-gold-400 transition-colors leading-tight uppercase tracking-wide">
            {product.name}
          </h3>
        </div>

        <div className="flex gap-4 mb-4 text-[10px] lg:text-[11px] uppercase font-black tracking-widest text-luxury-text-muted">
          <span className="flex items-center gap-2"><Layers size={14} className="text-gold-600 shrink-0" /> {product.purity}</span>
          <span className="flex items-center gap-2"><Ruler size={14} className="text-gold-600 shrink-0" /> {product.weight}g</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <p className="text-lg sm:text-xl font-black text-luxury-text tracking-wide">
            {formatCurrency(finalPrice)}
          </p>
          {!isPledged && (
            <div className="p-2 bg-gold-400/10 rounded-xl group-hover:bg-gold-400 group-hover:text-luxury-black transition-all">
              <Plus size={18} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
