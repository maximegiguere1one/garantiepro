import { supabase } from './supabase';

export interface DownloadToken {
  token: string;
  warrantyId: string;
  expiresAt: string;
  downloadsRemaining: number | null;
}

/**
 * Crée un token de téléchargement sécurisé pour une garantie
 */
export async function createWarrantyDownloadToken(
  warrantyId: string,
  customerEmail: string,
  customerName: string,
  expiresInDays: number = 90,
  maxDownloads: number | null = null
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    console.log('[createWarrantyDownloadToken] Creating download token', {
      warrantyId,
      customerEmail,
      expiresInDays,
      maxDownloads,
    });

    const { data, error } = await supabase.rpc('create_warranty_download_token', {
      p_warranty_id: warrantyId,
      p_customer_email: customerEmail,
      p_customer_name: customerName,
      p_expires_in_days: expiresInDays,
      p_max_downloads: maxDownloads,
    });

    if (error) {
      console.error('[createWarrantyDownloadToken] Error creating token:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      console.error('[createWarrantyDownloadToken] No token returned from RPC');
      return {
        success: false,
        error: 'Failed to create download token',
      };
    }

    console.log('[createWarrantyDownloadToken] Token created successfully:', data);

    return {
      success: true,
      token: data,
    };
  } catch (error: any) {
    console.error('[createWarrantyDownloadToken] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error creating token',
    };
  }
}

/**
 * Génère l'URL complète de téléchargement avec le token
 */
export function getDownloadUrl(token: string, documentType: 'all' | 'contract' | 'customer_invoice' = 'all'): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/download-warranty?token=${token}&type=${documentType}`;
}

/**
 * Génère l'URL de l'API pour télécharger les documents
 */
export function getDownloadApiUrl(token: string, documentType: 'all' | 'contract' | 'customer_invoice' = 'all'): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/download-warranty-documents?token=${token}&type=${documentType}`;
}

/**
 * Valide un token de téléchargement
 */
export async function validateDownloadToken(token: string): Promise<{
  isValid: boolean;
  warrantyId?: string;
  customerEmail?: string;
  downloadsRemaining?: number | null;
  errorMessage?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('validate_warranty_download_token', {
      p_token: token,
    });

    if (error) {
      console.error('[validateDownloadToken] Error validating token:', error);
      return {
        isValid: false,
        errorMessage: error.message,
      };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Invalid response from validation',
      };
    }

    const validation = data[0];

    return {
      isValid: validation.is_valid,
      warrantyId: validation.warranty_id,
      customerEmail: validation.customer_email,
      downloadsRemaining: validation.downloads_remaining,
      errorMessage: validation.error_message,
    };
  } catch (error: any) {
    console.error('[validateDownloadToken] Unexpected error:', error);
    return {
      isValid: false,
      errorMessage: error.message || 'Unexpected error validating token',
    };
  }
}

/**
 * Révoque un token de téléchargement
 */
export async function revokeDownloadToken(
  token: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('revoke_warranty_download_token', {
      p_token: token,
      p_reason: reason,
    });

    if (error) {
      console.error('[revokeDownloadToken] Error revoking token:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: !!data,
    };
  } catch (error: any) {
    console.error('[revokeDownloadToken] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error revoking token',
    };
  }
}

/**
 * Récupère les statistiques de téléchargement pour une garantie
 */
export async function getWarrantyDownloadStats(warrantyId: string) {
  try {
    const { data, error } = await supabase
      .from('warranty_download_stats')
      .select('*')
      .eq('warranty_id', warrantyId)
      .maybeSingle();

    if (error) {
      console.error('[getWarrantyDownloadStats] Error fetching stats:', error);
      return null;
    }

    return data;
  } catch (error: any) {
    console.error('[getWarrantyDownloadStats] Unexpected error:', error);
    return null;
  }
}

/**
 * Récupère l'historique des téléchargements pour une garantie
 */
export async function getWarrantyDownloadLogs(warrantyId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('warranty_download_logs')
      .select('*')
      .eq('warranty_id', warrantyId)
      .order('accessed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getWarrantyDownloadLogs] Error fetching logs:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('[getWarrantyDownloadLogs] Unexpected error:', error);
    return [];
  }
}
