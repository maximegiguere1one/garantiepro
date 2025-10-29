import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  DollarSign,
  Shield,
  AlertCircle,
  Clock,
  Package,
  Users,
  CheckCircle,
  Target,
  Award,
  BarChart3,
  Bell,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
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

interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  icon: any;
  label: string;
  description: string;
  color: string;
  action: () => void;
}

interface DealerDashboardProps {
  onNavigate?: (page: string) => void;
}

export function DealerDashboard({ onNavigate }: DealerDashboardProps = {}) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange, profile?.id]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;

    try {
      const now = new Date();
      const ranges = {
        week: { start: startOfWeek(now), end: endOfWeek(now) },
        month: { start: startOfMonth(now), end: endOfMonth(now) },
        quarter: { start: startOfMonth(subDays(now, 90)), end: endOfMonth(now) },
      };

      const { start, end } = ranges[timeRange];
      const previousStart = subDays(start, 7);
      const previousEnd = subDays(end, 7);

      const [warrantiesRes, claimsRes, inventoryRes] = await Promise.all([
        supabase
          .from('warranties')
          .select('total_price, status, created_at, sale_duration_seconds')
          .gte('created_at', previousStart.toISOString())
          .lte('created_at', end.toISOString()),
        supabase
          .from('claims')
          .select('status, created_at, approved_amount, incident_date, updated_at'),
        supabase
          .from('dealer_inventory')
          .select('*, selling_price, quantity_in_stock, status')
          .eq('dealer_id', profile.id),
      ]);

      if (warrantiesRes.data && claimsRes.data && inventoryRes.data) {
        const currentWarranties = warrantiesRes.data.filter(
          (w) => new Date(w.created_at) >= start && new Date(w.created_at) <= end
        );
        const previousWarranties = warrantiesRes.data.filter(
          (w) => new Date(w.created_at) >= previousStart && new Date(w.created_at) < start
        );

        const currentRevenue = currentWarranties.reduce((sum, w) => sum + (w.total_price || 0), 0);
        const previousRevenue = previousWarranties.reduce((sum, w) => sum + (w.total_price || 0), 0);
        const revenueTrend = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        const avgDaily = currentRevenue / Math.max(1, currentWarranties.length);
        const projectedRevenue = avgDaily * 30;

        const activeWarranties = warrantiesRes.data.filter((w) => w.status === 'active').length;
        const avgDuration =
          currentWarranties
            .filter((w) => w.sale_duration_seconds)
            .reduce((sum, w) => sum + (w.sale_duration_seconds || 0), 0) /
          Math.max(1, currentWarranties.filter((w) => w.sale_duration_seconds).length);

        const openClaims = claimsRes.data.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
        const pendingClaims = claimsRes.data.filter((c) => c.status === 'submitted').length;
        const approvedClaims = claimsRes.data.filter((c) => ['approved', 'partially_approved'].includes(c.status));
        const approvalRate = (approvedClaims.length / Math.max(1, claimsRes.data.length)) * 100;

        const avgResolutionTime =
          claimsRes.data
            .filter((c) => c.status === 'completed')
            .reduce((sum, c) => {
              const start = new Date(c.created_at);
              const end = new Date(c.updated_at || c.created_at);
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / Math.max(1, claimsRes.data.filter((c) => c.status === 'completed').length);

        const availableInventory = inventoryRes.data.filter((i) => i.status === 'available');
        const totalInventoryValue = availableInventory.reduce(
          (sum, i) => sum + i.selling_price * i.quantity_in_stock,
          0
        );
        const lowStock = availableInventory.filter((i) => i.quantity_in_stock <= 2);

        const fastMoving = availableInventory
          .sort((a, b) => (b.quantity_in_stock || 0) - (a.quantity_in_stock || 0))
          .slice(0, 3);

        setStats({
          revenue: {
            current: currentRevenue,
            previous: previousRevenue,
            trend: revenueTrend,
            projected: projectedRevenue,
          },
          warranties: {
            total: warrantiesRes.data.length,
            active: activeWarranties,
            thisWeek: currentWarranties.length,
            avgDuration: Math.round(avgDuration),
          },
          claims: {
            open: openClaims,
            pending: pendingClaims,
            avgResolution: avgResolutionTime,
            approvalRate,
          },
          inventory: {
            totalValue: totalInventoryValue,
            available: availableInventory.reduce((sum, i) => sum + i.quantity_in_stock, 0),
            lowStock: lowStock.length,
            fastMoving,
          },
          performance: {
            conversionRate: 85.5,
            avgTicket: currentRevenue / Math.max(1, currentWarranties.length),
            customerSatisfaction: 4.7,
            networkRank: 12,
          },
        });

        generateNotifications(lowStock.length, pendingClaims, currentWarranties.length);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = (lowStock: number, pendingClaims: number, newWarranties: number) => {
    const notifs: Notification[] = [];

    if (pendingClaims > 0) {
      notifs.push({
        id: '1',
        type: 'urgent',
        title: 'Réclamations en attente',
        message: `${pendingClaims} réclamation(s) nécessitent votre attention`,
        action: 'Voir les réclamations',
        timestamp: new Date(),
      });
    }

    if (lowStock > 0) {
      notifs.push({
        id: '2',
        type: 'warning',
        title: 'Stock bas',
        message: `${lowStock} produit(s) ont un stock faible`,
        action: 'Gérer l\'inventaire',
        timestamp: new Date(),
      });
    }

    if (newWarranties > 5) {
      notifs.push({
        id: '3',
        type: 'success',
        title: 'Excellente semaine!',
        message: `${newWarranties} nouvelles garanties cette semaine`,
        timestamp: new Date(),
      });
    }

    setNotifications(notifs);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'new-warranty',
      icon: Shield,
      label: 'Nouvelle garantie',
      description: 'Vendre une garantie en 3 min',
      color: 'bg-primary-500',
      action: () => onNavigate?.('new-warranty'),
    },
    {
      id: 'claims',
      icon: AlertCircle,
      label: 'Réclamations',
      description: `${stats?.claims.pending || 0} en attente`,
      color: 'bg-amber-500',
      action: () => onNavigate?.('claims'),
    },
    {
      id: 'inventory',
      icon: Package,
      label: 'Inventaire',
      description: `${stats?.inventory.available || 0} unités dispo`,
      color: 'bg-emerald-500',
      action: () => onNavigate?.('inventory'),
    },
    {
      id: 'customers',
      icon: Users,
      label: 'Clients',
      description: 'Voir tous les clients',
      color: 'bg-primary-500',
      action: () => onNavigate?.('customers'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-primary-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-primary-50 border-primary-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Tableau de bord franchisé
          </h1>
          <p className="text-slate-600 mt-1">
            Vue d'ensemble de votre performance • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {notifications.length > 0 && (
        <div className="grid gap-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 p-4 rounded-xl border ${getNotificationColor(notif.type)} transition-all hover:shadow-md`}
            >
              <div className="flex-shrink-0">{getNotificationIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900">{notif.title}</h4>
                <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
              </div>
              {notif.action && (
                <button className="flex-shrink-0 px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  {notif.action}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 text-left group"
            >
              <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{action.label}</h3>
              <p className="text-sm text-slate-600">{action.description}</p>
              <ChevronRight className="w-5 h-5 text-slate-400 mt-2 group-hover:translate-x-1 transition-transform" />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-primary-100 text-sm font-medium">Revenu {timeRange === 'week' ? 'hebdomadaire' : timeRange === 'month' ? 'mensuel' : 'trimestriel'}</p>
              <h2 className="text-4xl font-black mt-1">
                {stats.revenue.current.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
              </h2>
            </div>
            <DollarSign className="w-12 h-12 text-primary-200" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            {stats.revenue.trend >= 0 ? (
              <ArrowUpRight className="w-5 h-5 text-emerald-300" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-300" />
            )}
            <span className="font-bold text-lg">
              {Math.abs(stats.revenue.trend).toFixed(1)}%
            </span>
            <span className="text-primary-100 text-sm">vs période précédente</span>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-primary-100 text-xs mb-1">Projection 30 jours</p>
            <p className="text-xl font-bold">
              {stats.revenue.projected.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 text-sm font-medium">Garanties Actives</p>
              <h2 className="text-4xl font-black text-slate-900 mt-1">{stats.warranties.active}</h2>
            </div>
            <Shield className="w-12 h-12 text-primary-500" />
          </div>
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
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 text-sm font-medium">Réclamations</p>
              <h2 className="text-4xl font-black text-slate-900 mt-1">{stats.claims.open}</h2>
            </div>
            <AlertCircle className="w-12 h-12 text-amber-500" />
          </div>
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
        </div>
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
                  className="bg-primary-600 h-2 rounded-full"
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
}
