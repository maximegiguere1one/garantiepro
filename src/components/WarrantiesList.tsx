import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { Shield, Search, Download, Eye, X, MapPin, Phone, Mail, Calendar, FileDown, Zap, AlertTriangle, Bug, RefreshCw, Send } from 'lucide-react';
import { microcopy } from '../lib/microcopy';
import { ErrorMessage } from './common/ErrorMessage';
import { downloadPDF, downloadBase64PDF } from '../lib/document-download-utils';
import { exportWarrantiesToCSV, exportWarrantyToAcombaCSV } from '../lib/data-export';
import { warrantyService, type WarrantyListItem } from '../lib/warranty-service';
import { supabase } from '../lib/supabase';
import { generateWarrantyConfirmationEmailHTML } from '../lib/warranty-email-template';
import { ClaimLinkDisplay } from './ClaimLinkDisplay';
import { Breadcrumbs } from './common/Breadcrumbs';
import { AnimatedButton } from './common/AnimatedButton';
import { Pagination } from './Pagination';
import { WarrantyListSkeleton, PerformanceBadge } from './common/WarrantySkeleton';
import { WarrantyDiagnosticsPanel } from './WarrantyDiagnosticsPanel';
import { LazyWarrantyCard } from './common/LazyWarrantyCard';
import { WarrantyDeleteConfirmationModal } from './common/WarrantyDeleteConfirmationModal';
// import { WarrantyDocumentsManager } from './warranty/WarrantyDocumentsManager';

type Warranty = WarrantyListItem;

