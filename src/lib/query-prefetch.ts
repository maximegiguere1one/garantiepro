import { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface PrefetchConfig {
  queryKey: string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
}

export class QueryPrefetcher {
  constructor(private queryClient: QueryClient) {}

  async prefetchWarranties(organizationId?: string) {
    return this.queryClient.prefetchQuery({
      queryKey: ['warranties', organizationId],
      queryFn: async () => {
        let query = supabase
          .from('warranties')
          .select('*, customers(*), trailers(*), warranty_plans(*)');

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }

  async prefetchCustomers(organizationId?: string) {
    return this.queryClient.prefetchQuery({
      queryKey: ['customers', organizationId],
      queryFn: async () => {
        let query = supabase.from('customers').select('*');

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

        if (error) throw error;
        return data;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }

  async prefetchClaims(organizationId?: string) {
    return this.queryClient.prefetchQuery({
      queryKey: ['claims', organizationId],
      queryFn: async () => {
        let query = supabase.from('warranty_claims').select('*, warranties(*)');

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

        if (error) throw error;
        return data;
      },
      staleTime: 3 * 60 * 1000, // 3 minutes
    });
  }

  async prefetchSettings(organizationId: string) {
    return Promise.all([
      this.queryClient.prefetchQuery({
        queryKey: ['company_settings', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .eq('organization_id', organizationId)
            .maybeSingle();

          if (error) throw error;
          return data;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),
      this.queryClient.prefetchQuery({
        queryKey: ['warranty_plans', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('warranty_plans')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true);

          if (error) throw error;
          return data;
        },
        staleTime: 15 * 60 * 1000, // 15 minutes
      }),
    ]);
  }

  async prefetchDashboardData(organizationId: string) {
    return Promise.all([
      this.prefetchWarranties(organizationId),
      this.prefetchCustomers(organizationId),
      this.prefetchClaims(organizationId),
      this.prefetchSettings(organizationId),
    ]);
  }

  prefetchOnIdle(configs: PrefetchConfig[]) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        configs.forEach((config) => {
          this.queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            staleTime: config.staleTime || 5 * 60 * 1000,
          });
        });
      });
    } else {
      setTimeout(() => {
        configs.forEach((config) => {
          this.queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            staleTime: config.staleTime || 5 * 60 * 1000,
          });
        });
      }, 1000);
    }
  }

  invalidateAll() {
    return this.queryClient.invalidateQueries();
  }

  clearCache() {
    return this.queryClient.clear();
  }
}

export function createPrefetcher(queryClient: QueryClient) {
  return new QueryPrefetcher(queryClient);
}
