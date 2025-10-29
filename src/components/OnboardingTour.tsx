import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { AnimatedButton } from './common/AnimatedButton';

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
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (hasSeenTour) {
      setShow(false);
    }
  }, []);

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

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboardingTour', 'true');
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fadeIn" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 pointer-events-auto animate-scaleIn">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
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
                <AnimatedButton variant="primary" onClick={handleComplete} icon={<CheckCircle className="w-4 h-4" />}>
                  Terminer
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
