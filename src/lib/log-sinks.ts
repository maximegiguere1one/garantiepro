/**
 * log-sinks.ts
 *
 * Provides logging infrastructure with environment-aware remote logging.
 * In demo environments (WebContainer/Bolt), remote logging is disabled to
 * prevent unnecessary network requests.
 *
 * Features:
 * - In-memory ring buffer for all environments
 * - Remote logging only in production environments
 * - Automatic bypass in demo/development modes
 */

import { getEnvironmentType } from './environment-detection';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogPayload = {
  level: LogLevel;
  area?: string;
  message: string;
  context?: any;
  ts?: string;
};

// In-memory ring buffer (max 200 entries)
const RING_MAX = 200;
const memoryBuffer: LogPayload[] = [];

/**
 * Pushes a log entry to the in-memory buffer.
 * This is always called regardless of environment.
 */
export function pushLocal(payload: LogPayload): void {
  payload.ts = payload.ts || new Date().toISOString();
  memoryBuffer.push(payload);

  // Maintain max size
  if (memoryBuffer.length > RING_MAX) {
    memoryBuffer.shift();
  }
}

/**
 * Gets all logs from the in-memory buffer.
 * Useful for debugging and displaying logs in UI.
 */
export function getLocalLogs(): readonly LogPayload[] {
  return [...memoryBuffer];
}

/**
 * Clears the in-memory log buffer.
 */
export function clearLocalLogs(): void {
  memoryBuffer.length = 0;
}

/**
 * Sends a log entry to remote storage (Supabase).
 * Automatically skips in demo/development environments.
 *
 * @param payload - The log entry to send
 * @returns Result indicating success, skip, or failure
 */
export async function sendRemote(payload: LogPayload): Promise<{
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: any;
}> {
  // Check environment
  const env = getEnvironmentType();

  // Skip remote logging in demo/development environments
  if (
    env === 'bolt' ||
    env === 'webcontainer' ||
    env === 'stackblitz' ||
    (typeof window !== 'undefined' && (window as any).__DISABLE_REMOTE_LOGS__)
  ) {
    // Just store locally and return success
    pushLocal(payload);
    return { ok: true, skipped: true };
  }

  // Only send to remote in production environments
  if (env !== 'production') {
    pushLocal(payload);
    return { ok: true, skipped: true };
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/error_logs`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify([{
        level: payload.level,
        area: payload.area || null,
        message: payload.message,
        context: payload.context ?? null,
        ts: payload.ts || new Date().toISOString(),
      }]),
    });

    if (!res.ok) {
      // Log failure locally
      pushLocal({
        ...payload,
        level: 'warn',
        message: `Remote log failed: ${res.status}`,
      });
    }

    return { ok: res.ok, status: res.status };
  } catch (error) {
    // Log error locally
    pushLocal({
      ...payload,
      level: 'warn',
      message: 'Remote log error',
      context: error,
    });

    return { ok: false, error };
  }
}

/**
 * Sends a batch of log entries to remote storage.
 * Useful for flushing accumulated logs.
 */
export async function sendRemoteBatch(payloads: LogPayload[]): Promise<{
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: any;
}> {
  if (payloads.length === 0) {
    return { ok: true, skipped: true };
  }

  // Check environment
  const env = getEnvironmentType();

  // Skip remote logging in demo/development environments
  if (
    env === 'bolt' ||
    env === 'webcontainer' ||
    env === 'stackblitz' ||
    env === 'development' ||
    (typeof window !== 'undefined' && (window as any).__DISABLE_REMOTE_LOGS__)
  ) {
    payloads.forEach(pushLocal);
    return { ok: true, skipped: true };
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/error_logs`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payloads.map(p => ({
        level: p.level,
        area: p.area || null,
        message: p.message,
        context: p.context ?? null,
        ts: p.ts || new Date().toISOString(),
      }))),
    });

    return { ok: res.ok, status: res.status };
  } catch (error) {
    return { ok: false, error };
  }
}
