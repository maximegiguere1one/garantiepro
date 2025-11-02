import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { AnimatedButton } from '../common/AnimatedButton';
import { ProgressIndicator } from '../common/ProgressIndicator';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validate?: () => Promise<boolean> | boolean;
}

interface WarrantyWizardProps {
  steps: WizardStep[];
  onComplete: (data: any) => Promise<void>;
  onCancel: () => void;
  autoSaveKey?: string;
}

export function WarrantyWizard({
  steps,
  onComplete,
  onCancel,
  autoSaveKey = 'warranty-draft',
}: WarrantyWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (hasUnsavedChanges) {
        localStorage.setItem(autoSaveKey, JSON.stringify({
          step: currentStep,
          data: formData,
          timestamp: Date.now(),
        }));
        setHasUnsavedChanges(false);
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [formData, currentStep, hasUnsavedChanges, autoSaveKey]);

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(autoSaveKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const age = Date.now() - parsed.timestamp;

        // Only restore if less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          const shouldRestore = window.confirm(
            'Un brouillon non enregistré a été trouvé. Voulez-vous le restaurer?'
          );
          if (shouldRestore) {
            setFormData(parsed.data);
            setCurrentStep(parsed.step);
          } else {
            localStorage.removeItem(autoSaveKey);
          }
        } else {
          localStorage.removeItem(autoSaveKey);
        }
      } catch (error) {
        localStorage.removeItem(autoSaveKey);
      }
    }
  }, [autoSaveKey]);

  // Warn on exit with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateFormData = useCallback((stepData: any) => {
    setFormData((prev: any) => ({
      ...prev,
      ...stepData,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleNext = async () => {
    const step = steps[currentStep];

    if (step.validate) {
      setIsValidating(true);
      setValidationError(null);

      try {
        const isValid = await step.validate();
        if (!isValid) {
          setValidationError('Veuillez corriger les erreurs avant de continuer.');
          setIsValidating(false);
          return;
        }
      } catch (error: any) {
        setValidationError(error.message || 'Erreur de validation');
        setIsValidating(false);
        return;
      }

      setIsValidating(false);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationError(null);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(formData);
      localStorage.removeItem(autoSaveKey);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      setValidationError(error.message || 'Erreur lors de la création de la garantie');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const shouldCancel = window.confirm(
        'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter?'
      );
      if (!shouldCancel) return;
    }

    localStorage.removeItem(autoSaveKey);
    onCancel();
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header with Progress */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Créer une nouvelle garantie
            </h1>
            <button
              onClick={handleCancel}
              className="text-slate-500 hover:text-slate-700 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
              aria-label="Annuler et quitter"
            >
              Annuler
            </button>
          </div>

          {/* Step Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Étape {currentStep + 1} sur {steps.length}
              </span>
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Save className="w-4 h-4" />
                  Enregistrement auto...
                </span>
              )}
            </div>
            <ProgressIndicator
              current={currentStep + 1}
              total={steps.length}
              showPercentage={false}
            />
          </div>

          {/* Step Title & Description */}
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {steps[currentStep].description}
            </p>
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erreur de validation</p>
              <p className="text-sm text-red-700 mt-1">{validationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <CurrentStepComponent
            data={formData}
            onChange={updateFormData}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-slate-100"
              aria-label="Étape précédente"
            >
              <ChevronLeft className="w-5 h-5" />
              Retour
            </button>

            <div className="flex items-center gap-3">
              {isLastStep ? (
                <AnimatedButton
                  onClick={handleComplete}
                  disabled={isSubmitting || isValidating}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[200px]"
                  aria-label="Créer la garantie"
                >
                  {isSubmitting ? 'Création en cours...' : 'Créer la garantie'}
                </AnimatedButton>
              ) : (
                <AnimatedButton
                  onClick={handleNext}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-8 py-3 bg-brand-red text-white rounded-lg font-medium hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label="Étape suivante"
                >
                  {isValidating ? 'Validation...' : 'Suivant'}
                  <ChevronRight className="w-5 h-5" />
                </AnimatedButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
