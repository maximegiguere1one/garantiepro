import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ToastProvider } from './contexts/ToastContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { PersonalizationProvider } from './contexts/PersonalizationContext';
import { EnhancedToastProvider } from './components/ui/EnhancedToast';
import { queryClient } from './lib/query-client';
import 'shepherd.js/dist/css/shepherd.css';
import './styles/shepherd-custom.css';
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardLayoutV2 = lazy(() => import('./components/DashboardLayoutV2').then(m => ({ default: m.DashboardLayoutV2 })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const DealerDashboardComplete = lazy(() => import('./components/DealerDashboardComplete').then(m => ({ default: m.DealerDashboardComplete })));
const FranchiseeSetup = lazy(() => import('./components/FranchiseeSetup').then(m => ({ default: m.FranchiseeSetup })));
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import { TourInitializer } from './components/TourInitializer';

const OptimizedWarrantyPage = lazy(() => import('./components/OptimizedWarrantyPage').then(m => ({ default: m.OptimizedWarrantyPage })));
const WarrantiesList = lazy(() => import('./components/WarrantiesList').then(m => ({ default: m.WarrantiesList })));
const ClaimsCenter = lazy(() => import('./components/ClaimsCenter').then(m => ({ default: m.ClaimsCenter })));
const CustomersPage = lazy(() => import('./components/CustomersPage').then(m => ({ default: m.CustomersPage })));
const LoyaltyProgram = lazy(() => import('./components/LoyaltyProgram').then(m => ({ default: m.LoyaltyProgram })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MyProducts = lazy(() => import('./components/MyProducts').then(m => ({ default: m.MyProducts })));
const DealerInventory = lazy(() => import('./components/DealerInventory').then(m => ({ default: m.DealerInventory })));
const WarrantyTemplateBuilder = lazy(() => import('./components/WarrantyTemplateBuilder').then(m => ({ default: m.WarrantyTemplateBuilder })));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const PublicClaimSubmission = lazy(() => import('./components/PublicClaimSubmission').then(m => ({ default: m.PublicClaimSubmission })));
const LicenseAgreement = lazy(() => import('./components/LicenseAgreement').then(m => ({ default: m.LicenseAgreement })));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const OrganizationsManagement = lazy(() => import('./components/OrganizationsManagementV2').then(m => ({ default: m.OrganizationsManagementV2 })));
const BillingDashboard = lazy(() => import('./components/BillingDashboard').then(m => ({ default: m.BillingDashboard })));
const SignatureAuditDashboard = lazy(() => import('./components/SignatureAuditDashboard').then(m => ({ default: m.SignatureAuditDashboard })));
const PublicSignatureVerification = lazy(() => import('./components/PublicSignatureVerification').then(m => ({ default: m.PublicSignatureVerification })));
const AdminPasswordReset = lazy(() => import('./components/AdminPasswordReset').then(m => ({ default: m.AdminPasswordReset })));
const ResetPassword = lazy(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword })));
const WarrantyFormTester = lazy(() => import('./components/WarrantyFormTester').then(m => ({ default: m.WarrantyFormTester })));
const ProfileRecovery = lazy(() => import('./components/ProfileRecovery').then(m => ({ default: m.ProfileRecovery })));
const EmailQueueManager = lazy(() => import('./components/EmailQueueManager').then(m => ({ default: m.EmailQueueManager })));
const ResponseTemplatesManager = lazy(() => import('./components/ResponseTemplatesManager').then(m => ({ default: m.ResponseTemplatesManager })));
const SystemDiagnostics = lazy(() => import('./components/SystemDiagnostics').then(m => ({ default: m.SystemDiagnostics })));
const WarrantyDiagnosticsPanel = lazy(() => import('./components/WarrantyDiagnosticsPanel').then(m => ({ default: m.WarrantyDiagnosticsPanel })));
const SupabaseHealthCheck = lazy(() => import('./components/SupabaseHealthCheck').then(m => ({ default: m.SupabaseHealthCheck })));
const DemoNewFeatures = lazy(() => import('./components/DemoNewFeatures').then(m => ({ default: m.DemoNewFeatures })));
const WarrantyDownloadPage = lazy(() => import('./components/WarrantyDownloadPage').then(m => ({ default: m.WarrantyDownloadPage })));
const HelpCenter = lazy(() => import('./components/HelpCenter').then(m => ({ default: m.default })));
const UIV2Demo = lazy(() => import('./components/UIV2Demo').then(m => ({ default: m.UIV2Demo })));
const PromoteMasterPage = lazy(() => import('./components/PromoteMasterPage'));
const AutomationDashboard = lazy(() => import('./components/AutomationDashboard').then(m => ({ default: m.AutomationDashboard })));
const NotificationPreferences = lazy(() => import('./components/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));

function AppContent() {
  const { user, loading, profileError, retryLoadProfile, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // Show profile recovery if there's a profile error and user is authenticated
  if (user && profileError && (profileError.includes('PROFILE_NOT_FOUND') || profileError.includes('permission') || profileError.includes('Permission'))) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      }>
        <ProfileRecovery
          error={profileError}
          onRetry={retryLoadProfile}
          onSignOut={signOut}
        />
      </Suspense>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      }>
        <LoginPage />
      </Suspense>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DealerDashboardComplete onNavigate={setCurrentPage} />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'organizations':
        return <OrganizationsManagement />;
      case 'billing':
        return <BillingDashboard />;
      case 'new-warranty':
      case 'smart-warranty':
      case 'optimized-warranty':
        return <OptimizedWarrantyPage onNavigate={setCurrentPage} onBack={() => setCurrentPage('dashboard')} />;
      case 'warranties':
        return <WarrantiesList />;
      case 'my-products':
        return <MyProducts />;
      case 'dealer-inventory':
        return <DealerInventory />;
      case 'warranty-templates':
        return <WarrantyTemplateBuilder />;
      case 'claims':
        return <ClaimsCenter />;
      case 'customers':
        return <CustomersPage />;
      case 'loyalty':
        return <LoyaltyProgram />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'signature-audit':
        return <SignatureAuditDashboard />;
      case 'warranty-form-test':
        return <WarrantyFormTester />;
      case 'email-queue':
        return <EmailQueueManager />;
      case 'response-templates':
        return <ResponseTemplatesManager />;
      case 'system-diagnostics':
        return <SystemDiagnostics />;
      case 'warranty-diagnostics':
        return <WarrantyDiagnosticsPanel />;
      case 'supabase-health':
        return <SupabaseHealthCheck />;
      case 'demo-features':
        return <DemoNewFeatures />;
      case 'help':
        return <HelpCenter />;
      case 'settings':
        return <SettingsPage />;
      case 'ui-v2-demo':
        return <UIV2Demo />;
      case 'automation':
        return <AutomationDashboard />;
      case 'notification-preferences':
        return <NotificationPreferences />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <TourInitializer />
      <DashboardLayoutV2 currentPage={currentPage} onNavigate={setCurrentPage}>
        <Suspense fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          </div>
        }>
          {renderPage()}
        </Suspense>
      </DashboardLayoutV2>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary level="app">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <EnhancedToastProvider>
              <ViewModeProvider>
                <AuthProvider>
                  <PersonalizationProvider>
                    <OrganizationProvider>
                      <NetworkStatusIndicator />
                      <Suspense fallback={
                        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                        </div>
                      }>
                        <Routes>
                          <Route path="/claim/submit/:token" element={<PublicClaimSubmission />} />
                          <Route path="/verify-signature" element={<PublicSignatureVerification />} />
                          <Route path="/download-warranty" element={<WarrantyDownloadPage />} />
                          <Route path="/license-agreement" element={<LicenseAgreement />} />
                          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                          <Route path="/setup" element={<FranchiseeSetup />} />
                          <Route path="/admin-reset" element={<AdminPasswordReset />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/promote-master" element={<PromoteMasterPage />} />
                          <Route path="/*" element={<AppContent />} />
                        </Routes>
                      </Suspense>
                    </OrganizationProvider>
                  </PersonalizationProvider>
                </AuthProvider>
              </ViewModeProvider>
            </EnhancedToastProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
