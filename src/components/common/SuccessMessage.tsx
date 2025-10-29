import { CheckCircle2, ArrowRight } from 'lucide-react';

interface SuccessMessageProps {
  title: string;
  message: string;
  nextSteps?: string;
  onAction?: () => void;
  actionText?: string;
}

export function SuccessMessage({
  title,
  message,
  nextSteps,
  onAction,
  actionText = 'Continuer',
}: SuccessMessageProps) {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 animate-fadeIn">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">{title}</h3>
          <p className="text-emerald-800 leading-relaxed mb-3">{message}</p>

          {nextSteps && (
            <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3 mb-4">
              <p className="text-sm text-emerald-900">
                <strong>Prochaines étapes:</strong> {nextSteps}
              </p>
            </div>
          )}

          {onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              {actionText}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
