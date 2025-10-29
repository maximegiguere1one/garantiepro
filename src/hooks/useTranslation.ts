import { useAuth } from '../contexts/AuthContext';
import translations from '../i18n/translations.json';

/**
 * useTranslation Hook
 *
 * Provides translation functionality with FR/EN support based on user preference.
 * Defaults to French if no preference is set.
 *
 * @example
 * ```tsx
 * const t = useTranslation();
 *
 * // Simple translation
 * <button>{t('common.actions.save')}</button>
 *
 * // Translation with parameters
 * <p>{t('warranty.create.progressLabel', { current: '1', total: '3' })}</p>
 * ```
 */
export function useTranslation() {
  const { profile } = useAuth();
  const lang = (profile?.language_preference as 'fr' | 'en') || 'fr';

  return (key: string, params?: Record<string, string | number>): string => {
    try {
      // Navigate through nested object using dot notation
      const keys = key.split('.');
      let value: any = translations;

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          console.warn(`Translation key not found: ${key}`);
          return key; // Fallback to key itself
        }
      }

      // Get translation for current language, fallback to French
      let text: string = value[lang] || value['fr'] || key;

      // Replace {{param}} placeholders with actual values
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(`{{${paramKey}}}`, String(paramValue));
        });
      }

      return text;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return key;
    }
  };
}

/**
 * useCurrentLanguage Hook
 *
 * Returns the current language code ('fr' or 'en')
 */
export function useCurrentLanguage(): 'fr' | 'en' {
  const { profile } = useAuth();
  return (profile?.language_preference as 'fr' | 'en') || 'fr';
}
