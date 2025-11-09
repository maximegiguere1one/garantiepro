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
      // Use optimized RPC function for current user
      if (userId === (await supabase.auth.getUser()).data.user?.id) {
        console.log('[SupabaseProfileRepo] Using optimized RPC for current user');

        const { data, error } = await supabase.rpc('get_user_profile_complete');

        if (error) {
          console.warn('[SupabaseProfileRepo] RPC failed, falling back to direct query:', error);
          // Fallback to direct query
          const fallback = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (fallback.error) throw fallback.error;
          return fallback.data;
        }

        // RPC returns jsonb with { profile, organization }
        if (data?.profile) {
          console.log('[SupabaseProfileRepo] Profile loaded via RPC successfully');
          return data.profile as Profile;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        return null;
      }

      // For other users (admin viewing), use direct query
      console.log('[SupabaseProfileRepo] Using direct query for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
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
