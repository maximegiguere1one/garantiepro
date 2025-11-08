import { isWebContainerEnvironment } from './environment-detection';

const EMERGENCY_MODE_KEY = 'emergency_mode_enabled';
const EMERGENCY_PROFILE_KEY = 'emergency_profile';

export interface EmergencyProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'franchisee' | 'employee' | 'customer';
  organization_id: string;
  emergency: true;
}

export function isEmergencyModeEnabled(): boolean {
  return localStorage.getItem(EMERGENCY_MODE_KEY) === 'true';
}

export function enableEmergencyMode(): void {
  if (!isWebContainerEnvironment()) {
    console.warn('Emergency mode should only be used in WebContainer environments');
  }
  localStorage.setItem(EMERGENCY_MODE_KEY, 'true');
}

export function disableEmergencyMode(): void {
  localStorage.removeItem(EMERGENCY_MODE_KEY);
  localStorage.removeItem(EMERGENCY_PROFILE_KEY);
}

export function getEmergencyProfile(): EmergencyProfile | null {
  const stored = localStorage.getItem(EMERGENCY_PROFILE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setEmergencyProfile(profile: EmergencyProfile): void {
  localStorage.setItem(EMERGENCY_PROFILE_KEY, JSON.stringify(profile));
}

export function createDemoProfile(): EmergencyProfile {
  return {
    id: 'demo-user-' + Date.now(),
    email: 'demo@bolt.local',
    full_name: 'Mode Démonstration Bolt',
    role: 'admin',
    organization_id: 'demo-org-' + Date.now(),
    emergency: true,
  };
}
