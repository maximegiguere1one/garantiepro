import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

/**
 * MultiStepWarrantyForm Component
 *
 * Professional multi-step form with progress indicator, navigation controls,
 * automatic draft saving, and keyboard shortcuts. Designed for complex forms
 * that benefit from being broken into logical steps.
 *
 * @example
 * ```tsx
 * <MultiStepWarrantyForm
 *   steps={[
 *     { title: 'Informations client', content: <CustomerStep /> },
 *     { title: 'Détails remorque', content: <TrailerStep /> },
 *     { title: 'Sélection plan', content: <PlanStep /> }
 *   ]}
 *   onComplete={handleSubmit}
 *   onSave={handleAutosave}
 *   autosaveInterval={10000}
 * />
 * ```
 */

export interface FormStep {
  /** Step title for progress indicator */
  title: string;
  /** Step content (React component) */
  content: ReactNode;
  /** Optional validation function - return true if step is valid */
  validate?: () => boolean | Promise<boolean>;
}

export interface MultiStepWarrantyFormProps {
  /** Array of form steps */
  steps: FormStep[];
  /** Callback when form is completed */
  onComplete: () => void | Promise<void>;
  /** Callback for autosave (optional) */
  onSave?: () => void | Promise<void>;
  /** Autosave interval in milliseconds (default: 10000 = 10s) */
  autosaveInterval?: number;
  /** Custom className for container */
  className?: string;
  /** Show back button on first step */
  showBackOnFirstStep?: boolean;
  /** Custom back button handler (overrides default) */
  onBack?: () => void;
}

export function MultiStepWarrantyForm({
  steps,
  onComplete,
  onSave,
  autosaveInterval = 10000,
  className = '',
  showBackOnFirstStep = false,
  onBack,
}: MultiStepWarrantyFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  // Autosave functionality
  const performAutosave = useCallback(async () => {
    if (!onSave || !hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onSave();
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, hasUnsavedChanges, isSaving]);

  // Setup autosave interval
  useEffect(() => {
    if (!onSave) return;

    const interval = setInterval(() => {
      performAutosave();
    }, autosaveInterval);

    return () => clearInterval(interval);
  }, [performAutosave, autosaveInterval, onSave]);

  // Mark as having unsaved changes on any interaction
  useEffect(() => {
    const handleInteraction = () => setHasUnsavedChanges(true);
    window.addEventListener('input', handleInteraction);
    window.addEventListener('change', handleInteraction);

    return () => {
      window.removeEventListener('input', handleInteraction);
      window.removeEventListener('change', handleInteraction);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S for manual save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        performAutosave();
      }
      // Ctrl/Cmd + Enter to go to next step
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLastStep) {
          handleNext();
        } else {
          handleComplete();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isLastStep, performAutosave]);

  const handleNext = async () => {
    const currentStepData = steps[currentStep];

    // Validate current step if validation function is provided
    if (currentStepData.validate) {
      const isValid = await currentStepData.validate();
      if (!isValid) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLastSaved = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-700">
              Étape {currentStep + 1} sur {totalSteps}
            </span>
            {onSave && (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                {isSaving && (
                  <>
                    <Save className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
                    <span>Enregistrement...</span>
                  </>
                )}
                {!isSaving && lastSavedAt && (
                  <>
                    <Check className="w-3.5 h-3.5 text-success-600" aria-hidden="true" />
                    <span>Enregistré à {formatLastSaved(lastSavedAt)}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <span className="text-sm font-medium text-neutral-600">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Progress Bar Visual */}
        <div className="relative h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-600 to-primary-700 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Étape ${currentStep + 1} sur ${totalSteps}`}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                  index < currentStep
                    ? 'bg-success-500 text-white'
                    : index === currentStep
                    ? 'bg-primary-600 text-white ring-4 ring-primary-600/20'
                    : 'bg-neutral-200 text-neutral-400'
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs font-medium text-center ${
                  index === currentStep ? 'text-neutral-900' : 'text-neutral-500'
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">{steps[currentStep].content}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
        <div>
          {(!isFirstStep || showBackOnFirstStep) && (
            <SecondaryButton
              onClick={handleBack}
              leftIcon={<ChevronLeft />}
              disabled={isSubmitting}
            >
              Retour
            </SecondaryButton>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSave && hasUnsavedChanges && !isSaving && (
            <button
              onClick={performAutosave}
              className="text-sm text-neutral-600 hover:text-primary-600 transition-colors"
            >
              Enregistrer maintenant
            </button>
          )}

          {!isLastStep ? (
            <PrimaryButton
              onClick={handleNext}
              rightIcon={<ChevronRight />}
              disabled={isSubmitting}
            >
              Suivant
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={handleComplete}
              loading={isSubmitting}
              rightIcon={!isSubmitting && <Check />}
            >
              Terminer
            </PrimaryButton>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-xs text-neutral-500 text-center">
        Raccourcis: <kbd className="px-2 py-1 bg-neutral-100 rounded">Ctrl+S</kbd> pour
        enregistrer, <kbd className="px-2 py-1 bg-neutral-100 rounded">Ctrl+Enter</kbd> pour
        continuer
      </div>
    </div>
  );
}
