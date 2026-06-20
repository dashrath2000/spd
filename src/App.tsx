import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { GirviPage } from './pages/GirviPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DataInitializer } from './components/layout/DataInitializer';
import { Toaster } from 'react-hot-toast';
import { useSettingsStore } from './store/settingsStore';
import { useAuthStore } from './store/authStore';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DaybookPage } from './pages/DaybookPage';
import { OrdersPage } from './pages/OrdersPage';
import { KarigarPage } from './pages/KarigarPage';
import { KarigarDetailPage } from './pages/KarigarDetailPage';
import { OldGoldPurchasePage } from './pages/OldGoldPurchasePage';
import { AddEditKarigarPage } from './pages/AddEditKarigarPage';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { MetalIssuePage } from './pages/MetalIssuePage';
import { MetalReturnPage } from './pages/MetalReturnPage';
import { QualityCheckPage } from './pages/QualityCheckPage';
import { ValuationPage } from './pages/ValuationPage';
import { PaymentPage } from './pages/PaymentPage';
import { PlanExpiredScreen } from './components/subscription/PlanExpiredScreen';
// import { OfflineBanner } from './components/layout/OfflineBanner';
import { Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 p-10 flex flex-col items-center justify-center font-mono">
          <h1 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Critical Rendering Error</h1>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-red-500/20 max-w-2xl w-full overflow-hidden shadow-2xl">
            <p className="text-red-400 font-bold mb-2">Error Details:</p>
            <pre className="text-[10px] bg-black/50 p-4 rounded-xl overflow-auto custom-scrollbar max-h-[300px] text-zinc-300">
              {this.state.error?.toString()}
              {"\n\nComponent Stack:\n"}
              {this.state.error?.stack}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { settings } = useSettingsStore();
  const { planExpired, user } = useAuthStore();

  useEffect(() => {
    // Handle Google Drive Auth Callback for Web
    import('./lib/googleDriveService').then(({ googleDriveService }) => {
      googleDriveService.handleAuthCallback();
    });

    if (settings.theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [settings.theme]);

  // If the authenticated user's plan has expired, block the whole app
  if (user && planExpired) {
    return <PlanExpiredScreen />;
  }

  return (
    <ErrorBoundary>
      <Router>
        {/* Offline indicator — floats over everything */}
        {/* <OfflineBanner /> */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          containerStyle={{ zIndex: 99999 }}
          toastOptions={{
            style: {
              background: 'var(--luxury-charcoal)',
              color: 'var(--gold-text-color)',
              border: '1px solid var(--luxury-border)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '10px',
              padding: '16px 24px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require authentication */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DataInitializer>
                  <Routes>
                    <Route path="/pos" element={<POSPage />} />
                    <Route path="*" element={
                      <Layout>
                        <Routes>
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/products" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ProductsPage /></ProtectedRoute>} />
                          <Route path="/customers" element={<CustomersPage />} />
                          <Route path="/sales" element={<SalesHistoryPage />} />
                          <Route path="/old-gold-purchases" element={<OldGoldPurchasePage />} />
                          <Route path="/girvi" element={<GirviPage />} />
                          <Route path="/daybook" element={<DaybookPage />} />
                          <Route path="/orders" element={<OrdersPage />} />
                          <Route path="/karigars" element={<KarigarPage />} />
                          <Route path="/karigars/add" element={<AddEditKarigarPage />} />
                          <Route path="/karigar/add" element={<AddEditKarigarPage />} />
                          <Route path="/karigars/edit/:id" element={<AddEditKarigarPage />} />
                          <Route path="/karigar/edit/:id" element={<AddEditKarigarPage />} />
                          <Route path="/karigars/:id" element={<KarigarDetailPage />} />
                          <Route path="/karigar/:id" element={<KarigarDetailPage />} />
                          <Route path="/karigar-orders" element={<Navigate to="/karigars?tab=orders" replace />} />
                          <Route path="/order/new" element={<CreateOrderPage />} />
                          <Route path="/order/:id/issue-metal" element={<MetalIssuePage />} />
                          <Route path="/order/:id/return" element={<MetalReturnPage />} />
                          <Route path="/order/:id/qc" element={<QualityCheckPage />} />
                          <Route path="/order/:id/valuation" element={<ValuationPage />} />
                          <Route path="/order/:id/payment" element={<PaymentPage />} />
                          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
                          {/* Catch all for inner app routes */}
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Layout>
                    } />
                  </Routes>
                </DataInitializer>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
