import { useState } from 'react';
import { AlertTriangle, X, Trash2, Loader } from 'lucide-react';
import type { WarrantyListItem } from '../../lib/warranty-service';

interface WarrantyDeleteConfirmationModalProps {
  warranty: WarrantyListItem;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function WarrantyDeleteConfirmationModal({
  warranty,
  onConfirm,
  onCancel,
}: WarrantyDeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error deleting warranty:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onCancel();
    }
  };

  const isConfirmValid = confirmText.toLowerCase() === warranty.contract_number.toLowerCase();

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-slideUp">
        {/* Header avec alerte rouge */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Supprimer définitivement cette garantie</h2>
              <p className="text-red-100 text-sm">Cette action est irréversible</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Informations de la garantie */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Numéro de contrat</p>
                <p className="text-lg font-bold text-red-900">{warranty.contract_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-red-600 font-medium mb-1">Client</p>
                  <p className="text-sm font-semibold text-red-900">
                    {warranty.customer_first_name} {warranty.customer_last_name}
                  </p>
                  <p className="text-xs text-red-700">{warranty.customer_email}</p>
                </div>

                <div>
                  <p className="text-xs text-red-600 font-medium mb-1">Montant total</p>
                  <p className="text-lg font-bold text-red-900">
                    {warranty.total_price?.toFixed(2) || '0.00'} $
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Véhicule</p>
                <p className="text-sm font-semibold text-red-900">
                  {warranty.trailer_year} {warranty.trailer_make} {warranty.trailer_model}
                </p>
                <p className="text-xs text-red-700 font-mono">{warranty.trailer_vin}</p>
              </div>
            </div>
          </div>

          {/* Avertissement principal */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-yellow-900">Attention : Cette action est IRRÉVERSIBLE</p>
                <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                  <li>La garantie sera supprimée définitivement de la base de données</li>
                  <li>Tous les documents PDF associés seront supprimés</li>
                  <li>Les paiements et tokens de téléchargement seront supprimés</li>
                  <li>Les réclamations en cours seront marquées comme orphelines</li>
                  <li>Cette action sera enregistrée dans l'historique d'audit</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Champ de confirmation */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Pour confirmer, tapez le numéro de contrat : <span className="text-red-600">{warranty.contract_number}</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Tapez le numéro de contrat ici"
              disabled={isDeleting}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              autoFocus
            />
            {confirmText && !isConfirmValid && (
              <p className="text-sm text-red-600 mt-1">Le numéro de contrat ne correspond pas</p>
            )}
          </div>
        </div>

        {/* Footer avec boutons */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
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
        </div>
      </div>
    </div>
  );
}
