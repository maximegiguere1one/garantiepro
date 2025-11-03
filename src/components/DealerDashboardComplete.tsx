import { useState, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  DollarSign,
  Shield,
  AlertCircle,
  Target,
  Award,
  BarChart3,
  Package,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFranchiseeDashboardStats } from '../hooks/useFranchiseeDashboardStats';
import { QuickActionGrid } from './dashboard/QuickActionGrid';
import { ActivityFeed, type Notification } from './dashboard/ActivityFeed';
import { StatCard } from './dashboard/StatCard';


interface DealerDashboardCompleteProps {
  onNavigate?: (page: string) => void;
}

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-8 bg-slate-200 rounded w-64 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-96" />
      </div>
      <div className="h-10 bg-slate-200 rounded w-48" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="h-12 w-12 bg-slate-200 rounded-xl mb-4" />
          <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-6 bg-slate-200 rounded w-32" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="h-24 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ onNavigate }: { onNavigate?: (page: string) => void }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
    <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
    <h3 className="text-xl font-bold text-slate-900 mb-2">Bienvenue dans votre tableau de bord!</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">
      Commencez par vendre votre première garantie pour voir vos statistiques apparaître ici.
    </p>
    <button
      onClick={() => onNavigate?.('new-warranty')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl"
    >
      <Shield className="w-5 h-5" />
      Vendre ma première garantie
    </button>
  </div>
);

export const DealerDashboardComplete = memo(({ onNavigate }: DealerDashboardCompleteProps) => {
  const { organization: currentOrganization } = useAuth();
  const toast = useToast();

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const { stats, loading, error, hasData, refetch } = useFranchiseeDashboardStats(timeRange);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);



  const generateNotifications = (lowStock: number, pendingClaims: number, newWarranties: number) => {
    const notifs: Notification[] = [];

    if (pendingClaims > 0) {
      notifs.push({
        id: '1',
        type: 'urgent',
        title: 'Réclamations en attente',
        message: `${pendingClaims} réclamation(s) nécessitent votre attention immédiate`,
        action: 'Voir les réclamations',
        actionPage: 'claims',
        timestamp: new Date(),
      });
    }

    if (lowStock > 0) {
      notifs.push({
        id: '2',
        type: 'warning',
        title: 'Alerte stock bas',
        message: `${lowStock} produit(s) ont un stock critique (≤ 2 unités)`,
        action: 'Gérer l\'inventaire',
        actionPage: 'dealer-inventory',
        timestamp: new Date(),
      });
    }

    if (newWarranties >= 5) {
      notifs.push({
        id: '3',
        type: 'success',
        title: 'Excellente performance!',
        message: `${newWarranties} nouvelles garanties vendues cette période`,
        timestamp: new Date(),
      });
    }

    setNotifications(notifs);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Actualisation', 'Données mises à jour avec succès');
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-900 mb-2">Erreur de chargement</h3>
        <p className="text-red-700 mb-6">{error.message}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Réessayer
        </button>
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState onNavigate={onNavigate} />;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Tableau de bord franchisé
          </h1>
          <p className="text-slate-600 mt-1">
            {currentOrganization?.name} • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex bg-white rounded-lg border border-slate-200 p-1">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'week' && 'Semaine'}
                {range === 'month' && 'Mois'}
                {range === 'quarter' && 'Trimestre'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ActivityFeed
        notifications={notifications}
        onDismiss={handleDismissNotification}
        onNavigate={onNavigate}
      />

      <QuickActionGrid
        pendingClaims={stats.claims.pending}
        availableInventory={stats.inventory.available}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard
          title={`Revenu ${timeRange === 'week' ? 'hebdomadaire' : timeRange === 'month' ? 'mensuel' : 'trimestriel'}`}
          value={stats.revenue.current.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          icon={DollarSign}
          variant="primary"
          trend={{
            value: stats.revenue.trend,
            label: 'vs période précédente'
          }}
        >
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-primary-100 text-xs mb-1">Projection 30 jours</p>
            <p className="text-xl font-bold">
              {stats.revenue.projected.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
        </StatCard>

        <StatCard
          title="Garanties Actives"
          value={stats.warranties.active}
          icon={Shield}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Cette période</span>
              <span className="font-semibold text-slate-900">{stats.warranties.thisWeek} vendues</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Durée moy. vente</span>
              <span className="font-semibold text-slate-900">
                {Math.floor(stats.warranties.avgDuration / 60)}m {stats.warranties.avgDuration % 60}s
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Objectif: &lt; 5 minutes</span>
            </div>
          </div>
        </StatCard>

        <StatCard
          title="Réclamations"
          value={stats.claims.open}
          icon={AlertCircle}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">En attente</span>
              <span className="font-semibold text-amber-600">{stats.claims.pending}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Taux d'approbation</span>
              <span className="font-semibold text-emerald-600">{stats.claims.approvalRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Résolution moy.</span>
              <span className="font-semibold text-slate-900">{stats.claims.avgResolution.toFixed(1)} jours</span>
            </div>
          </div>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Performance</h3>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Taux de conversion</span>
                <span className="text-lg font-bold text-slate-900">{stats.performance.conversionRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.performance.conversionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Ticket moyen</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats.performance.avgTicket.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Satisfaction client</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats.performance.customerSatisfaction}/5.0
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Award
                    key={star}
                    className={`w-5 h-5 ${
                      star <= stats.performance.customerSatisfaction
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Classement réseau</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900">#{stats.performance.networkRank}</span>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Inventaire</h3>
            <Package className="w-5 h-5 text-slate-400" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900">{stats.inventory.available}</p>
              <p className="text-xs text-slate-600 mt-1">Unités dispo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600">
                {stats.inventory.totalValue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-600 mt-1">Valeur totale</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-600">{stats.inventory.lowStock}</p>
              <p className="text-xs text-slate-600 mt-1">Stock bas</p>
            </div>
          </div>
          {stats.inventory.fastMoving.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Top produits en stock</h4>
              <div className="space-y-2">
                {stats.inventory.fastMoving.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.make} {item.model}
                      </p>
                      <p className="text-xs text-slate-500">{item.year}</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
                      {item.quantity_in_stock} unités
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

DealerDashboardComplete.displayName = 'DealerDashboardComplete';
