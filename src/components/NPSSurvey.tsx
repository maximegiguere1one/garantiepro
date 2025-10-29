import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface NPSSurveyProps {
  customerId: string;
  warrantyId?: string | null;
  claimId?: string | null;
  surveyType: 'post_sale' | 'post_claim';
  onClose: () => void;
  onSuccess: () => void;
}

export function NPSSurvey({
  customerId,
  warrantyId,
  claimId,
  surveyType,
  onClose,
  onSuccess,
}: NPSSurveyProps) {
  const toast = useToast();
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === null) {
      toast.warning('Attention', 'Veuillez sélectionner une note');
      return;
    }

    try {
      setSubmitting(true);

      const shouldInviteReview = score >= 9;

      const { error } = await supabase.from('nps_surveys').insert({
        customer_id: customerId,
        warranty_id: warrantyId,
        claim_id: claimId,
        survey_type: surveyType,
        score,
        feedback: feedback.trim() || null,
        google_review_invited: shouldInviteReview,
        google_review_invited_at: shouldInviteReview ? new Date().toISOString() : null,
      });

      if (error) throw error;

      if (shouldInviteReview) {
        toast.success(
          'Merci!',
          'Votre avis nous est précieux. Nous vous invitons à laisser un avis Google!'
        );
      } else {
        toast.success('Merci!', 'Votre feedback nous aide à nous améliorer');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting NPS survey:', error);
      toast.error('Erreur', 'Impossible de soumettre le sondage');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (value: number) => {
    if (value <= 6) return 'bg-red-500 hover:bg-red-600';
    if (value <= 8) return 'bg-amber-500 hover:bg-amber-600';
    return 'bg-emerald-500 hover:bg-emerald-600';
  };

  const getScoreLabel = () => {
    if (score === null) return '';
    if (score <= 6) return 'Détracteur';
    if (score <= 8) return 'Passif';
    return 'Promoteur';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {surveyType === 'post_sale'
              ? 'Comment évaluez-vous votre expérience?'
              : 'Comment évaluez-vous le traitement de votre réclamation?'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-slate-700 mb-4 text-center">
              Sur une échelle de 0 à 10, quelle est la probabilité que vous recommandiez nos
              services à un ami ou un collègue?
            </p>

            <div className="grid grid-cols-11 gap-2 mb-3">
              {[...Array(11)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setScore(index)}
                  className={`aspect-square rounded-lg font-semibold text-white text-sm transition-all ${
                    score === index
                      ? `${getScoreColor(index)} ring-2 ring-offset-2 ring-slate-900 scale-110`
                      : score === null
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {index}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>Pas du tout probable</span>
              <span>Extrêmement probable</span>
            </div>

            {score !== null && (
              <div className="mt-4 text-center">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                    score <= 6
                      ? 'bg-red-100 text-red-800'
                      : score <= 8
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {getScoreLabel()}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pouvez-vous nous en dire plus? (optionnel)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
              rows={4}
              placeholder="Vos commentaires nous aident à nous améliorer..."
            />
          </div>

          {score !== null && score >= 9 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-900 font-medium mb-2">
                Merci pour votre excellente évaluation!
              </p>
              <p className="text-xs text-emerald-800">
                Nous vous invitons à partager votre expérience sur Google Reviews pour aider
                d'autres clients.
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || score === null}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
