import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, Mail, Phone, MapPin, ShieldCheck, DollarSign, FileText, Eye } from 'lucide-react';
import { microcopy } from '../lib/microcopy';
import type { Database } from '../lib/database.types';
import { CustomerHistory } from './CustomerHistory';
import { Breadcrumbs } from './common/Breadcrumbs';

type Customer = Database['public']['Tables']['customers']['Row'] & {
  warranties?: {
    count: number;
    total_spent: number;
  };
  claims?: {
    count: number;
  };
};

interface CustomerStats {
  totalCustomers: number;
  withWarranties: number;
  marketingConsent: number;
  totalRevenue: number;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    withWarranties: 0,
    marketingConsent: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const handleSelectCustomer = (e: CustomEvent) => {
      setHistoryCustomerId(e.detail);
    };

    window.addEventListener('selectCustomer' as any, handleSelectCustomer);
    return () => window.removeEventListener('selectCustomer' as any, handleSelectCustomer);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const customersWithStats = await Promise.all(
          data.map(async (customer) => {
            const [warrantiesRes, claimsRes] = await Promise.all([
              supabase
                .from('warranties')
                .select('total_price')
                .eq('customer_id', customer.id),
              supabase
                .from('claims')
                .select('id')
                .eq('customer_id', customer.id),
            ]);

            const totalSpent = warrantiesRes.data?.reduce((sum, w) => sum + (w.total_price || 0), 0) || 0;

            return {
              ...customer,
              warranties: {
                count: warrantiesRes.data?.length || 0,
                total_spent: totalSpent,
              },
              claims: {
                count: claimsRes.data?.length || 0,
              },
            };
          })
        );

        setCustomers(customersWithStats);

        const totalRevenue = customersWithStats.reduce(
          (sum: number, c: any) => sum + (c.warranties?.total_spent || 0),
          0
        );

        setStats({
          totalCustomers: customersWithStats.length,
          withWarranties: customersWithStats.filter((c) => (c.warranties?.count || 0) > 0).length,
          marketingConsent: customersWithStats.filter((c) => c.consent_marketing).length,
          totalRevenue,
        });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = search.toLowerCase();
    return (
      customer.first_name.toLowerCase().includes(searchLower) ||
      customer.last_name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Clients' }]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-600 mt-2">Gérez et suivez tous vos clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalCustomers}</p>
          <p className="text-sm text-slate-600">Total clients</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.withWarranties}</p>
          <p className="text-sm text-slate-600">Avec garanties</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <Mail className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.marketingConsent}</p>
          <p className="text-sm text-slate-600">Consentement marketing</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </p>
          <p className="text-sm text-slate-600">Revenu total</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={microcopy.search.customers.placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {search ? microcopy.emptyStates.searchResults.title(search) : microcopy.emptyStates.customers.title}
            </h3>
            <p className="text-slate-600">
              {search ? microcopy.emptyStates.searchResults.suggestion : microcopy.emptyStates.customers.message}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Localisation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Garanties</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Réclamations</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total dépensé</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Marketing</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {customer.first_name} {customer.last_name}
                        </p>
                        <p className="text-sm text-slate-500 capitalize">
                          {customer.language_preference === 'fr' ? 'Français' : 'English'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {customer.city}, {customer.province}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-slate-900">{customer.warranties?.count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-slate-900">{customer.claims?.count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-900">
                        {(customer.warranties?.total_spent || 0).toLocaleString('fr-CA', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        $
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {customer.consent_marketing ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Non
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryCustomerId(customer.id);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Historique
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </h2>
              <p className="text-slate-600 mt-1">Détails du client</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Informations de contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Courriel</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Téléphone</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Adresse</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ville, Province</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedCustomer.city}, {selectedCustomer.province}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Code postal</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.postal_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Langue</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {selectedCustomer.language_preference === 'fr' ? 'Français' : 'English'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Statistiques</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Garanties</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedCustomer.warranties?.count || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Réclamations</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedCustomer.claims?.count || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Total dépensé</p>
                    <p className="text-xl font-bold text-slate-900">
                      {(selectedCustomer.warranties?.total_spent || 0).toLocaleString('fr-CA')} $
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Marketing</h3>
                <div className="flex items-center gap-3">
                  {selectedCustomer.consent_marketing ? (
                    <>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        ✓ Consentement accordé
                      </span>
                      {selectedCustomer.consent_date && (
                        <span className="text-sm text-slate-600">
                          depuis {new Date(selectedCustomer.consent_date).toLocaleDateString('fr-CA')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                      Aucun consentement
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {historyCustomerId && (
        <CustomerHistory
          customerId={historyCustomerId}
          onClose={() => setHistoryCustomerId(null)}
        />
      )}
    </div>
  );
}
