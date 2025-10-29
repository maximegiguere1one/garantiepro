import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

interface ErrorMessageProps {
  title: string;
  message: string;
  suggestion?: string;
  onRetry?: () => void;
  onHelp?: () => void;
  retryText?: string;
  helpText?: string;
}

export function ErrorMessage({
  title,
  message,
  suggestion,
  onRetry,
  onHelp,
  retryText = 'Réessayer',
  helpText = 'Obtenir de l\'aide',
}: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 animate-fadeIn">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
          <p className="text-red-800 leading-relaxed mb-3">{message}</p>

          {suggestion && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-900">
                <strong>Suggestion:</strong> {suggestion}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                {retryText}
              </button>
            )}

            {onHelp && (
              <button
                onClick={onHelp}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                <HelpCircle className="w-4 h-4" />
                {helpText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
