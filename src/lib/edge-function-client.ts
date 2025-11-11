/**
 * Edge Function Client - Utility for calling Supabase Edge Functions with proper CORS headers
 *
 * CRITICAL: Always include both Authorization AND apikey headers to avoid CORS errors
 */

import { supabase } from './supabase';

export interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  timeout?: number;
}

/**
 * Call a Supabase Edge Function with proper authentication and CORS headers
 *
 * @param functionName - Name of the edge function (without /functions/v1/ prefix)
 * @param options - Request options
 * @returns Response data
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<T> {
  const { method = 'POST', body, timeout = 30000 } = options;

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session. Please sign in.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  // CRITICAL: Include both Authorization AND apikey headers
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': supabaseAnonKey, // REQUIRED for CORS
    'Content-Type': 'application/json',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Try to parse JSON response
    let result: any;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }
    } else {
      // Non-JSON response
      result = await response.text();
    }

    // Check for errors
    if (!response.ok) {
      const errorMessage = typeof result === 'object'
        ? result.error || result.message || `HTTP ${response.status}`
        : result;
      throw new Error(errorMessage);
    }

    return result as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
}

/**
 * Invoke a Supabase Edge Function using the official SDK method
 * This is the recommended approach as it handles CORS automatically
 *
 * @param functionName - Name of the edge function
 * @param body - Request body
 * @returns Response data
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body?: any
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    throw error;
  }

  return data as T;
}
