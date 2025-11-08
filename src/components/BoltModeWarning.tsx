import { AlertCircle, ExternalLink, X, Zap, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { isWebContainerEnvironment, getEnvironmentInfo } from '../lib/environment-detection';

export function BoltModeWarning() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('bolt_warning_dismissed') === 'true';
  });

  const isWebContainer = isWebContainerEnvironment();
  const envInfo = getEnvironmentInfo();

  if (!isWebContainer || dismissed) {
    return null;
  }

  const bgColor = envInfo.isBolt ? 'bg-blue-50 border-blue-300' : 'bg-amber-50 border-amber-300';
  const textColor = envInfo.isBolt ? 'text-blue-900' : 'text-amber-900';
  const iconColor = envInfo.isBolt ? 'text-blue-600' : 'text-amber-600';
  const buttonColor = envInfo.isBolt ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700';
  const Icon = envInfo.isBolt ? Zap : AlertCircle;

  const handleDismiss = () => {
    localStorage.setItem('bolt_warning_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed top-4 right-4 left-4 z-50 max-w-2xl mx-auto">
      <div className={`${bgColor} border-2 rounded-lg shadow-lg p-4`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold ${textColor} mb-1`}>
              {envInfo.isBolt ? 'Mode Bolt Activé \u26a1' : 'Mode Développement Détecté'}
            </h3>
            <p className={`text-xs ${textColor} opacity-90 mb-2`}>
              <strong>Environnement:</strong> {envInfo.environment}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${envInfo.isBolt ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                <CheckCircle className="w-3 h-3" />
                Timeouts optimisés (2s)
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${envInfo.isBolt ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                <CheckCircle className="w-3 h-3" />
                Cache agressif
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${envInfo.isBolt ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                <CheckCircle className="w-3 h-3" />
                Auth rapide
              </span>
            </div>
            <p className={`text-xs ${textColor} opacity-80 mb-3`}>
              L'application est optimisée pour fonctionner dans Bolt. Les erreurs CORS en console sont normales.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className={`px-3 py-1.5 ${buttonColor} text-white text-xs font-medium rounded transition-colors`}
              >
                J'ai compris
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ${iconColor} hover:opacity-80 transition-opacity`}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
