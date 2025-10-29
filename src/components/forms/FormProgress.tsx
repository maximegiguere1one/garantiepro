import { Check } from 'lucide-react';

interface FormProgressStep {
  id: string;
  label: string;
  description?: string;
}

interface FormProgressProps {
  steps: FormProgressStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowNavigation?: boolean;
}

export function FormProgress({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
}: FormProgressProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowNavigation && (isCompleted || index <= currentStep);

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`flex items-center gap-3 group ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    transition-all duration-200
                    ${isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                      : 'bg-slate-100 text-slate-400'
                    }
                    ${isClickable && !isCurrent ? 'group-hover:bg-slate-200' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? 'text-slate-900'
                        : isCompleted
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {step.description}
                    </div>
                  )}
                </div>
              </button>

              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 bg-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted ? 'bg-emerald-600 w-full' : 'bg-transparent w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
