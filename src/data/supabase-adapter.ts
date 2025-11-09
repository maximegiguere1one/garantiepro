/**
 * Supabase Adapter - Production Implementation
 *
 * Implements DataClient interface using real Supabase client.
 * Used in production and staging environments.
 */

import { supabase } from '@/lib/supabase';
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

class SupabaseAuthRepo implements AuthRepo {
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { user: null, session: null, error };
      }

      return {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.role,
          aud: data.user.aud,
          created_at: data.user.created_at,
        } : null,
        session: data.session,
        error: null,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted')) {
        throw new Error('SIGNIN_TIMEOUT');
      }
      throw err;
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.full_name,
            role: credentials.role || 'employee',
          },
        },
      });

      if (error) {
        return { user: null, session: null, error };
      }

      return {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.role,
          aud: data.user.aud,
          created_at: data.user.created_at,
        } : null,
        session: data.session,
        error: null,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted')) {
        throw new Error('SIGNUP_TIMEOUT');
      }
      throw err;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession(): Promise<{ session: Session | null; error?: Error | null }> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { session: null, error };
      }

      return { session: data.session, error: null };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted')) {
        throw new Error('GET_SESSION_TIMEOUT');
      }
      throw err;
    }
  }

  async refreshSession(): Promise<{ session: Session | null; error?: Error | null }> {
    const { data, error } = await supabase.auth.refreshSession();
    return { session: data.session, error: error || null };
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return () => subscription.unsubscribe();
  }
}

class SupabaseProfileRepo implements ProfileRepo {
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      console.log('[SupabaseProfileRepo] Loading profile for:', userId);

      // Simple direct query - RLS handles permissions
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseProfileRepo] Error:', error);
        throw error;
      }

      if (data) {
        console.log('[SupabaseProfileRepo] ✓ Profile loaded:', {
          id: data.id,
          role: data.role,
          organizationId: data.organization_id
        });
      } else {
        console.warn('[SupabaseProfileRepo] No profile found for user:', userId);
      }

      return data;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted')) {
        throw new Error('FETCH_TIMEOUT');
      }
      throw err;
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

class SupabaseOrgRepo implements OrgRepo {
  async getOrg(orgId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted')) {
        throw new Error('ORG_FETCH_TIMEOUT');
      }
      throw err;
    }
  }

  async getAllOrgs(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getOrgsByParent(parentId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('parent_organization_id', parentId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createOrg(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .insert(org)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateOrg(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const supabaseAdapter: DataClient = {
  auth: new SupabaseAuthRepo(),
  profiles: new SupabaseProfileRepo(),
  orgs: new SupabaseOrgRepo(),
};
