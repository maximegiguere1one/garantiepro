import { AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { isWebContainerEnvironment } from '../lib/environment-detection';
import { enableEmergencyMode, createDemoProfile, setEmergencyProfile } from '../lib/emergency-mode';

interface EmergencyAccessPageProps {
  onRetry: () => void;
  onSkip: () => void;
  errorMessage?: string;
}

export function EmergencyAccessPage({ onRetry, onSkip, errorMessage }: EmergencyAccessPageProps) {
  const isWebContainer = isWebContainerEnvironment();

  const handleEmergencyAccess = () => {
    // Create demo profile
    const demoProfile = createDemoProfile();
    setEmergencyProfile(demoProfile);
    enableEmergencyMode();

    // Force reload to apply emergency mode
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Impossible de charger l'application
            </h1>
            <p className="text-slate-600">
              L'authentification n'a pas pu s'initialiser correctement
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {isWebContainer && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-bold text-blue-900 mb-2">
                Environnement WebContainer détecté
              </h3>
              <p className="text-xs text-blue-800 mb-3">
                Vous utilisez Bolt.new ou StackBlitz. Ces environnements ont des limitations importantes avec
                Supabase Auth à cause des restrictions CORS.
              </p>
              <p className="text-xs text-blue-800 font-medium">
                Solution recommandée: Déployez l'application en production pour une expérience complète.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {isWebContainer && (
              <button
                onClick={handleEmergencyAccess}
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Accès d'urgence (Mode Démonstration)
              </button>
            )}

            <button
              onClick={onSkip}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Continuer sans authentification
            </button>

            <button
              onClick={onRetry}
              className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer la connexion
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Rafraîchir la page
            </button>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="text-xs font-bold text-slate-900 mb-2">
              Que faire ?
            </h4>
            <ul className="text-xs text-slate-700 space-y-1">
              <li>• <strong>Mode Démonstration:</strong> Accès limité pour tester l'interface</li>
              <li>• <strong>Continuer sans auth:</strong> Interface visible mais non fonctionnelle</li>
              <li>• <strong>Réessayer:</strong> Tenter une nouvelle connexion</li>
              <li>• <strong>Déployer en prod:</strong> Solution recommandée pour une utilisation réelle</li>
            </ul>
          </div>

          {isWebContainer && (
            <div className="mt-4 text-center">
              <a
                href="https://github.com/your-repo#deployment"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Guide de déploiement en production →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
