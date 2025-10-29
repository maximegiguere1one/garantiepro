import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Award, DollarSign, TrendingUp, Gift, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type LoyaltyCredit = Database['public']['Tables']['loyalty_credits']['Row'] & {
  customers?: Database['public']['Tables']['customers']['Row'];
  warranties?: {
    contract_number: string;
    created_at: string;
  };
};

interface LoyaltyStats {
  totalCreditsIssued: number;
  totalCreditsUsed: number;
  totalCreditsAvailable: number;
  customersWithCredits: number;
  averageCreditAmount: number;
}

export function LoyaltyProgram() {
  const [credits, setCredits] = useState<LoyaltyCredit[]>([]);
  const [stats, setStats] = useState<LoyaltyStats>({
    totalCreditsIssued: 0,
    totalCreditsUsed: 0,
    totalCreditsAvailable: 0,
    customersWithCredits: 0,
    averageCreditAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all');

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_credits')
        .select(`
          *,
          customers(*),
          warranties(contract_number, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCredits(data as LoyaltyCredit[]);

        const totalIssued = data.reduce((sum, c) => sum + (c.credit_amount || 0), 0);
        const used = data.filter((c) => c.applied_at !== null);
        const totalUsed = used.reduce((sum, c) => sum + (c.credit_amount || 0), 0);
        const available = data.filter((c) => c.applied_at === null);
        const totalAvailable = available.reduce((sum, c) => sum + (c.credit_amount || 0), 0);

        const uniqueCustomers = new Set(data.map((c) => c.customer_id)).size;

        setStats({
          totalCreditsIssued: totalIssued,
          totalCreditsUsed: totalUsed,
          totalCreditsAvailable: totalAvailable,
          customersWithCredits: uniqueCustomers,
          averageCreditAmount: data.length > 0 ? totalIssued / data.length : 0,
        });
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCredits = credits.filter((credit) => {
    if (filter === 'available') return credit.applied_at === null;
    if (filter === 'used') return credit.applied_at !== null;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Programme de fidélité</h1>
        <p className="text-slate-600 mt-2">
          Crédits de 250$ (≤10 000$) ou 500$ (&gt;10 000$) par garantie
        </p>
      </div>

      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-lg p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold">Programme Pro-Remorque</h2>
            <p className="text-primary-100 text-sm">Récompensez vos clients fidèles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-primary-200 text-sm mb-1">Crédits émis</p>
            <p className="text-3xl font-bold">{stats.totalCreditsIssued.toLocaleString('fr-CA')} $</p>
          </div>
          <div>
            <p className="text-primary-200 text-sm mb-1">Crédits utilisés</p>
            <p className="text-3xl font-bold">{stats.totalCreditsUsed.toLocaleString('fr-CA')} $</p>
          </div>
          <div>
            <p className="text-primary-200 text-sm mb-1">Crédits disponibles</p>
            <p className="text-3xl font-bold">{stats.totalCreditsAvailable.toLocaleString('fr-CA')} $</p>
          </div>
          <div>
            <p className="text-primary-200 text-sm mb-1">Clients avec crédits</p>
            <p className="text-3xl font-bold">{stats.customersWithCredits}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <Gift className="w-8 h-8 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-600">
              {((stats.totalCreditsUsed / stats.totalCreditsIssued) * 100 || 0).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-1">Taux d'utilisation</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalCreditsUsed.toLocaleString('fr-CA')} $ utilisés
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Crédit moyen</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.averageCreditAmount.toLocaleString('fr-CA')} $
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Économies clients</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalCreditsUsed.toLocaleString('fr-CA')} $
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tous ({credits.length})
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Disponibles ({credits.filter((c) => !c.applied_at).length})
            </button>
            <button
              onClick={() => setFilter('used')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'used'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Utilisés ({credits.filter((c) => c.applied_at).length})
            </button>
          </div>
        </div>

        {filteredCredits.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun crédit trouvé</h3>
            <p className="text-slate-600">Les crédits de fidélité apparaîtront ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contrat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Montant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Obtenu le</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Utilisé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCredits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {credit.customers?.first_name} {credit.customers?.last_name}
                        </p>
                        <p className="text-sm text-slate-500">{credit.customers?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-mono text-slate-900">{credit.warranties?.contract_number}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary-600" />
                        <span className="font-bold text-primary-700">
                          {(credit.credit_amount || 0).toLocaleString('fr-CA')} $
                        </span>
                      </div>
                      {credit.credit_amount === 250 && (
                        <p className="text-xs text-slate-500 mt-1">Remorque ≤ 10 000$</p>
                      )}
                      {credit.credit_amount === 500 && (
                        <p className="text-xs text-slate-500 mt-1">Remorque &gt; 10 000$</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600">
                        {new Date(credit.created_at).toLocaleDateString('fr-CA')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {credit.applied_at ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Utilisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <Gift className="w-3 h-3 mr-1" />
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {credit.applied_at ? (
                        <p className="text-sm text-slate-600">
                          {new Date(credit.applied_at).toLocaleDateString('fr-CA')}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">-</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-6">
        <div className="flex gap-3">
          <Award className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-900 mb-2">Comment fonctionne le programme?</h3>
            <ul className="space-y-2 text-sm text-primary-800">
              <li>• Crédit automatique de <strong>250$</strong> pour achat de remorque ≤ 10 000$</li>
              <li>• Crédit automatique de <strong>500$</strong> pour achat de remorque &gt; 10 000$</li>
              <li>• Non applicable sur les remorques en promotion</li>
              <li>• Le crédit peut être appliqué à un prochain achat de garantie</li>
              <li>• Encourage les clients à revenir chez Pro-Remorque</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
