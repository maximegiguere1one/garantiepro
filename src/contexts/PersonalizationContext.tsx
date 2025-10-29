import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUserRole, UserRole } from '../hooks/useUserRole';
import rulesPerRole from '../config/rules-per-role.json';

interface RoleConfiguration {
  displayName: { en: string; fr: string };
  permissions: Record<string, Record<string, boolean>>;
  uiFeatures: Record<string, boolean>;
  dashboardWidgets: string[];
  navigation: {
    mainMenu: string[];
    quickActions: string[];
  };
  formConfigurations: Record<string, any>;
  limits: Record<string, number>;
  notifications: {
    channels: string[];
    frequency: string;
  };
  onboarding: {
    requiredTours: string[];
    autoStartTours: boolean;
  };
}

interface PersonalizationContextValue {
  role: UserRole | null;
  rules: RoleConfiguration | null;
  hasPermission: (resource: string, action: string) => boolean;
  canSeeFeature: (featureName: string) => boolean;
  getDashboardWidgets: () => string[];
  getNavigationItems: () => string[];
  getQuickActions: () => string[];
  loading: boolean;
}

const PersonalizationContext = createContext<PersonalizationContextValue | undefined>(undefined);

interface PersonalizationProviderProps {
  children: ReactNode;
}

export function PersonalizationProvider({ children }: PersonalizationProviderProps) {
  const { role, loading } = useUserRole();

  const rules = useMemo(() => {
    if (!role) return null;

    // Map roles to configuration keys
    const roleKey = role === 'master' ? 'admin' : role;

    // Get rules from JSON, defaulting to customer if not found
    const rolesConfig = rulesPerRole.roles as Record<string, RoleConfiguration>;
    return rolesConfig[roleKey] || rolesConfig.customer || null;
  }, [role]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!rules || !rules.permissions) return false;
    return rules.permissions[resource]?.[action] === true;
  };

  const canSeeFeature = (featureName: string): boolean => {
    if (!rules || !rules.uiFeatures) return false;
    return rules.uiFeatures[featureName] === true;
  };

  const getDashboardWidgets = (): string[] => {
    return rules?.dashboardWidgets || [];
  };

  const getNavigationItems = (): string[] => {
    return rules?.navigation?.mainMenu || [];
  };

  const getQuickActions = (): string[] => {
    return rules?.navigation?.quickActions || [];
  };

  const value: PersonalizationContextValue = {
    role,
    rules,
    hasPermission,
    canSeeFeature,
    getDashboardWidgets,
    getNavigationItems,
    getQuickActions,
    loading,
  };

  return (
    <PersonalizationContext.Provider value={value}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext);
  if (context === undefined) {
    throw new Error('usePersonalization must be used within PersonalizationProvider');
  }
  return context;
}
