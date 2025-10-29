import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface AdminStats {
  totalFranchisees: number;
  activeFranchisees: number;
  suspendedFranchisees: number;
  totalWarrantiesSold: number;
  totalCommissionEarned: number;
  monthlyCommission: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  totalUsers: number;
}

interface TopFranchisee {
  id: string;
  name: string;
  warrantyCount: number;
  commission: number;
}

interface WarrantyTransaction {
  id: string;
  transaction_date: string;
  commission_amount: number;
  status: string;
  organization_id?: string;
}

interface FranchiseInvoice {
  id: string;
  status: string;
  total_amount: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalFranchisees: 0,
    activeFranchisees: 0,
    suspendedFranchisees: 0,
    totalWarrantiesSold: 0,
    totalCommissionEarned: 0,
    monthlyCommission: 0,
    unpaidInvoices: 0,
    unpaidAmount: 0,
    totalUsers: 0,
  });
  const [topFranchisees, setTopFranchisees] = useState<TopFranchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOwner } = useAuth();

  const loadAdminStats = useCallback(async () => {
    try {
      const [
        franchisees,
        transactions,
        invoices,
        users
      ] = await Promise.all([
        supabase.from('organizations').select('*').eq('type', 'franchisee'),
        supabase.from('warranty_transactions').select('*'),
        supabase.from('franchise_invoices').select('*').in('status', ['sent', 'overdue']),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ]);

      const warrantyTransactions = (transactions.data || []) as WarrantyTransaction[];
      const franchiseInvoices = (invoices.data || []) as FranchiseInvoice[];

      const activeFranchisees = franchisees.data?.filter((f: any) => f.status === 'active').length || 0;
      const suspendedFranchisees = franchisees.data?.filter((f: any) => f.status === 'suspended').length || 0;

      const totalCommission = warrantyTransactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const monthlyTransactions = warrantyTransactions.filter(t =>
        new Date(t.transaction_date) >= thisMonth
      );
      const monthlyCommission = monthlyTransactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0);

      const unpaidAmount = franchiseInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      setStats({
        totalFranchisees: franchisees.data?.length || 0,
        activeFranchisees,
        suspendedFranchisees,
        totalWarrantiesSold: warrantyTransactions.length,
        totalCommissionEarned: totalCommission,
        monthlyCommission,
        unpaidInvoices: franchiseInvoices.length,
        unpaidAmount,
        totalUsers: users.count || 0,
      });

      await loadTopFranchisees();
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      loadAdminStats();
    }
  }, [isOwner, loadAdminStats]);

  const loadTopFranchisees = async () => {
    try {
      const { data: franchisees } = await supabase
        .from('organizations')
        .select('*')
        .eq('type', 'franchisee')
        .eq('status', 'active')
        .limit(5);

      if (!franchisees) return;

      const franchiseesWithStats = await Promise.all(
        franchisees.map(async (org: any) => {
          const { data: transactions } = await supabase
            .from('warranty_transactions')
            .select('*')
            .eq('organization_id', org.id);

          const warrantyTrans = (transactions || []) as WarrantyTransaction[];
          const warrantyCount = warrantyTrans.length;
          const commission = warrantyTrans.reduce((sum, t) => sum + (t.commission_amount || 0), 0);

          return {
            id: org.id,
            name: org.name,
            warrantyCount,
            commission,
          };
        })
      );

      const sorted = franchiseesWithStats.sort((a, b) => b.commission - a.commission).slice(0, 5);
      setTopFranchisees(sorted);
    } catch (error) {
      console.error('Error loading top franchisees:', error);
    }
  };

  if (!isOwner) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Revenus du Mois',
      value: `${stats.monthlyCommission.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      subtext: 'Commissions ce mois',
    },
    {
      name: 'Revenus Totaux',
      value: `${stats.totalCommissionEarned.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`,
      icon: TrendingUp,
      color: 'bg-primary-500',
      subtext: 'Total à vie',
    },
    {
      name: 'Franchisés Actifs',
      value: stats.activeFranchisees.toString(),
      icon: Building2,
      color: 'bg-slate-700',
      subtext: `${stats.totalFranchisees} au total`,
    },
    {
      name: 'Garanties Vendues',
      value: stats.totalWarrantiesSold.toString(),
      icon: Shield,
      color: 'bg-primary-500',
      subtext: 'Tous les franchisés',
    },
    {
      name: 'Factures Impayées',
      value: stats.unpaidInvoices.toString(),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      subtext: `${stats.unpaidAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $ en attente`,
    },
    {
      name: 'Utilisateurs Total',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'bg-emerald-500',
      subtext: 'Tous les franchisés',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Administrateur</h1>
        <p className="text-slate-600 mt-2">
          Vue d'ensemble de tous vos franchisés et revenus générés
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${stat.color === 'bg-emerald-500' ? 'shadow-emerald-500/20' : stat.color === 'bg-primary-500' ? 'shadow-blue-500/20' : stat.color === 'bg-violet-500' ? 'shadow-blue-500/20' : 'shadow-slate-900/20'}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-slate-600 text-sm font-medium mb-1">{stat.name}</h3>
              <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
              {stat.subtext && <p className="text-xs text-slate-500">{stat.subtext}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Top 5 Franchisés</h2>

          {topFranchisees.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Aucun franchisé actif pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topFranchisees.map((franchisee, index) => (
                <div key={franchisee.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{franchisee.name}</div>
                    <div className="text-sm text-slate-600">
                      {franchisee.warrantyCount} garantie{franchisee.warrantyCount > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">
                      {franchisee.commission.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
                    </div>
                    <div className="text-xs text-slate-500">commission</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Statut des Franchisés</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-900">Actifs</div>
                  <div className="text-sm text-slate-600">En opération</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.activeFranchisees}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <div className="font-semibold text-slate-900">Suspendus</div>
                  <div className="text-sm text-slate-600">Temporairement inactifs</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.suspendedFranchisees}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-600" />
                <div>
                  <div className="font-semibold text-slate-900">Factures en Attente</div>
                  <div className="text-sm text-slate-600">Non payées</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.unpaidInvoices}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-emerald-500/5" />
        <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-4">Impact sur le ROI</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-slate-300 text-sm mb-2">Commission Moyenne par Garantie</p>
            <p className="text-3xl font-bold">
              {stats.totalWarrantiesSold > 0
                ? (stats.totalCommissionEarned / stats.totalWarrantiesSold).toLocaleString('fr-CA', {
                    minimumFractionDigits: 2,
                  })
                : '0.00'}{' '}
              $
            </p>
            <p className="text-slate-400 text-xs mt-1">Basé sur 50% de commission</p>
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-2">Revenus Mensuels Moyens</p>
            <p className="text-3xl font-bold">
              {stats.monthlyCommission.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
            </p>
            <p className="text-slate-400 text-xs mt-1">Ce mois-ci</p>
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-2">Croissance du Réseau</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span className="text-3xl font-bold">{stats.activeFranchisees}</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">Franchisés actifs</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
