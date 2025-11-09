export const isWebContainerEnvironment = () => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  const userAgent = navigator.userAgent;

  return (
    hostname.includes('stackblitz.com') ||
    hostname.includes('webcontainer') ||
    hostname.includes('staticblitz') ||
    hostname.includes('bolt.new') ||
    hostname.includes('local-credentialless') ||
    hostname.includes('local-corp') ||
    userAgent.includes('WebContainer')
  );
};

export const isLocalDevelopment = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
};

export const isProduction = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('garantieproremorque.com') || (!isWebContainerEnvironment() && !isLocalDevelopment());
};

export const isBoltEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('bolt.new');
};

export const isStackBlitzEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('stackblitz.com');
};

export const getEnvironmentType = (): 'production' | 'development' | 'webcontainer' | 'bolt' | 'stackblitz' => {
  // IMPORTANT: Toujours forcer production sur garantieproremorque.com
  if (typeof window !== 'undefined' && window.location.hostname.includes('garantieproremorque.com')) {
    return 'production';
  }

  if (isBoltEnvironment()) return 'bolt';
  if (isStackBlitzEnvironment()) return 'stackblitz';
  if (isWebContainerEnvironment()) return 'webcontainer';
  if (import.meta.env.DEV) return 'development';
  return 'production';
};

export const shouldBypassCORS = () => {
  return isWebContainerEnvironment();
};

export const getEnvironmentWarnings = (): string[] => {
  const warnings: string[] = [];
  const envType = getEnvironmentType();

  if (envType === 'webcontainer' || envType === 'bolt' || envType === 'stackblitz') {
    warnings.push('Running in WebContainer environment - some features may be limited');
    warnings.push('CORS restrictions may apply - authentication might require special handling');
  }

  return warnings;
};

export const getOptimalTimeouts = () => {
  const envType = getEnvironmentType();

  if (envType === 'bolt' || envType === 'webcontainer' || envType === 'stackblitz') {
    return {
      sessionTimeout: 15000,
      profileTimeout: 20000,
      retryDelay: 2000,
      maxRetries: 3,
      emergencyTimeout: 90000
    };
  }

  return {
    sessionTimeout: 30000,
    profileTimeout: 30000,
    retryDelay: 2000,
    maxRetries: 3,
    emergencyTimeout: 60000
  };
};

export const getSiteUrl = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_SITE_URL || 'https://www.garantieproremorque.com';
  }

  const envType = getEnvironmentType();

  if (envType === 'bolt' || envType === 'webcontainer' || envType === 'stackblitz') {
    return window.location.origin;
  }

  if (envType === 'development') {
    return window.location.origin;
  }

  return import.meta.env.VITE_SITE_URL || window.location.origin;
};

export const shouldUseAggressiveCaching = () => {
  const envType = getEnvironmentType();
  return envType === 'bolt' || envType === 'webcontainer' || envType === 'stackblitz';
};

export const getEnvironmentInfo = () => {
  const envType = getEnvironmentType();
  return {
    environment: envType,
    siteUrl: getSiteUrl(),
    isProduction: envType === 'production',
    isDevelopment: envType === 'development' || envType === 'bolt' || envType === 'webcontainer' || envType === 'stackblitz',
    isBolt: envType === 'bolt',
  };
};

export const getCurrentOrigin = (): string => {
  if (typeof window === 'undefined') return import.meta.env.VITE_SITE_URL || 'https://www.garantieproremorque.com';
  return window.location.origin;
};
