import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Download,
  Bell,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ErrorSeverity, ErrorCode } from '../lib/error-types';
import { errorFingerprintGenerator } from '../lib/error-fingerprint';
import { breadcrumbTracker } from '../lib/error-breadcrumbs';
import { errorRecoveryManager } from '../lib/error-recovery';

interface ErrorStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  activeFingerprints: number;
  affectedUsers: number;
}

interface ErrorTrend {
  hour: string;
  count: number;
  uniqueErrors: number;
}

export function ErrorDashboard() {
  const [stats, setStats] = useState<ErrorStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
    activeFingerprints: 0,
    affectedUsers: 0,
  });
  const [trends, setTrends] = useState<ErrorTrend[]>([]);
  const [topErrors, setTopErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadErrorStats(),
        loadErrorTrends(),
        loadTopErrors(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadErrorStats = async () => {
    const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('error_logs')
      .select('severity, resolved_at, user_id')
      .gte('created_at', since);

    if (error) throw error;

    const uniqueUsers = new Set(data?.map(e => e.user_id).filter(Boolean));

    setStats({
      total: data?.length || 0,
      critical: data?.filter(e => e.severity === 'critical').length || 0,
      high: data?.filter(e => e.severity === 'high').length || 0,
      medium: data?.filter(e => e.severity === 'medium').length || 0,
      low: data?.filter(e => e.severity === 'low').length || 0,
      resolved: data?.filter(e => e.resolved_at).length || 0,
      activeFingerprints: errorFingerprintGenerator.getAllFingerprints().length,
      affectedUsers: uniqueUsers.size,
    });
  };

  const loadErrorTrends = async () => {
    const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;

    const { data, error } = await supabase.rpc('get_error_trends', {
      p_organization_id: null,
      p_hours: hours,
    });

    if (error) {
      console.error('Failed to load trends:', error);
      return;
    }

    setTrends(
      data?.map((t: any) => ({
        hour: new Date(t.hour_bucket).toLocaleTimeString(),
        count: parseInt(t.error_count),
        uniqueErrors: parseInt(t.unique_errors),
      })) || []
    );
  };

  const loadTopErrors = async () => {
    const { data, error } = await supabase
      .from('error_fingerprints')
      .select('*')
      .eq('status', 'active')
      .order('severity_score', { ascending: false })
      .limit(10);

    if (error) throw error;
    setTopErrors(data || []);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-green-600';
      case 'investigating':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Error Management Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Real-time error monitoring and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Errors"
          value={stats.total}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-slate-600"
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={<XCircle className="w-5 h-5" />}
          color="text-red-600"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={<CheckCircle className="w-5 h-5" />}
          color="text-green-600"
        />
        <StatCard
          title="Affected Users"
          value={stats.affectedUsers}
          icon={<Users className="w-5 h-5" />}
          color="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Error Trends</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {trends.map((trend, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-red-500 rounded-t transition-all hover:bg-red-600"
                  style={{
                    height: `${Math.max((trend.count / Math.max(...trends.map(t => t.count))) * 100, 5)}%`,
                  }}
                  title={`${trend.count} errors`}
                />
                <span className="text-xs text-slate-600 mt-2 transform -rotate-45 origin-top-left">
                  {trend.hour}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribution by Severity</h2>
          <div className="space-y-3">
            <SeverityBar label="Critical" count={stats.critical} total={stats.total} color="bg-red-500" />
            <SeverityBar label="High" count={stats.high} total={stats.total} color="bg-orange-500" />
            <SeverityBar label="Medium" count={stats.medium} total={stats.total} color="bg-yellow-500" />
            <SeverityBar label="Low" count={stats.low} total={stats.total} color="bg-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Top Errors by Impact</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {topErrors.map(error => (
            <div key={error.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor('high')}`}>
                      Score: {error.severity_score}
                    </span>
                    <span className={`text-sm font-medium ${getStatusColor(error.status)}`}>
                      {error.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {error.normalized_message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {error.occurrence_count} occurrences
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {error.affected_user_count} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last seen {new Date(error.last_seen_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button className="text-slate-600 hover:text-slate-900">
                  <Bell className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Circuit Breaker Status</h2>
          <CircuitBreakerStatus />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recovery Statistics</h2>
          <RecoveryStats />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}

function SeverityBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-600">{count}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CircuitBreakerStatus() {
  const [cbStates, setCbStates] = useState<any>({});

  useEffect(() => {
    const states = errorRecoveryManager.getAllCircuitBreakerStates();
    setCbStates(states);
  }, []);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'text-green-600 bg-green-100';
      case 'half_open':
        return 'text-yellow-600 bg-yellow-100';
      case 'open':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  if (Object.keys(cbStates).length === 0) {
    return <p className="text-sm text-slate-600">No circuit breakers active</p>;
  }

  return (
    <div className="space-y-2">
      {Object.entries(cbStates).map(([name, state]: [string, any]) => (
        <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="text-sm font-medium text-slate-900">{name}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(state.state)}`}>
            {state.state}
          </span>
        </div>
      ))}
    </div>
  );
}

function RecoveryStats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const recoveryStats = errorRecoveryManager.getRecoveryStats();
    setStats(recoveryStats);
  }, []);

  if (!stats) {
    return <p className="text-sm text-slate-600">No recovery data available</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-600">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-slate-600">Total Attempts</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(stats.byStrategy).map(([strategy, data]: [string, any]) => (
          <div key={strategy} className="flex justify-between text-sm">
            <span className="text-slate-700 capitalize">{strategy.replace(/_/g, ' ')}</span>
            <span className="text-slate-600">
              {data.successful}/{data.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
