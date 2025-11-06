import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { isWebContainerEnvironment } from '../lib/environment-detection';

export function BoltModeWarning() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('bolt_warning_dismissed') === 'true';
  });

  const isWebContainer = isWebContainerEnvironment();

  if (!isWebContainer || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('bolt_warning_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed top-4 right-4 left-4 z-50 max-w-2xl mx-auto">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-amber-900 mb-1">
              Mode Bolt/WebContainer détecté
            </h3>
            <p className="text-xs text-amber-800 mb-2">
              Vous utilisez cette application dans un environnement de développement avec des limitations importantes:
            </p>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside mb-3">
              <li>Les erreurs CORS dans la console sont <strong>normales</strong></li>
              <li>La session d'authentification est limitée (~1 heure)</li>
              <li>Certaines fonctionnalités peuvent ne pas fonctionner</li>
            </ul>
            <div className="flex gap-2">
              <a
                href="https://github.com/votre-repo#deploiement"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Déployer en production
              </a>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 text-xs font-medium rounded border border-amber-300 transition-colors"
              >
                J'ai compris
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-amber-600 hover:text-amber-900 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
