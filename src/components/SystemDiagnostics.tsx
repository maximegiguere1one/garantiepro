import { useState } from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Mail, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { checkEmailConfiguration } from '../lib/email-config-validator';

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function SystemDiagnostics() {
  const { user, profile, organization: currentOrganization } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    diagnostics.push({
      category: 'Authentification',
      name: 'Utilisateur connecté',
      status: user ? 'success' : 'error',
      message: user ? `Connecté en tant que ${user.email}` : 'Aucun utilisateur connecté',
      details: user?.id
    });

    diagnostics.push({
      category: 'Authentification',
      name: 'Profil utilisateur',
      status: profile ? 'success' : 'error',
      message: profile ? `Profil trouvé: ${profile.full_name} (${profile.role})` : 'Profil non trouvé',
      details: profile?.id
    });

    diagnostics.push({
      category: 'Authentification',
      name: 'Organization ID dans profil',
      status: profile?.organization_id ? 'success' : 'error',
      message: profile?.organization_id ? 'Organization ID présent' : 'Organization ID manquant!',
      details: profile?.organization_id
    });

    diagnostics.push({
      category: 'Organisation',
      name: 'Organisation chargée',
      status: currentOrganization ? 'success' : 'error',
      message: currentOrganization ? `${currentOrganization.name} (${currentOrganization.type})` : 'Organisation non chargée',
      details: currentOrganization?.id
    });

    if (profile?.organization_id) {
      try {
        const { data: testFunction } = await supabase.rpc('get_user_organization_id');
        diagnostics.push({
          category: 'Base de données',
          name: 'Fonction get_user_organization_id()',
          status: testFunction ? 'success' : 'error',
          message: testFunction ? 'Fonction accessible et retourne une valeur' : 'Fonction ne retourne rien',
          details: testFunction || 'NULL'
        });
      } catch (error: any) {
        diagnostics.push({
          category: 'Base de données',
          name: 'Fonction get_user_organization_id()',
          status: 'error',
          message: 'Erreur lors de l\'appel de la fonction',
          details: error.message
        });
      }

      const settingsTables = [
        'company_settings',
        'tax_settings',
        'pricing_settings',
        'notification_settings',
        'claim_settings'
      ];

      for (const table of settingsTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('id, organization_id')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();

          if (error) {
            diagnostics.push({
              category: 'Paramètres',
              name: table,
              status: 'error',
              message: `Erreur: ${error.message}`,
              details: `Code: ${error.code}, Hint: ${error.hint}`
            });
          } else if (data) {
            diagnostics.push({
              category: 'Paramètres',
              name: table,
              status: 'success',
              message: 'Paramètres trouvés',
              details: data.id
            });
          } else {
            diagnostics.push({
              category: 'Paramètres',
              name: table,
              status: 'warning',
              message: 'Aucun paramètre trouvé (seront créés à la première sauvegarde)',
              details: 'Utilisez UPSERT pour créer automatiquement'
            });
          }
        } catch (error: any) {
          diagnostics.push({
            category: 'Paramètres',
            name: table,
            status: 'error',
            message: 'Erreur inattendue',
            details: error.message
          });
        }
      }
    }

    try {
      const emailConfig = await checkEmailConfiguration();
      diagnostics.push({
        category: 'Email',
        name: 'Configuration Resend',
        status: emailConfig.configured ? 'success' : 'error',
        message: emailConfig.configured
          ? `Configuré: ${emailConfig.fromEmail}`
          : 'Non configuré (RESEND_API_KEY manquant)',
        details: emailConfig.errors.join(', ') || emailConfig.fromName
      });
    } catch (error: any) {
      diagnostics.push({
        category: 'Email',
        name: 'Configuration Resend',
        status: 'error',
        message: 'Erreur lors de la vérification',
        details: error.message
      });
    }

    setResults(diagnostics);
    setRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-primary-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, DiagnosticResult[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Authentification':
        return <Activity className="w-5 h-5" />;
      case 'Organisation':
        return <Settings className="w-5 h-5" />;
      case 'Base de données':
        return <Database className="w-5 h-5" />;
      case 'Paramètres':
        return <Settings className="w-5 h-5" />;
      case 'Email':
        return <Mail className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Diagnostic Système</h2>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Analyse en cours...' : 'Lancer le diagnostic'}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                  <span className="font-semibold text-green-900">Succès</span>
                </div>
                <p className="text-2xl font-bold text-primary-700">{successCount}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-900">Avertissements</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{warningCount}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">Erreurs</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{errorCount}</p>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedResults).map(([category, categoryResults]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <span className="text-sm text-gray-500">({categoryResults.length})</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {categoryResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 ${getStatusBg(result.status)} border-l-4`}
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(result.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{result.name}</span>
                            </div>
                            <p className="text-sm text-gray-700">{result.message}</p>
                            {result.details && (
                              <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                                {result.details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {results.length === 0 && !running && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Cliquez sur "Lancer le diagnostic" pour analyser votre système
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
