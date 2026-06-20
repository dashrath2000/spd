import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Users,
  History,
  Settings,
  LayoutDashboard,
  Gem,
  LogOut,
  BookText,
  Hammer,
  Scale
} from 'lucide-react';
import { cn } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Store } from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingBag, label: 'POS', path: '/pos' },
  { icon: LayoutDashboard, label: 'Products & Inventory', path: '/products' },
  { icon: ShoppingBag, label: 'Orders', path: '/orders' },
  { icon: Hammer, label: 'Karigar', path: '/karigars' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Scale, label: 'Old Gold Purchases', path: '/old-gold-purchases' },
  { icon: Gem, label: 'Girvi Management', path: '/girvi' },
  { icon: BookText, label: 'Daybook', path: '/daybook' },
  { icon: History, label: 'Sales History', path: '/sales' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];


export const Sidebar = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuthStore();
  const { settings } = useSettingsStore();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <div
      className="bg-luxury-charcoal border-r border-luxury-border flex flex-col fixed left-0 z-40 transition-colors duration-500"
      style={{
        top: 'var(--banner-height, 0px)',
        height: 'calc(100vh - var(--banner-height, 0px))',
        width: '16rem'
      }}
    >
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-gold-600 to-gold-400 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
          <Gem className="text-luxury-black" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-gold-400 tracking-wider">AURUM</h1>
          <p className="text-[11px] text-luxury-text-muted tracking-[0.2em] font-black uppercase">LUXURY POS</p>
        </div>
      </div>

      {/* Branch Selector Section */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 bg-gold-400/5 border border-gold-400/10 rounded-xl">
          <Store size={16} className="text-gold-400" />
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-400">Store</span>
            <span className="text-[12px] font-bold text-luxury-text truncate">
              {settings.shopName || 'Main Store'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.filter(item => {
          if (profile?.role === 'admin') return true;
          if (profile?.role === 'manager') {
            return !['/settings'].includes(item.path);
          }
          if (profile?.role === 'cashier') {
            return !['/settings', '/reports', '/products'].includes(item.path);
          }
          return false;
        }).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-4 py-3 rounded-xl transition-all group border-transparent border',
              isActive
                ? 'bg-gold-500/10 text-gold-400 border-gold-500/20 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                : 'text-luxury-text-muted hover:text-luxury-text hover:bg-luxury-surface'
            )}
          >
            <item.icon size={20} className={cn('transition-transform group-hover:scale-110')} />
            <span className="font-bold uppercase tracking-widest text-[12px]">{item.label}</span>
            <div className={cn(
              'ml-auto w-1.5 h-1.5 rounded-full bg-gold-400 transition-opacity',
              'opacity-0 group-[.active]:opacity-100'
            )} />
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-luxury-border-dim mt-auto flex-shrink-0 bg-luxury-charcoal">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 w-full text-luxury-text-muted hover:text-red-400 font-bold transition-all rounded-xl hover:bg-red-500/5 group"
        >
          <div className="p-2 rounded-lg bg-luxury-surface text-luxury-text-muted group-hover:text-red-400 group-hover:bg-red-500/10 transition-all">
            <LogOut size={18} />
          </div>
          <span className="uppercase tracking-widest text-[12px]">Logout</span>
        </button>
      </div>
    </div>
  );
};
