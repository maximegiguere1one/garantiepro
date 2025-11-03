import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
import { AnimatedButton } from './common/AnimatedButton';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface TourStep {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    title: 'Bienvenue dans Pro-Remorque!',
    description: 'Ce guide rapide vous aidera à découvrir les fonctionnalités principales de votre système de gestion de garanties.',
  },
  {
    title: 'Navigation principale',
    description: 'Utilisez le menu latéral pour accéder aux différentes sections: Garanties, Réclamations, Clients, Analytics et Paramètres.',
    target: 'sidebar',
    position: 'right',
  },
  {
    title: 'Créer une garantie',
    description: 'Cliquez sur "Nouvelle Garantie" pour démarrer le processus de création. Le formulaire vous guidera en 3 étapes simples.',
    target: 'new-warranty-btn',
    position: 'bottom',
  },
  {
    title: 'Recherche globale',
    description: 'Utilisez la barre de recherche pour trouver rapidement des garanties, clients ou réclamations par numéro, nom ou VIN.',
    target: 'global-search',
    position: 'bottom',
  },
  {
    title: 'Dashboard Analytics',
    description: 'Consultez vos KPIs en temps réel: revenus, marges, garanties actives et taux d\'approbation des réclamations.',
    target: 'analytics-link',
    position: 'right',
  },
  {
    title: 'Paramètres',
    description: 'Configurez votre entreprise, plans de garantie, taxes et intégrations dans la section Paramètres.',
    target: 'settings-link',
    position: 'right',
  },
  {
    title: 'Prêt à commencer!',
    description: 'Vous êtes maintenant prêt à utiliser le système. N\'hésitez pas à revisiter ce guide depuis les paramètres.',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  autoStart?: boolean;
}

export function OnboardingTour({ onComplete, autoStart = true }: OnboardingTourProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const checkTourStatus = async () => {
      const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');

      if (!hasSeenTour && autoStart) {
        setTimeout(() => setShow(true), 1000);
      }
    };

    if (user?.id) {
      checkTourStatus();
    }
  }, [user?.id, autoStart]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    localStorage.setItem('hasSeenOnboardingTour', 'true');

    if (user?.id) {
      try {
        await supabase
          .from('user_onboarding_progress')
          .update({ has_completed_tour: true })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating tour completion:', error);
      }
    }

    setShowConfetti(true);
    showToast('Tour complété! Vous êtes prêt à commencer', 'success');

    setTimeout(() => {
      setShow(false);
      onComplete();
    }, 2000);
  };

  if (!show) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary-500 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 z-40 animate-fadeIn" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-gradient-to-br from-white to-primary-50 rounded-2xl shadow-2xl max-w-lg w-full p-8 pointer-events-auto animate-scaleIn border-2 border-primary-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{step.title}</h3>
              </div>
              <p className="text-slate-700 leading-relaxed">{step.description}</p>
            </div>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-slate-600 transition-colors ml-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-primary-500 w-8'
                    : index < currentStep
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-200 w-2'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Étape {currentStep + 1} sur {tourSteps.length}
            </div>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <AnimatedButton variant="ghost" onClick={handlePrev} icon={<ChevronLeft className="w-4 h-4" />}>
                  Précédent
                </AnimatedButton>
              )}

              {isLastStep ? (
                <AnimatedButton
                  variant="primary"
                  onClick={handleComplete}
                  icon={<CheckCircle className="w-4 h-4" />}
                  className="bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700"
                >
                  Terminer le tour
                </AnimatedButton>
              ) : (
                <AnimatedButton variant="primary" onClick={handleNext} icon={<ChevronRight className="w-4 h-4" />}>
                  Suivant
                </AnimatedButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  const startTour = () => {
    setShowTour(true);
  };

  const resetTour = () => {
    localStorage.removeItem('hasSeenOnboardingTour');
    startTour();
  };

  return {
    showTour,
    startTour,
    resetTour,
    OnboardingTour: showTour ? (
      <OnboardingTour onComplete={() => setShowTour(false)} />
    ) : null,
  };
}
