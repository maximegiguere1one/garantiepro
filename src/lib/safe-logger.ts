/**
 * Safe Logger - Prevents sensitive data exposure in production
 *
 * Usage:
 *   import { safeLog } from './lib/safe-logger';
 *   safeLog.debug('User data:', user);
 *   safeLog.sensitive('API Key:', apiKey); // Never logs in production
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

class SafeLogger {
  debug(...args: any[]) {
    if (IS_DEVELOPMENT) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: any[]) {
    if (IS_DEVELOPMENT) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]) {
    console.warn('[WARN]', ...args);
  }

  error(...args: any[]) {
    console.error('[ERROR]', ...args);
  }

  // For sensitive data - NEVER logs in production
  sensitive(...args: any[]) {
    if (IS_DEVELOPMENT) {
      console.log('[SENSITIVE]', ...args);
    }
  }

  // For performance timing
  time(label: string) {
    if (IS_DEVELOPMENT) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (IS_DEVELOPMENT) {
      console.timeEnd(label);
    }
  }
}

export const safeLog = new SafeLogger();
