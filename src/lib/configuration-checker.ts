import { supabase } from './supabase';
import { checkServiceHealth } from './error-tracking';

export interface ConfigCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export interface ConfigurationReport {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checks: ConfigCheck[];
  timestamp: string;
}

/**
 * Vérifie la configuration Supabase
 */
async function checkSupabaseConfiguration(): Promise<ConfigCheck> {
  try {
    // Vérifier l'URL et la clé anon
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        name: 'Supabase Configuration',
        status: 'error',
        message: 'Variables d\'environnement Supabase manquantes',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      };
    }

    // Tester la connexion
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      return {
        name: 'Supabase Configuration',
        status: 'error',
        message: `Erreur de connexion: ${error.message}`,
        details: { error: error.message }
      };
    }

    return {
      name: 'Supabase Configuration',
      status: 'success',
      message: 'Connexion Supabase fonctionnelle',
      details: {
        url: supabaseUrl.substring(0, 30) + '...',
        keyPresent: true
      }
    };
  } catch (error: any) {
    return {
      name: 'Supabase Configuration',
      status: 'error',
      message: `Exception: ${error?.message || 'Erreur inconnue'}`,
      details: { error: error?.message }
    };
  }
}

/**
 * Vérifie la configuration des emails (Resend)
 */
async function checkEmailConfiguration(): Promise<ConfigCheck> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { checkConfigOnly: true }
    });

    if (error) {
      return {
        name: 'Email Configuration (Resend)',
        status: 'error',
        message: `Erreur d'invocation: ${error.message}`,
        details: { error: error.message }
      };
    }

    if (!data || !data.configured) {
      return {
        name: 'Email Configuration (Resend)',
        status: 'error',
        message: 'RESEND_API_KEY non configurée dans Supabase Edge Functions',
        details: {
          configured: false,
          action: 'Configurer RESEND_API_KEY dans Supabase Dashboard > Project Settings > Edge Functions > Secrets'
        }
      };
    }

    return {
      name: 'Email Configuration (Resend)',
      status: 'success',
      message: 'Service email configuré correctement',
      details: {
        fromEmail: data.fromEmail,
        fromName: data.fromName
      }
    };
  } catch (error: any) {
    return {
      name: 'Email Configuration (Resend)',
      status: 'error',
      message: `Exception: ${error?.message || 'Erreur inconnue'}`,
      details: { error: error?.message }
    };
  }
}

/**
 * Vérifie la configuration des bibliothèques PDF
 */
async function checkPDFLibraries(): Promise<ConfigCheck> {
  try {
    const { loadPDFLibraries } = await import('./pdf-lazy-loader');
    await loadPDFLibraries();

    return {
      name: 'Bibliothèques PDF',
      status: 'success',
      message: 'jsPDF et jspdf-autotable chargés avec succès'
    };
  } catch (error: any) {
    return {
      name: 'Bibliothèques PDF',
      status: 'error',
      message: `Erreur de chargement: ${error?.message || 'Erreur inconnue'}`,
      details: {
        error: error?.message,
        stack: error?.stack
      }
    };
  }
}

/**
 * Vérifie l'authentification de l'utilisateur
 */
async function checkAuthentication(): Promise<ConfigCheck> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return {
        name: 'Authentification',
        status: 'warning',
        message: `Erreur d'authentification: ${error.message}`,
        details: { error: error.message }
      };
    }

    if (!user) {
      return {
        name: 'Authentification',
        status: 'warning',
        message: 'Aucun utilisateur connecté',
        details: { authenticated: false }
      };
    }

    // Vérifier le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return {
        name: 'Authentification',
        status: 'warning',
        message: `Erreur de récupération du profil: ${profileError.message}`,
        details: { error: profileError.message }
      };
    }

    if (!profile) {
      return {
        name: 'Authentification',
        status: 'error',
        message: 'Profil utilisateur manquant',
        details: { userId: user.id }
      };
    }

    if (!profile.organization_id) {
      return {
        name: 'Authentification',
        status: 'error',
        message: 'Organisation manquante pour le profil utilisateur',
        details: { userId: user.id, profile }
      };
    }

    return {
      name: 'Authentification',
      status: 'success',
      message: 'Utilisateur authentifié avec profil et organisation valides',
      details: {
        userId: user.id,
        email: profile.email,
        role: profile.role,
        hasOrganization: true
      }
    };
  } catch (error: any) {
    return {
      name: 'Authentification',
      status: 'error',
      message: `Exception: ${error?.message || 'Erreur inconnue'}`,
      details: { error: error?.message }
    };
  }
}

