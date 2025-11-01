import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPrefetcher } from '../lib/query-prefetch';
import { useOrganization } from '../contexts/OrganizationContext';

export function useDashboardPrefetch() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization?.id) return;

    const prefetcher = createPrefetcher(queryClient);

    const timeoutId = setTimeout(() => {
      prefetcher.prefetchDashboardData(currentOrganization.id).catch((error) => {
        console.warn('Failed to prefetch dashboard data:', error);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentOrganization?.id, queryClient]);
}

export function useWarrantiesPrefetch() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization?.id) return;

    const prefetcher = createPrefetcher(queryClient);

    const timeoutId = setTimeout(() => {
      prefetcher.prefetchWarranties(currentOrganization.id).catch((error) => {
        console.warn('Failed to prefetch warranties:', error);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentOrganization?.id, queryClient]);
}

export function useSettingsPrefetch() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization?.id) return;

    const prefetcher = createPrefetcher(queryClient);

    const timeoutId = setTimeout(() => {
      prefetcher.prefetchSettings(currentOrganization.id).catch((error) => {
        console.warn('Failed to prefetch settings:', error);
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentOrganization?.id, queryClient]);
}
