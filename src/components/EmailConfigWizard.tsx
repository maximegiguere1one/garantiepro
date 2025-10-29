import { useState, useEffect } from 'react';
import { CheckCircle, Circle, ExternalLink, AlertCircle, Loader } from 'lucide-react';
import { checkEmailConfiguration, getConfigurationSteps } from '../lib/email-config-validator';

export function EmailConfigWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const steps = getConfigurationSteps();

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    setChecking(true);
    setError(null);
    try {
      const status = await checkEmailConfiguration();
      setConfigured(status.configured);
      if (!status.configured && status.errors.length > 0) {
        setError(status.errors[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Assistant de configuration email
        </h3>
        <p className="text-sm text-slate-600">
          Suivez ces étapes pour configurer l'envoi d'emails avec Resend
        </p>
      </div>

      {checking && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <Loader className="w-4 h-4 animate-spin" />
          Vérification de la configuration...
        </div>
      )}

      {configured && !checking && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Configuration complète!</span>
          </div>
          <p className="text-sm text-emerald-700 mt-1">
            Le service email est correctement configuré et prêt à l'emploi.
          </p>
        </div>
      )}

      {error && !checking && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Configuration incomplète</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = configured && index < steps.length;

          return (
            <div
              key={step.step}
              className={`border rounded-lg transition-all ${
                isActive
                  ? 'border-slate-300 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => handleStepClick(index)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">
                        Étape {step.step}: {step.title}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              </button>

              {isActive && (
                <div className="px-4 pb-4 border-t border-slate-200 mt-2 pt-4">
                  <div className="space-y-3">
                    {step.step === 1 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          Resend offre 3 000 emails gratuits par mois, largement suffisant pour commencer.
                        </p>
                        <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                          <li>Aucune carte bancaire requise pour débuter</li>
                          <li>Interface simple et moderne</li>
                          <li>Support de plusieurs domaines</li>
                        </ul>
                      </div>
                    )}

                    {step.step === 2 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          Une fois connecté à Resend:
                        </p>
                        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                          <li>Allez dans la section "API Keys"</li>
                          <li>Cliquez sur "Create API Key"</li>
                          <li>Donnez-lui un nom (ex: "Production")</li>
                          <li>Copiez la clé (elle commence par "re_")</li>
                        </ol>
                        <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
                          <p className="text-xs text-amber-800">
                            ⚠️ Important: La clé n'est affichée qu'une seule fois. Copiez-la immédiatement!
                          </p>
                        </div>
                      </div>
                    )}

                    {step.step === 3 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          Dans votre dashboard Supabase:
                        </p>
                        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                          <li>Sélectionnez votre projet</li>
                          <li>Allez dans Settings → Edge Functions</li>
                          <li>Cliquez sur "Manage secrets"</li>
                          <li>Ajoutez ces 3 secrets:</li>
                        </ol>
                        <div className="bg-slate-50 rounded p-3 mt-2 font-mono text-xs space-y-1">
                          <div><strong>RESEND_API_KEY</strong> = re_xxxxxxxxxxxxx</div>
                          <div><strong>FROM_EMAIL</strong> = noreply@votredomaine.com</div>
                          <div><strong>FROM_NAME</strong> = Votre Entreprise</div>
                        </div>
                        <p className="text-xs text-slate-600 mt-2">
                          Note: Pour les tests, vous pouvez utiliser onboarding@resend.dev comme FROM_EMAIL
                        </p>
                      </div>
                    )}

                    {step.step === 4 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          Pour la production, vérifiez votre domaine:
                        </p>
                        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                          <li>Dans Resend, allez dans "Domains"</li>
                          <li>Cliquez "Add Domain"</li>
                          <li>Entrez votre domaine</li>
                          <li>Ajoutez les enregistrements DNS fournis (SPF, DKIM)</li>
                          <li>Attendez la vérification (15 min - 2h)</li>
                        </ol>
                        <div className="bg-primary-50 border border-primary-200 rounded p-3 mt-3">
                          <p className="text-xs text-primary-800">
                            💡 Cette étape est optionnelle pour les tests avec onboarding@resend.dev
                          </p>
                        </div>
                      </div>
                    )}

                    {step.actionUrl && (
                      <a
                        href={step.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                      >
                        {step.actionLabel || 'Ouvrir'}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <button
          onClick={checkConfiguration}
          disabled={checking}
          className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {checking ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Vérification...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Vérifier la configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
