import { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface OrganizationGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function OrganizationGuard({ children, requireAdmin = false }: OrganizationGuardProps) {
  const { organization: currentOrganization, loading, refreshOrganization } = useAuth();
  const error = null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Erreur de chargement de l'organisation
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={refreshOrganization}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Organisation non configurée
              </h3>
              <p className="text-amber-700 mb-4">
                Votre compte n'est pas associé à une organisation. Veuillez contacter l'administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
