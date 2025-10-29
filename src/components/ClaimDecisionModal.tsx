import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Loader2,
  Save,
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Claim = Database['public']['Tables']['claims']['Row'] & {
  customers?: Database['public']['Tables']['customers']['Row'];
  warranties?: Database['public']['Tables']['warranties']['Row'];
};

interface ClaimDecisionModalProps {
  claim: Claim;
  onClose: () => void;
  onSuccess: () => void;
}

type DecisionType = 'approved' | 'partially_approved' | 'denied';

const DENIAL_REASONS = [
  'Non couvert par la garantie',
  'Dommages pré-existants',
  'Usure normale',
  'Mauvaise utilisation',
  'Entretien inadéquat',
  'Garantie expirée au moment de l\'incident',
  'Documentation insuffisante',
  'Autre (préciser dans les notes)',
];

export function ClaimDecisionModal({ claim, onClose, onSuccess }: ClaimDecisionModalProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [decisionType, setDecisionType] = useState<DecisionType>('approved');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [denialReason, setDenialReason] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const canMakeDecision = profile?.role === 'admin' || profile?.role === 'f_and_i';

  if (!canMakeDecision) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Accès refusé</h3>
            <p className="text-slate-600 mb-4">
              Seuls les administrateurs et le personnel F&I peuvent prendre des décisions sur les réclamations.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (decisionType === 'approved' || decisionType === 'partially_approved') {
      const amount = parseFloat(approvedAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Erreur', 'Veuillez entrer un montant valide');
        return;
      }
    }

    if (decisionType === 'denied' && !denialReason.trim()) {
      toast.error('Erreur', 'Veuillez sélectionner une raison de refus');
      return;
    }

    try {
      setSubmitting(true);

      const updateData: Record<string, any> = {
        status: decisionType,
        current_step: decisionType === 'approved' || decisionType === 'partially_approved' ? 4 : 4,
        updated_at: new Date().toISOString(),
      };

      if (decisionType === 'approved' || decisionType === 'partially_approved') {
        updateData.approved_amount = parseFloat(approvedAmount);
      }

      if (decisionType === 'denied') {
        updateData.denied_reason = denialReason;
      }

      const { error: updateError } = await supabase
        .from('claims')
        .update(updateData)
        .eq('id', claim.id);

      if (updateError) throw updateError;

      let timelineDescription = '';
      const timelineMetadata: Record<string, unknown> = {
        decision_type: decisionType,
        decided_by: profile?.id,
        decided_by_email: profile?.email,
      };

      if (decisionType === 'approved') {
        timelineDescription = `Réclamation approuvée - Montant: ${parseFloat(approvedAmount).toFixed(2)} $`;
        timelineMetadata.approved_amount = parseFloat(approvedAmount);
      } else if (decisionType === 'partially_approved') {
        timelineDescription = `Réclamation partiellement approuvée - Montant: ${parseFloat(approvedAmount).toFixed(2)} $`;
        timelineMetadata.approved_amount = parseFloat(approvedAmount);
      } else {
        timelineDescription = `Réclamation refusée - Raison: ${denialReason}`;
        timelineMetadata.denial_reason = denialReason;
      }

      if (additionalNotes.trim()) {
        timelineMetadata.notes = additionalNotes;
      }

      await supabase.from('claim_timeline').insert({
        claim_id: claim.id,
        event_type: 'decision_made',
        description: timelineDescription,
        created_by: profile?.id,
        metadata: timelineMetadata,
      });

      toast.success(
        'Décision enregistrée',
        `La réclamation a été ${
          decisionType === 'approved'
            ? 'approuvée'
            : decisionType === 'partially_approved'
            ? 'partiellement approuvée'
            : 'refusée'
        }`
      );

      onSuccess();
      onClose();
    } catch (error) {
      const err = error as Error;
      console.error('Error making decision:', error);
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer la décision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Prendre une décision</h2>
              <p className="text-slate-300 text-sm">Réclamation {claim.claim_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Résumé de la réclamation</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Client:</p>
                <p className="font-medium text-slate-900">
                  {claim.customers?.first_name} {claim.customers?.last_name}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Date incident:</p>
                <p className="font-medium text-slate-900">
                  {new Date(claim.incident_date).toLocaleDateString('fr-CA')}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-600 mb-1">Description:</p>
                <p className="text-slate-900">{claim.incident_description}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Type de décision <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecisionType('approved')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  decisionType === 'approved'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CheckCircle
                  className={`w-8 h-8 mx-auto mb-2 ${
                    decisionType === 'approved' ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    decisionType === 'approved' ? 'text-emerald-900' : 'text-slate-700'
                  }`}
                >
                  Approuver
                </p>
                <p className="text-xs text-slate-500 mt-1">Montant complet</p>
              </button>

              <button
                type="button"
                onClick={() => setDecisionType('partially_approved')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  decisionType === 'partially_approved'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <AlertCircle
                  className={`w-8 h-8 mx-auto mb-2 ${
                    decisionType === 'partially_approved' ? 'text-primary-600' : 'text-slate-400'
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    decisionType === 'partially_approved' ? 'text-primary-900' : 'text-slate-700'
                  }`}
                >
                  Approuver partiellement
                </p>
                <p className="text-xs text-slate-500 mt-1">Montant réduit</p>
              </button>

              <button
                type="button"
                onClick={() => setDecisionType('denied')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  decisionType === 'denied'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <XCircle
                  className={`w-8 h-8 mx-auto mb-2 ${
                    decisionType === 'denied' ? 'text-red-600' : 'text-slate-400'
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    decisionType === 'denied' ? 'text-red-900' : 'text-slate-700'
                  }`}
                >
                  Refuser
                </p>
                <p className="text-xs text-slate-500 mt-1">Non couvert</p>
              </button>
            </div>
          </div>

          {(decisionType === 'approved' || decisionType === 'partially_approved') && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Montant approuvé <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">
                    {decisionType === 'approved'
                      ? 'Montant total de la réclamation'
                      : 'Montant partiel à approuver'}
                  </p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-slate-900 font-medium"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          )}

          {decisionType === 'denied' && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Raison du refus <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Sélectionnez la raison principale</p>
                </div>
              </div>
              <select
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-slate-900 font-medium"
                required
              >
                <option value="">Sélectionnez une raison</option>
                {DENIAL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Notes additionnelles (optionnel)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none text-slate-900"
              rows={4}
              placeholder="Ajoutez des notes ou commentaires additionnels..."
            />
          </div>

          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-primary-800">
                <p className="font-semibold mb-1">Important</p>
                <p>
                  Cette décision sera enregistrée de façon permanente. Une notification sera envoyée
                  automatiquement au client.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-medium"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer la décision
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
