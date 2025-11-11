import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-environment',
};

interface FixProfileRequest {
  userId?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from JWT
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log(`[fix-profile] Fixing profile for user: ${user.id}`);

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('[fix-profile] Error checking profile:', checkError);
      throw checkError;
    }

    if (existingProfile) {
      console.log('[fix-profile] Profile already exists:', existingProfile);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile already exists',
          profile: existingProfile,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Profile doesn't exist, create it
    console.log('[fix-profile] Creating missing profile...');

    // Get default organization
    const { data: defaultOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('type', 'owner')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const organizationId = defaultOrg?.id || null;

    // Extract metadata from auth user
    const metadata = user.user_metadata || {};
    const fullName =
      metadata.full_name || user.email?.split('@')[0] || 'User';
    const role = metadata.role || 'admin';

    console.log('[fix-profile] Creating profile with:', {
      id: user.id,
      email: user.email,
      fullName,
      role,
      organizationId,
    });

    // Create profile using service role (bypasses RLS)
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: role,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('[fix-profile] Error creating profile:', createError);
      throw createError;
    }

    console.log('[fix-profile] ✓ Profile created successfully:', newProfile);

    // Also log to track usage for monitoring
    console.log('[fix-profile] Profile recovery successful for:', user.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile created successfully via recovery function',
        profile: newProfile,
        recovered: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[fix-profile] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
