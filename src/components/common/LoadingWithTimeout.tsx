import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, SkipForward } from 'lucide-react';
import { isWebContainerEnvironment, getEnvironmentType } from '../../lib/environment-detection';

interface LoadingWithTimeoutProps {
  message?: string;
  submessage?: string;
  timedOut?: boolean;
  onSkip?: () => void;
  onRetry?: () => void;
  showEnvironmentWarning?: boolean;
}

export function LoadingWithTimeout({
  message = 'Chargement en cours...',
  submessage = 'Connexion au serveur',
  timedOut = false,
  onSkip,
  onRetry,
  showEnvironmentWarning = true,
}: LoadingWithTimeoutProps) {
  const [dots, setDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const isWebContainer = isWebContainerEnvironment();
  const envType = getEnvironmentType();

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {!timedOut ? (
              <>
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-red-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {message}{dots}
                </h2>
                <p className="text-sm text-slate-600 mb-4">{submessage}</p>
                <p className="text-xs text-slate-400">
                  {elapsedTime}s {elapsedTime >= 10 && '(cela prend plus de temps que pr\u00e9vu)'}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  D\u00e9lai d\u00e9pass\u00e9
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  Le chargement prend plus de temps que pr\u00e9vu ({elapsedTime}s)
                </p>
              </>
            )}
          </div>

          {isWebContainer && showEnvironmentWarning && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Environnement: {envType}</strong>
                <br />
                Vous utilisez un environnement de d\u00e9veloppement WebContainer. Les restrictions CORS peuvent affecter certaines fonctionnalit\u00e9s.
              </p>
            </div>
          )}

          {timedOut && (
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-1 font-medium">
                  Que faire maintenant ?
                </p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>V\u00e9rifiez votre connexion internet</li>
                  <li>Le serveur Supabase peut \u00eatre temporairement indisponible</li>
                  {isWebContainer && <li>Les environnements WebContainer peuvent avoir des limitations</li>}
                  <li>Essayez de rafra\u00eechir la page ou ignorer le chargement</li>
                </ul>
              </div>

              <div className="space-y-2">
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
                  >
                    <SkipForward className="w-4 h-4" />
                    Ignorer et continuer
                  </button>
                )}

                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    R\u00e9essayer
                  </button>
                )}

                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Rafra\u00eechir la page
                </button>
              </div>
            </div>
          )}

          {!timedOut && elapsedTime >= 15 && onSkip && (
            <div className="mt-6">
              <button
                onClick={onSkip}
                className="w-full px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors underline"
              >
                Prend trop de temps ? Cliquez pour continuer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
