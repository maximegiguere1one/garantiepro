/**
 * Centralized Application Configuration
 *
 * This file consolidates all configuration values to prevent hardcoding
 * throughout the application. All environment variables and constants
 * should be defined here.
 *
 * Environment variables should follow the pattern: VITE_[CATEGORY]_[NAME]
 */

// Site and URL Configuration
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.garantieproremorque.com';

export const APP_CONFIG = {
  // Company Information
  company: {
    name: import.meta.env.VITE_COMPANY_NAME || 'Location Pro-Remorque',
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@locationproremorque.ca',
    defaultLanguage: 'fr' as const,
  },

  // Application URLs
  urls: {
    siteUrl: SITE_URL,
    productionUrl: 'https://www.garantieproremorque.com',
    appName: 'Location Pro-Remorque',
  },

  // Performance Settings
  performance: {
    cacheTTL: Number(import.meta.env.VITE_CACHE_TTL_MS) || 300000, // 5 minutes
    slowQueryThreshold: Number(import.meta.env.VITE_SLOW_QUERY_MS) || 2000, // 2 seconds
    defaultPageSize: Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 10,
    maxRetries: Number(import.meta.env.VITE_MAX_RETRIES) || 3,
    retryBaseDelay: Number(import.meta.env.VITE_RETRY_BASE_DELAY_MS) || 1500,
    maxRetryDelay: Number(import.meta.env.VITE_MAX_RETRY_DELAY_MS) || 10000,
  },

  // Warranty Configuration
  warranty: {
    // PPR (Programme de Protection Remorque) defaults
    defaultDurationMonths: 72, // 6 years
    defaultDeductible: 100, // $100 per claim
    minPurchasePrice: 1000, // Minimum trailer purchase price
    cacheDebounceMs: 5000, // Debounce warranty cache operations
  },

  // Feature Flags
  features: {
    enableQuickBooksSync: import.meta.env.VITE_FEATURE_QB_SYNC === 'true',
    enableAcombaSync: import.meta.env.VITE_FEATURE_ACOMBA === 'true',
    enableAdvancedAnalytics: import.meta.env.VITE_FEATURE_ANALYTICS === 'true',
    enablePushNotifications: import.meta.env.VITE_FEATURE_PUSH === 'true',
  },

  // Email Configuration
  email: {
    defaultTestSubject: 'Test Email',
    rateLimitPerHour: Number(import.meta.env.VITE_EMAIL_RATE_LIMIT) || 100,
  },

  // PDF Generation Settings
  pdf: {
    theme: {
      primaryColor: [15, 23, 42] as [number, number, number], // Slate-900
      fontSize: {
        title: 24,
        heading: 12,
        body: 10,
        small: 8,
      },
      fontFamily: 'helvetica',
    },
    qrCodeSize: 60,
    signatureSize: { width: 40, height: 15 },
  },

  // Logging Configuration
  logging: {
    enabled: !import.meta.env.PROD,
    level: (import.meta.env.VITE_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    enableConsoleInProduction: import.meta.env.VITE_ENABLE_CONSOLE_PROD === 'true',
  },
} as const;

// Route Constants
export const ROUTES = {
  RESET_PASSWORD: '/reset-password',
  SETUP: '/setup',
  AUTH_CALLBACK: '/auth/callback',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CLAIM_SUBMIT: '/claim/submit',
  VERIFY_SIGNATURE: '/verify-signature',
  DOWNLOAD_WARRANTY: '/download-warranty',
} as const;

// Canadian Provinces
export const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
] as const;

// Helper Functions
export const getFullUrl = (path: string): string => {
  return `${SITE_URL}${path}`;
};

export const getResetPasswordUrl = (): string => {
  return getFullUrl(ROUTES.RESET_PASSWORD);
};

export const getSetupUrl = (token?: string): string => {
  const base = getFullUrl(ROUTES.SETUP);
  return token ? `${base}?token=${token}` : base;
};

export const getClaimSubmitUrl = (token: string): string => {
  return getFullUrl(`${ROUTES.CLAIM_SUBMIT}/${token}`);
};

// Type exports for better type safety
export type Province = typeof CANADIAN_PROVINCES[number]['code'];
export type Route = typeof ROUTES[keyof typeof ROUTES];
export type LogLevel = typeof APP_CONFIG.logging.level;
