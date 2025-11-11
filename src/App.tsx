import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ToastProvider } from './contexts/ToastContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { PersonalizationProvider } from './contexts/PersonalizationContext';
import { EnhancedToastProvider } from './components/ui/EnhancedToast';
import { LoadingWithTimeout } from './components/common/LoadingWithTimeout';
import { EmergencyAccessPage } from './components/EmergencyAccessPage';
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
import { BoltModeWarning } from './components/BoltModeWarning';

const NewWarranty = lazy(() => import('./components/NewWarranty').then(m => ({ default: m.NewWarranty })));
const SmartNewWarranty = lazy(() => import('./components/SmartNewWarranty').then(m => ({ default: m.SmartNewWarranty })));
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
const AdminPasswordReset = lazy(() => import('./components/AdminPasswordReset'));
const ResetPassword = lazy(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword })));
const ProfileRecovery = lazy(() => import('./components/ProfileRecovery').then(m => ({ default: m.ProfileRecovery })));
const EmailQueueManager = lazy(() => import('./components/EmailQueueManager').then(m => ({ default: m.EmailQueueManager })));
const ResponseTemplatesManager = lazy(() => import('./components/ResponseTemplatesManager').then(m => ({ default: m.ResponseTemplatesManager })));
const SupabaseHealthCheck = lazy(() => import('./components/SupabaseHealthCheck').then(m => ({ default: m.SupabaseHealthCheck })));
const DemoNewFeatures = lazy(() => import('./components/DemoNewFeatures').then(m => ({ default: m.DemoNewFeatures })));
const WarrantyDownloadPage = lazy(() => import('./components/WarrantyDownloadPage').then(m => ({ default: m.WarrantyDownloadPage })));
const HelpCenter = lazy(() => import('./components/HelpCenter').then(m => ({ default: m.default })));
const HelpCenterPage = lazy(() => import('./components/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })));
const PromoteMasterPage = lazy(() => import('./components/PromoteMasterPage'));
const AutomationDashboard = lazy(() => import('./components/AutomationDashboard').then(m => ({ default: m.AutomationDashboard })));
const NotificationPreferences = lazy(() => import('./components/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const FeedbackAnalyticsDashboard = lazy(() => import('./components/admin/FeedbackAnalyticsDashboard').then(m => ({ default: m.FeedbackAnalyticsDashboard })));
const UserEngagementMetrics = lazy(() => import('./components/admin/UserEngagementMetrics').then(m => ({ default: m.UserEngagementMetrics })));

function LoginRoute() {
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

function AppContent() {
  const { user, loading, profileLoaded, profile, profileError, loadingTimedOut, forceSkipLoading, retryLoadProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Debug logs
  console.log('[AppContent] State:', {
    user: user ? 'present' : 'null',
    profile: profile ? 'present' : 'null',
    loading,
    profileLoaded,
    profileError,
    loadingTimedOut
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && !profileError) {
      console.log('[AppContent] No user, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [user, loading, profileError, navigate]);

  // Show emergency access page if loading timed out AND there's an error
  if (loadingTimedOut && profileError && !user) {
    console.log('[AppContent] Showing emergency access page');
    return (
      <EmergencyAccessPage
        errorMessage={profileError}
        onRetry={retryLoadProfile}
        onSkip={forceSkipLoading}
      />
    );
  }

  // Show loading screen while authenticating OR while profile is loading
  if (loading || (user && !profileLoaded && !profileError)) {
    console.log('[AppContent] Showing loading screen - loading:', loading, 'profileLoaded:', profileLoaded);
    return (
      <LoadingWithTimeout
        message="Chargement de votre profil"
        submessage="Connexion à Supabase en cours..."
        timedOut={loadingTimedOut}
        onSkip={forceSkipLoading}
        onRetry={retryLoadProfile}
        showEnvironmentWarning={true}
      />
    );
  }

  // Show profile recovery if there's a profile error and user is authenticated
  if (user && profileError && (profileError.includes('PROFILE_NOT_FOUND') || profileError.includes('permission') || profileError.includes('Permission'))) {
    console.log('[AppContent] Showing profile recovery');
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

  // Don't render anything if not authenticated (will redirect via useEffect)
  if (!user) {
    console.log('[AppContent] No user, showing spinner (will redirect)');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  console.log('[AppContent] Rendering dashboard layout');

  const renderPage = () => {
    console.log('[AppContent] renderPage called, currentPage:', currentPage);
    switch (currentPage) {
      case 'dashboard':
        console.log('[AppContent] Rendering DealerDashboardComplete');
        return <DealerDashboardComplete onNavigate={setCurrentPage} />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'organizations':
        return <OrganizationsManagement />;
      case 'billing':
        return <BillingDashboard />;
      case 'new-warranty':
        return <NewWarranty />;
      case 'smart-warranty':
        return <SmartNewWarranty />;
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
      case 'email-queue':
        return <EmailQueueManager />;
      case 'response-templates':
        return <ResponseTemplatesManager />;
      case 'supabase-health':
        return <SupabaseHealthCheck />;
      case 'demo-features':
        return <DemoNewFeatures />;
      case 'help':
        return <HelpCenterPage />;
      case 'settings':
        return <SettingsPage />;
      case 'automation':
        return <AutomationDashboard />;
      case 'notification-preferences':
        return <NotificationPreferences />;
      case 'feedback-analytics':
        return <FeedbackAnalyticsDashboard />;
      case 'user-engagement':
        return <UserEngagementMetrics />;
      default:
        return <Dashboard />;
    }
  };

  console.log('[AppContent] About to render DashboardLayoutV2');

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
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
                      <BoltModeWarning />
                      <NetworkStatusIndicator />
                      <Suspense fallback={
                        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                        </div>
                      }>
                        <Routes>
                          <Route path="/login" element={<LoginRoute />} />
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
