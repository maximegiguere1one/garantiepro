import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdateRoleRequest {
  userId: string;
  newRole: string;
  newFullName?: string;
}

/**
 * Edge Function: admin-update-role
 *
 * Met à jour le rôle d'un utilisateur en utilisant une fonction RPC PostgreSQL.
 * Cette fonction NE NÉCESSITE PAS la clé Service Role de Supabase.
 *
 * Sécurité:
 * - Utilise l'authentification standard de Supabase
 * - Les permissions sont vérifiées côté base de données via la fonction RPC
 * - Toutes les opérations sont loggées dans audit_logs
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

    // Utiliser la clé anon et le token utilisateur pour l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[admin-update-role] Missing Authorization header');
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token === 'undefined' || token === 'null') {
      console.error('[admin-update-role] Invalid token format');
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
      console.error('[admin-update-role] Authentication failed:', userError);
      throw new Error('Authentication failed');
    }

    console.log('[admin-update-role] Authenticated user:', user.id, user.email);

    const { userId, newRole, newFullName }: UpdateRoleRequest = await req.json();

    if (!userId || !newRole) {
      throw new Error('User ID and new role are required');
    }

    console.log('[admin-update-role] Update request:', {
      requestingUser: user.id,
      targetUser: userId,
      newRole,
      hasNewFullName: !!newFullName
    });

    // Appeler la fonction RPC PostgreSQL pour mettre à jour le rôle
    // Cette fonction gère toute la logique de permissions et de validation
    const { data, error } = await supabase.rpc('admin_update_user_role', {
      p_target_user_id: userId,
      p_new_role: newRole,
      p_new_full_name: newFullName || null,
    });

    if (error) {
      console.error('[admin-update-role] RPC error:', error);
      throw new Error(error.message || 'Failed to update user role');
    }

    console.log('[admin-update-role] Success:', data);

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
    console.error('[admin-update-role] Error:', error);

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
