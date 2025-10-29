import { supabase } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SupabaseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000;

  private getCacheKey(table: string, params: any): string {
    return `${table}:${JSON.stringify(params)}`;
  }

  async get<T>(
    table: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    params: any = {},
    ttl: number = this.defaultTTL
  ): Promise<{ data: T | null; error: any; fromCache: boolean }> {
    const key = this.getCacheKey(table, params);
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return { data: cached.data, error: null, fromCache: true };
    }

    const result = await queryFn();

    if (result.data && !result.error) {
      this.cache.set(key, {
        data: result.data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      });
    }

    return { ...result, fromCache: false };
  }

  invalidate(table: string, params?: any): void {
    if (params) {
      const key = this.getCacheKey(table, params);
      this.cache.delete(key);
    } else {
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${table}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const supabaseCache = new SupabaseCache();

export async function getCachedCompanySettings(organizationId: string) {
  return supabaseCache.get(
    'company_settings',
    () =>
      supabase
        .from('company_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    { organizationId },
    10 * 60 * 1000
  );
}

export async function getCachedWarrantyPlans(organizationId: string) {
  return supabaseCache.get(
    'warranty_plans',
    () =>
      supabase
        .from('warranty_plans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name'),
    { organizationId },
    15 * 60 * 1000
  );
}

export async function getCachedProfile(userId: string) {
  return supabaseCache.get(
    'profiles',
    () =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
    { userId },
    30 * 60 * 1000
  );
}

export function invalidateCompanySettings(organizationId: string) {
  supabaseCache.invalidate('company_settings', { organizationId });
}

export function invalidateWarrantyPlans(organizationId: string) {
  supabaseCache.invalidate('warranty_plans', { organizationId });
}

export function invalidateProfile(userId: string) {
  supabaseCache.invalidate('profiles', { userId });
}
