import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../lib/settings-service';
import type {
  CompanySettings,
  TaxSettings,
  PricingSettings,
  NotificationSettings,
  ClaimSettings
} from '../lib/settings-schemas';

interface UseSettingsOptions {
  autoLoad?: boolean;
}

interface UseSettingsResult<T> {
  settings: T | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (data: Partial<T>) => Promise<boolean>;
  update: (updates: Partial<T>) => void;
  reset: () => void;
}

/**
 * Generic Settings Hook
 * Provides consistent interface for managing any settings type
 */
function useSettingsBase<T extends { organization_id?: string }>(
  loadFn: (orgId: string) => Promise<{ data: T | null; error: Error | null }>,
  saveFn: (data: Partial<T> & { organization_id: string }) => Promise<{ data: T | null; error: Error | null }>,
  defaultValues: Partial<T>,
  options: UseSettingsOptions = { autoLoad: true }
): UseSettingsResult<T> {
  const { organization: currentOrganization } = useAuth();
  const [settings, setSettings] = useState<T | null>(null);
  const [originalSettings, setOriginalSettings] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const defaultValuesRef = useRef(defaultValues);

  const load = useCallback(async () => {
    if (!currentOrganization?.id) {
      console.warn('Cannot load settings: no organization ID available');
      setError('Organisation non chargée');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log('Loading settings for organization:', currentOrganization.id);

    const result = await loadFn(currentOrganization.id);

    if (result.error) {
      console.error('Error loading settings:', result.error);
      setError(result.error.message);
      // Set default values on error
      const withDefaults = {
        ...defaultValuesRef.current,
        organization_id: currentOrganization.id,
      } as T;
      setSettings(withDefaults);
      setOriginalSettings(withDefaults);
    } else if (result.data) {
      console.log('Settings loaded successfully');
      setSettings(result.data);
      setOriginalSettings(result.data);
    } else {
      // No settings exist yet, use defaults
      console.log('No existing settings found, using defaults');
      const withDefaults = {
        ...defaultValuesRef.current,
        organization_id: currentOrganization.id,
      } as T;
      setSettings(withDefaults);
      setOriginalSettings(withDefaults);
    }

    setLoading(false);
  }, [currentOrganization?.id, loadFn]);

  const save = useCallback(async (data: Partial<T>): Promise<boolean> => {
    if (!currentOrganization?.id) {
      const errorMsg = 'Cannot save: organization ID is missing';
      console.error(errorMsg, { currentOrganization });
      setError('Organisation non trouvée. Impossible de sauvegarder les paramètres.');
      return false;
    }

    console.log('Saving settings for organization:', currentOrganization.id);
    setSaving(true);
    setError(null);

    const dataToSave = {
      ...data,
      organization_id: currentOrganization.id,
    };

    console.log('Data to save:', { ...dataToSave, organization_id: currentOrganization.id });

    const result = await saveFn(dataToSave);

    setSaving(false);

    if (result.error) {
      console.error('Save failed:', result.error);
      setError(result.error.message);
      return false;
    }

    if (result.data) {
      console.log('Settings saved successfully');
      setSettings(result.data);
      setOriginalSettings(result.data);
    }

    return true;
  }, [currentOrganization?.id, saveFn]);

  const update = useCallback((updates: Partial<T>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const reset = useCallback(() => {
    setSettings(originalSettings);
    setError(null);
  }, [originalSettings]);

  useEffect(() => {
    if (currentOrganization?.id) {
      if (options.autoLoad && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        load();
      }
    } else {
      hasLoadedRef.current = false;
    }
  }, [currentOrganization?.id, options.autoLoad]);

  useEffect(() => {
    return () => {
      hasLoadedRef.current = false;
    };
  }, []);

  return {
    settings,
    loading,
    saving,
    error,
    load,
    save,
    update,
    reset,
  };
}

/**
 * Hook for Company Settings
 */
export function useCompanySettings(options?: UseSettingsOptions) {
  return useSettingsBase<CompanySettings>(
    (orgId) => settingsService.loadCompanySettings(orgId),
    (data) => settingsService.saveCompanySettings(data),
    {
      company_name: '',
      contact_address: '',
      contact_phone: '',
      contact_email: '',
      website_url: '',
      logo_url: '',
      business_number: '',
      primary_color: '#0f172a',
      secondary_color: '#3b82f6',
      vendor_signature_url: '',
    },
    options
  );
}

/**
 * Hook for Tax Settings
 */
export function useTaxSettings(options?: UseSettingsOptions) {
  return useSettingsBase<TaxSettings>(
    (orgId) => settingsService.loadTaxSettings(orgId),
    (data) => settingsService.saveTaxSettings(data),
    {
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
    },
    options
  );
}

/**
 * Hook for Pricing Settings
 */
export function usePricingSettings(options?: UseSettingsOptions) {
  return useSettingsBase<PricingSettings>(
    (orgId) => settingsService.loadPricingSettings(orgId),
    (data) => settingsService.savePricingSettings(data),
    {
      default_margin_percentage: 20,
      minimum_warranty_price: 50,
      maximum_warranty_price: 10000,
      price_rounding_method: 'nearest',
      price_rounding_to: 0.99,
      apply_volume_discounts: false,
      volume_discount_threshold: 10,
      volume_discount_percentage: 5,
    },
    options
  );
}

/**
 * Hook for Notification Settings
 */
export function useNotificationSettings(options?: UseSettingsOptions) {
  return useSettingsBase<NotificationSettings>(
    (orgId) => settingsService.loadNotificationSettings(orgId),
    (data) => settingsService.saveNotificationSettings(data),
    {
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
    },
    options
  );
}

/**
 * Hook for Claim Settings
 */
export function useClaimSettings(options?: UseSettingsOptions) {
  return useSettingsBase<ClaimSettings>(
    (orgId) => settingsService.loadClaimSettings(orgId),
    (data) => settingsService.saveClaimSettings(data),
    {
      sla_hours: 48,
      auto_approval_threshold: 500,
      require_supervisor_approval_above: 2000,
      auto_approve_under_amount: 100,
      require_manager_approval: true,
      manager_approval_threshold: 500,
      allow_partial_approvals: true,
      max_claim_processing_days: 14,
      require_photo_evidence: true,
      require_receipt: false,
      email_customer_on_status_change: true,
      exclusion_keywords: [],
      workflow_steps: [],
    },
    options
  );
}
