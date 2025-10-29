import { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import { sanitizeTaxSettings, calculateCanadianTaxes } from '../../lib/tax-utils';
import { safeUpsert } from '../../lib/supabase-safe-query';

interface TaxSettings {
  id?: string;
  user_id?: string;
  organization_id: string;
  gst_rate: number;
  qst_rate: number;
  pst_rate: number;
  hst_rate: number;
  apply_gst: boolean;
  apply_qst: boolean;
  apply_pst: boolean;
  apply_hst: boolean;
  tax_number_gst: string;
  tax_number_qst: string;
}

const CANADIAN_PROVINCES = [
  { code: 'QC', name: 'Quebec', gst: 5.0, qst: 9.975, pst: 0, hst: 0 },
  { code: 'ON', name: 'Ontario', gst: 0, qst: 0, pst: 0, hst: 13.0 },
  { code: 'NS', name: 'Nova Scotia', gst: 0, qst: 0, pst: 0, hst: 15.0 },
  { code: 'NB', name: 'New Brunswick', gst: 0, qst: 0, pst: 0, hst: 15.0 },
  { code: 'NL', name: 'Newfoundland', gst: 0, qst: 0, pst: 0, hst: 15.0 },
  { code: 'PE', name: 'PEI', gst: 0, qst: 0, pst: 0, hst: 15.0 },
  { code: 'BC', name: 'British Columbia', gst: 5.0, qst: 0, pst: 7.0, hst: 0 },
  { code: 'AB', name: 'Alberta', gst: 5.0, qst: 0, pst: 0, hst: 0 },
  { code: 'SK', name: 'Saskatchewan', gst: 5.0, qst: 0, pst: 6.0, hst: 0 },
  { code: 'MB', name: 'Manitoba', gst: 5.0, qst: 0, pst: 7.0, hst: 0 },
  { code: 'YT', name: 'Yukon', gst: 5.0, qst: 0, pst: 0, hst: 0 },
  { code: 'NT', name: 'NWT', gst: 5.0, qst: 0, pst: 0, hst: 0 },
  { code: 'NU', name: 'Nunavut', gst: 5.0, qst: 0, pst: 0, hst: 0 },
];

export function TaxSettings() {
  const { profile, organization } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TaxSettings>({
    user_id: '',
    organization_id: '',
    gst_rate: 5.0,
    qst_rate: 9.975,
    pst_rate: 0,
    hst_rate: 0,
    apply_gst: true,
    apply_qst: true,
    apply_pst: false,
    apply_hst: false,
    tax_number_gst: '',
    tax_number_qst: '',
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
        .from('tax_settings')
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
        // Créer les paramètres par défaut avec UPSERT (Québec par défaut)
        await createDefaultSettings();
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      showToast('Error loading settings', 'error');
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
        gst_rate: 5.0,
        qst_rate: 9.975,
        pst_rate: 0,
        hst_rate: 0,
        apply_gst: true,
        apply_qst: true,
        apply_pst: false,
        apply_hst: false,
        tax_number_gst: '',
        tax_number_qst: '',
      };

      const { data, error } = await supabase
        .from('tax_settings')
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
        showToast('Paramètres fiscaux créés automatiquement (Québec)', 'success');
      }
    } catch (error: any) {
      console.error('Error creating default settings:', error);
    }
  };

  const handleProvinceChange = (provinceCode: string) => {
    const province = CANADIAN_PROVINCES.find(p => p.code === provinceCode);
    if (province) {
      setSettings({
        ...settings,
        gst_rate: province.gst,
        qst_rate: province.qst,
        pst_rate: province.pst,
        hst_rate: province.hst,
        apply_gst: province.gst > 0,
        apply_qst: province.qst > 0,
        apply_pst: province.pst > 0,
        apply_hst: province.hst > 0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[TaxSettings.handleSubmit] CALLED - Form submitted');
    console.log('[TaxSettings.handleSubmit] profile:', profile);
    console.log('[TaxSettings.handleSubmit] organization:', organization);

    if (!profile?.id || !organization?.id) {
      console.error('[TaxSettings.handleSubmit] Missing user or org!');
      showToast('Error: user not connected', 'error');
      return;
    }

    console.log('[TaxSettings.handleSubmit] Starting save process...');

    setSaving(true);
    try {
      // Sanitize settings pour éviter NaN et valeurs invalides (400)
      const settingsData = sanitizeTaxSettings({
        user_id: profile.id,
        organization_id: organization.id,
        gst_rate: settings.gst_rate,
        qst_rate: settings.qst_rate,
        pst_rate: settings.pst_rate,
        hst_rate: settings.hst_rate,
        apply_gst: settings.apply_gst,
        apply_qst: settings.apply_qst,
        apply_pst: settings.apply_pst,
        apply_hst: settings.apply_hst,
        tax_number_gst: settings.tax_number_gst,
        tax_number_qst: settings.tax_number_qst,
      });

      // Log détaillé pour debugging (avec types)
      console.log('[TaxSettings.save] Payload:', settingsData);
      console.log('[TaxSettings.save] Types:', Object.fromEntries(
        Object.entries(settingsData).map(([k, v]) => [k, typeof v])
      ));

      // Utiliser safeUpsert pour éviter les erreurs 400
      const result = await safeUpsert(supabase, 'tax_settings', settingsData, 'organization_id');

      console.log('[TaxSettings.save] Success:', result);
      showToast('Tax settings saved successfully', 'success');
      await loadSettings();
    } catch (error: any) {
      console.error('[TaxSettings.save] Error:', error);
      console.error('[TaxSettings.save] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      // Message d'erreur détaillé pour l'utilisateur
      const errorMsg = error.message || error.details || 'Unknown error';
      showToast(`Error saving settings: ${errorMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = (amount: number) => {
    // Utiliser le calcul correct (QST sur base + GST)
    const result = calculateCanadianTaxes(amount, settings);
    return result.total;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Loading tax settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Tax Configuration</h3>
            <p className="text-sm text-slate-600">Manage applicable tax rates</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Quick Setup</p>
              <p className="text-xs text-blue-700 mt-1">Select your province</p>
            </div>
          </div>
          <select
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Select province...</option>
            {CANADIAN_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">GST</h4>
                <p className="text-sm text-slate-600">Federal Tax</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.apply_gst}
                  onChange={(e) => setSettings({ ...settings, apply_gst: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            <div className="space-y-3">
              <input
                type="number"
                step="0.001"
                value={settings.gst_rate}
                onChange={(e) => setSettings({ ...settings, gst_rate: parseFloat(e.target.value) || 0 })}
                disabled={!settings.apply_gst}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-100"
                placeholder="Rate %"
              />
              <input
                type="text"
                value={settings.tax_number_gst}
                onChange={(e) => setSettings({ ...settings, tax_number_gst: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="GST Number"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">QST</h4>
                <p className="text-sm text-slate-600">Quebec</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.apply_qst}
                  onChange={(e) => setSettings({ ...settings, apply_qst: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            <div className="space-y-3">
              <input
                type="number"
                step="0.001"
                value={settings.qst_rate}
                onChange={(e) => setSettings({ ...settings, qst_rate: parseFloat(e.target.value) || 0 })}
                disabled={!settings.apply_qst}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-100"
                placeholder="Rate %"
              />
              <input
                type="text"
                value={settings.tax_number_qst}
                onChange={(e) => setSettings({ ...settings, tax_number_qst: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="QST Number"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">HST</h4>
                <p className="text-sm text-slate-600">Harmonized</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.apply_hst}
                  onChange={(e) => setSettings({ ...settings, apply_hst: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            <input
              type="number"
              step="0.001"
              value={settings.hst_rate}
              onChange={(e) => setSettings({ ...settings, hst_rate: parseFloat(e.target.value) || 0 })}
              disabled={!settings.apply_hst}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-100"
              placeholder="Rate %"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">PST</h4>
                <p className="text-sm text-slate-600">Provincial</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.apply_pst}
                  onChange={(e) => setSettings({ ...settings, apply_pst: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            <input
              type="number"
              step="0.001"
              value={settings.pst_rate}
              onChange={(e) => setSettings({ ...settings, pst_rate: parseFloat(e.target.value) || 0 })}
              disabled={!settings.apply_pst}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-100"
              placeholder="Rate %"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-600" />
            Simulation ($100.00)
          </h4>
          <div className="bg-white rounded-lg p-4 space-y-2">
            {(() => {
              const calc = calculateCanadianTaxes(100, settings);
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base</span>
                    <span className="font-semibold">{calc.subtotal.toFixed(2)} $</span>
                  </div>
                  {calc.gst > 0 && (
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-slate-600">GST ({settings.gst_rate}%)</span>
                      <span>+ {calc.gst.toFixed(2)} $</span>
                    </div>
                  )}
                  {calc.qst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">QST ({settings.qst_rate}%) <span className="text-xs text-slate-500">sur TTC</span></span>
                      <span>+ {calc.qst.toFixed(2)} $</span>
                    </div>
                  )}
                  {calc.hst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">HST ({settings.hst_rate}%)</span>
                      <span>+ {calc.hst.toFixed(2)} $</span>
                    </div>
                  )}
                  {calc.pst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">PST ({settings.pst_rate}%)</span>
                      <span>+ {calc.pst.toFixed(2)} $</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-primary-200 pt-2">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary-700">{calc.total.toFixed(2)} $</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={loadSettings}>
            Reset
          </Button>
          <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
