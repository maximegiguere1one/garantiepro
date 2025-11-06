import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { isWebContainerEnvironment } from './environment-detection';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const isWebContainer = isWebContainerEnvironment();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: isWebContainer
      ? {
          'X-Client-Info': 'supabase-js-web',
          'X-Environment': 'webcontainer',
        }
      : {
          'X-Client-Info': 'supabase-js-web',
        },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