/**
 * Vérifie les tables requises
 */
async function checkDatabaseTables(): Promise<ConfigCheck> {
  try {
    const requiredTables = [
      'profiles',
      'organizations',
      'warranties',
      'customers',
      'trailers',
      'warranty_plans',
      'warranty_options',
      'claims',
      'warranty_claim_tokens',
      'company_settings',
      'email_queue',
      'error_logs',
      'document_generation_status'
    ];

    const missingTables: string[] = [];
    const accessibleTables: string[] = [];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('id').limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          missingTables.push(table);
        }
        // Ignorer les erreurs RLS (normal si table vide)
      } else {
        accessibleTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        name: 'Tables de la base de données',
        status: 'error',
        message: `${missingTables.length} table(s) manquante(s)`,
        details: {
          missing: missingTables,
          accessible: accessibleTables
        }
      };
    }

    return {
      name: 'Tables de la base de données',
      status: 'success',
      message: `Toutes les ${requiredTables.length} tables requises sont présentes`,
      details: {
        tables: accessibleTables
      }
    };
  } catch (error: any) {
    return {
      name: 'Tables de la base de données',
      status: 'error',
      message: `Exception: ${error?.message || 'Erreur inconnue'}`,
      details: { error: error?.message }
    };
  }
}

/**
 * Vérifie la configuration de la queue email
 */
async function checkEmailQueue(): Promise<ConfigCheck> {
  try {
    // Vérifier les emails en attente
    const { data, error } = await supabase
      .from('email_queue')
      .select('id, status, priority, attempts')
      .in('status', ['queued', 'processing', 'failed'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return {
        name: 'Queue Email',
        status: 'error',
        message: `Erreur d'accès à la queue: ${error.message}`,
        details: { error: error.message }
      };
    }

    const queued = data?.filter(e => e.status === 'queued').length || 0;
    const processing = data?.filter(e => e.status === 'processing').length || 0;
    const failed = data?.filter(e => e.status === 'failed').length || 0;

    if (failed > 10) {
      return {
        name: 'Queue Email',
        status: 'warning',
        message: `${failed} email(s) en échec`,
        details: { queued, processing, failed, total: data?.length || 0 }
      };
    }

    return {
      name: 'Queue Email',
      status: 'success',
      message: 'Queue email fonctionnelle',
      details: { queued, processing, failed, total: data?.length || 0 }
    };
  } catch (error: any) {
    return {
      name: 'Queue Email',
      status: 'error',
      message: `Exception: ${error?.message || 'Erreur inconnue'}`,
      details: { error: error?.message }
    };
  }
}

/**
 * Effectue un diagnostic complet du système
 */
export async function checkSystemConfiguration(): Promise<ConfigurationReport> {
  console.log('[configuration-checker] Début du diagnostic système...');

  const checks = await Promise.all([
    checkSupabaseConfiguration(),
    checkAuthentication(),
    checkDatabaseTables(),
    checkEmailConfiguration(),
    checkEmailQueue(),
    checkPDFLibraries()
  ]);

  const errorCount = checks.filter(c => c.status === 'error').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;

  let overallStatus: 'healthy' | 'degraded' | 'critical';
  if (errorCount > 0) {
    overallStatus = 'critical';
  } else if (warningCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const report: ConfigurationReport = {
    overallStatus,
    checks,
    timestamp: new Date().toISOString()
  };

  console.log('[configuration-checker] Diagnostic terminé:', {
    status: overallStatus,
    errors: errorCount,
    warnings: warningCount,
    success: checks.filter(c => c.status === 'success').length
  });

  return report;
}

/**
 * Affiche le rapport de configuration dans la console
 */
export function printConfigurationReport(report: ConfigurationReport) {
  console.group('=== RAPPORT DE CONFIGURATION SYSTÈME ===');
  console.log(`Statut global: ${report.overallStatus.toUpperCase()}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('');

  report.checks.forEach((check) => {
    const icon = check.status === 'success' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
    const color = check.status === 'success' ? 'color: green' : check.status === 'warning' ? 'color: orange' : 'color: red';

    console.log(`%c${icon} ${check.name}`, color);
    console.log(`  ${check.message}`);

    if (check.details) {
      console.log('  Détails:', check.details);
    }
    console.log('');
  });

  console.groupEnd();
}
