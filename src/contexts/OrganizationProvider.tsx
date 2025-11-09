/**
 * OrganizationProvider - Simplified with DataClient
 *
 * Manages organization context using the dataClient adapter.
 * Automatically uses demo data in WebContainer/Bolt mode.
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { dataClient, type Organization } from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { getEnvironmentType } from '@/lib/environment-detection';
import { DEMO_ORG_ID, DEMO_ORGANIZATION } from '@/lib/demo-constants';

export interface OrganizationContextValue {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

export const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { profile, user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const envType = getEnvironmentType();
  const isDemo = envType === 'webcontainer' || envType === 'bolt' || envType === 'stackblitz';

  const loadOrganization = useCallback(async (orgId: string) => {
    try {
      console.log('[OrganizationProvider] Loading organization:', orgId);

      if (isDemo) {
        console.log('[OrganizationProvider] Demo mode - using DEMO_ORGANIZATION');

        const storedOrgId = localStorage.getItem('active_organization_id');
        if (storedOrgId && storedOrgId !== DEMO_ORG_ID) {
          localStorage.removeItem('active_organization_id');
        }

        setCurrentOrganization(DEMO_ORGANIZATION);
        setOrganizations([DEMO_ORGANIZATION]);
        return;
      }

      const org = await dataClient.orgs.getOrg(orgId);

      if (!org) {
        throw new Error('Organization not found');
      }

      setCurrentOrganization(org);
      localStorage.setItem('active_organization_id', orgId);

      console.log('[OrganizationProvider] Organization loaded:', org.name);
    } catch (err: any) {
      console.error('[OrganizationProvider] Load error:', err);

      if (err?.message === 'ORG_FETCH_TIMEOUT') {
        throw new Error('Organization loading timed out. Please check your connection.');
      }

      throw err;
    }
  }, [isDemo]);

  const loadOrganizations = useCallback(async () => {
    try {
      if (isDemo) {
        setOrganizations([DEMO_ORGANIZATION]);
        return;
      }

      if (!profile) return;

      if (profile.role === 'master') {
        const allOrgs = await dataClient.orgs.getAllOrgs();
        setOrganizations(allOrgs);
      } else if (profile.role === 'owner' && profile.organization_id) {
        const childOrgs = await dataClient.orgs.getOrgsByParent(profile.organization_id);
        const currentOrg = await dataClient.orgs.getOrg(profile.organization_id);

        setOrganizations(currentOrg ? [currentOrg, ...childOrgs] : childOrgs);
      } else {
        const currentOrg = await dataClient.orgs.getOrg(profile.organization_id);
        setOrganizations(currentOrg ? [currentOrg] : []);
      }
    } catch (err) {
      console.error('[OrganizationProvider] Load organizations error:', err);
    }
  }, [isDemo, profile]);

  useEffect(() => {
    const initOrganization = async () => {
      if (!profile || !user) {
        setLoading(false);
        return;
      }

      try {
        if (isDemo) {
          setCurrentOrganization(DEMO_ORGANIZATION);
          setOrganizations([DEMO_ORGANIZATION]);
          return;
        }

        const storedOrgId = localStorage.getItem('active_organization_id');
        const orgId = storedOrgId || profile.organization_id;

        if (orgId) {
          await loadOrganization(orgId);
        }

        await loadOrganizations();
      } catch (err) {
        console.error('[OrganizationProvider] Init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initOrganization();
  }, [profile, user, isDemo, loadOrganization, loadOrganizations]);

  const switchOrganization = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      await loadOrganization(orgId);
    } finally {
      setLoading(false);
    }
  }, [loadOrganization]);

  const refreshOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      await loadOrganizations();

      if (currentOrganization) {
        await loadOrganization(currentOrganization.id);
      }
    } finally {
      setLoading(false);
    }
  }, [loadOrganizations, currentOrganization, loadOrganization]);

  const value: OrganizationContextValue = {
    currentOrganization,
    organizations,
    loading,
    switchOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
