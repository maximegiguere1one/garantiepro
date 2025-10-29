import { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Info, TrendingUp, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';

interface PricingSettings {
  id?: string;
  user_id?: string;
  organization_id: string;
  default_margin_percentage: number;
  minimum_warranty_price: number;
  maximum_warranty_price: number;
  price_rounding_method: 'none' | 'nearest' | 'up' | 'down';
  price_rounding_to: number;
  apply_volume_discounts: boolean;
  volume_discount_threshold: number;
  volume_discount_percentage: number;
}

const ROUNDING_METHODS = [
  { value: 'none', label: 'Aucun arrondi', description: 'Prix exact' },
  { value: 'nearest', label: 'Au plus proche', description: 'Ex: 149.99, 150.00' },
  { value: 'up', label: 'Vers le haut', description: 'Ex: 149.99 → 150.00' },
  { value: 'down', label: 'Vers le bas', description: 'Ex: 150.01 → 150.00' },
];

const ROUNDING_OPTIONS = [
  { value: 0.99, label: '0.99 (149.99, 249.99)' },
  { value: 0.95, label: '0.95 (149.95, 249.95)' },
  { value: 0.00, label: '0.00 (150.00, 250.00)' },
  { value: 0.50, label: '0.50 (149.50, 249.50)' },
];

export function PricingSettings() {
  const { profile, organization } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PricingSettings>({
    user_id: '',
    organization_id: '',
    default_margin_percentage: 20.0,
    minimum_warranty_price: 50.0,
    maximum_warranty_price: 10000.0,
    price_rounding_method: 'nearest',
    price_rounding_to: 0.99,
    apply_volume_discounts: false,
    volume_discount_threshold: 10,
    volume_discount_percentage: 5.0,
  });

  useEffect(() => {
    if (profile?.user_id && organization?.id) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [profile?.user_id, organization?.id]);

  const loadSettings = async () => {
    if (!profile?.user_id || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          ...data,
          user_id: profile.id,
          organization_id: organization.id
        });
      } else {
        // Créer les paramètres par défaut avec UPSERT
        await createDefaultSettings();
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!profile?.user_id || !organization?.id) return;

    try {
      const defaultSettings = {
        user_id: profile.id,
        organization_id: organization.id,
        default_margin_percentage: 20.0,
        minimum_warranty_price: 50.0,
        maximum_warranty_price: 10000.0,
        price_rounding_method: 'nearest' as const,
        price_rounding_to: 0.99,
        apply_volume_discounts: false,
        volume_discount_threshold: 10,
        volume_discount_percentage: 5.0,
      };

      const { data, error } = await supabase
        .from('pricing_settings')
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
          organization_id: organization.id
        });
        showToast('Paramètres de tarification créés automatiquement', 'success');
      }
    } catch (error: any) {
      console.error('Error creating default settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.user_id || !organization?.id) {
      showToast('Erreur: utilisateur non connecté', 'error');
      return;
    }

    if (settings.minimum_warranty_price >= settings.maximum_warranty_price) {
      showToast('Le prix minimum doit être inférieur au prix maximum', 'error');
      return;
    }

    setSaving(true);
    try {
      const settingsData = {
        user_id: profile.id,
        organization_id: organization.id,
        default_margin_percentage: settings.default_margin_percentage,
        minimum_warranty_price: settings.minimum_warranty_price,
        maximum_warranty_price: settings.maximum_warranty_price,
        price_rounding_method: settings.price_rounding_method,
        price_rounding_to: settings.price_rounding_to,
        apply_volume_discounts: settings.apply_volume_discounts,
        volume_discount_threshold: settings.volume_discount_threshold,
        volume_discount_percentage: settings.volume_discount_percentage,
      };

      // Utiliser UPSERT pour créer ou mettre à jour automatiquement
      const { error } = await supabase
        .from('pricing_settings')
        .upsert(settingsData, {
          onConflict: 'organization_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      showToast('Paramètres de tarification sauvegardés avec succès', 'success');
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const calculateExample = () => {
    const baseCost = 100;
    const withMargin = baseCost * (1 + settings.default_margin_percentage / 100);

    let finalPrice = withMargin;
    if (settings.price_rounding_method !== 'none') {
      const decimalPart = settings.price_rounding_to;
      const wholePart = Math.floor(withMargin);

      if (settings.price_rounding_method === 'nearest') {
        finalPrice = wholePart + decimalPart;
      } else if (settings.price_rounding_method === 'up') {
        finalPrice = wholePart + decimalPart;
        if (withMargin > finalPrice) finalPrice += 1;
      } else if (settings.price_rounding_method === 'down') {
        finalPrice = wholePart + decimalPart;
        if (withMargin < finalPrice) finalPrice -= 1;
      }
    }

    return { baseCost, withMargin, finalPrice };
  };

  const example = calculateExample();

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Chargement des paramètres de tarification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Configuration de la tarification</h3>
            <p className="text-sm text-slate-600">Gérez vos marges et règles de prix</p>
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
        {/* Marges et limites */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-5 h-5 text-primary-600" />
            <h4 className="text-lg font-semibold text-slate-900">Marges et limites de prix</h4>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Marge par défaut (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.default_margin_percentage}
                onChange={(e) => setSettings({ ...settings, default_margin_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Marge appliquée sur le coût de base</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prix minimum ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.minimum_warranty_price}
                onChange={(e) => setSettings({ ...settings, minimum_warranty_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Prix plancher d'une garantie</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prix maximum ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.maximum_warranty_price}
                onChange={(e) => setSettings({ ...settings, maximum_warranty_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Prix plafond d'une garantie</p>
            </div>
          </div>
        </div>

        {/* Arrondissement des prix */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h4 className="text-lg font-semibold text-slate-900">Arrondissement des prix</h4>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Méthode d'arrondissement
              </label>
              <select
                value={settings.price_rounding_method}
                onChange={(e) => setSettings({ ...settings, price_rounding_method: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {ROUNDING_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {ROUNDING_METHODS.find(m => m.value === settings.price_rounding_method)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Arrondir à
              </label>
              <select
                value={settings.price_rounding_to}
                onChange={(e) => setSettings({ ...settings, price_rounding_to: parseFloat(e.target.value) })}
                disabled={settings.price_rounding_method === 'none'}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100"
              >
                {ROUNDING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Format des prix finaux</p>
            </div>
          </div>
        </div>

        {/* Remises volume */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h4 className="text-lg font-semibold text-slate-900">Remises sur volume</h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.apply_volume_discounts}
                onChange={(e) => setSettings({ ...settings, apply_volume_discounts: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">Activer</span>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seuil de volume (garanties)
              </label>
              <input
                type="number"
                min="1"
                value={settings.volume_discount_threshold}
                onChange={(e) => setSettings({ ...settings, volume_discount_threshold: parseInt(e.target.value) || 1 })}
                disabled={!settings.apply_volume_discounts}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">Nombre de garanties pour activer la remise</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Remise volume (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.volume_discount_percentage}
                onChange={(e) => setSettings({ ...settings, volume_discount_percentage: parseFloat(e.target.value) || 0 })}
                disabled={!settings.apply_volume_discounts}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">Réduction appliquée au-delà du seuil</p>
            </div>
          </div>

          {settings.apply_volume_discounts && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <Info className="w-4 h-4 inline mr-1" />
                Une remise de <strong>{settings.volume_discount_percentage}%</strong> sera appliquée
                pour les commandes de <strong>{settings.volume_discount_threshold}+ garanties</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Exemple de calcul */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Exemple de calcul
          </h4>

          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Coût de base</span>
              <span className="text-lg font-semibold text-slate-900">{example.baseCost.toFixed(2)} $</span>
            </div>

            <div className="flex justify-between items-center text-sm border-t pt-2">
              <span className="text-slate-600">Marge ({settings.default_margin_percentage}%)</span>
              <span className="font-medium text-slate-900">
                + {(example.withMargin - example.baseCost).toFixed(2)} $
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Prix avant arrondissement</span>
              <span className="font-medium text-slate-900">{example.withMargin.toFixed(2)} $</span>
            </div>

            {settings.price_rounding_method !== 'none' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">
                  Arrondissement ({ROUNDING_METHODS.find(m => m.value === settings.price_rounding_method)?.label})
                </span>
                <span className="font-medium text-slate-900">
                  {example.finalPrice > example.withMargin ? '+' : ''}
                  {(example.finalPrice - example.withMargin).toFixed(2)} $
                </span>
              </div>
            )}

            <div className="flex justify-between items-center border-t-2 border-primary-200 pt-3">
              <span className="text-base font-semibold text-slate-900">Prix final</span>
              <span className="text-xl font-bold text-primary-700">{example.finalPrice.toFixed(2)} $</span>
            </div>

            {settings.apply_volume_discounts && (
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">
                    Avec remise volume ({settings.volume_discount_percentage}%)
                  </span>
                  <span className="font-bold text-green-700">
                    {(example.finalPrice * (1 - settings.volume_discount_percentage / 100)).toFixed(2)} $
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Si {settings.volume_discount_threshold}+ garanties
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={loadSettings}>
            Réinitialiser
          </Button>
          <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
