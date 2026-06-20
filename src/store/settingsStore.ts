import { create } from 'zustand';
import type { ShopSettings } from '../types';
import { localDB as firestoreService } from '../lib/localDB';

interface SettingsState {
  settings: ShopSettings;
  isLoading: boolean;
  updateSettings: (updates: Partial<ShopSettings>) => Promise<void>;
  incrementInvoiceCounter: () => Promise<void>;
  initialize: () => () => void;
  fetchLiveRates: () => Promise<void>;
}

const defaultSettings: ShopSettings = {
  shopName: 'Aurum Jewellery Shop',
  ownerName: 'Admin',
  country: 'India',
  state: '',
  district: '',
  address: '123 Luxury Lane, Gold Avenue, Mumbai, 400001',
  phone: '+91 98765 43210',
  email: 'contact@aurumjewels.com',
  gstin: '27AAAAA0000A1Z5',
  logo: '',
  currency: '₹',
  goldApiKey: '',
  metalRates: {
    'Gold': 6500,
    'Silver': 80,
    'Diamond': 50000,
    'Platinum': 3500
  },
  goldRate: 6500,
  silverRate: 80,
  platinumRate: 3500,
  cgstPercent: 1.5,
  sgstPercent: 1.5,
  igstPercent: 3.0,
  enableLoyalty: true,
  loyaltyPointsPerRupee: 10,
  loyaltyRedemptionRate: 1,
  invoicePrefix: 'INV-2024-',
  invoiceCounter: 1,
  receiptFooter: 'Thank you for choosing Aurum. Visit again!',
  termsAndConditions: '',
  theme: 'dark',
  girviDefaultPeriodMonths: 12,
  categories: ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant', 'Bangles', 'Chain', 'Anklet', 'Brooch', 'Watch', 'Raw Material', 'Other'],
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: true,

  updateSettings: async (updates) => {
    const currentSettings = get().settings;
    const newSettings = { ...currentSettings, ...updates };

    // Persist logo separately to avoid bloating the main document
    if (typeof updates.logo === 'string') {
      try {
        localStorage.setItem('pos_shop_logo', updates.logo);
      } catch (e) {
        console.warn('Failed to save logo to localStorage:', e);
      }
    }

    await firestoreService.setDocument('settings', 'global_settings', newSettings);
  },

  incrementInvoiceCounter: async () => {
    const currentSettings = get().settings;
    await firestoreService.updateDocument('settings', 'global_settings', {
      invoiceCounter: currentSettings.invoiceCounter + 1,
    });
    // State will be updated by the realtime listener
  },

  fetchLiveRates: async () => {
    const { settings, updateSettings } = get();
    if (!settings.goldApiKey) {
      throw new Error('Please configure your GoldAPI.io API Key in settings first.');
    }

    set({ isLoading: true });
    try {
      const headers = { 'x-access-token': settings.goldApiKey, 'Content-Type': 'application/json' };

      const responses = await Promise.allSettled([
        fetch('https://www.goldapi.io/api/XAU/INR', { headers }),
        fetch('https://www.goldapi.io/api/XAG/INR', { headers }),
        fetch('https://www.goldapi.io/api/XPT/INR', { headers }),
      ]);

      let goldRate = settings.goldRate || 6500;
      let silverRate = settings.silverRate || 80;
      let platinumRate = settings.platinumRate || 3500;

      const [goldRes, silverRes, platRes] = responses;

      if (goldRes.status === 'fulfilled' && goldRes.value.ok) {
        const data = await goldRes.value.json();
        goldRate = data.price_gram_24k || (data.price / 31.1035);
      } else if (goldRes.status === 'fulfilled' && !goldRes.value.ok) {
        const errData = await goldRes.value.json();
        throw new Error(`GoldAPI Error: ${errData.error || 'Invalid API Key or Limit Reached'}`);
      }

      if (silverRes.status === 'fulfilled' && silverRes.value.ok) {
        const data = await silverRes.value.json();
        silverRate = data.price_gram_24k || (data.price / 31.1035);
      }

      if (platRes.status === 'fulfilled' && platRes.value.ok) {
        const data = await platRes.value.json();
        platinumRate = data.price_gram_24k || (data.price / 31.1035);
      }

      await updateSettings({
        goldRate: Number(goldRate.toFixed(2)),
        silverRate: Number(silverRate.toFixed(2)),
        platinumRate: Number(platinumRate.toFixed(2)),
        metalRates: {
          ...settings.metalRates,
          'Gold': Number(goldRate.toFixed(2)),
          'Silver': Number(silverRate.toFixed(2)),
          'Platinum': Number(platinumRate.toFixed(2)),
        }
      });
      // State is updated by Firestore listener
    } catch (err) {
      set({ isLoading: false });
      const error = err as Error;
      throw new Error(error.message || 'Failed to fetch live rates.');
    }
  },

  initialize: () => {
    set({ isLoading: true });
    // Subscribe to a single document for global settings
    const unsubscribe = firestoreService.subscribeToDoc<ShopSettings>(
      'settings',
      'global_settings',
      (rawSettings) => {
        // Restore logo from its dedicated localStorage key
        const persistedLogo = localStorage.getItem('pos_shop_logo') || '';

        if (rawSettings) {
          // Migration step for backwards compatibility
          const settings = {
            ...rawSettings,
            logo: persistedLogo || rawSettings.logo || '',
            branches: rawSettings.branches || [{
              id: 'main',
              name: rawSettings.shopName || 'Main Boutique',
              address: rawSettings.address || '',
              phone: rawSettings.phone || '',
              isPrimary: true
            }],
            metalRates: rawSettings.metalRates || {
              'Gold': rawSettings.goldRate ?? 6500,
              'Silver': rawSettings.silverRate ?? 80,
              'Platinum': rawSettings.platinumRate ?? 3500,
              'Diamond': 50000
            },
            girviDefaultPeriodMonths: rawSettings.girviDefaultPeriodMonths ?? 12,
            categories: rawSettings.categories || defaultSettings.categories,
            termsAndConditions: rawSettings.termsAndConditions ?? '',
          };
          set({ settings, isLoading: false });
        } else {
          // If settings don't exist yet, initialize with defaults
          const initSettings = { ...defaultSettings, logo: persistedLogo };
          firestoreService.setDocument('settings', 'global_settings', initSettings);
          set({ settings: initSettings, isLoading: false });
        }
      }
    );
    return unsubscribe;
  },
}));

