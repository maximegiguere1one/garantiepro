import { useState, useEffect, useCallback } from 'react';
import { FileText, Save, RefreshCw, Plus, X, AlertTriangle, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import {
  backupSettings,
  restoreSettings,
  clearBackup,
  hasUnsavedBackup,
  getBackupAge,
  saveWithRetry,
  cleanupOldBackups
} from '../../lib/settings-persistence';
import { safeNumber } from '../../lib/numeric-utils';

interface ClaimSettings {
  id?: string;
  user_id?: string;
  organization_id: string;
  sla_hours: number;
  auto_approval_threshold: number;
  require_supervisor_approval_above: number;
  exclusion_keywords: string[];
  workflow_steps: string[];
}

const DEFAULT_WORKFLOW = [
  'Examen Initial',
  'Vérification de la Documentation',
  'Évaluation',
  'Décision d\'Approbation/Refus',
  'Résolution'
];

const COMMON_EXCLUSIONS = [
  'abus', 'mauvaise utilisation', 'négligence', 'usage commercial',
  'accident', 'vandalisme', 'vol', 'catastrophe naturelle'
];

export function ClaimSettings() {
  const { profile, organization } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ClaimSettings>({
    user_id: '',
    organization_id: '',
    sla_hours: 48,
    auto_approval_threshold: 500,
    require_supervisor_approval_above: 2000,
    exclusion_keywords: [],
    workflow_steps: DEFAULT_WORKFLOW,
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [newStep, setNewStep] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  useEffect(() => {
    cleanupOldBackups();
    if (profile?.id && organization?.id) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [profile?.id, organization?.id]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadSettings = useCallback(async () => {
    if (!profile?.id || !organization?.id) return;

    setLoading(true);
    try {
      // Check for unsaved backup first
      if (hasUnsavedBackup('claim_settings', organization.id)) {
        const age = getBackupAge('claim_settings', organization.id);
        if (age && age < 60000) { // Less than 1 minute old
          setShowRestorePrompt(true);
        }
      }

      const { data, error } = await supabase
        .from('claim_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const loadedSettings = {
          ...data,
          user_id: profile.id,
          organization_id: organization.id,
          sla_hours: safeNumber(data.sla_hours, 48),
          auto_approval_threshold: safeNumber(data.auto_approval_threshold, 500),
          require_supervisor_approval_above: safeNumber(data.require_supervisor_approval_above, 2000),
          exclusion_keywords: Array.isArray(data.exclusion_keywords) ? data.exclusion_keywords : [],
          workflow_steps: Array.isArray(data.workflow_steps) ? data.workflow_steps : DEFAULT_WORKFLOW,
        };
        setSettings(loadedSettings);
        setHasUnsavedChanges(false);
      } else {
        await createDefaultSettings();
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      showToast('Erreur lors du chargement des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, organization?.id, showToast]);

  const createDefaultSettings = async () => {
    if (!profile?.id || !organization?.id) return;

    try {
      const defaultSettings = {
        user_id: profile.id,
        organization_id: organization.id,
        sla_hours: 48,
        auto_approval_threshold: 500,
        require_supervisor_approval_above: 2000,
        exclusion_keywords: COMMON_EXCLUSIONS,
        workflow_steps: DEFAULT_WORKFLOW,
        updated_by: profile.id,
      };

      const { data, error } = await supabase
        .from('claim_settings')
        .upsert(defaultSettings, {
          onConflict: 'organization_id',
          ignoreDuplicates: false
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          user_id: profile.id,
          organization_id: organization.id,
          exclusion_keywords: Array.isArray(data.exclusion_keywords) ? data.exclusion_keywords : COMMON_EXCLUSIONS,
          workflow_steps: Array.isArray(data.workflow_steps) ? data.workflow_steps : DEFAULT_WORKFLOW,
        });
        showToast('Paramètres par défaut créés automatiquement', 'success');
      }
    } catch (error: any) {
      console.error('Error creating default settings:', error);
      // Ne pas afficher d'erreur ici, les valeurs par défaut dans l'état fonctionneront
    }
  };

  const restoreFromBackup = () => {
    if (!organization?.id) return;

    const backup = restoreSettings<ClaimSettings>('claim_settings', organization.id);
    if (backup) {
      setSettings({
        ...backup.data,
        sla_hours: safeNumber(backup.data.sla_hours, 48),
        auto_approval_threshold: safeNumber(backup.data.auto_approval_threshold, 500),
        require_supervisor_approval_above: safeNumber(backup.data.require_supervisor_approval_above, 2000),
      });
      setHasUnsavedChanges(true);
      showToast('Paramètres restaurés depuis la sauvegarde', 'info');
    }
    setShowRestorePrompt(false);
  };

  const discardBackup = () => {
    if (!organization?.id) return;
    clearBackup('claim_settings', organization.id);
    setShowRestorePrompt(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id || !organization?.id) {
      showToast('Erreur: utilisateur non connecté', 'error');
      return;
    }

    if (settings.auto_approval_threshold > settings.require_supervisor_approval_above) {
      showToast('Le seuil d\'auto-approbation doit être inférieur au seuil superviseur', 'error');
      return;
    }

    setSaving(true);
    try {
      const settingsData = {
        user_id: profile.id,
        organization_id: organization.id,
        sla_hours: safeNumber(settings.sla_hours, 48),
        auto_approval_threshold: safeNumber(settings.auto_approval_threshold, 500),
        require_supervisor_approval_above: safeNumber(settings.require_supervisor_approval_above, 2000),
        exclusion_keywords: settings.exclusion_keywords,
        workflow_steps: settings.workflow_steps,
        updated_by: profile.id,
      };

      // Backup before saving
      backupSettings('claim_settings', organization.id, profile.id, settingsData);

      // Save with retry logic
      const result = await saveWithRetry(async () => {
        const { error } = await supabase
          .from('claim_settings')
          .upsert(settingsData, {
            onConflict: 'organization_id',
            ignoreDuplicates: false
          });

        if (error) throw error;
        return true;
      });

      if (result.success) {
        clearBackup('claim_settings', organization.id);
        setHasUnsavedChanges(false);
        showToast('Paramètres de réclamation enregistrés avec succès', 'success');
        await loadSettings();
      } else {
        throw result.error || new Error('Save failed');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const errorMsg = error.message || 'Erreur lors de l\'enregistrement';
      showToast(`${errorMsg}. Vos modifications sont sauvegardées localement.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.exclusion_keywords.includes(newKeyword.trim().toLowerCase())) {
      setSettings({
        ...settings,
        exclusion_keywords: [...settings.exclusion_keywords, newKeyword.trim().toLowerCase()]
      });
      setNewKeyword('');
      setHasUnsavedChanges(true);
    }
  };

  const removeKeyword = (keyword: string) => {
    setSettings({
      ...settings,
      exclusion_keywords: settings.exclusion_keywords.filter(k => k !== keyword)
    });
    setHasUnsavedChanges(true);
  };

  const addStep = () => {
    if (newStep.trim() && !settings.workflow_steps.includes(newStep.trim())) {
      setSettings({
        ...settings,
        workflow_steps: [...settings.workflow_steps, newStep.trim()]
      });
      setNewStep('');
      setHasUnsavedChanges(true);
    }
  };

  const removeStep = (step: string) => {
    setSettings({
      ...settings,
      workflow_steps: settings.workflow_steps.filter(s => s !== step)
    });
    setHasUnsavedChanges(true);
  };

  const addCommonExclusion = (keyword: string) => {
    if (!settings.exclusion_keywords.includes(keyword)) {
      setSettings({
        ...settings,
        exclusion_keywords: [...settings.exclusion_keywords, keyword]
      });
      setHasUnsavedChanges(true);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Chargement des paramètres de réclamation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {showRestorePrompt && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Modifications non enregistrées détectées
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Nous avons trouvé des modifications non enregistrées de votre session précédente. Voulez-vous les restaurer?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={restoreFromBackup}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Restaurer
                </button>
                <button
                  onClick={discardBackup}
                  className="px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">
              Vous avez des modifications non enregistrées
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Configuration des Réclamations</h3>
            <p className="text-sm text-slate-600">Gérer les règles de traitement des réclamations</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Actualiser
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SLA & Approval Thresholds */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary-600" />
            <h4 className="text-lg font-semibold text-slate-900">Règles de Traitement</h4>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Temps de Réponse SLA (heures)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.sla_hours}
                onChange={(e) => {
                  const value = safeNumber(e.target.value, 48);
                  setSettings({ ...settings, sla_hours: Math.max(1, Math.min(168, value)) });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Temps de réponse maximum</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seuil d'Auto-Approbation ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.auto_approval_threshold}
                onChange={(e) => {
                  const value = safeNumber(e.target.value, 0);
                  setSettings({ ...settings, auto_approval_threshold: Math.max(0, value) });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Réclamations sous ce montant approuvées auto</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Approbation Superviseur Au-Dessus ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.require_supervisor_approval_above}
                onChange={(e) => {
                  const value = safeNumber(e.target.value, 0);
                  setSettings({ ...settings, require_supervisor_approval_above: Math.max(0, value) });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Nécessite une révision superviseur</p>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-900">Auto-Approuvées</span>
              </div>
              <p className="text-xs text-green-700">
                Réclamations sous ${settings.auto_approval_threshold.toFixed(2)}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">Révision Standard</span>
              </div>
              <p className="text-xs text-blue-700">
                ${settings.auto_approval_threshold.toFixed(2)} - ${settings.require_supervisor_approval_above.toFixed(2)}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-900">Superviseur Requis</span>
              </div>
              <p className="text-xs text-amber-700">
                Plus de ${settings.require_supervisor_approval_above.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Exclusion Keywords */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-primary-600" />
            <h4 className="text-lg font-semibold text-slate-900">Mots-Clés d'Exclusion</h4>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ajouter un Mot-Clé
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="ex: abus, mauvaise utilisation..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <Button type="button" onClick={addKeyword} leftIcon={<Plus className="w-4 h-4" />}>
                Ajouter
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Exclusions Courantes:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_EXCLUSIONS.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => addCommonExclusion(keyword)}
                  disabled={settings.exclusion_keywords.includes(keyword)}
                  className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  + {keyword}
                </button>
              ))}
            </div>
          </div>

          {settings.exclusion_keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {settings.exclusion_keywords.map((keyword) => (
                <div
                  key={keyword}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                >
                  <span>{keyword}</span>
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="hover:bg-red-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Aucun mot-clé d'exclusion défini</p>
          )}
        </div>

        {/* Workflow Steps */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h4 className="text-lg font-semibold text-slate-900">Étapes du Workflow</h4>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ajouter une Étape Personnalisée
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                placeholder="ex: Révision Légale..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <Button type="button" onClick={addStep} leftIcon={<Plus className="w-4 h-4" />}>
                Ajouter
              </Button>
            </div>
          </div>

          {settings.workflow_steps.length > 0 ? (
            <div className="space-y-2">
              {settings.workflow_steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{step}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(step)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Aucune étape de workflow définie</p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Résumé de la Configuration</h4>
          <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Temps de Réponse SLA:</span>
              <span className="font-semibold text-slate-900">{settings.sla_hours} heures</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-600">Auto-Approbation:</span>
              <span className="font-semibold text-green-700">Sous ${settings.auto_approval_threshold.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Superviseur Requis:</span>
              <span className="font-semibold text-amber-700">Plus de ${settings.require_supervisor_approval_above.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-600">Mots-Clés d'Exclusion:</span>
              <span className="font-semibold text-slate-900">{settings.exclusion_keywords.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Étapes du Workflow:</span>
              <span className="font-semibold text-slate-900">{settings.workflow_steps.length}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              loadSettings();
              setHasUnsavedChanges(false);
            }}
            disabled={saving}
          >
            Réinitialiser
          </Button>
          <Button
            type="submit"
            loading={saving}
            leftIcon={<Save className="w-4 h-4" />}
            disabled={!hasUnsavedChanges && !saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer la Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
