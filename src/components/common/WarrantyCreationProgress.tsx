import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WarrantyCreationProgressProps {
  currentStep?: number;
  totalSteps?: number;
  isComplete?: boolean;
}

const STEPS = [
  { id: 1, label: 'Validation des données', duration: 500 },
  { id: 2, label: 'Création du client', duration: 800 },
  { id: 3, label: 'Enregistrement de la remorque', duration: 800 },
  { id: 4, label: 'Création de la garantie', duration: 1000 },
  { id: 5, label: 'Génération des documents', duration: 1500 },
  { id: 6, label: 'Finalisation', duration: 500 }
];

export function WarrantyCreationProgress({
  currentStep = 1,
  totalSteps = 6,
  isComplete = false
}: WarrantyCreationProgressProps) {
  const [animatedStep, setAnimatedStep] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedStep(currentStep);
      setProgressPercentage((currentStep / totalSteps) * 100);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, totalSteps]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
            {isComplete ? (
              <CheckCircle className="w-8 h-8 text-teal-600" />
            ) : (
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isComplete ? 'Garantie créée avec succès!' : 'Création de la garantie en cours...'}
          </h2>
          <p className="text-gray-600">
            {isComplete
              ? 'Tous les documents ont été générés et envoyés'
              : 'Veuillez patienter pendant que nous traitons votre demande'
            }
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Étape {Math.min(currentStep, totalSteps)} sur {totalSteps}
            </span>
            <span className="text-sm font-semibold text-teal-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {STEPS.map((step) => {
            const isCurrentStep = animatedStep === step.id;
            const isCompletedStep = animatedStep > step.id;
            const isPendingStep = animatedStep < step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isCurrentStep
                    ? 'bg-teal-50 border-2 border-teal-200 scale-[1.02]'
                    : isCompletedStep
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                {/* Step Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    isCompletedStep
                      ? 'bg-green-500 text-white'
                      : isCurrentStep
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompletedStep ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : isCurrentStep ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step Label */}
                <div className="flex-1">
                  <p
                    className={`font-medium transition-colors ${
                      isCurrentStep
                        ? 'text-teal-900'
                        : isCompletedStep
                        ? 'text-green-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrentStep && (
                    <p className="text-sm text-teal-600 animate-pulse">
                      En cours...
                    </p>
                  )}
                  {isCompletedStep && (
                    <p className="text-sm text-green-600">Terminé</p>
                  )}
                </div>

                {/* Animated Dots for Current Step */}
                {isCurrentStep && (
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        {!isComplete && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <span className="font-semibold">Ne fermez pas cette fenêtre.</span> La création peut prendre quelques instants.
            </p>
          </div>
        )}

        {/* Success Message */}
        {isComplete && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 text-center">
              La garantie a été créée avec succès et tous les documents ont été envoyés par email.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
