import { supabase } from './supabase';
import type {
  CompanySettings,
  TaxSettings,
  PricingSettings,
  NotificationSettings,
  ClaimSettings
} from './settings-schemas';

type SettingsTable =
  | 'company_settings'
  | 'tax_settings'
  | 'pricing_settings'
  | 'notification_settings'
  | 'claim_settings';

interface SettingsServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Centralized Settings Service
 * Provides CRUD operations for all settings tables with consistent error handling
 */
class SettingsService {
  /**
   * Generic method to load settings for an organization
   */
  private async loadSettings<T>(
    table: SettingsTable,
    organizationId: string
  ): Promise<SettingsServiceResult<T>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) {
        console.error(`Error loading ${table}:`, error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T, error: null };
    } catch (err) {
      console.error(`Unexpected error loading ${table}:`, err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Erreur inconnue')
      };
    }
  }

  /**
   * Generic method to save settings (upsert)
   */
  private async saveSettings<T extends { organization_id: string }>(
    table: SettingsTable,
    settings: T
  ): Promise<SettingsServiceResult<T>> {
    try {
      // Validate organization_id before attempting save
      if (!settings.organization_id) {
        const errorMsg = `Cannot save ${table}: organization_id is required`;
        console.error(errorMsg, { settings });
        return {
          data: null,
          error: new Error('Organization non trouvée. Veuillez vous reconnecter ou contacter le support.')
        };
      }

      console.log(`Saving ${table} for organization:`, settings.organization_id);

      const { data, error } = await supabase
        .from(table)
        .upsert(settings, {
          onConflict: 'organization_id',
          ignoreDuplicates: false
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error(`Error saving ${table}:`, {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          organizationId: settings.organization_id
        });

        // Provide more helpful error messages based on error code
        let userMessage = error.message;
        if (error.code === 'PGRST116' || error.message.includes('RLS')) {
          userMessage = 'Accès refusé. Vous n\'avez pas la permission de modifier ces paramètres.';
        } else if (error.code === 'PGRST204') {
          userMessage = 'Erreur de configuration: une colonne requise est manquante dans la base de données. Contactez le support.';
          console.error(`[SettingsService] PGRST204 for ${table} - Schema migration may be needed`);
        } else if (error.code === '23505') {
          userMessage = 'Ces paramètres existent déjà.';
        } else if (error.code === '42501') {
          userMessage = 'Erreur de permission. Veuillez vous reconnecter.';
        } else if (error.code === '42703') {
          userMessage = 'Colonne non trouvée. Les migrations de base de données doivent être appliquées.';
          console.error(`[SettingsService] 42703 for ${table} - Undefined column`);
        } else if (error.code === '23502') {
          userMessage = 'Données requises manquantes. Vérifiez que tous les champs obligatoires sont remplis.';
        } else if (error.code === '23503') {
          userMessage = 'Référence invalide. L\'organisation n\'existe peut-être plus.';
        }

        return { data: null, error: new Error(userMessage) };
      }

      console.log(`Successfully saved ${table}`);
      return { data: data as T, error: null };
    } catch (err) {
      console.error(`Unexpected error saving ${table}:`, err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Erreur inconnue')
      };
    }
  }

  /**
   * Company Settings Methods
   */
  async loadCompanySettings(organizationId: string) {
    return this.loadSettings<CompanySettings>('company_settings', organizationId);
  }

  async saveCompanySettings(settings: Partial<CompanySettings> & { organization_id: string }) {
    return this.saveSettings('company_settings', settings);
  }

  /**
   * Tax Settings Methods
   */
  async loadTaxSettings(organizationId: string) {
    return this.loadSettings<TaxSettings>('tax_settings', organizationId);
  }

  async saveTaxSettings(settings: Partial<TaxSettings> & { organization_id: string }) {
    return this.saveSettings('tax_settings', settings);
  }

  /**
   * Pricing Settings Methods
   */
  async loadPricingSettings(organizationId: string) {
    return this.loadSettings<PricingSettings>('pricing_settings', organizationId);
  }

  async savePricingSettings(settings: Partial<PricingSettings> & { organization_id: string }) {
    return this.saveSettings('pricing_settings', settings);
  }

  /**
   * Notification Settings Methods
   */
  async loadNotificationSettings(organizationId: string) {
    return this.loadSettings<NotificationSettings>('notification_settings', organizationId);
  }

  async saveNotificationSettings(settings: Partial<NotificationSettings> & { organization_id: string }) {
    return this.saveSettings('notification_settings', settings);
  }

  /**
   * Claim Settings Methods
   */
  async loadClaimSettings(organizationId: string) {
    return this.loadSettings<ClaimSettings>('claim_settings', organizationId);
  }

  async saveClaimSettings(settings: Partial<ClaimSettings> & { organization_id: string }) {
    return this.saveSettings('claim_settings', settings);
  }

  /**
   * Utility: Load all settings at once
   */
  async loadAllSettings(organizationId: string) {
    const [company, tax, pricing, notification, claim] = await Promise.all([
      this.loadCompanySettings(organizationId),
      this.loadTaxSettings(organizationId),
      this.loadPricingSettings(organizationId),
      this.loadNotificationSettings(organizationId),
      this.loadClaimSettings(organizationId),
    ]);

    return {
      company: company.data,
      tax: tax.data,
      pricing: pricing.data,
      notification: notification.data,
      claim: claim.data,
      errors: {
        company: company.error,
        tax: tax.error,
        pricing: pricing.error,
        notification: notification.error,
        claim: claim.error,
      },
    };
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
