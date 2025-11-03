import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingProgress {
  has_completed_profile: boolean;
  has_created_first_warranty: boolean;
  has_viewed_dashboard: boolean;
  has_explored_settings: boolean;
  has_created_customer: boolean;
  has_used_search: boolean;
  has_viewed_analytics: boolean;
  has_completed_tour: boolean;
  completed_steps: number;
  total_steps: number;
  completion_percentage: number;
  completed_at: string | null;
}

export function OnboardingChecklist() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProgress();
    }
  }, [user?.id]);

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const { data: newProgress, error: insertError } = await supabase
          .from('user_onboarding_progress')
          .insert({
            user_id: user!.id,
            organization_id: profile?.organization_id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setProgress(newProgress);
      } else {
        setProgress(data);

        if (data.completion_percentage === 100 && !data.completed_at) {
          setShowCelebration(true);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (field: string, value: boolean) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .update({ [field]: value })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const previousPercentage = progress?.completion_percentage || 0;
      setProgress(data);

      if (data.completion_percentage > previousPercentage) {
        showToast('Bravo! Étape complétée', 'success');
      }

      if (data.completion_percentage === 100 && previousPercentage < 100) {
        setShowCelebration(true);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const markStepComplete = (key: string) => {
    const fieldMap: Record<string, string> = {
      profile: 'has_completed_profile',
      warranty: 'has_created_first_warranty',
      dashboard: 'has_viewed_dashboard',
      settings: 'has_explored_settings',
      customer: 'has_created_customer',
      search: 'has_used_search',
      analytics: 'has_viewed_analytics',
      tour: 'has_completed_tour',
    };

    const field = fieldMap[key];
    if (field) {
      updateProgress(field, true);
    }
  };

  const steps: OnboardingStep[] = [
    {
      key: 'profile',
      title: 'Complétez votre profil',
      description: 'Ajoutez vos informations personnelles',
      completed: progress?.has_completed_profile || false,
      action: () => window.location.hash = '#settings/profile',
      actionLabel: 'Compléter',
    },
    {
      key: 'tour',
      title: 'Suivez le tour guidé',
      description: 'Découvrez les fonctionnalités principales',
      completed: progress?.has_completed_tour || false,
      action: () => {
        localStorage.removeItem('hasSeenOnboardingTour');
        window.location.reload();
      },
      actionLabel: 'Démarrer',
    },
    {
      key: 'warranty',
      title: 'Créez votre première garantie',
      description: 'Le processus prend moins de 2 minutes',
      completed: progress?.has_created_first_warranty || false,
      action: () => window.location.hash = '#new-warranty',
      actionLabel: 'Créer',
    },
    {
      key: 'customer',
      title: 'Ajoutez un client',
      description: 'Gérez votre base de clients',
      completed: progress?.has_created_customer || false,
      action: () => window.location.hash = '#customers',
      actionLabel: 'Ajouter',
    },
    {
      key: 'settings',
      title: 'Configurez vos paramètres',
      description: 'Plans de garantie, taxes et entreprise',
      completed: progress?.has_explored_settings || false,
      action: () => window.location.hash = '#settings',
      actionLabel: 'Configurer',
    },
    {
      key: 'search',
      title: 'Utilisez la recherche',
      description: 'Trouvez rapidement garanties et clients',
      completed: progress?.has_used_search || false,
    },
    {
      key: 'analytics',
      title: 'Consultez vos analytics',
      description: 'Suivez vos revenus et performances',
      completed: progress?.has_viewed_analytics || false,
      action: () => window.location.hash = '#analytics',
      actionLabel: 'Voir',
    },
    {
      key: 'dashboard',
      title: 'Explorez le dashboard',
      description: 'Votre hub central d\'informations',
      completed: progress?.has_viewed_dashboard || false,
      action: () => window.location.hash = '#dashboard',
      actionLabel: 'Explorer',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const percentage = progress?.completion_percentage || 0;

  if (loading) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-primary-700 transition-all hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">Getting Started</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {completedCount}/{steps.length}
          </span>
        </button>
      </div>
    );
  }

  if (percentage === 100 && progress?.completed_at) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 w-96 animate-slideUp">
        <div className="bg-white rounded-xl shadow-2xl border-2 border-primary-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-lg">Premiers pas</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{completedCount} sur {steps.length} complétées</span>
                <span className="font-bold">{percentage}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Steps list */}
          {isExpanded && (
            <div className="p-4 max-h-96 overflow-y-auto space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    step.completed
                      ? 'bg-success-50 border border-success-200'
                      : 'bg-slate-50 border border-slate-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm ${step.completed ? 'text-success-900 line-through' : 'text-slate-900'}`}>
                      {step.title}
                    </h4>
                    <p className={`text-xs mt-0.5 ${step.completed ? 'text-success-700' : 'text-slate-600'}`}>
                      {step.description}
                    </p>

                    {!step.completed && step.action && (
                      <button
                        onClick={step.action}
                        className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        {step.actionLabel} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer tip */}
          {isExpanded && percentage < 100 && (
            <div className="border-t border-slate-200 p-3 bg-slate-50">
              <p className="text-xs text-slate-600 text-center">
                💡 Complétez toutes les étapes pour débloquer un badge spécial!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-scaleIn">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trophy className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Félicitations! 🎉
            </h2>

            <p className="text-slate-600 mb-6">
              Vous avez complété toutes les étapes d'onboarding. Vous êtes maintenant prêt à exploiter tout le potentiel de Pro-Remorque!
            </p>

            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-primary-900 mb-2">
                🏆 Badge débloqué: "Expert débutant"
              </p>
              <p className="text-xs text-primary-700">
                Vous avez maîtrisé les bases du système
              </p>
            </div>

            <button
              onClick={() => {
                setShowCelebration(false);
                setIsMinimized(true);
              }}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all"
            >
              Continuer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function useOnboardingProgress() {
  const { user } = useAuth();

  const trackStep = async (step: string) => {
    if (!user?.id) return;

    const fieldMap: Record<string, string> = {
      profile: 'has_completed_profile',
      warranty: 'has_created_first_warranty',
      dashboard: 'has_viewed_dashboard',
      settings: 'has_explored_settings',
      customer: 'has_created_customer',
      search: 'has_used_search',
      analytics: 'has_viewed_analytics',
      tour: 'has_completed_tour',
    };

    const field = fieldMap[step];
    if (!field) return;

    try {
      await supabase
        .from('user_onboarding_progress')
        .update({ [field]: true })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error tracking onboarding step:', error);
    }
  };

  return { trackStep };
}
