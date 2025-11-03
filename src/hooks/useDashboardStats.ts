import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DashboardStats {
  totalWarranties: number;
  activeWarranties: number;
  totalRevenue: number;
  totalMargin: number;
  openClaims: number;
  avgSaleDuration: number;
  monthlyGrowth: number;
}

interface UseDashboardStatsResult {
  stats: DashboardStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const DEFAULT_STATS: DashboardStats = {
  totalWarranties: 0,
  activeWarranties: 0,
  totalRevenue: 0,
  totalMargin: 0,
  openClaims: 0,
  avgSaleDuration: 0,
  monthlyGrowth: 0,
};

export function useDashboardStats(): UseDashboardStatsResult {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
        p_organization_id: profile.organization_id,
      });

      if (rpcError) throw rpcError;

      if (data) {
        setStats({
          totalWarranties: data.totalWarranties || 0,
          activeWarranties: data.activeWarranties || 0,
          totalRevenue: data.totalRevenue || 0,
          totalMargin: data.totalMargin || 0,
          openClaims: data.openClaims || 0,
          avgSaleDuration: data.avgSaleDuration || 0,
          monthlyGrowth: data.monthlyGrowth || 0,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dashboard stats');
      setError(error);
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [profile?.organization_id]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
