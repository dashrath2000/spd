import {
  Bell,
  CircleDot,
  Sun,
  Moon,
  RefreshCw,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/calculations';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const Header = () => {
  const { settings, updateSettings, fetchLiveRates } = useSettingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [tempRates, setTempRates] = useState({
    gold: settings.goldRate || 0,
    silver: settings.silverRate || 0,
    platinum: settings.platinumRate || 0
  });

  const { profile } = useAuthStore();

  useEffect(() => {
    setTempRates({
      gold: settings.goldRate || 0,
      silver: settings.silverRate || 0,
      platinum: settings.platinumRate || 0
    });
  }, [settings]);

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };



  const displayName = profile?.name || settings.ownerName || 'Executive';


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSyncRates = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      await fetchLiveRates();
      toast.success('Market rates synced successfully!');
      setIsUpdatingRates(false);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        goldRate: tempRates.gold,
        silverRate: tempRates.silver,
        platinumRate: tempRates.platinum,
        metalRates: {
          ...settings.metalRates,
          'Gold': tempRates.gold,
          'Silver': tempRates.silver,
          'Platinum': tempRates.platinum
        }
      });
      toast.success('Rates updated manually!');
      setIsUpdatingRates(false);
    } catch (err: unknown) {
      toast.error('Failed to update rates');
    }
  };

  return (
    <header
      className="h-20 bg-luxury-charcoal/50 backdrop-blur-md border-b border-luxury-border px-8 flex items-center justify-between sticky z-30 transition-colors duration-500"
      style={{ top: 'var(--banner-height, 0px)' }}
    >
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <h2 className="text-lg font-serif font-bold text-gold-400 leading-tight">
            {getGreeting()}, {displayName}
          </h2>
          <p className="text-[10px] text-luxury-text-muted font-black uppercase tracking-widest mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Market Rates Overview */}
        <div className="hidden lg:flex items-center gap-6 ml-12 bg-luxury-surface px-6 py-2 rounded-2xl border border-luxury-border shadow-inner group cursor-pointer hover:border-gold-400/40 transition-all" onClick={() => setIsUpdatingRates(true)}>
          <div className="flex items-center gap-3">
            <CircleDot size={14} className="text-gold-400 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-luxury-text-muted leading-none font-black">Gold 24K / 22K</p>
              <p className="text-sm font-bold text-gold-400 leading-tight">
                {formatCurrency(settings.goldRate || 0)} / {formatCurrency((settings.goldRate || 0) * 22 / 24)}
              </p>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-luxury-border-dim" />
          <div className="flex items-center gap-3">
            <CircleDot size={14} className="text-[#A8A9AD]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-luxury-text-muted leading-none font-black">Silver Rate</p>
              <p className="text-sm font-bold text-luxury-text leading-tight">{formatCurrency(settings.silverRate || 0)}/g</p>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-luxury-border-dim" />
          <div className="flex items-center gap-3">
            <CircleDot size={14} className="text-blue-400" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-luxury-text-muted leading-none font-black">Platinum Rate</p>
              <p className="text-sm font-bold text-luxury-text leading-tight">{formatCurrency(settings.platinumRate || 0)}/g</p>
            </div>
          </div>
          <button
            onClick={handleSyncRates}
            disabled={isSyncing}
            className="ml-2 p-2 hover:bg-gold-400/20 rounded-xl transition-all text-gold-400 group-hover:animate-pulse disabled:opacity-50"
            title="Sync Live Rates from GoldAPI.io"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-luxury-surface transition-all text-luxury-text-muted hover:text-gold-400 group relative"
          title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="p-2.5 rounded-xl hover:bg-luxury-surface transition-all text-luxury-text-muted hover:text-gold-400 group relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-luxury-charcoal" />
        </button>



      </div>

      <Modal isOpen={isUpdatingRates} onClose={() => setIsUpdatingRates(false)} title="Quick Rate Update" size="sm">
        <form onSubmit={handleManualUpdate} className="p-6 space-y-6 bg-luxury-charcoal">
          <div className="space-y-4">
            <Input
              label="Gold Rate (24K / g)"
              type="number"
              step="0.01"
              value={tempRates.gold}
              onChange={(e) => setTempRates({ ...tempRates, gold: parseFloat(e.target.value) })}
              className="text-gold-400 font-bold"
            />
            <Input
              label="Silver Rate ( / g)"
              type="number"
              step="0.01"
              value={tempRates.silver}
              onChange={(e) => setTempRates({ ...tempRates, silver: parseFloat(e.target.value) })}
              className="text-luxury-text font-bold"
            />
            <Input
              label="Platinum Rate ( / g)"
              type="number"
              step="0.01"
              value={tempRates.platinum}
              onChange={(e) => setTempRates({ ...tempRates, platinum: parseFloat(e.target.value) })}
              className="text-blue-400 font-bold"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-luxury-border-dim">
            <Button type="submit" variant="gold" className="flex-1 h-12 uppercase font-black tracking-widest text-[10px]">
              <Check size={16} className="mr-2" /> Save Rates
            </Button>
            <Button type="button" variant="outline" onClick={handleSyncRates} disabled={isSyncing} className="flex-1 h-12 uppercase font-black tracking-widest text-[10px] border-gold-400/20 text-gold-400">
              <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Live
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
};
