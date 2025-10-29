import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, DollarSign, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { KPICard } from './ui';
import { useTranslation } from '../hooks/useTranslation';

interface DashboardStats {
  totalWarranties: number;
  activeWarranties: number;
  totalRevenue: number;
  totalMargin: number;
  openClaims: number;
  avgSaleDuration: number;
  monthlyGrowth: number;
}

export function Dashboard() {
  const { profile } = useAuth();
  const t = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalWarranties: 0,
    activeWarranties: 0,
    totalRevenue: 0,
    totalMargin: 0,
    openClaims: 0,
    avgSaleDuration: 0,
    monthlyGrowth: 0,
  });
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      loadDashboardData();
      loadCompanySettings();

      const channel = supabase
        .channel('company_settings_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'company_settings',
          },
          (payload) => {
            if (payload.new && 'company_name' in payload.new) {
              setCompanyName(payload.new.company_name as string);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  const loadCompanySettings = async () => {
    try {
      if (!profile?.organization_id) {
        console.warn('Cannot load company settings: no organization_id in profile');
        return;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (error) throw error;

      if (data?.company_name) {
        setCompanyName(data.company_name);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [warrantiesRes, claimsRes] = await Promise.all([
        supabase
          .from('warranties')
          .select('total_price, margin, status, sale_duration_seconds, created_at'),
        supabase
          .from('claims')
          .select('status')
          .in('status', ['submitted', 'under_review']),
      ]);

      if (warrantiesRes.data) {
        const total = warrantiesRes.data.length;
        const active = warrantiesRes.data.filter((w) => w.status === 'active').length;
        const revenue = warrantiesRes.data.reduce((sum, w) => sum + (w.total_price || 0), 0);
        const margin = warrantiesRes.data.reduce((sum, w) => sum + (w.margin || 0), 0);
        const avgDuration =
          warrantiesRes.data
            .filter((w) => w.sale_duration_seconds)
            .reduce((sum, w) => sum + (w.sale_duration_seconds || 0), 0) /
          (warrantiesRes.data.filter((w) => w.sale_duration_seconds).length || 1);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const lastMonth = new Date(thisMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const thisMonthCount = warrantiesRes.data.filter(
          (w) => new Date(w.created_at) >= thisMonth
        ).length;
        const lastMonthCount = warrantiesRes.data.filter(
          (w) => new Date(w.created_at) >= lastMonth && new Date(w.created_at) < thisMonth
        ).length;
        const growth = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

        setStats({
          totalWarranties: total,
          activeWarranties: active,
          totalRevenue: revenue,
          totalMargin: margin,
          openClaims: claimsRes.data?.length || 0,
          avgSaleDuration: Math.round(avgDuration),
          monthlyGrowth: growth,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: t('dashboard.kpis.revenue.title'),
      value: `${stats.totalRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`,
      icon: <DollarSign className="w-5 h-5" />,
      variant: 'primary' as const,
      trend: {
        value: stats.monthlyGrowth,
        isPositive: stats.monthlyGrowth >= 0,
      },
      subtitle: t('dashboard.kpis.revenue.thisMonth'),
    },
    {
      title: 'Marge totale',
      value: `${stats.totalMargin.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`,
      icon: <TrendingUp className="w-5 h-5" />,
      variant: 'secondary' as const,
      subtitle: 'Récupéré des intermédiaires',
    },
    {
      title: t('dashboard.kpis.warranties.title'),
      value: stats.activeWarranties.toString(),
      icon: <Shield className="w-5 h-5" />,
      variant: 'info' as const,
      subtitle: `${stats.totalWarranties} au total`,
    },
    {
      title: t('dashboard.kpis.claims.title'),
      value: stats.openClaims.toString(),
      icon: <AlertCircle className="w-5 h-5" />,
      variant: 'warning' as const,
      subtitle: 'Nécessitent attention',
    },
    {
      title: 'Durée moy. vente',
      value: `${Math.floor(stats.avgSaleDuration / 60)}m ${stats.avgSaleDuration % 60}s`,
      icon: <Clock className="w-5 h-5" />,
      variant: 'info' as const,
      subtitle: 'Objectif: < 5 minutes',
    },
    {
      title: 'Taux de succès',
      value: '98.5%',
      icon: <CheckCircle className="w-5 h-5" />,
      variant: 'success' as const,
      subtitle: 'Validation légale réussie',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="space-y-3">
          <div className="h-10 w-96 bg-neutral-200 animate-pulse rounded-lg" />
          <div className="h-6 w-80 bg-neutral-100 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-neutral-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Bannière UI V2 Demo */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎨 Nouveau Design System V2 disponible!</h2>
            <p className="text-primary-50 mb-3">
              Découvrez les nouveaux composants UI professionnels: boutons, formulaires, KPI cards et plus encore!
            </p>
            <button
              onClick={() => window.location.hash = '#ui-v2-demo'}
              className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Voir la démo interactive →
            </button>
          </div>
          <div className="hidden md:block text-6xl">
            🚀
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="space-y-2 animate-slideUp">
        <h1 className="text-4xl font-bold text-neutral-900">
          {t('dashboard.welcome', { name: profile?.full_name || 'Utilisateur' })}
          {companyName && <span className="text-primary-600"> - {companyName}</span>}
        </h1>
        <p className="text-lg text-neutral-600">
          Voici un aperçu de vos opérations aujourd'hui
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => (
          <div key={card.title} style={{ animationDelay: `${index * 50}ms` }} className="animate-scaleIn">
            <KPICard
              title={card.title}
              value={card.value}
              icon={card.icon}
              variant={card.variant}
              trend={card.trend}
              subtitle={card.subtitle}
            />
          </div>
        ))}
      </div>

      {/* ROI Impact Section */}
      <div className="relative bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-900 rounded-2xl shadow-xl p-8 overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-secondary-600/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Impact sur le ROI</h2>
              <p className="text-neutral-300 text-sm">Économies réalisées avec Pro-Remorque</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <p className="text-neutral-300 text-sm font-medium mb-2">Économies par garantie</p>
              <p className="text-4xl font-bold text-white mb-1">1 470 $</p>
              <p className="text-neutral-400 text-xs">Après coûts variables (~30-40 $)</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <p className="text-neutral-300 text-sm font-medium mb-2">Économies totales</p>
              <p className="text-4xl font-bold text-primary-400 mb-1">
                {(stats.totalWarranties * 1470).toLocaleString('fr-CA')} $
              </p>
              <p className="text-neutral-400 text-xs">Frais d'intermédiaires éliminés</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <p className="text-neutral-300 text-sm font-medium mb-2">État du système</p>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-success-400 rounded-full animate-pulse shadow-lg shadow-success-400/50" />
                <span className="text-2xl font-bold text-white">Opérationnel</span>
              </div>
              <p className="text-neutral-400 text-xs">Tous les systèmes fonctionnent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
