import { supabase } from './supabase';
import { profilesAdapter } from './supabase-adapter';
import { createLogger } from './logger';
import { isWebContainerEnvironment } from './environment-detection';

const logger = createLogger('[ConnectionHealth]');

export interface ConnectionHealthResult {
  healthy: boolean;
  details: {
    supabaseReachable: boolean;
    authWorking: boolean;
    databaseAccessible: boolean;
    responseTime: number;
  };
  warnings: string[];
  errors: string[];
}

export async function checkConnectionHealth(timeout = 8000): Promise<ConnectionHealthResult> {
  const startTime = Date.now();
  const result: ConnectionHealthResult = {
    healthy: false,
    details: {
      supabaseReachable: false,
      authWorking: false,
      databaseAccessible: false,
      responseTime: 0,
    },
    warnings: [],
    errors: [],
  };

  if (isWebContainerEnvironment()) {
    result.warnings.push('Running in WebContainer environment - some checks may fail due to CORS restrictions');
  }

  try {
    const healthCheckPromise = (async () => {
      try {
        const { error } = await profilesAdapter.selectLimit(1);

        if (!error || error.code === 'PGRST116') {
          result.details.supabaseReachable = true;
          result.details.databaseAccessible = true;
        } else {
          result.errors.push(`Database error: ${error.message}`);
        }
      } catch (err) {
        logger.error('Database check failed:', err);
        if (err instanceof Error) {
          if (err.message.includes('CORS')) {
            result.warnings.push('CORS issue detected - this is expected in WebContainer environments');
            result.details.supabaseReachable = true;
          } else if (err.message.includes('Failed to fetch')) {
            result.errors.push('Network error: Unable to reach Supabase server');
          } else {
            result.errors.push(`Connection error: ${err.message}`);
          }
        }
      }

      try {
        const { error: authError } = await supabase.auth.getSession();
        if (!authError) {
          result.details.authWorking = true;
        } else {
          result.warnings.push(`Auth warning: ${authError.message}`);
        }
      } catch (err) {
        logger.error('Auth check failed:', err);
        if (err instanceof Error && !err.message.includes('CORS')) {
          result.errors.push(`Auth error: ${err.message}`);
        }
      }
    })();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });

    await Promise.race([healthCheckPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message === 'Health check timeout') {
      result.errors.push('Health check timed out - server may be slow or unreachable');
    }
  }

  result.details.responseTime = Date.now() - startTime;

  result.healthy =
    result.details.supabaseReachable &&
    (result.details.authWorking || isWebContainerEnvironment()) &&
    result.errors.length === 0;

  logger.info('Connection health check completed:', result);

  return result;
}

export async function waitForConnection(maxAttempts = 3, delayMs = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logger.info(`Connection attempt ${attempt}/${maxAttempts}`);

    const health = await checkConnectionHealth();

    if (health.healthy) {
      logger.info('Connection established successfully');
      return true;
    }

    if (attempt < maxAttempts) {
      logger.info(`Waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  logger.warn('Failed to establish connection after all attempts');
  return false;
}

export function getConnectionAdvice(health: ConnectionHealthResult): string {
  if (health.healthy) {
    return 'La connexion fonctionne correctement.';
  }

  if (isWebContainerEnvironment()) {
    return 'Environnement WebContainer d\u00e9tect\u00e9. Si vous rencontrez des probl\u00e8mes, essayez de rafra\u00eechir la page ou d\u00e9ployez l\'application en production pour une exp\u00e9rience compl\u00e8te.';
  }

  if (health.errors.some(e => e.includes('Network error'))) {
    return 'V\u00e9rifiez votre connexion internet et assurez-vous que Supabase est accessible.';
  }

  if (health.errors.some(e => e.includes('timeout'))) {
    return 'La connexion est trop lente. V\u00e9rifiez votre connexion internet.';
  }

  return 'Un probl\u00e8me de connexion a \u00e9t\u00e9 d\u00e9tect\u00e9. Essayez de rafra\u00eechir la page.';
}
