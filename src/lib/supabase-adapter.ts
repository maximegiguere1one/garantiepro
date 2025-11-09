import { supabase } from './supabase';
import { DEMO_USER_ID, DEMO_ORG_ID, DEMO_PROFILE } from './demo-constants';
import { getEnvironmentType } from './environment-detection';

const isDemoMode = () => {
  const envType = getEnvironmentType();
  return envType === 'bolt' || envType === 'webcontainer';
};

export const profilesAdapter = {
  async getById(userId: string) {
    if (isDemoMode()) {
      if (userId === DEMO_USER_ID) {
        return { data: DEMO_PROFILE, error: null };
      }
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    return { data, error };
  },

  async update(userId: string, updates: any) {
    if (isDemoMode()) {
      return { data: { ...DEMO_PROFILE, ...updates }, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();

    return { data, error };
  },

  async getByOrganization(organizationId: string) {
    if (isDemoMode()) {
      if (organizationId === DEMO_ORG_ID) {
        return { data: [DEMO_PROFILE], error: null };
      }
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId);

    return { data, error };
  },

  async list() {
    if (isDemoMode()) {
      return { data: [DEMO_PROFILE], error: null };
    }

    const { data, error } = await supabase.from('profiles').select('*');

    return { data, error };
  },

  async count() {
    if (isDemoMode()) {
      return { count: 1, error: null };
    }

    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    return { count, error };
  },

  async selectLimit(limit: number = 1) {
    if (isDemoMode()) {
      return { data: [DEMO_PROFILE].slice(0, limit), error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(limit);

    return { data, error };
  },

  async getByEmail(email: string) {
    if (isDemoMode()) {
      if (email === DEMO_PROFILE.email) {
        return { data: DEMO_PROFILE, error: null };
      }
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    return { data, error };
  },
};

export const organizationsAdapter = {
  async getById(orgId: string) {
    if (isDemoMode()) {
      if (orgId === DEMO_ORG_ID) {
        return {
          data: {
            id: DEMO_ORG_ID,
            name: 'Organisation Démo',
            type: 'owner' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    return { data, error };
  },

  async list() {
    if (isDemoMode()) {
      return {
        data: [
          {
            id: DEMO_ORG_ID,
            name: 'Organisation Démo',
            type: 'owner' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      };
    }

    const { data, error } = await supabase.from('organizations').select('*');

    return { data, error };
  },
};

export const warrantiesAdapter = {
  async list(filters?: any) {
    if (isDemoMode()) {
      return { data: [], error: null };
    }

    let query = supabase.from('warranties').select('*, trailers(*), customers(*)');

    if (filters?.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async getById(warrantyId: string) {
    if (isDemoMode()) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('warranties')
      .select('*, trailers(*), customers(*)')
      .eq('id', warrantyId)
      .maybeSingle();

    return { data, error };
  },
};

export const customersAdapter = {
  async list(organizationId?: string) {
    if (isDemoMode()) {
      return { data: [], error: null };
    }

    let query = supabase.from('customers').select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    return { data, error };
  },
};

export const claimsAdapter = {
  async list(filters?: any) {
    if (isDemoMode()) {
      return { data: [], error: null };
    }

    let query = supabase.from('warranty_claims').select('*, warranties(*)');

    if (filters?.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }

    const { data, error } = await query;
    return { data, error };
  },
};
