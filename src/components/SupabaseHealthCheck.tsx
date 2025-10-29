import { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { performHealthCheck, getSupabaseInfo, type HealthCheckResult } from '../lib/supabase-health-check';

export function SupabaseHealthCheck() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const [healthResult, infoResult] = await Promise.all([
        performHealthCheck(),
        getSupabaseInfo(),
      ]);
      setHealth(healthResult);
      setInfo(infoResult);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  if (!health || !info) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-primary-600" />;
      case 'degraded':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getStatusText = () => {
    switch (health.status) {
      case 'healthy':
        return 'Système opérationnel';
      case 'degraded':
        return 'Fonctionnement dégradé';
      case 'unhealthy':
        return 'Système non disponible';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">État de la connexion Supabase</h3>
          </div>
          <button
            onClick={runHealthCheck}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className={`rounded-lg border-2 p-4 mb-4 ${getStatusColor()}`}>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="font-semibold">{getStatusText()}</p>
              <p className="text-sm opacity-90">{health.checks.details}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Configuration</span>
            <span className={`font-medium ${info.configured ? 'text-primary-600' : 'text-red-600'}`}>
              {info.configured ? '✓ Configuré' : '✗ Non configuré'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Connexion</span>
            <span className={`font-medium ${health.checks.connection ? 'text-primary-600' : 'text-red-600'}`}>
              {health.checks.connection ? '✓ Active' : '✗ Échec'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Authentification</span>
            <span className={`font-medium ${health.checks.authentication ? 'text-primary-600' : 'text-red-600'}`}>
              {health.checks.authentication ? '✓ Disponible' : '✗ Indisponible'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Base de données</span>
            <span className={`font-medium ${health.checks.database ? 'text-primary-600' : 'text-red-600'}`}>
              {health.checks.database ? '✓ Accessible' : '✗ Inaccessible'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          {showDetails ? '▼ Masquer les détails' : '▶ Afficher les détails'}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-3 pt-4 border-t border-slate-200">
            {info.url && (
              <div className="text-sm">
                <span className="font-medium text-slate-700">URL Supabase:</span>
                <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-xs break-all">
                  {info.url}
                </div>
              </div>
            )}

            {info.error && (
              <div className="text-sm">
                <span className="font-medium text-red-700">Erreur de configuration:</span>
                <div className="mt-1 p-2 bg-red-50 rounded border border-red-200 text-xs">
                  {info.error}
                </div>
              </div>
            )}

            {health.checks.error && (
              <div className="text-sm">
                <span className="font-medium text-red-700">Erreur de connexion:</span>
                <div className="mt-1 p-2 bg-red-50 rounded border border-red-200 text-xs">
                  {health.checks.error}
                </div>
              </div>
            )}

            <div className="text-sm">
              <span className="font-medium text-slate-700">Dernière vérification:</span>
              <div className="mt-1 text-slate-600">
                {new Date(health.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>

            {!info.configured && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <p className="text-sm text-primary-900 font-medium mb-2">
                  Configuration manquante
                </p>
                <p className="text-sm text-primary-800 mb-3">
                  Consultez le fichier <code className="px-1 py-0.5 bg-primary-100 rounded">SUPABASE_SETUP_GUIDE.md</code> à la racine du projet pour les instructions de configuration.
                </p>
                <p className="text-xs text-primary-700">
                  Vous devez configurer VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
