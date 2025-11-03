import { useState } from 'react';
import { MessageSquare, X, Send, Smile, Meh, Frown, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface FeedbackWidgetProps {
  page?: string;
  className?: string;
}

export function FeedbackWidget({ page, className = '' }: FeedbackWidgetProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative' | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const feedbackTypes = [
    { value: 'bug', label: 'Signaler un bug', icon: '🐛', color: 'red' },
    { value: 'feature_request', label: 'Demande de fonctionnalité', icon: '💡', color: 'blue' },
    { value: 'improvement', label: 'Suggestion d\'amélioration', icon: '✨', color: 'purple' },
    { value: 'question', label: 'Question', icon: '❓', color: 'yellow' },
    { value: 'praise', label: 'Félicitations', icon: '🎉', color: 'green' },
    { value: 'other', label: 'Autre', icon: '💬', color: 'gray' },
  ];

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user!.id,
        organization_id: profile?.organization_id,
        feedback_type: feedbackType,
        sentiment,
        category: page,
        page_url: window.location.href,
        page_title: document.title,
        user_agent: navigator.userAgent,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (error) throw error;

      setStep('success');

      setTimeout(() => {
        resetForm();
        setIsOpen(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      showToast('Erreur lors de l\'envoi du feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('type');
    setFeedbackType('');
    setSentiment(null);
    setSubject('');
    setMessage('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetForm, 300);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-24 z-40 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center gap-2 ${className}`}
        title="Donner votre avis"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-semibold">Feedback</span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fadeIn"
        onClick={handleClose}
      />

      {/* Feedback Panel */}
      <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-lg">Votre feedback</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1">
            Aidez-nous à améliorer Pro-Remorque
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Quel type de feedback souhaitez-vous partager?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setFeedbackType(type.value);
                        setStep('details');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-left hover:scale-105 ${
                        feedbackType === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-xs font-medium text-slate-900">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {/* Sentiment */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comment vous sentez-vous?
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSentiment('positive')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      sentiment === 'positive'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300'
                    }`}
                  >
                    <Smile className={`w-6 h-6 mx-auto ${sentiment === 'positive' ? 'text-green-600' : 'text-slate-400'}`} />
                  </button>
                  <button
                    onClick={() => setSentiment('neutral')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      sentiment === 'neutral'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-slate-200 hover:border-yellow-300'
                    }`}
                  >
                    <Meh className={`w-6 h-6 mx-auto ${sentiment === 'neutral' ? 'text-yellow-600' : 'text-slate-400'}`} />
                  </button>
                  <button
                    onClick={() => setSentiment('negative')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      sentiment === 'negative'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-red-300'
                    }`}
                  >
                    <Frown className={`w-6 h-6 mx-auto ${sentiment === 'negative' ? 'text-red-600' : 'text-slate-400'}`} />
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="En quelques mots..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre feedback en détail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-slate-500 text-right mt-1">
                  {message.length}/500
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('type')}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  disabled={submitting}
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!subject.trim() || !message.trim() || submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scaleIn">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">
                Merci pour votre feedback!
              </h4>
              <p className="text-slate-600 text-sm">
                Votre message a été transmis à notre équipe. Nous l'examinons attentivement.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function useFeedback() {
  const [showFeedback, setShowFeedback] = useState(false);

  const openFeedback = () => setShowFeedback(true);
  const closeFeedback = () => setShowFeedback(false);

  return {
    showFeedback,
    openFeedback,
    closeFeedback,
  };
}
