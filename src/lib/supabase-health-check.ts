import { supabase } from './supabase';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    connection: boolean;
    authentication: boolean;
    database: boolean;
    details?: string;
    error?: string;
  };
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  const result: HealthCheckResult = {
    status: 'unhealthy',
    timestamp,
    checks: {
      connection: false,
      authentication: false,
      database: false,
    },
  };

  try {
    // Test 1: Basic connection
    const { data: pingData, error: pingError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (pingError) {
      result.checks.details = `Connection failed: ${pingError.message}`;
      result.checks.error = pingError.message;
      return result;
    }

    result.checks.connection = true;

    // Test 2: Authentication service
    try {
      const { data: authData } = await supabase.auth.getSession();
      result.checks.authentication = true;
    } catch (authError: any) {
      result.checks.details = `Auth check failed: ${authError.message}`;
    }

    // Test 3: Database query
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (!dbError) {
        result.checks.database = true;
      } else {
        result.checks.details = `Database query failed: ${dbError.message}`;
      }
    } catch (dbError: any) {
      result.checks.details = `Database test failed: ${dbError.message}`;
    }

    // Determine overall status
    if (result.checks.connection && result.checks.authentication && result.checks.database) {
      result.status = 'healthy';
      result.checks.details = 'All systems operational';
    } else if (result.checks.connection) {
      result.status = 'degraded';
      result.checks.details = 'Connection established but some services are unavailable';
    }

  } catch (error: any) {
    result.checks.error = error.message || 'Unknown error occurred';
    result.checks.details = `Health check failed: ${error.message}`;
  }

  return result;
}

export async function getSupabaseInfo(): Promise<{
  configured: boolean;
  url?: string;
  hasAnonKey: boolean;
  error?: string;
}> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return {
        configured: false,
        hasAnonKey: false,
        error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables',
      };
    }

    // Mask the anon key for security
    return {
      configured: true,
      url,
      hasAnonKey: true,
    };
  } catch (error: any) {
    return {
      configured: false,
      hasAnonKey: false,
      error: error.message,
    };
  }
}

export function getConnectionErrorMessage(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';

  // Log pour diagnostic
  console.error('[DIAGNOSTIC] Erreur reçue:', {
    error,
    message,
    type: typeof error,
    keys: error ? Object.keys(error) : [],
    stack: error?.stack
  });

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
  }

  if (message.includes('404') || message.includes('Not Found')) {
    return 'Le projet Supabase est introuvable. Veuillez vérifier la configuration dans le fichier .env';
  }

  if (message.includes('401') || message.includes('Invalid API key')) {
    return 'Clé API invalide. Veuillez vérifier VITE_SUPABASE_ANON_KEY dans le fichier .env';
  }

  if (message.includes('PGRST')) {
    return 'Erreur de base de données. Contactez l\'administrateur système.';
  }

  if (message.includes('RLS') || message.includes('policy') || message.includes('row-level security')) {
    return 'Erreur de permission corrigée. Veuillez vous reconnecter pour appliquer les nouvelles règles de sécurité.';
  }

  // Retourner le message d'erreur complet pour diagnostic
  return `Erreur: ${message}`;
}