export const WarrantiesList = memo(() => {
  const { profile } = useAuth();
  const toast = useToast();
  const { viewMode } = useViewMode();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [fromCache, setFromCache] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [warrantyToDelete, setWarrantyToDelete] = useState<Warranty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 10;

  const loadWarranties = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[WarrantiesList] Loading warranties - attempt ${retryCount + 1}`);

      const response = await warrantyService.getWarrantiesOptimized(
        currentPage,
        itemsPerPage,
        statusFilter,
        search
      );

      // Check if we got valid data
      if (response && Array.isArray(response.data)) {
        setWarranties(response.data as Warranty[]);
        setTotalCount(response.totalCount);
        setExecutionTime(response.executionTime);
        setFromCache(response.fromCache);
        setError(null);

        console.log(`[WarrantiesList] Successfully loaded ${response.data.length} warranties`);

        // Prefetch next page if performance is good
        if (response.executionTime < 500) {
          warrantyService.prefetchNextPage(currentPage, itemsPerPage, statusFilter, search);
        }

        // Performance feedback only for very slow queries
        if (response.executionTime > 3000) {
          console.warn('Slow query detected:', response.executionTime.toFixed(0), 'ms');
        }
      } else {
        // Invalid response
        console.error('[WarrantiesList] Invalid response from service:', response);
        throw new Error('Réponse invalide du service');
      }
    } catch (error: any) {
      console.error('[WarrantiesList] Error loading warranties:', error);

      // Retry logic with exponential backoff
      if (retryCount < 2) {
        const delay = 1000 * Math.pow(2, retryCount);
        console.log(`[WarrantiesList] Retrying in ${delay}ms... (attempt ${retryCount + 2}/3)`);
        toast.info('Rechargement', `Nouvelle tentative dans ${delay / 1000}s...`);
        setTimeout(() => loadWarranties(retryCount + 1), delay);
        return;
      }

      // All retries failed
      const errorMessage = error.message || 'Impossible de charger les garanties';
      console.error('[WarrantiesList] All retry attempts failed:', errorMessage);
      setError(errorMessage);
      toast.error('Erreur', errorMessage);
      setWarranties([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, search, toast]);

  useEffect(() => {
    loadWarranties();
  }, [loadWarranties]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredWarranties = useMemo(() => {
    return warranties;
  }, [warranties]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700';
      case 'draft':
        return 'bg-slate-100 text-slate-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <Breadcrumbs items={[{ label: 'Garanties' }]} />
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Garanties</h1>
            <p className="text-slate-600 mt-2">Chargement optimisé en cours...</p>
          </div>
        </div>
        <WarrantyListSkeleton count={5} />
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      exportWarrantiesToCSV(filteredWarranties);
      toast.success('Export réussi', 'Les garanties ont été exportées');
    } catch (error: any) {
      toast.error('Erreur', 'Impossible d\'exporter les garanties');
    } finally {
      setExporting(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[WarrantiesList] Manual refresh triggered');

      // Invalidate cache
      warrantyService.invalidateCache();

      // Refresh materialized view
      await warrantyService.refreshMaterializedView();

      // Reload warranties
      await loadWarranties(0);

      toast.success('Rafraîchi', 'La liste des garanties a été mise à jour');
    } catch (error: any) {
      console.error('[WarrantiesList] Manual refresh failed:', error);
      toast.error('Erreur', 'Impossible de rafraîchir la liste');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteWarranty = async () => {
    if (!warrantyToDelete) return;

    setIsDeleting(true);

    try {
      console.log('[WarrantiesList] Deleting warranty:', warrantyToDelete.id);

      const result = await warrantyService.deleteWarranty(warrantyToDelete.id);

      if (result.success) {
        // Retirer la garantie de la liste locale avec animation
        setWarranties((prev) => prev.filter((w) => w.id !== warrantyToDelete.id));
        setTotalCount((prev) => Math.max(0, prev - 1));

        // Fermer le modal
        setWarrantyToDelete(null);

        // Afficher un toast de succès
        toast.success(
          'Garantie supprimée',
          result.message,
          5000
        );

        // Recharger la liste après un court délai pour synchroniser
        setTimeout(() => {
          loadWarranties(0);
        }, 1000);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('[WarrantiesList] Delete error:', error);
      toast.error(
        'Erreur de suppression',
        error.message || 'Impossible de supprimer la garantie. Veuillez réessayer.',
        7000
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteWarranty = useMemo(() => {
    return profile?.role === 'admin' || profile?.role === 'master';
  }, [profile?.role]);

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Garanties' }]} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Garanties</h1>
            {executionTime > 0 && <PerformanceBadge executionTime={executionTime} />}
            {fromCache && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-300">
                <Zap className="w-3 h-3" />
                Depuis le cache
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-2">
            Gérez et suivez tous les contrats de garantie ({totalCount} total{totalCount > 1 ? 's' : ''})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rafraîchir la liste des garanties"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
          <button
            onClick={() => setShowDiagnostics(true)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            title="Ouvrir le panneau de diagnostic"
          >
            <Bug className="w-4 h-4" />
            <span className="hidden sm:inline">Diagnostic</span>
          </button>
          {filteredWarranties.length > 0 && (
            <AnimatedButton
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              icon={<FileDown className="w-5 h-5" />}
            >
              Exporter en CSV
            </AnimatedButton>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={microcopy.search.warranties.placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">{microcopy.filters.status.all}</option>
            <option value="draft">{microcopy.status.warranty.draft.label}</option>
            <option value="active">{microcopy.status.warranty.active.label}</option>
            <option value="expired">{microcopy.status.warranty.expired.label}</option>
            <option value="cancelled">{microcopy.status.warranty.cancelled.label}</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Impossible de charger les garanties
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadWarranties(0)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Réessayer
                </button>
                <button
                  onClick={() => setShowDiagnostics(true)}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Bug className="w-4 h-4" />
                  Ouvrir le diagnostic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {!loading && !error && filteredWarranties.length === 0 && totalCount === 0 && !search && statusFilter === 'all' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{microcopy.emptyStates.warranties.title}</h3>
            <p className="text-slate-600 mb-4">
              {microcopy.emptyStates.warranties.message}
            </p>
            <button
              onClick={() => loadWarranties(0)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        ) : filteredWarranties.length === 0 && !loading && !error ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune garantie trouvée</h3>
            <p className="text-slate-600 mb-4">
              Essayez d'ajuster vos filtres ou recherchez un autre terme
            </p>
            <button
              onClick={() => loadWarranties(0)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : filteredWarranties.length > 0 ? (
          filteredWarranties.map((warranty) => (
            <LazyWarrantyCard
              key={warranty.id}
              warranty={warranty}
              onViewDetails={setSelectedWarranty}
              onDownload={(w) => w.contract_pdf_url && downloadBase64PDF(w.contract_pdf_url, `Contrat-${w.contract_number}.pdf`)}
              onDelete={canDeleteWarranty ? setWarrantyToDelete : undefined}
              canDelete={canDeleteWarranty}
              getStatusColor={getStatusColor}
            />
          ))
        ) : null}
      </div>

      {/* Fallback to old cards for special features */}
      <div className="hidden">
        {filteredWarranties.length > 0 ? (
          filteredWarranties.map((warranty) => (
            <div
              key={warranty.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{warranty.contract_number}</h3>
                  <p className="text-sm text-slate-600">
                    {warranty.customer_first_name} {warranty.customer_last_name} - {warranty.customer_email}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    warranty.status
                  )}`}
                >
                  {warranty.status.charAt(0).toUpperCase() + warranty.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Trailer</p>
                  <p className="text-sm font-medium text-slate-900">
                    {warranty.trailer_year} {warranty.trailer_make} {warranty.trailer_model}
                  </p>
                  <p className="text-xs text-slate-500">{warranty.trailer_vin}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Plan</p>
                  <p className="text-sm font-medium text-slate-900">{warranty.plan_name_en}</p>
                  <p className="text-xs text-slate-500">
                    {warranty.duration_months} months - ${warranty.deductible} deductible
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Coverage Period</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(warranty.start_date).toLocaleDateString()} -{' '}
                    {new Date(warranty.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">{warranty.province}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Total Price</p>
                    <p className="text-lg font-bold text-slate-900">
                      {warranty.total_price != null ? `$${warranty.total_price.toFixed(2)} CAD` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Margin</p>
                    <p className="text-sm font-medium text-slate-900">
                      {warranty.margin != null ? `$${warranty.margin.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  {warranty.sale_duration_seconds && (
                    <div>
                      <p className="text-xs text-slate-500">Sale Duration</p>
                      <p className="text-sm font-medium text-slate-900">
                        {Math.floor(warranty.sale_duration_seconds / 60)}m{' '}
                        {warranty.sale_duration_seconds % 60}s
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {profile?.role !== 'client' && (
                    <button
                      onClick={() => exportWarrantyToAcombaCSV(warranty)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Exporter pour Acomba"
                    >
                      <FileDown className="w-5 h-5" />
                    </button>
                  )}
                  {warranty.customer_invoice_pdf_url && (
                    <button
                      onClick={() => downloadBase64PDF(warranty.customer_invoice_pdf_url!, `Facture-Client-${warranty.contract_number}.pdf`)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Télécharger la facture client"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  {warranty.merchant_invoice_pdf_url && profile?.role !== 'client' && (
                    <button
                      onClick={() => downloadBase64PDF(warranty.merchant_invoice_pdf_url!, `Facture-Marchande-${warranty.contract_number}.pdf`)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Télécharger la facture marchande"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  {warranty.contract_pdf_url && (
                    <button
                      onClick={() => downloadBase64PDF(warranty.contract_pdf_url!, `Contrat-${warranty.contract_number}.pdf`)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Télécharger le contrat"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedWarranty(warranty)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Voir les détails"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {warranty.legal_validation_passed === false && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-900">Legal validation issues detected</p>
                </div>
              )}
            </div>
          ))
        ) : null}
      </div>

      {/* Pagination */}
      {totalCount > itemsPerPage && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            showItemsPerPage={false}
          />
        </div>
      )}

      {selectedWarranty && (
        <WarrantyDetailsModal
          warranty={selectedWarranty}
          onClose={() => setSelectedWarranty(null)}
        />
      )}

      {showDiagnostics && (
        <WarrantyDiagnosticsPanel onClose={() => setShowDiagnostics(false)} />
      )}

      {warrantyToDelete && (
        <WarrantyDeleteConfirmationModal
          warranty={warrantyToDelete}
          onConfirm={handleDeleteWarranty}
          onCancel={() => setWarrantyToDelete(null)}
        />
      )}
    </div>
  );
});

WarrantiesList.displayName = 'WarrantiesList';

function WarrantyDetailsModal({ warranty, onClose }: { warranty: Warranty; onClose: () => void }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const resendWarrantyEmail = async () => {
    setSending(true);
    try {
      // Validation des données requises
      if (!warranty.customer_email) {
        throw new Error('Adresse email du client manquante');
      }

      // Générer l'URL de téléchargement
      const downloadUrl = `${window.location.origin}/warranty-download/${warranty.id}`;

      // Préparer les informations de la remorque
      const trailerParts = [
        warranty.trailer_year,
        warranty.trailer_make,
        warranty.trailer_model
      ].filter(Boolean);
      const trailerInfo = trailerParts.length > 0 ? trailerParts.join(' ') : 'Informations non disponibles';

      // Générer l'HTML de l'email
      const emailHTML = generateWarrantyConfirmationEmailHTML({
        customerName: warranty.customer_name || 'Client',
        contractNumber: warranty.contract_number,
        planName: warranty.plan_name || 'Plan de garantie',
        totalPrice: warranty.total_price || 0,
        startDate: warranty.start_date,
        endDate: warranty.end_date,
        trailerInfo,
        vin: warranty.vin || 'N/A',
        downloadUrl,
        expiresInDays: 30,
        language: 'fr',
      });

      // Envoyer l'email via la fonction edge
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: warranty.customer_email,
          subject: `Confirmation de garantie - ${warranty.contract_number}`,
          body: emailHTML,
        },
      });

      if (error) throw error;

      toast.success(
        'Email envoyé',
        `L'email de confirmation a été renvoyé à ${warranty.customer_email}`
      );
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast.error('Erreur', error.message || 'Impossible d\'envoyer l\'email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Détails de la garantie</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {warranty.contract_number}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  warranty.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : warranty.status === 'draft'
                    ? 'bg-slate-100 text-slate-700'
                    : warranty.status === 'expired'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {warranty.status}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Créé le {new Date(warranty.created_at).toLocaleDateString('fr-CA')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Information client</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-900 font-medium">
                      {warranty.customer_first_name || ''} {warranty.customer_last_name || 'Client'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{warranty.customer_email || 'Email non disponible'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{warranty.customer_phone || 'Téléphone non disponible'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="text-slate-600">
                    {warranty.customer_address && <p>{warranty.customer_address}</p>}
                    <p>
                      {warranty.customer_city || ''}{warranty.customer_city && warranty.customer_province ? ', ' : ''}{warranty.customer_province || ''}
                    </p>
                    {warranty.customer_postal_code && <p>{warranty.customer_postal_code}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Remorque</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Année:</span>{' '}
                  <span className="text-slate-900 font-medium">
                    {warranty.trailer_year && warranty.trailer_year !== 0 ? warranty.trailer_year : 'Non spécifiée'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Marque:</span>{' '}
                  <span className="text-slate-900 font-medium">
                    {warranty.trailer_make || 'Non spécifiée'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Modèle:</span>{' '}
                  <span className="text-slate-900 font-medium">
                    {warranty.trailer_model || 'Non spécifié'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">NIV:</span>{' '}
                  <span className="text-slate-900 font-mono text-xs">
                    {warranty.trailer_vin || 'Non disponible'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Prix d'achat:</span>{' '}
                  <span className="text-slate-900 font-medium">
                    {warranty.trailer_purchase_price && warranty.trailer_purchase_price !== 0
                      ? `${warranty.trailer_purchase_price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
                      : 'Non spécifié'}
                  </span>
                </p>
                {warranty.trailer_length && warranty.trailer_length !== 0 && (
                  <p>
                    <span className="text-slate-500">Longueur:</span>{' '}
                    <span className="text-slate-900 font-medium">
                      {warranty.trailer_length} pieds
                    </span>
                  </p>
                )}
                {warranty.trailer_gvwr && warranty.trailer_gvwr !== 0 && (
                  <p>
                    <span className="text-slate-500">PNBV:</span>{' '}
                    <span className="text-slate-900 font-medium">
                      {warranty.trailer_gvwr.toLocaleString('fr-CA')} lbs
                    </span>
                  </p>
                )}
                {warranty.trailer_color && (
                  <p>
                    <span className="text-slate-500">Couleur:</span>{' '}
                    <span className="text-slate-900 font-medium">
                      {warranty.trailer_color}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Couverture</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Début</p>
                <p className="text-sm font-medium text-slate-900">
                  {warranty.start_date && warranty.start_date !== 'Invalid Date'
                    ? new Date(warranty.start_date).toLocaleDateString('fr-CA')
                    : 'Date non disponible'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Fin</p>
                <p className="text-sm font-medium text-slate-900">
                  {warranty.end_date && warranty.end_date !== 'Invalid Date'
                    ? new Date(warranty.end_date).toLocaleDateString('fr-CA')
                    : 'Date non disponible'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Durée</p>
                <p className="text-sm font-medium text-slate-900">
                  {warranty.duration_months && warranty.duration_months !== 0
                    ? `${warranty.duration_months} mois`
                    : 'Non spécifiée'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Franchise</p>
                <p className="text-sm font-medium text-slate-900">
                  {warranty.deductible && warranty.deductible !== 0
                    ? `${warranty.deductible.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
                    : 'Non spécifiée'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Tarification</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Prix de base</span>
                <span className="text-slate-900">
                  {warranty.base_price ? `${warranty.base_price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Options</span>
                <span className="text-slate-900">
                  {warranty.options_price != null ? `${warranty.options_price.toFixed(2)} $` : '0.00 $'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Taxes</span>
                <span className="text-slate-900">
                  {warranty.taxes != null ? `${warranty.taxes.toFixed(2)} $` : '0.00 $'}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-slate-200">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">
                  {warranty.total_price != null ? `${warranty.total_price.toFixed(2)} $` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600 font-medium">
                <span>Marge</span>
                <span>
                  {warranty.margin != null ? `${warranty.margin.toFixed(2)} $` : '0.00 $'}
                </span>
              </div>
            </div>
          </div>

          {warranty.status === 'active' && (
            <div className="border-t border-slate-200 pt-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Lien de réclamation</h4>
              <ClaimLinkDisplay warrantyId={warranty.id} />
            </div>
          )}
        </div>

        {warranty.signature_proof_url && (
          <div className="p-6 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Signature du client</h4>
            <div className="flex items-start gap-6">
              <div className="border-2 border-slate-200 rounded-lg p-4 bg-white">
                <img src={warranty.signature_proof_url} alt="Signature" className="h-20" />
              </div>
              <div className="text-sm text-slate-600">
                <p>Signé le {warranty.signed_at ? new Date(warranty.signed_at).toLocaleString('fr-CA') : 'N/A'}</p>
                <p className="mt-1">IP: {warranty.signature_ip || 'Non enregistrée'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Gestionnaire de Documents */}
        {/* <div className="p-6 border-t border-slate-200">
          <WarrantyDocumentsManager
            warrantyId={warranty.id}
            organizationId={warranty.organization_id}
          />
        </div> */}

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={resendWarrantyEmail}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              title="Renvoyer l'email de confirmation au client"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Envoi...' : 'Renvoyer par courriel'}
            </button>
            {warranty.customer_invoice_pdf_url && (
              <button
                onClick={async () => {
                  try {
                    await downloadPDF(warranty.customer_invoice_pdf_url!, `Facture-Client-${warranty.contract_number}.pdf`);
                  } catch (error: any) {
                    toast.error('Erreur', error.message);
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                Facture Client
              </button>
            )}
            {warranty.merchant_invoice_pdf_url && (
              <button
                onClick={async () => {
                  try {
                    await downloadPDF(warranty.merchant_invoice_pdf_url!, `Facture-Marchande-${warranty.contract_number}.pdf`);
                  } catch (error: any) {
                    toast.error('Erreur', error.message);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                Facture Marchande
              </button>
            )}
            {warranty.contract_pdf_url && (
              <button
                onClick={async () => {
                  try {
                    await downloadPDF(warranty.contract_pdf_url!, `Contrat-${warranty.contract_number}.pdf`);
                  } catch (error: any) {
                    toast.error('Erreur', error.message);
                  }
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
              >
                Contrat
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {microcopy.buttons.close}
          </button>
        </div>
      </div>
    </div>
  );
}
