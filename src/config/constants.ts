import { getSiteUrl, getEnvironmentType } from '../lib/environment-detection';

export const SITE_URL = getSiteUrl();

const envType = getEnvironmentType();

export const APP_CONFIG = {
  SITE_URL,
  ENVIRONMENT: envType,
  PRODUCTION_URL: 'https://www.garantieproremorque.com',
  APP_NAME: 'Garantie Prolongée | Pro Remorque',
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
  const baseUrl = typeof window !== 'undefined' && (envType === 'bolt' || envType === 'development' || envType === 'webcontainer')
    ? window.location.origin
    : SITE_URL;

  return `${baseUrl}${path}`;
};


export const getResetPasswordUrl = (): string => {
  return getFullUrl(ROUTES.RESET_PASSWORD);
};

export const getSetupUrl = (token?: string): string => {
  const base = getFullUrl(ROUTES.SETUP);
  return token ? `${base}?token=${token}` : base;
};
