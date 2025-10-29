import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { createLogger } from '../lib/logger';
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

  const loadOrganization = async () => {
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
      logger.debug('Loading organization:', profile.organization_id);
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
  };

  useEffect(() => {
    loadOrganization();
  }, [profile?.organization_id]);

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
