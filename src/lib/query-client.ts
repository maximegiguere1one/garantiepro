import { QueryClient } from '@tanstack/react-query';
import { errorMonitor } from './monitoring/error-monitor';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 404) return false;
        if (error?.status === 401) return false;
        if (error?.status === 403) return false;
        return failureCount < MAX_RETRIES;
      },
      retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        errorMonitor.captureException(
          error?.message || 'Mutation failed',
          {
            component: 'QueryClient',
            action: 'mutation',
            metadata: { error }
          },
          'high'
        );
      },
    },
  },
});

export const queryKeys = {
  warranties: {
    all: ['warranties'] as const,
    lists: () => [...queryKeys.warranties.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.warranties.lists(), filters] as const,
    details: () => [...queryKeys.warranties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warranties.details(), id] as const,
  },
  claims: {
    all: ['claims'] as const,
    lists: () => [...queryKeys.claims.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.claims.lists(), filters] as const,
    details: () => [...queryKeys.claims.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.claims.details(), id] as const,
  },
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.organizations.lists(), filters] as const,
    details: () => [...queryKeys.organizations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
  },
  plans: {
    all: ['plans'] as const,
    lists: () => [...queryKeys.plans.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.plans.lists(), filters] as const,
  },
} as const;

export function invalidateWarranties() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
}

export function invalidateClaims() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
}

export function invalidateCustomers() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
}

export function prefetchWarranties(filters?: Record<string, any>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.warranties.list(filters),
    queryFn: async () => {
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
