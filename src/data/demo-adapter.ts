/**
 * Demo Adapter - Demo Mode Implementation
 *
 * Implements DataClient interface with mock data.
 * Used in WebContainer, Bolt, and local demo mode.
 * NO network calls to Supabase.
 */

import {
  DEMO_USER,
  DEMO_USER_ID,
  DEMO_PROFILE,
  DEMO_ORGANIZATION,
  DEMO_ORG_ID,
} from '@/lib/demo-constants';
import type {
  DataClient,
  AuthRepo,
  ProfileRepo,
  OrgRepo,
  Profile,
  Organization,
  AuthResponse,
  SignInCredentials,
  SignUpCredentials,
  Session,
} from './types';

const DEMO_SESSION: Session = {
  access_token: 'demo_access_token',
  refresh_token: 'demo_refresh_token',
  expires_in: 3600,
  token_type: 'bearer',
  user: DEMO_USER,
};

class DemoAuthRepo implements AuthRepo {
  private currentSession: Session | null = null;
  private listeners: Array<(session: Session | null) => void> = [];

  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    console.log('[Demo Auth] Sign in called (no network request)');

    await new Promise(resolve => setTimeout(resolve, 500));

    if (credentials.email === 'demo@proremorque.com' || credentials.email.includes('test')) {
      this.currentSession = DEMO_SESSION;
      this.notifyListeners(DEMO_SESSION);

      return {
        user: DEMO_USER,
        session: DEMO_SESSION,
        error: null,
      };
    }

    return {
      user: null,
      session: null,
      error: new Error('Invalid credentials (demo mode)'),
    };
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    console.log('[Demo Auth] Sign up called (no network request)');

    await new Promise(resolve => setTimeout(resolve, 500));

    this.currentSession = DEMO_SESSION;
    this.notifyListeners(DEMO_SESSION);

    return {
      user: DEMO_USER,
      session: DEMO_SESSION,
      error: null,
    };
  }

  async signOut(): Promise<void> {
    console.log('[Demo Auth] Sign out called (no network request)');
    this.currentSession = null;
    this.notifyListeners(null);
  }

  async getSession(): Promise<{ session: Session | null; error?: Error | null }> {
    console.log('[Demo Auth] Get session called (no network request)');
    return { session: this.currentSession, error: null };
  }

  async refreshSession(): Promise<{ session: Session | null; error?: Error | null }> {
    console.log('[Demo Auth] Refresh session called (no network request)');
    return { session: this.currentSession, error: null };
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    this.listeners.push(callback);

    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach(listener => {
      try {
        listener(session);
      } catch (err) {
        console.error('[Demo Auth] Listener error:', err);
      }
    });
  }
}

class DemoProfileRepo implements ProfileRepo {
  async getProfile(userId: string): Promise<Profile | null> {
    console.log('[Demo Profile] Get profile called (no network request)', userId);

    await new Promise(resolve => setTimeout(resolve, 200));

    if (userId === DEMO_USER_ID) {
      return DEMO_PROFILE;
    }

    return null;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    console.log('[Demo Profile] Update profile called (no network request)', userId, updates);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      ...DEMO_PROFILE,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }

  async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    console.log('[Demo Profile] Create profile called (no network request)', profile);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      ...profile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

class DemoOrgRepo implements OrgRepo {
  async getOrg(orgId: string): Promise<Organization | null> {
    console.log('[Demo Org] Get org called (no network request)', orgId);

    await new Promise(resolve => setTimeout(resolve, 200));

    if (orgId === DEMO_ORG_ID) {
      return DEMO_ORGANIZATION;
    }

    return null;
  }

  async getAllOrgs(): Promise<Organization[]> {
    console.log('[Demo Org] Get all orgs called (no network request)');

    await new Promise(resolve => setTimeout(resolve, 200));

    return [DEMO_ORGANIZATION];
  }

  async getOrgsByParent(parentId: string): Promise<Organization[]> {
    console.log('[Demo Org] Get orgs by parent called (no network request)', parentId);

    await new Promise(resolve => setTimeout(resolve, 200));

    return [];
  }

  async createOrg(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    console.log('[Demo Org] Create org called (no network request)', org);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      ...org,
      id: DEMO_ORG_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async updateOrg(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    console.log('[Demo Org] Update org called (no network request)', orgId, updates);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      ...DEMO_ORGANIZATION,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }
}

export const demoAdapter: DataClient = {
  auth: new DemoAuthRepo(),
  profiles: new DemoProfileRepo(),
  orgs: new DemoOrgRepo(),
};
