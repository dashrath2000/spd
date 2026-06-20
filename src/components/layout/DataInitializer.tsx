import { useEffect } from 'react';
import { useProductStore } from '../../store/productStore';
import { useCustomerStore } from '../../store/customerStore';
import { useSalesStore } from '../../store/salesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useGirviStore } from '../../store/girviStore';
import { useOwnerLoanStore } from '../../store/ownerLoanStore';
import { useSupplierStore } from '../../store/supplierStore';
import { useSalesOrderStore } from '../../store/salesOrderStore';
import { usePurchaseOrderStore } from '../../store/purchaseOrderStore';
import { useKarigarStore } from '../../store/karigarStore';
import { useOldGoldPurchaseStore } from '../../store/oldGoldPurchaseStore';
import { useDaybookStore } from '../../store/daybookStore';
import { localDB as firestoreService } from '../../lib/localDB';

export const DataInitializer = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, initialized } = useAuthStore();
  
  const initializeProducts = useProductStore((state) => state.initialize);
  const initializeCustomers = useCustomerStore((state) => state.initialize);
  const initializeSales = useSalesStore((state) => state.initialize);
  const initializeSettings = useSettingsStore((state) => state.initialize);
  const initializeGirvi = useGirviStore((state) => state.initialize);
  const initializeOwnerLoans = useOwnerLoanStore((state) => state.initialize);
  const initializeSuppliers = useSupplierStore((state) => state.initialize);
  const initializeSalesOrders = useSalesOrderStore((state) => state.initialize);
  const initializePurchaseOrders = usePurchaseOrderStore((state) => state.initialize);
  const initializeKarigars = useKarigarStore((state) => state.initialize);
  const initializeOldGoldPurchases = useOldGoldPurchaseStore((state) => state.initialize);
  const initializeDaybook = useDaybookStore((state) => state.initialize);

  useEffect(() => {
    // Only proceed once auth is initialized and we have a user/profile
    if (!initialized || !user || !profile) {
      if (initialized && !user) {
        // Clear the user scope when logged out
        firestoreService.setUserId(null);
      }
      return;
    }

    // Scope all Firestore operations to the shared tenantId
    const tenantId = profile.tenantId || user.uid;
    console.log(`Initializing listeners for tenant: ${tenantId} (User: ${user.uid}, Role: ${profile.role})`);
    
    firestoreService.setUserId(tenantId);
 
    const unsubProducts = initializeProducts();
    const unsubCustomers = initializeCustomers();
    const unsubSales = initializeSales();
    const unsubSettings = initializeSettings();
    const unsubGirvi = initializeGirvi();
    const unsubOwnerLoans = initializeOwnerLoans();
    const unsubSuppliers = initializeSuppliers();
    const unsubSalesOrders = initializeSalesOrders();
    const unsubPurchaseOrders = initializePurchaseOrders();
    const unsubKarigars = initializeKarigars();
    const unsubOldGoldPurchases = initializeOldGoldPurchases();
    const unsubDaybook = initializeDaybook();

    return () => {
      console.log('Cleaning up listeners...');
      unsubProducts();
      unsubCustomers();
      unsubSales();
      unsubSettings();
      unsubGirvi();
      unsubOwnerLoans();
      unsubSuppliers();
      unsubSalesOrders();
      unsubPurchaseOrders();
      unsubKarigars();
      unsubOldGoldPurchases();
      unsubDaybook();
    };
  }, [user, profile, initialized, initializeProducts, initializeCustomers, initializeSales, initializeSettings, initializeGirvi, initializeOwnerLoans, initializeSuppliers, initializeSalesOrders, initializePurchaseOrders, initializeKarigars, initializeOldGoldPurchases, initializeDaybook]);

  // Synchronize phone number to admin user profile if missing or changed
  const settings = useSettingsStore((state) => state.settings);
  useEffect(() => {
    if (initialized && profile && profile.role === 'admin' && settings?.phone && profile.phone !== settings.phone) {
      console.log('Syncing phone number to admin user profile...');
      firestoreService.updateGlobalDocument('user_profiles', profile.uid, {
        phone: settings.phone
      }).then(() => {
        profile.phone = settings.phone;
      }).catch(err => {
        console.error('Failed to sync phone to user_profile:', err);
      });
    }
  }, [initialized, profile, settings?.phone, profile?.phone]);

  return <>{children}</>;
};
