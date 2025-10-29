import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanySettings } from '../hooks/useSettings';
import { FormField, Input, Select } from './common/FormField';
import { SettingsCard } from './common/SettingsCard';

export function FranchiseeSetup() {
  const navigate = useNavigate();
  const { organization: currentOrganization } = useAuth();
  const { settings, loading, saving, error, update, save } = useCompanySettings();
  const [successMessage, setSuccessMessage] = useState(false);

  const handleSave = async () => {
    if (!settings) return;

    const success = await save(settings);

    if (success) {
      setSuccessMessage(true);
      setTimeout(() => navigate('/'), 1500);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuration enregistrée!</h2>
          <p className="text-slate-600">Redirection vers le tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Bienvenue chez {currentOrganization?.name}
          </h1>
          <p className="text-slate-600">
            Configurez rapidement les informations de votre franchise
          </p>
        </div>

        <SettingsCard>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <FormField label="Nom de l'entreprise" required>
              <Input
                value={settings?.company_name || ''}
                onChange={(e) => update({ company_name: e.target.value })}
                placeholder="Location Pro Remorque Inc."
                required
              />
            </FormField>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField label="Email">
                <Input
                  type="email"
                  value={settings?.email || ''}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="contact@entreprise.com"
                />
              </FormField>

              <FormField label="Téléphone">
                <Input
                  type="tel"
                  value={settings?.phone || ''}
                  onChange={(e) => update({ phone: e.target.value })}
                  placeholder="(514) 555-0123"
                />
              </FormField>
            </div>

            <FormField label="Adresse">
              <Input
                value={settings?.address || ''}
                onChange={(e) => update({ address: e.target.value })}
                placeholder="123 Rue Principale"
              />
            </FormField>

            <div className="grid md:grid-cols-3 gap-6">
              <FormField label="Ville">
                <Input
                  value={settings?.city || ''}
                  onChange={(e) => update({ city: e.target.value })}
                  placeholder="Montréal"
                />
              </FormField>

              <FormField label="Province">
                <Select
                  value={settings?.province || 'QC'}
                  onChange={(e) => update({ province: e.target.value })}
                >
                  <option value="QC">Québec</option>
                  <option value="ON">Ontario</option>
                  <option value="AB">Alberta</option>
                  <option value="BC">Colombie-Britannique</option>
                </Select>
              </FormField>

              <FormField label="Code postal">
                <Input
                  value={settings?.postal_code || ''}
                  onChange={(e) => update({ postal_code: e.target.value })}
                  placeholder="H1A 1A1"
                />
              </FormField>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
              <button
                onClick={handleSkip}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                Configurer plus tard
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !settings?.company_name}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Enregistrer et continuer
                  </>
                )}
              </button>
            </div>
          </div>
        </SettingsCard>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            Vous pourrez modifier ces informations à tout moment dans les paramètres
          </p>
        </div>
      </div>
    </div>
  );
}
