import { useState, useEffect } from 'react';
import { Mail, Save, Bell, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';

interface NotificationSettings {
  id?: string;
  organization_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  notify_new_warranty: boolean;
  notify_warranty_expiring: boolean;
  notify_claim_submitted: boolean;
  notify_claim_approved: boolean;
  notify_claim_rejected: boolean;
  expiring_warranty_days: number;
  notification_email: string;
  notification_phone: string;
}

export function EmailNotificationSettings() {
  const { showToast } = useToast();
  const { profile, organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    organization_id: '',
    email_notifications: true,
    sms_notifications: false,
    notify_new_warranty: true,
    notify_warranty_expiring: true,
    notify_claim_submitted: true,
    notify_claim_approved: true,
    notify_claim_rejected: true,
    expiring_warranty_days: 30,
    notification_email: '',
    notification_phone: '',
  });

  useEffect(() => {
    if (organization?.id) {
      loadSettings();
    } else {
      setLoadingSettings(false);
    }
  }, [organization?.id]);

  const loadSettings = async () => {
    if (!organization?.id) return;

    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          ...data,
          organization_id: organization.id
        });
      } else {
        setSettings(prev => ({
          ...prev,
          organization_id: organization.id
        }));
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      showToast('Erreur: organisation non trouvée', 'error');
      return;
    }

    setLoading(true);
    try {
      const settingsData = {
        organization_id: organization.id,
        email_notifications: settings.email_notifications,
        sms_notifications: settings.sms_notifications,
        notify_new_warranty: settings.notify_new_warranty,
        notify_warranty_expiring: settings.notify_warranty_expiring,
        notify_claim_submitted: settings.notify_claim_submitted,
        notify_claim_approved: settings.notify_claim_approved,
        notify_claim_rejected: settings.notify_claim_rejected,
        expiring_warranty_days: settings.expiring_warranty_days,
        notification_email: settings.notification_email,
        notification_phone: settings.notification_phone,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('notification_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      showToast('Paramètres sauvegardés avec succès', 'success');
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Notifications automatiques</h3>
            <p className="text-sm text-slate-600">Configurez vos préférences de notifications</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Rafraîchir
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Canaux de notification */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-600" />
            Canaux de notification
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Notifications par email</label>
                  <p className="text-xs text-slate-600 mt-1">Recevoir des notifications par email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Notifications SMS</label>
                  <p className="text-xs text-slate-600 mt-1">Recevoir des notifications par SMS</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sms_notifications}
                onChange={(e) => setSettings({...settings, sms_notifications: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>
          </div>
        </div>

        {/* Notifications de garanties */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Garanties
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Nouvelle garantie</label>
                  <p className="text-xs text-slate-600 mt-1">Notification lors de la création d'une garantie</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notify_new_warranty}
                onChange={(e) => setSettings({...settings, notify_new_warranty: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Garantie expirante</label>
                  <p className="text-xs text-slate-600 mt-1">Alerte avant l'expiration d'une garantie</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notify_warranty_expiring}
                onChange={(e) => setSettings({...settings, notify_warranty_expiring: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>

            {settings.notify_warranty_expiring && (
              <div className="ml-8 pl-3 border-l-2 border-amber-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Jours avant expiration
                </label>
                <select
                  value={settings.expiring_warranty_days}
                  onChange={(e) => setSettings({...settings, expiring_warranty_days: parseInt(e.target.value)})}
                  className="w-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="7">7 jours</option>
                  <option value="14">14 jours</option>
                  <option value="30">30 jours</option>
                  <option value="60">60 jours</option>
                  <option value="90">90 jours</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notifications de réclamations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            Réclamations
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-500" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Nouvelle réclamation</label>
                  <p className="text-xs text-slate-600 mt-1">Notification lors de la soumission d'une réclamation</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notify_claim_submitted}
                onChange={(e) => setSettings({...settings, notify_claim_submitted: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Réclamation approuvée</label>
                  <p className="text-xs text-slate-600 mt-1">Notification quand une réclamation est approuvée</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notify_claim_approved}
                onChange={(e) => setSettings({...settings, notify_claim_approved: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <label className="text-sm font-semibold text-slate-900">Réclamation rejetée</label>
                  <p className="text-xs text-slate-600 mt-1">Notification quand une réclamation est rejetée</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notify_claim_rejected}
                onChange={(e) => setSettings({...settings, notify_claim_rejected: e.target.checked})}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Coordonnées de notification</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email de notification
              </label>
              <input
                type="email"
                value={settings.notification_email}
                onChange={(e) => setSettings({...settings, notification_email: e.target.value})}
                placeholder="email@example.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-slate-500 mt-1">Laisser vide pour utiliser votre email principal</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone de notification
              </label>
              <input
                type="tel"
                value={settings.notification_phone}
                onChange={(e) => setSettings({...settings, notification_phone: e.target.value})}
                placeholder="+1 (514) 555-0000"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-slate-500 mt-1">Pour les notifications SMS</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={loadSettings}
          >
            Réinitialiser
          </Button>
          <Button type="submit" loading={loading} leftIcon={<Save className="w-4 h-4" />}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
