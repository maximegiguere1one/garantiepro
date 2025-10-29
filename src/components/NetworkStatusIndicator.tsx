import { WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { useNetworkStatus, useOfflineQueue } from '../lib/network-status';

export function NetworkStatusIndicator() {
  const networkStatus = useNetworkStatus();
  const { queueLength } = useOfflineQueue();

  if (networkStatus.online && queueLength === 0) {
    return null;
  }

  const isSlowConnection =
    networkStatus.effectiveType === 'slow-2g' ||
    networkStatus.effectiveType === '2g' ||
    networkStatus.effectiveType === '3g';

  if (!networkStatus.online) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-down">
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <WifiOff className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">Mode hors ligne</p>
            {queueLength > 0 && (
              <p className="text-xs opacity-90">{queueLength} opération(s) en attente</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSlowConnection) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-down">
        <div className="bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <Wifi className="w-5 h-5 opacity-50" />
          <p className="text-sm">Connexion lente détectée</p>
        </div>
      </div>
    );
  }

  if (queueLength > 0) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-down">
        <div className="bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <Wifi className="w-5 h-5 animate-pulse" />
          <p className="text-sm">Synchronisation en cours ({queueLength})</p>
        </div>
      </div>
    );
  }

  return null;
}

export function OfflineWarning() {
  const { online } = useNetworkStatus();

  if (online) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Mode hors ligne</h3>
          <p className="text-sm text-amber-700 mt-1">
            Vous êtes actuellement hors ligne. Vos modifications seront synchronisées automatiquement
            lorsque la connexion sera rétablie.
          </p>
        </div>
      </div>
    </div>
  );
}
