import { useState } from 'react';
import { Breadcrumbs } from './common/Breadcrumbs';
import { AnimatedButton } from './common/AnimatedButton';
import { ProgressIndicator, ProgressBar } from './common/ProgressIndicator';
import { ViewModeToggle } from './common/ViewModeToggle';
import { useViewMode } from '../contexts/ViewModeContext';
import { useOnboardingTour } from './OnboardingTour';
import { Save, Download, Upload, Sparkles } from 'lucide-react';

export function DemoNewFeatures() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { viewMode } = useViewMode();
  const { startTour, OnboardingTour } = useOnboardingTour();

  const steps = [
    { label: 'Informations', completed: true },
    { label: 'Validation', completed: false },
    { label: 'Confirmation', completed: false },
  ];

  const handleSimulateLoad = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      steps[currentStep + 1] = { ...steps[currentStep + 1], completed: true };
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {OnboardingTour}

      <div className="max-w-6xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Paramètres', path: '/settings' },
            { label: 'Nouvelles Fonctionnalités' },
          ]}
        />

        <div className="mb-6 flex items-center justify-between animate-slideDown">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Nouvelles Fonctionnalités
            </h1>
            <p className="text-slate-600">
              Découvrez les améliorations apportées à votre expérience
            </p>
          </div>
          <ViewModeToggle />
        </div>

        <div className="grid gap-6 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              Animations et Micro-Interactions
            </h2>
            <p className="text-slate-600 mb-4">
              Tous les boutons ont maintenant des animations fluides et du feedback visuel.
            </p>
            <div className="flex flex-wrap gap-3">
              <AnimatedButton variant="primary" icon={<Save className="w-4 h-4" />}>
                Sauvegarder
              </AnimatedButton>
              <AnimatedButton
                variant="secondary"
                icon={<Download className="w-4 h-4" />}
                loading={loading}
                onClick={handleSimulateLoad}
              >
                {loading ? 'Chargement...' : 'Télécharger'}
              </AnimatedButton>
              <AnimatedButton variant="danger" icon={<Upload className="w-4 h-4" />}>
                Supprimer
              </AnimatedButton>
              <AnimatedButton variant="ghost">Annuler</AnimatedButton>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Indicateurs de Progression
            </h2>
            <p className="text-slate-600 mb-6">
              Suivez visuellement l'avancement de vos tâches multi-étapes.
            </p>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">
                  Workflow par étapes
                </h3>
                <ProgressIndicator steps={steps} currentStep={currentStep} />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">
                  Barres de progression
                </h3>
                <ProgressBar percentage={75} label="Profil client complété" color="blue" />
                <ProgressBar percentage={100} label="Validation documents" color="emerald" />
                <ProgressBar percentage={45} label="Objectif mensuel" color="amber" />
                <ProgressBar percentage={20} label="Taux de réclamations" color="red" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Mode Compact / Spacieux
            </h2>
            <p className="text-slate-600 mb-4">
              Ajustez la densité d'information selon vos préférences.
            </p>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                Mode actuel: <span className="font-semibold">{viewMode === 'comfortable' ? 'Spacieux' : 'Compact'}</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {viewMode === 'comfortable'
                  ? 'Plus d\'espace, meilleure lisibilité'
                  : 'Plus de lignes visibles, densité maximale'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Breadcrumbs Navigation
            </h2>
            <p className="text-slate-600 mb-4">
              Ne vous perdez jamais avec le fil d'Ariane toujours visible en haut de page.
            </p>
            <div className="bg-slate-50 rounded-lg p-4">
              <Breadcrumbs
                items={[
                  { label: 'Garanties', path: '/warranties' },
                  { label: 'Contrat #12345', path: '/warranties/12345' },
                  { label: 'Détails' },
                ]}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Onboarding Interactif
            </h2>
            <p className="text-slate-600 mb-4">
              Un guide interactif pour les nouveaux utilisateurs.
            </p>
            <AnimatedButton variant="primary" onClick={startTour}>
              Lancer le Guide
            </AnimatedButton>
          </div>

          <div className={`bg-gradient-to-br from-primary-50 to-indigo-50 rounded-xl p-6 border-2 border-primary-200 ${viewMode === 'comfortable' ? 'p-8' : 'p-4'}`}>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Toutes les fonctionnalités sont actives!
            </h2>
            <p className="text-slate-700">
              Ces améliorations sont maintenant intégrées dans toute l'application pour une expérience
              utilisateur moderne et professionnelle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
