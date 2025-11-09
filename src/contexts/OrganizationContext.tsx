import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { createLogger } from '../lib/logger';
import { getEnvironmentType } from '../lib/environment-detection';
import { DEMO_ORG_ID, DEMO_ORGANIZATION } from '../lib/demo-constants';
import type { Database } from '../lib/database.types';

const logger = createLogger('[OrganizationContext]');

type Organization = Database['public']['Tables']['organizations']['Row'];

interface OrganizationContextType {
  currentOrganization: Organization | null;
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    // Check for demo environment first
    const envType = getEnvironmentType();
    if (envType === 'webcontainer' || envType === 'bolt') {
      logger.info('[OrganizationContext] Demo env detected — returning DEMO_ORGANIZATION');

      // Clean up localStorage if it contains stale organization IDs in demo mode
      const stored = localStorage.getItem('active_organization_id');
      if (stored && stored !== DEMO_ORG_ID) {
        logger.debug('[OrganizationContext] Clearing stale organization ID from localStorage');
        localStorage.removeItem('active_organization_id');
      }

      // Set demo organization and exit
      setCurrentOrganization(DEMO_ORGANIZATION);
      setIsOwner(true);
      setError(null);
      setLoading(false);
      return;
    }

    if (!profile) {
      setLoading(false);
      return;
    }

    if (!profile.organization_id) {
      logger.warn(`Profile ${profile.email} has no organization_id`);
      setError('Votre profil n\'est pas associé à une organisation. Veuillez contacter le support.');
      setLoading(false);
      return;
    }

    try {
      logger.debug('[OrganizationContext] Loading organization:', profile.organization_id);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        logger.error(`Organization ${profile.organization_id} not found`);
        setError('Organisation introuvable. Veuillez contacter le support.');
        setLoading(false);
        return;
      }

      logger.debug('Organization loaded successfully:', data.name);
      setCurrentOrganization(data);
      setIsOwner(data.type === 'owner' && profile.role === 'admin');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Error loading organization:', error);
      setError(`Erreur lors du chargement de l'organisation: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const refreshOrganization = async () => {
    setLoading(true);
    await loadOrganization();
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        isOwner,
        loading,
        error,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
