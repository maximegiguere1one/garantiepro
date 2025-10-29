import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Breadcrumbs } from './common/Breadcrumbs';
import { ProgressBar } from './common/ProgressIndicator';

interface WarrantyData {
  total_price: number;
  margin: number;
  status: string;
  created_at: string;
  sale_duration_seconds: number | null;
  warranty_plans: { name?: string } | null;
}

interface ClaimData {
  status: string;
  created_at: string;
  approved_amount: number | null;
}

interface CustomerData {
  created_at: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalMargin: number;
  totalWarranties: number;
  activeWarranties: number;
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  pendingClaims: number;
  totalCustomers: number;
  avgSaleDuration: number;
  claimsApprovalRate: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topPlans: { name: string; count: number }[];
  claimsByStatus: { status: string; count: number }[];
}

export function AnalyticsPage() {
  const {} = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const [warrantiesResult, claimsResult, customersResult] = await Promise.all([
        supabase
          .from('warranties')
          .select('total_price, margin, status, created_at, duration_months, sale_duration_seconds, plan_id, warranty_plans(name)')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('claims')
          .select('status, created_at, approved_amount')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('customers')
          .select('created_at')
          .gte('created_at', startDate.toISOString()),
      ]);

      if (warrantiesResult.error) throw warrantiesResult.error;
      if (claimsResult.error) throw claimsResult.error;
      if (customersResult.error) throw customersResult.error;

      const warranties = (warrantiesResult.data || []) as WarrantyData[];
      const claims = (claimsResult.data || []) as ClaimData[];
      const customers = (customersResult.data || []) as CustomerData[];

      const totalRevenue = warranties.reduce((sum, w) => sum + w.total_price, 0);
      const totalMargin = warranties.reduce((sum, w) => sum + w.margin, 0);
      const activeWarranties = warranties.filter(w => w.status === 'active').length;
      const approvedClaims = claims.filter(c => c.status === 'approved' || c.status === 'completed').length;
      const deniedClaims = claims.filter(c => c.status === 'denied').length;
      const pendingClaims = claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length;

      const avgSaleDuration = warranties.length > 0
        ? warranties.reduce((sum, w) => sum + (w.sale_duration_seconds || 0), 0) / warranties.length
        : 0;

      const claimsApprovalRate = claims.length > 0
        ? (approvedClaims / claims.length) * 100
        : 0;

      const monthlyRevenue: { month: string; revenue: number }[] = [];
      const monthsMap = new Map<string, number>();

      warranties.forEach(w => {
        const month = new Date(w.created_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short' });
        monthsMap.set(month, (monthsMap.get(month) || 0) + w.total_price);
      });

      monthsMap.forEach((revenue, month) => {
        monthlyRevenue.push({ month, revenue });
      });
      monthlyRevenue.sort((a, b) => a.month.localeCompare(b.month));

      const plansMap = new Map<string, number>();
      warranties.forEach(w => {
        const planName = w.warranty_plans?.name || 'Unknown';
        plansMap.set(planName, (plansMap.get(planName) || 0) + 1);
      });

      const topPlans = Array.from(plansMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const claimsByStatus: { status: string; count: number }[] = [
        { status: 'Approuvées', count: approvedClaims },
        { status: 'Refusées', count: deniedClaims },
        { status: 'En attente', count: pendingClaims },
      ];

      setData({
        totalRevenue,
        totalMargin,
        totalWarranties: warranties.length,
        activeWarranties,
        totalClaims: claims.length,
        approvedClaims,
        deniedClaims,
        pendingClaims,
        totalCustomers: customers.length,
        avgSaleDuration,
        claimsApprovalRate,
        monthlyRevenue,
        topPlans,
        claimsByStatus,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Erreur', 'Impossible de charger les analytiques');
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const maxMonthlyRevenue = Math.max(...data.monthlyRevenue.map(m => m.revenue), 1);
  const maxPlanCount = Math.max(...data.topPlans.map(p => p.count), 1);

  const marginPercentage = data.totalRevenue > 0 ? (data.totalMargin / data.totalRevenue) * 100 : 0;

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Analytiques' }]} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytiques</h1>
          <p className="text-slate-600 mt-2">Vue d'ensemble des performances</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
        >
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="90d">90 derniers jours</option>
          <option value="1y">1 an</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProgressBar
          percentage={marginPercentage}
          label="Marge bénéficiaire"
          color={marginPercentage >= 30 ? "emerald" : marginPercentage >= 20 ? "blue" : "amber"}
        />
        <ProgressBar
          percentage={data.claimsApprovalRate}
          label="Taux d'approbation réclamations"
          color={data.claimsApprovalRate >= 80 ? "emerald" : data.claimsApprovalRate >= 60 ? "blue" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Revenus totaux</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Marge totale</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalMargin)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {((data.totalMargin / data.totalRevenue) * 100).toFixed(1)}% du revenu
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <Shield className="w-6 h-6 text-slate-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Garanties vendues</p>
          <p className="text-2xl font-bold text-slate-900">{data.totalWarranties}</p>
          <p className="text-xs text-slate-500 mt-1">{data.activeWarranties} actives</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Nouveaux clients</p>
          <p className="text-2xl font-bold text-slate-900">{data.totalCustomers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Durée moyenne de vente</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-4">{formatDuration(data.avgSaleDuration)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Taux d'approbation</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-4">{data.claimsApprovalRate.toFixed(1)}%</p>
          <p className="text-sm text-slate-500 mt-2">
            {data.approvedClaims} sur {data.totalClaims} réclamations
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-1">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-slate-900">Réclamations actives</h3>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-4">{data.pendingClaims}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Revenus mensuels</h3>
          {data.monthlyRevenue.length > 0 ? (
            <div className="space-y-4">
              {data.monthlyRevenue.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.month}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(item.revenue / maxMonthlyRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Aucune donnée disponible</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Plans les plus populaires</h3>
          {data.topPlans.length > 0 ? (
            <div className="space-y-4">
              {data.topPlans.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 truncate flex-1">{item.name}</span>
                    <span className="font-medium text-slate-900 ml-2">{item.count} ventes</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / maxPlanCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Aucune donnée disponible</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Statut des réclamations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.claimsByStatus.map((item, index) => {
            const colors = [
              { bg: 'bg-emerald-50', text: 'text-emerald-900', bar: 'bg-emerald-500' },
              { bg: 'bg-red-50', text: 'text-red-900', bar: 'bg-red-500' },
              { bg: 'bg-amber-50', text: 'text-amber-900', bar: 'bg-amber-500' },
            ];
            const color = colors[index] || colors[0];
            const percentage = data.totalClaims > 0 ? (item.count / data.totalClaims) * 100 : 0;

            return (
              <div key={index} className={`${color.bg} rounded-lg p-4`}>
                <p className={`text-sm font-medium ${color.text} mb-2`}>{item.status}</p>
                <p className={`text-3xl font-bold ${color.text} mb-3`}>{item.count}</p>
                <div className="w-full bg-white/50 rounded-full h-2">
                  <div
                    className={`${color.bar} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-2">{percentage.toFixed(0)}% du total</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
