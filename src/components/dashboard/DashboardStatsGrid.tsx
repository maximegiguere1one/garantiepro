import { TrendingUp, DollarSign, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { KPICard } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';
import type { DashboardStats } from '../../hooks/useDashboardStats';

interface DashboardStatsGridProps {
  stats: DashboardStats;
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const t = useTranslation();

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

  return (
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
  );
}
