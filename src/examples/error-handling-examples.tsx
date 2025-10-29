import { useState } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { NetworkStatusIndicator, OfflineWarning } from '../components/NetworkStatusIndicator';
import { safeQuery, safeMutate } from '../lib/api-client';
import { supabase } from '../lib/supabase';
import { ValidationError, NetworkError, DatabaseError } from '../lib/error-types';
import { FormValidator, ValidationRules, createFormSchema } from '../lib/form-validation';
import { useNetworkStatus, addToOfflineQueue } from '../lib/network-status';
import { logError } from '../lib/error-logger';

export function NetworkErrorExample() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleNetworkRequest = async () => {
    setLoading(true);
    try {
      const data = await safeQuery(
        () => supabase.from('warranties').select('*').limit(10),
        { timeout: 5000 }
      );
      toast.success('Données chargées', 'Les garanties ont été chargées avec succès');
    } catch (error: any) {
      if (error instanceof NetworkError) {
        toast.error('Erreur de connexion', error.userMessage);
      } else {
        toast.error('Erreur', 'Une erreur inattendue est survenue');
      }
      logError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Exemple: Gestion des erreurs réseau</h3>
      <p className="text-sm text-slate-600 mb-4">
        Cet exemple montre comment gérer les erreurs réseau avec retry automatique et messages utilisateur.
      </p>
      <button
        onClick={handleNetworkRequest}
        disabled={loading}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Chargement...' : 'Tester requête réseau'}
      </button>
    </div>
  );
}

export function ValidationErrorExample() {
  const toast = useToast();
  const [formData, setFormData] = useState({ email: '', phone: '', vin: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const schema = createFormSchema({
    email: {
      required: true,
      rules: [ValidationRules.email('fr')],
    },
    phone: {
      required: true,
      rules: [ValidationRules.phone('fr')],
    },
    vin: {
      required: true,
      rules: [ValidationRules.vin('fr')],
    },
  });

  const validator = new FormValidator(schema, 'fr');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result = await validator.validate(formData);

      if (!result.valid) {
        setErrors(result.errors);
        toast.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire');
        return;
      }

      toast.success('Succès', 'Formulaire valide!');
    } catch (error: any) {
      toast.error('Erreur', error.message);
      logError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Exemple: Validation de formulaire</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="text"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.email ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="exemple@email.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.phone ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="514-555-1234"
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">NIV (VIN)</label>
          <input
            type="text"
            value={formData.vin}
            onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.vin ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="1HGBH41JXMN109186"
            maxLength={17}
          />
          {errors.vin && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.vin}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Validation...' : 'Valider le formulaire'}
        </button>
      </form>
    </div>
  );
}

export function OfflineSupportExample() {
  const toast = useToast();
  const networkStatus = useNetworkStatus();
  const [queuedOperations, setQueuedOperations] = useState<number>(0);

  const handleOfflineOperation = () => {
    if (!networkStatus.online) {
      const operationId = addToOfflineQueue(
        async () => {
          return safeMutate(() =>
            supabase.from('warranties').insert({
              contract_number: `OFFLINE-${Date.now()}`,
            })
          );
        },
        { type: 'warranty_creation', timestamp: Date.now() }
      );

      setQueuedOperations((prev) => prev + 1);
      toast.info(
        'Opération mise en file',
        'L\'opération sera synchronisée lorsque vous serez en ligne'
      );
    } else {
      toast.warning('Mode en ligne', 'Vous êtes actuellement en ligne');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Exemple: Support hors ligne</h3>
      <div className="mb-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          {networkStatus.online ? (
            <>
              <Wifi className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">En ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Hors ligne</span>
            </>
          )}
        </div>
        <p className="text-sm text-slate-600">
          Opérations en attente: <span className="font-semibold">{queuedOperations}</span>
        </p>
      </div>
      <button
        onClick={handleOfflineOperation}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
      >
        Tester opération hors ligne
      </button>
    </div>
  );
}

export function ErrorBoundaryExample() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Exemple d\'erreur de composant React');
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Exemple: Error Boundary</h3>
      <p className="text-sm text-slate-600 mb-4">
        Cet exemple montre comment les erreurs de composant sont capturées et affichées.
      </p>
      <button
        onClick={() => setShouldCrash(true)}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
      >
        Déclencher une erreur
      </button>
    </div>
  );
}

export function ErrorHandlingExamplesPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <NetworkStatusIndicator />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Exemples de gestion d'erreurs
          </h1>
          <p className="text-slate-600">
            Démonstrations des différentes stratégies de gestion d'erreurs dans l'application
          </p>
        </div>

        <OfflineWarning />

        <div className="space-y-6">
          <NetworkErrorExample />

          <ValidationErrorExample />

          <OfflineSupportExample />

          <ErrorBoundary level="component">
            <ErrorBoundaryExample />
          </ErrorBoundary>
        </div>

        <div className="mt-8 bg-primary-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">Documentation</h3>
          <ul className="space-y-2 text-sm text-primary-800">
            <li>• Les erreurs réseau sont automatiquement réessayées avec backoff exponentiel</li>
            <li>• Les erreurs de validation affichent des messages spécifiques par champ</li>
            <li>• Les opérations hors ligne sont mises en file et synchronisées automatiquement</li>
            <li>• Les erreurs critiques sont loguées dans la base de données pour analyse</li>
            <li>• Les Error Boundaries capturent les erreurs React et empêchent le crash complet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
