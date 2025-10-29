import { useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileRecoveryProps {
  error: string;
  onRetry: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function ProfileRecovery({ error, onRetry, onSignOut }: ProfileRecoveryProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const handleFixProfile = async () => {
    setLoading(true);
    setFixError(null);
    setSuccess(false);

    try {
      console.log('[ProfileRecovery] Attempting to fix profile...');

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      // Call fix-profile edge function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-profile`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fix profile');
      }

      console.log('[ProfileRecovery] Profile fixed successfully:', result.profile);
      setSuccess(true);

      // Wait a moment then retry loading profile
      setTimeout(async () => {
        await onRetry();
      }, 1500);

    } catch (err) {
      console.error('[ProfileRecovery] Error fixing profile:', err);
      setFixError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCacheAndRetry = async () => {
    // Clear all session storage
    sessionStorage.clear();
    localStorage.clear();

    // Retry loading profile
    await onRetry();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {success ? (
                <CheckCircle className="w-8 h-8 text-primary-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center">
              {success ? 'Profil Récupéré!' : 'Erreur de Profil'}
            </h1>
          </div>

          {/* Error Message */}
          {!success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 mb-2">
                <strong>Message d'erreur:</strong>
              </p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                Votre profil a été récupéré avec succès! Vous allez être redirigé automatiquement...
              </p>
            </div>
          )}

          {/* Fix Error */}
          {fixError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 mb-2">
                <strong>Erreur lors de la réparation:</strong>
              </p>
              <p className="text-sm text-amber-700">{fixError}</p>
            </div>
          )}

          {/* Actions */}
          {!success && (
            <div className="space-y-3">
              {/* Primary Action: Fix Profile */}
              <button
                onClick={handleFixProfile}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Réparation en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Réparer mon profil
                  </>
                )}
              </button>

              {/* Secondary Action: Clear Cache & Retry */}
              <button
                onClick={handleClearCacheAndRetry}
                disabled={loading}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vider le cache et réessayer
              </button>

              {/* Tertiary Action: Sign Out */}
              <button
                onClick={onSignOut}
                disabled={loading}
                className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Se déconnecter
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-600 text-center mb-3">
              <strong>Que s'est-il passé?</strong>
            </p>
            <p className="text-xs text-slate-500 text-center mb-3">
              Votre compte utilisateur existe, mais votre profil n'a pas été créé correctement lors de votre inscription.
            </p>
            <p className="text-xs text-slate-500 text-center">
              Cliquez sur "Réparer mon profil" pour créer votre profil automatiquement et accéder à l'application.
            </p>
          </div>

          {/* Technical Details (Collapsible) */}
          <details className="mt-4">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
              Détails techniques
            </summary>
            <div className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-600 font-mono">
              <p><strong>Erreur:</strong> {error}</p>
              <p className="mt-2"><strong>Action:</strong> Création de profil via edge function</p>
              <p className="mt-2"><strong>Impact:</strong> Aucune donnée perdue</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
