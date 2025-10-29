import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { ViewModeToggle } from './common/ViewModeToggle';
import { useOnboardingTour } from './OnboardingTour';
import {
  LayoutDashboard,
  FileText,
  Users,
  AlertCircle,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Award,
  BarChart3,
  Package,
  Building2,
  DollarSign,
  TrendingUp,
  Search,
  Mail,
  Stethoscope,
  TestTube,
  Wrench,
  BellRing,
  UserPlus,
  Lightbulb,
  Activity,
  Server,
  Database,
  FileCheck,
  CreditCard,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function DashboardLayout({ children, currentPage, onNavigate }: DashboardLayoutProps) {
  const { profile, signOut, loading, isOwner, organization: currentOrganization, profileError, retryLoadProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { OnboardingTour } = useOnboardingTour();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRetryProfile = async () => {
    setRetrying(true);
    try {
      await retryLoadProfile();
    } catch (error) {
      console.error('Error retrying profile load:', error);
    } finally {
      setRetrying(false);
    }
  };

  const ownerNavigation = [
    { id: 'admin-dashboard', name: 'Dashboard Admin', icon: TrendingUp, roles: ['admin', 'master'], isOwnerOnly: true },
    { id: 'organizations', name: 'Franchisés', icon: Building2, roles: ['admin', 'master'], isOwnerOnly: true },
  ];

  const franchiseeNavigation = [
    { id: 'billing', name: 'Facturation', icon: DollarSign, roles: ['admin', 'master'], isFranchiseeOnly: true },
  ];

  const standardNavigation = [
    { id: 'dashboard', name: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'master', 'f_and_i', 'operations'], section: 'main' },

    { id: 'warranties', name: 'Garanties', icon: ShieldCheck, roles: ['admin', 'master', 'f_and_i', 'operations', 'client'], section: 'sales' },
    { id: 'new-warranty', name: 'Nouvelle vente', icon: FileText, roles: ['admin', 'master', 'f_and_i'], section: 'sales' },
    { id: 'my-products', name: 'Mes Produits', icon: Package, roles: ['client'], section: 'sales' },
    { id: 'dealer-inventory', name: 'Mon Inventaire', icon: Package, roles: ['admin', 'master', 'f_and_i'], section: 'sales' },
    { id: 'warranty-templates', name: 'Documents & Contrats', icon: FileText, roles: ['admin', 'master', 'f_and_i'], section: 'sales' },

    { id: 'claims', name: 'Réclamations', icon: AlertCircle, roles: ['admin', 'master', 'operations', 'client'], section: 'support' },
    { id: 'response-templates', name: 'Modèles de réponse', icon: FileCheck, roles: ['admin', 'master', 'operations'], section: 'support' },

    { id: 'customers', name: 'Clients', icon: Users, roles: ['admin', 'master', 'f_and_i', 'operations'], section: 'management' },
    { id: 'loyalty', name: 'Programme de fidélité', icon: Award, roles: ['admin', 'master', 'f_and_i'], section: 'management' },
    { id: 'analytics', name: 'Analytiques', icon: BarChart3, roles: ['admin', 'master', 'f_and_i'], section: 'management' },

    { id: 'signature-audit', name: 'Audit Signatures', icon: ShieldCheck, roles: ['admin', 'master'], section: 'admin' },
    { id: 'quickbooks-sync', name: 'QuickBooks Sync', icon: CreditCard, roles: ['admin', 'master'], section: 'admin' },
    { id: 'email-queue', name: 'Gestion Emails', icon: Mail, roles: ['admin', 'master'], section: 'admin' },
    { id: 'invitations-monitor', name: 'Invitations', icon: UserPlus, roles: ['admin', 'master'], section: 'admin' },
    { id: 'push-notifications', name: 'Notifications Push', icon: BellRing, roles: ['admin', 'master'], section: 'admin' },
    { id: 'settings', name: 'Paramètres', icon: Settings, roles: ['admin', 'master'], section: 'admin' },

    { id: 'system-diagnostics', name: 'Diagnostics Système', icon: Stethoscope, roles: ['admin', 'master'], section: 'tools' },
    { id: 'warranty-diagnostics', name: 'Diagnostics Garanties', icon: Activity, roles: ['admin', 'master'], section: 'tools' },
    { id: 'supabase-health', name: 'État Supabase', icon: Database, roles: ['admin', 'master'], section: 'tools' },
    { id: 'warranty-form-test', name: 'Test Formulaire', icon: Wrench, roles: ['admin', 'master'], section: 'tools' },
    { id: 'demo-features', name: 'Démo Nouvelles Features', icon: Lightbulb, roles: ['admin', 'master'], section: 'tools' },
  ];

  let navigation = [...standardNavigation];

  if (isOwner) {
    navigation = [...ownerNavigation, ...standardNavigation];
  } else if (currentOrganization?.type === 'franchisee') {
    navigation = [...franchiseeNavigation, ...standardNavigation];
  }

  const visibleNavigation = navigation.filter(
    (item) => profile && item.roles.includes(profile.role)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur de profil</h2>
            <p className="text-slate-600 mb-6">
              {profileError || 'Impossible de charger votre profil. Veuillez réessayer.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleRetryProfile}
                disabled={retrying}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {retrying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Nouvelle tentative...</span>
                  </>
                ) : (
                  'Réessayer maintenant'
                )}
              </button>

              <button
                onClick={handleSignOut}
                disabled={retrying}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Se déconnecter
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">
                Si le problème persiste:
              </p>
              <ul className="text-xs text-left text-slate-600 space-y-2 bg-slate-50 rounded-lg p-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">1.</span>
                  <span>Attendez 1-2 minutes (votre profil est peut-être en cours de création)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">2.</span>
                  <span>Vérifiez votre connexion Internet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">3.</span>
                  <span>Contactez votre administrateur système</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Gestion Garanties</span>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToggle />
            <NotificationCenter />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">Gestion Garanties</span>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <ViewModeToggle />
              <NotificationCenter />
            </div>
          </div>

          <div className="px-4 py-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Search className="w-5 h-5" />
              <span className="flex-1 text-left">Recherche rapide...</span>
              <kbd className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded">⌘K</kbd>
            </button>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {(() => {
              const sections: Record<string, string> = {
                main: 'Principal',
                sales: 'Ventes',
                support: 'Support',
                management: 'Gestion',
                admin: 'Administration',
                tools: 'Outils',
              };

              let currentSection = '';
              return visibleNavigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const showSectionHeader = item.section && item.section !== currentSection;

                if (showSectionHeader) {
                  currentSection = item.section || '';
                }

                return (
                  <div key={item.id}>
                    {showSectionHeader && index > 0 && (
                      <div className="pt-4 pb-2">
                        <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {sections[item.section || '']}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        onNavigate(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  </div>
                );
              });
            })()}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-slate-700">
                  {profile?.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {OnboardingTour}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
