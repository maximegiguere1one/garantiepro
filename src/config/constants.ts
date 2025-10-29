export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.garantieproremorque.com';

export const APP_CONFIG = {
  SITE_URL,
  PRODUCTION_URL: 'https://www.garantieproremorque.com',
  APP_NAME: 'Location Pro-Remorque',
  SUPPORT_EMAIL: 'support@locationproremorque.ca',
} as const;

export const ROUTES = {
  RESET_PASSWORD: '/reset-password',
  SETUP: '/setup',
  AUTH_CALLBACK: '/auth/callback',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const;

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
