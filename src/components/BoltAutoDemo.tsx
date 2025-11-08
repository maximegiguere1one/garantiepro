import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { isEmergencyModeEnabled, enableEmergencyMode, createDemoProfile, setEmergencyProfile } from '../lib/emergency-mode';

export function BoltAutoDemo() {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const isBoltEnvironment =
      window.location.hostname.includes('webcontainer') ||
      window.location.hostname.includes('stackblitz') ||
      window.location.hostname.includes('bolt') ||
      window.location.hostname.includes('staticblitz');

    if (isBoltEnvironment && !isEmergencyModeEnabled()) {
      const activateDemo = () => {
        console.log('[BoltAutoDemo] Activation automatique du mode démo pour Bolt');

        const demoProfile = createDemoProfile();
        setEmergencyProfile(demoProfile);
        enableEmergencyMode();

        setActivated(true);

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      };

      const timer = setTimeout(activateDemo, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!activated) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Mode Démo Bolt Activé
        </h2>
        <p className="text-slate-600 mb-4">
          Supabase Auth ne fonctionne pas dans Bolt.
          <br />
          Activation automatique du mode démonstration...
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-slate-600">Chargement...</span>
        </div>
      </div>
    </div>
  );
}
