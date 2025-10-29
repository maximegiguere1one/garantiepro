import { CheckCircle2, Circle } from 'lucide-react';

interface Step {
  label: string;
  completed: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full py-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.completed;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                    ${isCompleted ? 'bg-emerald-500 text-white scale-110' : ''}
                    ${isCurrent && !isCompleted ? 'bg-primary-500 text-white ring-4 ring-primary-100 scale-110' : ''}
                    ${!isCurrent && !isCompleted ? 'bg-slate-200 text-slate-500' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 animate-scaleIn" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`
                    text-xs font-medium text-center transition-colors
                    ${isCompleted ? 'text-emerald-600' : ''}
                    ${isCurrent && !isCompleted ? 'text-primary-600' : ''}
                    ${!isCurrent && !isCompleted ? 'text-slate-500' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div className="flex-1 h-1 mx-2 relative overflow-hidden bg-slate-200 rounded-full">
                  <div
                    className={`
                      absolute inset-0 transition-all duration-500 rounded-full
                      ${isCompleted ? 'bg-emerald-500 w-full' : 'bg-slate-200 w-0'}
                    `}
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

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'red';
}

export function ProgressBar({
  percentage,
  label,
  showPercentage = true,
  color = 'blue',
}: ProgressBarProps) {
  const colors = {
    blue: 'bg-primary-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className="w-full animate-fadeIn">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {showPercentage && (
            <span className="text-sm font-semibold text-slate-900">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"
               style={{ backgroundSize: '200% 100%' }}
          />
        </div>
      </div>
    </div>
  );
}
