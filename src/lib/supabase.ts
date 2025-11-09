import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { isWebContainerEnvironment, getEnvironmentType, getOptimalTimeouts } from './environment-detection';
import { createTimeoutFetch } from './timeout-fetch';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const isWebContainer = isWebContainerEnvironment();
const envType = getEnvironmentType();
const timeouts = getOptimalTimeouts();

const fetchWithTimeout = (typeof window !== 'undefined')
  ? createTimeoutFetch({
      sessionTimeout: timeouts.sessionTimeout,
      profileTimeout: timeouts.profileTimeout,
    })
  : fetch;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: !isWebContainer,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
      'X-Environment': envType,
      ...(isWebContainer && { 'X-WebContainer': 'true' }),
    },
    fetch: fetchWithTimeout as any,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: isWebContainer ? 2 : 10,
    },
  },
});

console.log(`[Supabase] Initialized in ${envType} environment with ${timeouts.sessionTimeout}ms timeout`);

if (envType === 'bolt' || envType === 'webcontainer') {
  console.log('[Supabase] Running in WebContainer - using optimized settings for limited network access');
}
