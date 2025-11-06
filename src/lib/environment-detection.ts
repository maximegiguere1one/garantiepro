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

export const isBoltEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('bolt.new');
};

export const isStackBlitzEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('stackblitz.com');
};

export const getEnvironmentType = (): 'production' | 'development' | 'webcontainer' | 'bolt' | 'stackblitz' => {
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
