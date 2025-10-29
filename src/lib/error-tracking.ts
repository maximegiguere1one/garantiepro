import { supabase } from './supabase';

export interface ErrorLogOptions {
  errorType: 'pdf_generation' | 'email_sending' | 'database' | 'api' | 'validation' | 'authentication' | 'integration' | 'unknown';
  errorMessage: string;
  severity?: 'critical' | 'error' | 'warning' | 'info';
  errorCode?: string;
  stackTrace?: string;
  context?: Record<string, any>;
  relatedEntityType?: 'warranty' | 'claim' | 'customer' | 'user' | 'organization';
  relatedEntityId?: string;
}

export interface HealthCheckOptions {
  serviceName: 'resend' | 'supabase' | 'stripe' | 'quickbooks' | 'acomba' | 'twilio' | 'pdf_generation';
  checkType: 'api_connection' | 'database' | 'configuration' | 'functionality';
  status: 'healthy' | 'degraded' | 'down';
  responseTimeMs?: number;
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Enregistre une erreur dans le système de logging avec déduplication automatique
 */
export async function logError(options: ErrorLogOptions): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user?.id || '')
      .maybeSingle();

    // Générer un ID d'erreur unique basé sur le type et le message
    const errorId = generateErrorId(options.errorType, options.errorMessage);

    const { data, error } = await supabase.rpc('log_error', {
      p_organization_id: profile?.organization_id || null,
      p_user_id: user?.id || null,
      p_error_id: errorId,
      p_error_type: options.errorType,
      p_error_message: options.errorMessage,
      p_severity: options.severity || 'error',
      p_context: options.context || {},
      p_error_code: options.errorCode || null,
      p_stack_trace: options.stackTrace || null,
      p_related_entity_type: options.relatedEntityType || null,
      p_related_entity_id: options.relatedEntityId || null,
    });

    if (error) {
      console.error('[error-tracking] Failed to log error:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('[error-tracking] Exception while logging error:', error);
    return null;
  }
}

/**
 * Génère un ID d'erreur unique pour la déduplication
 */
function generateErrorId(errorType: string, errorMessage: string): string {
  // Normaliser le message en enlevant les détails variables (IDs, timestamps, etc.)
  const normalized = errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
    .replace(/\d+/g, 'NUM')
    .toLowerCase()
    .trim();

  return `${errorType}:${normalized.substring(0, 100)}`;
}

/**
 * Enregistre un health check pour un service externe
 */
export async function recordHealthCheck(options: HealthCheckOptions): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('record_health_check', {
      p_service_name: options.serviceName,
      p_check_type: options.checkType,
      p_status: options.status,
      p_response_time_ms: options.responseTimeMs || null,
      p_details: options.details || {},
      p_error_message: options.errorMessage || null,
    });

    if (error) {
      console.error('[error-tracking] Failed to record health check:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('[error-tracking] Exception while recording health check:', error);
    return null;
  }
}

/**
 * Initialise le statut de génération de documents pour une garantie
 */
