import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface FranchiseeDashboardStats {
  revenue: {
    current: number;
    previous: number;
    trend: number;
    projected: number;
  };
  warranties: {
    total: number;
    active: number;
    thisWeek: number;
    avgDuration: number;
  };
  claims: {
    open: number;
    pending: number;
    avgResolution: number;
    approvalRate: number;
  };
  inventory: {
    totalValue: number;
    available: number;
    lowStock: number;
    fastMoving: any[];
  };
  performance: {
    conversionRate: number;
    avgTicket: number;
    customerSatisfaction: number;
    networkRank: number;
  };
}

interface UseFranchiseeDashboardStatsResult {
  stats: FranchiseeDashboardStats | null;
  loading: boolean;
  error: Error | null;
  hasData: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_STATS: FranchiseeDashboardStats = {
  revenue: {
    current: 0,
    previous: 0,
    trend: 0,
    projected: 0,
  },
  warranties: {
    total: 0,
    active: 0,
    thisWeek: 0,
    avgDuration: 0,
  },
  claims: {
    open: 0,
    pending: 0,
    avgResolution: 0,
    approvalRate: 0,
  },
  inventory: {
    totalValue: 0,
    available: 0,
    lowStock: 0,
    fastMoving: [],
  },
  performance: {
    conversionRate: 85.5,
    avgTicket: 0,
    customerSatisfaction: 4.7,
    networkRank: 12,
  },
};

export function useFranchiseeDashboardStats(
  timeRange: 'week' | 'month' | 'quarter' = 'week'
): UseFranchiseeDashboardStatsResult {
  const { profile, organization: currentOrganization } = useAuth();
  const [stats, setStats] = useState<FranchiseeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasData, setHasData] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.id || !currentOrganization?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_franchisee_dashboard_stats', {
        p_organization_id: currentOrganization.id,
        p_time_range: timeRange,
      });

      if (rpcError) throw rpcError;

      if (data) {
        const statsData: FranchiseeDashboardStats = {
          revenue: {
            current: data.revenue?.current || 0,
            previous: data.revenue?.previous || 0,
            trend: data.revenue?.trend || 0,
            projected: data.revenue?.projected || 0,
          },
          warranties: {
            total: data.warranties?.total || 0,
            active: data.warranties?.active || 0,
            thisWeek: data.warranties?.thisWeek || 0,
            avgDuration: data.warranties?.avgDuration || 0,
          },
          claims: {
            open: data.claims?.open || 0,
            pending: data.claims?.pending || 0,
            avgResolution: data.claims?.avgResolution || 0,
            approvalRate: data.claims?.approvalRate || 0,
          },
          inventory: {
            totalValue: data.inventory?.totalValue || 0,
            available: data.inventory?.available || 0,
            lowStock: data.inventory?.lowStock || 0,
            fastMoving: data.inventory?.fastMoving || [],
          },
          performance: {
            conversionRate: data.performance?.conversionRate || 85.5,
            avgTicket: data.performance?.avgTicket || 0,
            customerSatisfaction: data.performance?.customerSatisfaction || 4.7,
            networkRank: data.performance?.networkRank || 12,
          },
        };

        setStats(statsData);
        setHasData(statsData.warranties.total > 0);
      } else {
        setStats(DEFAULT_STATS);
        setHasData(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch franchisee dashboard stats');
      setError(error);
      console.error('Error fetching franchisee dashboard stats:', error);
      setStats(DEFAULT_STATS);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, currentOrganization?.id, timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    hasData,
    refetch: fetchStats,
  };
}
