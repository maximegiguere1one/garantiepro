import { ReactNode, useState } from 'react';
import { ShieldCheck, LogOut, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { ViewModeToggle } from './common/ViewModeToggle';
import { NavigationSidebar } from './navigation/NavigationSidebar';
import { MobileNav } from './navigation/MobileNav';
import { QuickActionsMenu } from './navigation/QuickActionsMenu';
import { PageBreadcrumbs } from './navigation/PageBreadcrumbs';
import { DeveloperModeToggle } from './navigation/DeveloperModeToggle';
import { FranchiseSwitcher } from './navigation/FranchiseSwitcher';
import {
  buildNavigation,
  getQuickActions,
} from '../config/navigation.config';
import {
  generateBreadcrumbs,
  getPageTitle,
  getPageDescription,
} from '../utils/navigation.utils';

interface DashboardLayoutV2Props {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function DashboardLayoutV2({
  children,
  currentPage,
  onNavigate,
}: DashboardLayoutV2Props) {
  const {
    profile,
    signOut,
    isOwner,
    organization: currentOrganization,
    user,
  } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(
    () => localStorage.getItem('devMode') === 'true'
  );

  // If no profile but we have a user, show layout with fallback data
  if (!profile && user) {
    console.log('[DashboardLayoutV2] No profile yet, using fallback layout with navigation');

    // Minimal fallback navigation
    const fallbackNavigation = [
      { id: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard', page: 'dashboard' },
      { id: 'new-warranty', label: 'Nouvelle garantie', icon: 'Plus', page: 'new-warranty' },
      { id: 'warranties', label: 'Garanties', icon: 'FileText', page: 'warranties' },
    ];

    return (
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <img
                src="/Pro remorque.png"
                alt="Pro Remorque"
                className="h-8 w-auto"
              />
              <span className="font-semibold text-slate-900">Pro Remorque</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1">
            {fallbackNavigation.map((item) => {
              const Icon = icons[item.icon as keyof typeof icons];
              const isActive = currentPage === item.page;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.page)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 text-left
                    ${isActive
                      ? 'bg-red-50 text-red-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info at Bottom */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-red-700">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-600 truncate">{user.email}</span>
              </div>
              <button
                onClick={signOut}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-2"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Chargement du profil...
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // If no user at all, return null
  if (!profile) {
    console.warn('[DashboardLayoutV2] No profile and no user - returning null');
    return null;
  }

  // Build navigation based on user context
  const navigation = buildNavigation(
    profile.role,
    isOwner,
    currentOrganization?.type as 'franchisee' | 'master' | null,
    showDevTools
  );

  const quickActions = getQuickActions(profile.role);
  const breadcrumbs = generateBreadcrumbs(currentPage, navigation);
  const pageTitle = getPageTitle(currentPage);
  const pageDescription = getPageDescription(currentPage);

  const logo = (
    <div className="flex items-center gap-3">
      <img
        src="/Pro remorque.png"
        alt="Pro Remorque"
        className="h-8 w-auto"
      />
      <span className="font-semibold text-slate-900">Pro Remorque</span>
    </div>
  );

  const userActions = (
    <div className="flex items-center gap-2">
      <ViewModeToggle />
      <NotificationCenter />
    </div>
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Navigation */}
      <MobileNav
        sections={navigation}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onSearchOpen={() => setSearchOpen(true)}
        logo={logo}
        actions={userActions}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 flex-shrink-0">
            {logo}
          </div>

          {/* Search & Quick Actions */}
          <div className="px-4 py-4 space-y-3 border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Search className="w-5 h-5" />
              <span className="flex-1 text-left">Recherche rapide...</span>
              <kbd className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded">
                ⌘K
              </kbd>
            </button>

            {(profile.role === 'admin' || profile.role === 'master') && (
              <DeveloperModeToggle onChange={setShowDevTools} />
            )}
          </div>

          {/* Franchise Switcher */}
          <div className="px-4 mb-4">
            <FranchiseSwitcher />
          </div>

          {/* Navigation */}
          <NavigationSidebar
            sections={navigation}
            currentPage={currentPage}
            onNavigate={onNavigate}
          />

          {/* User Profile */}
          <div className="border-t border-slate-200 p-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-slate-700">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-slate-500 capitalize truncate">
                  {profile?.role.replace('_', ' ')}
                </p>
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

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        {/* Page Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <PageBreadcrumbs
                breadcrumbs={breadcrumbs}
                onNavigate={onNavigate}
              />
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 truncate">
                  {pageTitle}
                </h1>
              </div>
              {pageDescription && (
                <p className="text-sm text-slate-500 mt-1">{pageDescription}</p>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <ViewModeToggle />
              <NotificationCenter />
              {quickActions.length > 0 && (
                <QuickActionsMenu
                  actions={quickActions}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>

      {/* Global Search */}
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
