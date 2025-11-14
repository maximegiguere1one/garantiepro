import { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2, Loader, ArrowRight, Building2, Package, Users, FileText, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface FranchiseStats {
  franchise_id: string;
  franchise_name: string;
  franchise_code: string;
  total_warranties: number;
  active_warranties: number;
  total_customers: number;
  total_claims: number;
  pending_claims: number;
  total_users: number;
  active_users: number;
  total_tokens: number;
  unpaid_invoices: number;
  total_unpaid_amount: number;
  billing_config: any;
  created_at: string;
  status: string;
}

interface DestinationFranchise {
  franchise_id: string;
  franchise_name: string;
  franchise_code: string;
  total_warranties: number;
  total_customers: number;
  status: string;
  created_at: string;
}

interface DeleteFranchiseModalProps {
  franchise: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteFranchiseModal({ franchise, onClose, onSuccess }: DeleteFranchiseModalProps) {
  const [step, setStep] = useState<'stats' | 'select-destination' | 'confirm'>('stats');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [franchiseStats, setFranchiseStats] = useState<FranchiseStats | null>(null);
  const [availableFranchises, setAvailableFranchises] = useState<DestinationFranchise[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadFranchiseStats();
  }, [franchise.id]);

  useEffect(() => {
    if (step === 'select-destination') {
      loadAvailableFranchises();
    }
  }, [step]);

  const loadFranchiseStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_franchise_deletion_stats', {
        p_franchise_id: franchise.id
      });

      if (error) throw error;
      setFranchiseStats(data);
    } catch (error: any) {
      console.error('Error loading franchise stats:', error);
      showToast('Erreur lors du chargement des statistiques', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFranchises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_available_destination_franchises', {
        p_exclude_franchise_id: franchise.id
      });

      if (error) throw error;
      setAvailableFranchises(data || []);
    } catch (error: any) {
      console.error('Error loading available franchises:', error);
      showToast('Erreur lors du chargement des franchises', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDestination || !franchiseStats) return;

    setDeleting(true);

    try {
      const { data, error } = await supabase.rpc('transfer_and_delete_franchise', {
        p_franchise_to_delete_id: franchise.id,
        p_destination_franchise_id: selectedDestination,
        p_confirmation_text: confirmText,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;

      if (data?.success) {
        showToast(
          `Franchise supprimée avec succès. ${data.transfer_summary.warranties_transferred} garanties transférées.`,
          'success'
        );
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error deleting franchise:', error);
      showToast(
        error.message || 'Erreur lors de la suppression de la franchise',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleNext = () => {
    if (step === 'stats') {
      setStep('select-destination');
    } else if (step === 'select-destination' && selectedDestination) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('select-destination');
    } else if (step === 'select-destination') {
      setStep('stats');
    }
  };

  const selectedDestinationFranchise = availableFranchises.find(f => f.franchise_id === selectedDestination);
  const isConfirmValid = confirmText.toLowerCase() === franchiseStats?.franchise_name.toLowerCase();
  const hasUnpaidInvoices = franchiseStats && franchiseStats.unpaid_invoices > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Supprimer une Franchise</h2>
              <p className="text-red-100 text-sm">
                {step === 'stats' && 'Étape 1: Statistiques'}
                {step === 'select-destination' && 'Étape 2: Franchise de destination'}
                {step === 'confirm' && 'Étape 3: Confirmation finale'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className={`flex items-center gap-2 ${step === 'stats' ? 'text-red-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'stats' ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                1
              </div>
              <span className="text-sm font-medium hidden sm:inline">Statistiques</span>
            </div>
            <div className="h-px flex-1 mx-2 bg-slate-300"></div>
            <div className={`flex items-center gap-2 ${step === 'select-destination' ? 'text-red-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'select-destination' ? 'bg-red-600 text-white' : step === 'confirm' ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                {step === 'confirm' ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Destination</span>
            </div>
            <div className="h-px flex-1 mx-2 bg-slate-300"></div>
            <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-red-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'confirm' ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                3
              </div>
              <span className="text-sm font-medium hidden sm:inline">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-red-600" />
              <span className="ml-3 text-slate-600">Chargement...</span>
            </div>
          ) : (
            <>
              {/* STEP 1: STATS */}
              {step === 'stats' && franchiseStats && (
                <div className="space-y-6">
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-900">{franchiseStats.franchise_name}</h3>
                        <p className="text-sm text-red-700">Code: {franchiseStats.franchise_code}</p>
                        <p className="text-xs text-red-600 mt-1">
                          Créée le {new Date(franchiseStats.created_at).toLocaleDateString('fr-CA')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {hasUnpaidInvoices && (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-bold text-yellow-900">Factures impayées détectées</p>
                          <p className="text-sm text-yellow-800 mt-1">
                            {franchiseStats.unpaid_invoices} facture(s) impayée(s) pour un total de {franchiseStats.total_unpaid_amount.toFixed(2)} $
                          </p>
                          <p className="text-xs text-yellow-700 mt-2">
                            Ces factures resteront impayées après la suppression. Assurez-vous d'avoir récupéré les paiements.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-3">Données à transférer</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Garanties</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{franchiseStats.total_warranties}</p>
                        <p className="text-xs text-blue-600 mt-1">{franchiseStats.active_warranties} actives</p>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Clients</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{franchiseStats.total_customers}</p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">Réclamations</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{franchiseStats.total_claims}</p>
                        <p className="text-xs text-purple-600 mt-1">{franchiseStats.pending_claims} en attente</p>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-orange-600" />
                          <span className="text-xs font-medium text-orange-700">Utilisateurs</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">{franchiseStats.total_users}</p>
                        <p className="text-xs text-orange-600 mt-1">Seront désactivés</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-1" />
                      <div className="text-sm text-slate-700 space-y-2">
                        <p className="font-medium">Cette action va:</p>
                        <ul className="ml-4 space-y-1 list-disc">
                          <li>Transférer toutes les garanties vers une autre franchise</li>
                          <li>Transférer les clients et réclamations associés</li>
                          <li>Désactiver tous les utilisateurs de cette franchise</li>
                          <li>Supprimer définitivement la franchise et ses paramètres</li>
                          <li>Créer un historique complet de l'opération</li>
                          <li>Permettre une restauration pendant 30 jours</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT DESTINATION */}
              {step === 'select-destination' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-bold text-blue-900 mb-2">Choisissez la franchise de destination</h4>
                    <p className="text-sm text-blue-700">
                      Toutes les garanties et données seront transférées vers cette franchise.
                    </p>
                  </div>

                  {availableFranchises.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-slate-600">Aucune franchise disponible pour le transfert</p>
                      <p className="text-sm text-slate-500 mt-1">Vous devez avoir au moins une autre franchise active</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableFranchises.map((dest) => (
                        <button
                          key={dest.franchise_id}
                          onClick={() => setSelectedDestination(dest.franchise_id)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedDestination === dest.franchise_id
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Building2 className={`w-5 h-5 ${selectedDestination === dest.franchise_id ? 'text-green-600' : 'text-slate-600'}`} />
                                <h4 className="font-bold text-slate-900">{dest.franchise_name}</h4>
                              </div>
                              <p className="text-sm text-slate-600 mt-1">Code: {dest.franchise_code}</p>
                              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                <span>{dest.total_warranties} garanties</span>
                                <span>{dest.total_customers} clients</span>
                              </div>
                            </div>
                            {selectedDestination === dest.franchise_id && (
                              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: CONFIRM */}
              {step === 'confirm' && franchiseStats && selectedDestinationFranchise && (
                <div className="space-y-6">
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                      <div>
                        <h3 className="text-xl font-bold text-red-900">Confirmation finale requise</h3>
                        <p className="text-sm text-red-700 mt-1">Cette action est irréversible après 30 jours</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-slate-200 rounded-xl p-5">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-slate-600" />
                      Résumé du transfert
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Franchise à supprimer</span>
                        <span className="font-bold text-red-900">{franchiseStats.franchise_name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Franchise de destination</span>
                        <span className="font-bold text-green-900">{selectedDestinationFranchise.franchise_name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Garanties à transférer</span>
                        <span className="font-bold text-blue-900">{franchiseStats.total_warranties}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Clients à transférer</span>
                        <span className="font-bold text-blue-900">{franchiseStats.total_customers}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-600">Utilisateurs à désactiver</span>
                        <span className="font-bold text-orange-900">{franchiseStats.total_users}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Pour confirmer, tapez le nom exact de la franchise:
                    </label>
                    <p className="text-lg font-bold text-red-600 mb-3 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                      {franchiseStats.franchise_name}
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Tapez le nom exact ici"
                      disabled={deleting}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100"
                      autoFocus
                    />
                    {confirmText && !isConfirmValid && (
                      <p className="text-sm text-red-600 mt-2">Le nom ne correspond pas exactement</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
          <button
            onClick={step === 'stats' ? onClose : handleBack}
            disabled={deleting}
            className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {step === 'stats' ? 'Annuler' : 'Retour'}
          </button>

          <div className="flex gap-3">
            {step !== 'confirm' && (
              <button
                onClick={handleNext}
                disabled={loading || (step === 'select-destination' && !selectedDestination)}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                Suivant
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {step === 'confirm' && (
              <button
                onClick={handleDelete}
                disabled={!isConfirmValid || deleting}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Suppression en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Supprimer définitivement
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
