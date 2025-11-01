import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Mail, Bell, MessageSquare, Clock, Save, CheckCircle2 } from 'lucide-react';

interface NotificationPrefs {
  id?: string;
  email_enabled: boolean;
  warranty_created: boolean;
  warranty_expiring_30_days: boolean;
  warranty_expiring_15_days: boolean;
  warranty_expiring_7_days: boolean;
  warranty_expired: boolean;
  claim_submitted: boolean;
  claim_status_changed: boolean;
  invoice_generated: boolean;
  invoice_due: boolean;
  push_enabled: boolean;
  push_warranty_expiring: boolean;
  push_claim_updates: boolean;
  sms_enabled: boolean;
  sms_warranty_expiring: boolean;
  sms_claim_urgent: boolean;
  digest_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

export function NotificationPreferences() {
  const { user, profile } = useAuth();
  const { currentOrganization } = useOrganization();
  const [preferences, setPreferences] = useState<NotificationPrefs>({
    email_enabled: true,
    warranty_created: true,
    warranty_expiring_30_days: true,
    warranty_expiring_15_days: true,
    warranty_expiring_7_days: true,
    warranty_expired: true,
    claim_submitted: true,
    claim_status_changed: true,
    invoice_generated: true,
    invoice_due: true,
    push_enabled: false,
    push_warranty_expiring: true,
    push_claim_updates: true,
    sms_enabled: false,
    sms_warranty_expiring: false,
    sms_claim_urgent: false,
    digest_frequency: 'never',
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'America/Montreal',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user && currentOrganization?.id) {
      loadPreferences();
    }
  }, [user, currentOrganization?.id]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .eq('organization_id', currentOrganization!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            ...preferences,
            user_id: user!.id,
            organization_id: currentOrganization!.id,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,organization_id',
          }
        );

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPrefs, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Préférences de Notification</h1>
          <p className="text-slate-600 mt-1">
            Personnalisez comment et quand vous recevez des notifications
          </p>
        </div>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Enregistré!
            </>
          ) : saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Enregistrer
            </>
          )}
        </button>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-6 w-6 text-red-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Notifications Email</h2>
            <p className="text-sm text-slate-600">Configurez vos notifications par email</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-red-300 transition-colors">
            <div>
              <span className="font-medium text-slate-900">Activer les emails</span>
              <p className="text-sm text-slate-600">Recevoir toutes les notifications par email</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={(e) => updatePreference('email_enabled', e.target.checked)}
              className="h-5 w-5 text-red-600 rounded focus:ring-red-500"
            />
          </label>

          {preferences.email_enabled && (
            <>
              <div className="ml-6 space-y-3">
                <h3 className="font-medium text-slate-900 text-sm">Garanties</h3>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Nouvelle garantie créée</span>
                  <input
                    type="checkbox"
                    checked={preferences.warranty_created}
                    onChange={(e) => updatePreference('warranty_created', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Expiration dans 30 jours</span>
                  <input
                    type="checkbox"
                    checked={preferences.warranty_expiring_30_days}
                    onChange={(e) => updatePreference('warranty_expiring_30_days', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Expiration dans 15 jours</span>
                  <input
                    type="checkbox"
                    checked={preferences.warranty_expiring_15_days}
                    onChange={(e) => updatePreference('warranty_expiring_15_days', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Expiration dans 7 jours</span>
                  <input
                    type="checkbox"
                    checked={preferences.warranty_expiring_7_days}
                    onChange={(e) => updatePreference('warranty_expiring_7_days', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Garantie expirée</span>
                  <input
                    type="checkbox"
                    checked={preferences.warranty_expired}
                    onChange={(e) => updatePreference('warranty_expired', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>
              </div>

              <div className="ml-6 space-y-3 pt-4 border-t border-slate-200">
                <h3 className="font-medium text-slate-900 text-sm">Réclamations</h3>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Nouvelle réclamation</span>
                  <input
                    type="checkbox"
                    checked={preferences.claim_submitted}
                    onChange={(e) => updatePreference('claim_submitted', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Changement de statut</span>
                  <input
                    type="checkbox"
                    checked={preferences.claim_status_changed}
                    onChange={(e) => updatePreference('claim_status_changed', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>
              </div>

              <div className="ml-6 space-y-3 pt-4 border-t border-slate-200">
                <h3 className="font-medium text-slate-900 text-sm">Facturation</h3>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Facture générée</span>
                  <input
                    type="checkbox"
                    checked={preferences.invoice_generated}
                    onChange={(e) => updatePreference('invoice_generated', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">Facture à payer</span>
                  <input
                    type="checkbox"
                    checked={preferences.invoice_due}
                    onChange={(e) => updatePreference('invoice_due', e.target.checked)}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Notifications Push</h2>
            <p className="text-sm text-slate-600">Notifications dans l'application et le navigateur</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
            <div>
              <span className="font-medium text-slate-900">Activer les notifications push</span>
              <p className="text-sm text-slate-600">Recevoir des notifications en temps réel</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.push_enabled}
              onChange={(e) => updatePreference('push_enabled', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {preferences.push_enabled && (
            <div className="ml-6 space-y-3">
              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                <span className="text-sm text-slate-700">Expiration de garanties</span>
                <input
                  type="checkbox"
                  checked={preferences.push_warranty_expiring}
                  onChange={(e) => updatePreference('push_warranty_expiring', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                <span className="text-sm text-slate-700">Mises à jour de réclamations</span>
                <input
                  type="checkbox"
                  checked={preferences.push_claim_updates}
                  onChange={(e) => updatePreference('push_claim_updates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* SMS Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-6 w-6 text-green-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Notifications SMS</h2>
            <p className="text-sm text-slate-600">Alertes urgentes par message texte</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-green-300 transition-colors">
            <div>
              <span className="font-medium text-slate-900">Activer les SMS</span>
              <p className="text-sm text-slate-600">Pour les alertes urgentes seulement</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.sms_enabled}
              onChange={(e) => updatePreference('sms_enabled', e.target.checked)}
              className="h-5 w-5 text-green-600 rounded focus:ring-green-500"
            />
          </label>

          {preferences.sms_enabled && (
            <div className="ml-6 space-y-3">
              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                <span className="text-sm text-slate-700">Garantie expire bientôt (7 jours)</span>
                <input
                  type="checkbox"
                  checked={preferences.sms_warranty_expiring}
                  onChange={(e) => updatePreference('sms_warranty_expiring', e.target.checked)}
                  className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                <span className="text-sm text-slate-700">Réclamation urgente</span>
                <input
                  type="checkbox"
                  checked={preferences.sms_claim_urgent}
                  onChange={(e) => updatePreference('sms_claim_urgent', e.target.checked)}
                  className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Digest & Quiet Hours */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Fréquence & Horaires</h2>
            <p className="text-sm text-slate-600">Contrôlez quand recevoir les notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Résumé quotidien/hebdomadaire
            </label>
            <select
              value={preferences.digest_frequency}
              onChange={(e) =>
                updatePreference('digest_frequency', e.target.value as 'never' | 'daily' | 'weekly' | 'monthly')
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="never">Jamais</option>
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Heures silencieuses (début)
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_start || ''}
                onChange={(e) => updatePreference('quiet_hours_start', e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Heures silencieuses (fin)
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_end || ''}
                onChange={(e) => updatePreference('quiet_hours_end', e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Aucune notification ne sera envoyée pendant les heures silencieuses (sauf urgentes)
          </p>
        </div>
      </div>

      {/* Save Button (sticky at bottom) */}
      <div className="sticky bottom-6 flex justify-center">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Enregistré!
            </>
          ) : saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Enregistrer les préférences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
