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
    const { data: tokenData, error: tokenError } = await supabase
      .from('warranty_claim_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      console.error('Error fetching token:', tokenError);
      return { valid: false, error: 'Erreur lors de la validation du token' };
    }

    if (!tokenData) {
      return { valid: false, error: 'Token invalide' };
    }

    if (tokenData.is_used) {
      return { valid: false, error: 'Ce lien a déjà été utilisé pour soumettre une réclamation' };
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return { valid: false, error: 'Ce lien a expiré' };
    }

    // Fetch warranty data separately to work with RLS
    const { data: warrantyData, error: warrantyError } = await supabase
      .from('warranties')
      .select('*')
      .eq('id', tokenData.warranty_id)
      .maybeSingle();

    if (warrantyError || !warrantyData) {
      console.error('Error fetching warranty:', warrantyError);
      return { valid: false, error: 'Garantie introuvable' };
    }

    // Fetch related data separately (RLS allows via token context)
    const [customerResult, trailerResult, planResult] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('id', warrantyData.customer_id)
        .maybeSingle(),
      supabase
        .from('trailers')
        .select('*')
        .eq('id', warrantyData.trailer_id)
        .maybeSingle(),
      supabase
        .from('warranty_plans')
        .select('*')
        .eq('id', warrantyData.plan_id)
        .maybeSingle(),
    ]);

    // Combine the data
    const enrichedWarranty = {
      ...warrantyData,
      customers: customerResult.data,
      trailers: trailerResult.data,
      warranty_plans: planResult.data,
    };

    await supabase
      .from('warranty_claim_tokens')
      .update({
        access_count: tokenData.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    return {
      valid: true,
      token: tokenData,
      warranty: enrichedWarranty,
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
