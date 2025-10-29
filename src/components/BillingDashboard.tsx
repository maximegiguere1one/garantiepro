import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  DollarSign,
  FileText,
  Download,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Invoice = Database['public']['Tables']['franchise_invoices']['Row'];
type Transaction = Database['public']['Tables']['warranty_transactions']['Row'];

interface BillingStats {
  currentMonthWarranties: number;
  currentMonthCommission: number;
  pendingTransactions: number;
  unpaidInvoices: number;
  totalPaid: number;
  nextInvoiceDate: string;
}

export function BillingDashboard() {
  const [stats, setStats] = useState<BillingStats>({
    currentMonthWarranties: 0,
    currentMonthCommission: 0,
    pendingTransactions: 0,
    unpaidInvoices: 0,
    totalPaid: 0,
    nextInvoiceDate: '',
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization: currentOrganization, isOwner } = useAuth();
  const toast = useToast();

  const loadBillingData = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const [invoicesRes, transactionsRes] = await Promise.all([
        supabase
          .from('franchise_invoices')
          .select('*')
          .eq('franchisee_organization_id', currentOrganization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('warranty_transactions')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('transaction_date', { ascending: false })
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const invoicesList = (invoicesRes.data || []) as Invoice[];
      const transactionsList = (transactionsRes.data || []) as Transaction[];

      setInvoices(invoicesList);
      setTransactions(transactionsList);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const currentMonthTransactions = transactionsList.filter(t =>
        new Date(t.transaction_date) >= thisMonth && t.billing_status === 'pending'
      );

      const unpaidInvoices = invoicesList.filter(inv =>
        inv.status === 'sent' || inv.status === 'overdue'
      );

      const paidInvoices = invoicesList.filter(inv => inv.status === 'paid');
      const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);

      setStats({
        currentMonthWarranties: currentMonthTransactions.length,
        currentMonthCommission: currentMonthTransactions.reduce((sum, t) => sum + t.commission_amount, 0),
        pendingTransactions: transactionsList.filter(t => t.billing_status === 'pending').length,
        unpaidInvoices: unpaidInvoices.length,
        totalPaid,
        nextInvoiceDate: nextMonth.toLocaleDateString('fr-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
      });
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Erreur lors du chargement des données de facturation');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, toast]);

  useEffect(() => {
    if (currentOrganization && !isOwner) {
      loadBillingData();
    }
  }, [currentOrganization, isOwner, loadBillingData]);

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-slate-100 text-slate-700', text: 'Brouillon' },
      sent: { color: 'bg-primary-100 text-primary-700', text: 'Envoyée' },
      paid: { color: 'bg-emerald-100 text-emerald-700', text: 'Payée' },
      overdue: { color: 'bg-red-100 text-red-700', text: 'En Retard' },
      cancelled: { color: 'bg-slate-100 text-slate-700', text: 'Annulée' },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (isOwner) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600">
          Cette page est réservée aux franchisés. En tant que propriétaire, vous n'avez pas de facturation.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Facturation</h1>
        <p className="text-slate-600 mt-2">
          Gérez vos factures et suivez vos paiements
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Facture du Mois</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">
            {stats.currentMonthCommission.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </p>
          <p className="text-xs text-slate-500">{stats.currentMonthWarranties} garanties vendues</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Factures Impayées</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">{stats.unpaidInvoices}</p>
          <p className="text-xs text-slate-500">À régler</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Total Payé</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">
            {stats.totalPaid.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </p>
          <p className="text-xs text-slate-500">À vie</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Prochaine Facture</h3>
          <p className="text-sm font-bold text-slate-900 mb-1">{stats.nextInvoiceDate}</p>
          <p className="text-xs text-slate-500">Génération automatique</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-emerald-500/5" />
        <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Estimation du Mois en Cours</h2>
            <p className="text-slate-300 text-sm">
              Basé sur les garanties vendues jusqu'à maintenant
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">
              {stats.currentMonthCommission.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
            </p>
            <p className="text-slate-300 text-sm mt-1">
              Commission à 50%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-slate-300 text-sm">Garanties Vendues</div>
            <div className="text-2xl font-bold mt-1">{stats.currentMonthWarranties}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-slate-300 text-sm">En Attente de Facturation</div>
            <div className="text-2xl font-bold mt-1">{stats.pendingTransactions}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-slate-300 text-sm">Factures Payées</div>
            <div className="text-2xl font-bold mt-1">
              {invoices.filter(inv => inv.status === 'paid').length}
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Historique des Factures</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucune facture pour le moment
            </h3>
            <p className="text-slate-600">
              Vos factures mensuelles apparaîtront ici automatiquement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Garanties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(invoice.billing_period_start).toLocaleDateString('fr-CA', {
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {invoice.total_warranties_sold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {invoice.total_amount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(invoice.due_date).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {invoice.pdf_url && (
                          <button
                            onClick={() => window.open(invoice.pdf_url!, '_blank')}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <button
                            className="px-3 py-1 bg-slate-900 text-white text-xs rounded hover:bg-slate-800 transition-colors"
                          >
                            Payer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary-50 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Paiement Automatique
            </h3>
            <p className="text-slate-600 mb-4">
              Configurez une méthode de paiement pour que vos factures soient automatiquement payées à l'échéance.
            </p>
            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
              Configurer le Paiement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
