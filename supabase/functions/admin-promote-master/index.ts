import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PromoteMasterRequest {
  email: string;
}

/**
 * Edge Function: admin-promote-master
 *
 * Promeut un utilisateur au rôle master en utilisant une fonction RPC PostgreSQL.
 * Cette fonction NE NÉCESSITE PAS la clé Service Role de Supabase.
 *
 * Sécurité:
 * - Utilise l'authentification standard de Supabase
 * - Seuls les masters et super_admins peuvent utiliser cette fonction
 * - Les permissions sont vérifiées côté base de données
 * - L'opération est loggée dans audit_logs
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[admin-promote-master] Missing Authorization header');
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token === 'undefined' || token === 'null') {
      console.error('[admin-promote-master] Invalid token format');
      throw new Error('Invalid authorization token');
    }

    // Créer le client Supabase avec le token de l'utilisateur
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[admin-promote-master] Authentication failed:', userError);
      throw new Error('Authentication failed');
    }

    console.log('[admin-promote-master] Authenticated user:', user.id, user.email);

    const { email }: PromoteMasterRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    console.log('[admin-promote-master] Promotion request:', {
      requestingUser: user.email,
      targetEmail: email
    });

    // Appeler la fonction RPC PostgreSQL pour promouvoir l'utilisateur
    const { data, error } = await supabase.rpc('admin_promote_user_to_master', {
      p_target_email: email.trim(),
    });

    if (error) {
      console.error('[admin-promote-master] RPC error:', error);
      throw new Error(error.message || 'Failed to promote user to master');
    }

    console.log('[admin-promote-master] Success:', data);

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[admin-promote-master] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite';
    const statusCode = errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized') ? 401 : 400;

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: statusCode,
      }
    );
  }
});
