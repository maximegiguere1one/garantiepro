/**
 * Data Layer Entry Point
 *
 * Exports the appropriate DataClient based on environment.
 * - Production/Staging: supabaseAdapter (real Supabase calls)
 * - Demo/WebContainer/Bolt: demoAdapter (mock data, no network)
 */

import { getEnvironmentType } from '@/lib/environment-detection';
import { supabaseAdapter } from './supabase-adapter';
import { demoAdapter } from './demo-adapter';
import type { DataClient } from './types';

function createDataClient(): DataClient {
  const envType = getEnvironmentType();

  if (envType === 'webcontainer' || envType === 'bolt' || envType === 'stackblitz') {
    console.log('[DataClient] Using demo adapter (no network calls)');
    return demoAdapter;
  }

  console.log('[DataClient] Using Supabase adapter (production mode)');
  return supabaseAdapter;
}

export const dataClient = createDataClient();

export type { DataClient, Profile, Organization, User, Session } from './types';
