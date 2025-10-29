import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the requesting user's profile to check role
    const { data: requestingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !requestingProfile) {
      throw new Error('Profile not found');
    }

    // Only admin, super_admin, and master users can delete other users
    if (!['admin', 'super_admin', 'master'].includes(requestingProfile.role)) {
      throw new Error('Only administrators can delete users');
    }

    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      throw new Error('You cannot delete your own account');
    }

    // Get the target user's profile to check role and dependencies
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('role, email, full_name, organization_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      throw new Error('User not found');
    }

    // Super admins and masters can only be deleted by masters or super admins
    if (['super_admin', 'master'].includes(targetProfile.role) && !['super_admin', 'master'].includes(requestingProfile.role)) {
      throw new Error('Only super administrators and masters can delete super administrators or masters');
    }

    // Admins cannot delete other admins unless they are super_admin
    if (targetProfile.role === 'admin' && requestingProfile.role === 'admin') {
      throw new Error('You cannot delete other administrators');
    }

    // Check for dependencies using the database function
    const { data: dependencies, error: depsError } = await supabase
      .rpc('check_user_dependencies', { p_user_id: userId });

    if (depsError) {
      console.error('Error checking dependencies:', depsError);
    }

    // Warn if user has critical dependencies
    if (dependencies && dependencies.length > 0) {
      const dep = dependencies[0];
      if (dep.has_warranties || dep.has_claims) {
        const warnings = [];
        if (dep.has_warranties) {
          warnings.push(`${dep.warranties_count} garantie(s)`);
        }
        if (dep.has_claims) {
          warnings.push(`${dep.claims_count} réclamation(s)`);
        }

        // For now, we'll allow deletion but log the warning
        console.warn(`Deleting user ${targetProfile.email} with dependencies:`, warnings.join(', '));
      }
    }

    // Delete the user using direct SQL approach
    // First delete from profiles (if not already cascaded)
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
    }

    // Then delete from auth.users using service role
    const { error: authDeleteError } = await supabase.rpc('delete_auth_user', { user_id: userId });

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    console.log(`User ${targetProfile.email} (${targetProfile.role}) successfully deleted by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-user function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});