export async function initDocumentGenerationStatus(
  warrantyId: string,
  organizationId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('init_document_generation_status', {
      p_warranty_id: warrantyId,
      p_organization_id: organizationId,
    });

    if (error) {
      console.error('[error-tracking] Failed to init document generation status:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('[error-tracking] Exception while initializing document status:', error);
    return null;
  }
}

/**
 * Met à jour le statut de génération d'un document spécifique
 */
export async function updateDocumentStatus(
  warrantyId: string,
  documentType: 'customer_invoice' | 'merchant_invoice' | 'contract',
  status: 'pending' | 'generating' | 'completed' | 'failed',
  errorMessage?: string
): Promise<boolean> {
  try {
    const statusField = `${documentType}_status`;
    const errorField = `${documentType}_error`;

    const updateData: any = {
      [statusField]: status,
      generation_attempts: status === 'generating' ? supabase.sql`generation_attempts + 1` : undefined,
      last_attempt_at: status === 'generating' ? new Date().toISOString() : undefined,
      completed_at: status === 'completed' ? new Date().toISOString() : undefined,
    };

    if (errorMessage) {
      updateData[errorField] = errorMessage;
    }

    if (status === 'failed') {
      // Calculer le prochain retry avec backoff exponentiel
      const { data: currentStatus } = await supabase
        .from('document_generation_status')
        .select('generation_attempts')
        .eq('warranty_id', warrantyId)
        .maybeSingle();

      const attempts = currentStatus?.generation_attempts || 0;
      const backoffMinutes = Math.min(Math.pow(2, attempts), 60); // Max 60 minutes
      const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);
      updateData.next_retry_at = nextRetry.toISOString();
    }

    const { error } = await supabase
      .from('document_generation_status')
      .update(updateData)
      .eq('warranty_id', warrantyId);

    if (error) {
      console.error('[error-tracking] Failed to update document status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[error-tracking] Exception while updating document status:', error);
    return false;
  }
}

/**
 * Récupère les erreurs récentes pour une organization
 */
export async function getRecentErrors(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .is('resolved_at', null)
      .order('last_occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[error-tracking] Failed to fetch recent errors:', error);
    return [];
  }
}

/**
 * Récupère les documents en échec nécessitant une régénération
 */
export async function getFailedDocuments() {
  try {
    const { data, error } = await supabase
      .from('document_generation_status')
      .select(`
        *,
        warranty:warranties(
          id,
          contract_number,
          customer_id,
          organization_id
        )
      `)
      .or('customer_invoice_status.eq.failed,merchant_invoice_status.eq.failed,contract_status.eq.failed')
      .order('last_attempt_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[error-tracking] Failed to fetch failed documents:', error);
    return [];
  }
}

/**
 * Vérifie la santé d'un service et enregistre le résultat
 */
export async function checkServiceHealth(
  serviceName: HealthCheckOptions['serviceName']
): Promise<HealthCheckOptions['status']> {
  const startTime = Date.now();
  let status: HealthCheckOptions['status'] = 'down';
  let errorMessage: string | undefined;
  const details: Record<string, any> = {};

  try {
    switch (serviceName) {
      case 'resend':
        // Test de configuration Resend
        const { data: resendData, error: resendError } = await supabase.functions.invoke('send-email', {
          body: { checkConfigOnly: true },
        });

        if (resendError || !resendData?.configured) {
          status = 'down';
          errorMessage = resendError?.message || 'Resend not configured';
        } else {
          status = 'healthy';
          details.fromEmail = resendData.fromEmail;
        }
        break;

      case 'supabase':
        // Test de connexion Supabase
        const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
        status = dbError ? 'down' : 'healthy';
        errorMessage = dbError?.message;
        break;

      case 'pdf_generation':
        // Test de disponibilité des modules PDF
        try {
          const { loadPDFLibraries } = await import('./pdf-lazy-loader');
          await loadPDFLibraries();
          status = 'healthy';
        } catch (error: any) {
          status = 'down';
          errorMessage = error?.message || 'PDF libraries failed to load';
        }
        break;

      default:
        status = 'degraded';
        errorMessage = 'Health check not implemented for this service';
    }
  } catch (error: any) {
    status = 'down';
    errorMessage = error?.message || 'Unknown error during health check';
  }

  const responseTime = Date.now() - startTime;

  // Enregistrer le résultat
  await recordHealthCheck({
    serviceName,
    checkType: 'functionality',
    status,
    responseTimeMs: responseTime,
    details,
    errorMessage,
  });

  return status;
}

/**
 * Effectue un health check complet de tous les services
 */
export async function checkAllServices(): Promise<Record<string, HealthCheckOptions['status']>> {
  const services: HealthCheckOptions['serviceName'][] = [
    'resend',
    'supabase',
    'pdf_generation',
  ];

  const results: Record<string, HealthCheckOptions['status']> = {};

  await Promise.all(
    services.map(async (service) => {
      results[service] = await checkServiceHealth(service);
    })
  );

  return results;
}
