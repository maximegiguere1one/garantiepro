import { supabase } from './supabase';
import type { Database } from './database.types';

type ClaimToken = Database['public']['Tables']['warranty_claim_tokens']['Row'];
type Warranty = Database['public']['Tables']['warranties']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Trailer = Database['public']['Tables']['trailers']['Row'];
type WarrantyPlan = Database['public']['Tables']['warranty_plans']['Row'];

export interface TokenValidationResult {
  valid: boolean;
  token?: ClaimToken;
  warranty?: Warranty & {
    customers?: Customer;
    trailers?: Trailer;
    warranty_plans?: WarrantyPlan;
  };
  error?: string;
}

export async function validateClaimToken(token: string): Promise<TokenValidationResult> {
  try {
    // Use RPC function to get all data in one call (bypasses RLS context issues)
    const { data, error } = await supabase.rpc('validate_claim_token_rpc', {
      p_token: token,
    });

    if (error) {
      console.error('Error validating token:', error);
      return { valid: false, error: 'Erreur lors de la validation du token' };
    }

    if (!data) {
      return { valid: false, error: 'Erreur lors de la validation' };
    }

    // Parse the JSON response
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    console.log('Token validation result:', {
      valid: result.valid,
      hasWarranty: !!result.warranty,
      hasCustomer: !!result.warranty?.customers,
      hasTrailer: !!result.warranty?.trailers,
      hasPlan: !!result.warranty?.warranty_plans,
    });

    if (!result.valid) {
      return { valid: false, error: result.error || 'Token invalide' };
    }

    return {
      valid: true,
      token: result.token,
      warranty: result.warranty,
    };
  } catch (error: any) {
    console.error('Validation error:', error);
    return { valid: false, error: 'Erreur lors de la validation' };
  }
}

export async function markTokenAsUsed(token: string, claimId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('warranty_claim_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        claim_id: claimId,
      })
      .eq('token', token);

    if (error) {
      console.error('Error marking token as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
}

export async function logClaimAccess(
  token: string,
  action: 'view_form' | 'submit_claim' | 'upload_file' | 'invalid_token',
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('public_claim_access_logs').insert({
      token,
      ip_address: null,
      user_agent: navigator?.userAgent || null,
      action,
      success,
      error_message: errorMessage || null,
    });
  } catch (error) {
    console.error('Error logging claim access:', error);
  }
}

export function getClaimSubmissionUrl(token: string): string {
  const baseUrl = import.meta.env.VITE_SITE_URL || 'https://www.garantieproremorque.com';
  return `${baseUrl}/claim/submit/${token}`;
}

export async function regenerateClaimToken(warrantyId: string): Promise<string | null> {
  try {
    const { data: existingToken } = await supabase
      .from('warranty_claim_tokens')
      .select('*')
      .eq('warranty_id', warrantyId)
      .maybeSingle();

    if (existingToken && !existingToken.is_used) {
      return existingToken.token;
    }

    const { data: warranty } = await supabase
      .from('warranties')
      .select('end_date')
      .eq('id', warrantyId)
      .maybeSingle();

    if (!warranty) {
      return null;
    }

    const newToken = generateRandomToken();

    const { error } = await supabase.from('warranty_claim_tokens').insert({
      warranty_id: warrantyId,
      token: newToken,
      expires_at: warranty.end_date,
    });

    if (error) {
      console.error('Error regenerating token:', error);
      return null;
    }

    await supabase
      .from('warranties')
      .update({ claim_submission_url: `/claim/submit/${newToken}` })
      .eq('id', warrantyId);

    return newToken;
  } catch (error) {
    console.error('Error regenerating token:', error);
    return null;
  }
}

function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
