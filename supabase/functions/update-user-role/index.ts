import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdateUserRoleRequest {
  userId: string;
  newRole: 'super_admin' | 'admin' | 'dealer' | 'f_and_i' | 'operations' | 'client';
  newFullName?: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: requestingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, email')
      .eq('id', user.id)
      .single();

    if (profileError || !requestingProfile) {
      throw new Error('Profile not found');
    }

    if (!['admin', 'super_admin'].includes(requestingProfile.role)) {
      throw new Error('Only administrators can update user roles');
    }

    const { userId, newRole, newFullName }: UpdateUserRoleRequest = await req.json();

    if (!userId || !newRole) {
      throw new Error('User ID and new role are required');
    }

    if (userId === user.id) {
      throw new Error('You cannot change your own role');
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('role, email, full_name, organization_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      throw new Error('User not found');
    }

    if (newRole === 'super_admin' && requestingProfile.role !== 'super_admin') {
      throw new Error('Only super administrators can assign the super_admin role');
    }

    if (targetProfile.role === 'super_admin' && requestingProfile.role !== 'super_admin') {
      throw new Error('Only super administrators can modify super administrator roles');
    }

    if (newRole === 'admin' && requestingProfile.role === 'admin') {
      throw new Error('You cannot assign the admin role to other users');
    }

    const { data: canManage, error: canManageError } = await supabase
      .rpc('can_manage_role', {
        p_manager_role: requestingProfile.role,
        p_target_role: newRole
      });

    if (canManageError || !canManage) {
      throw new Error('You do not have permission to assign this role');
    }

    const updateData: any = {
      role: newRole,
      updated_at: new Date().toISOString(),
    };

    if (newFullName && newFullName.trim() !== '') {
      updateData.full_name = newFullName.trim();
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to update user role: ' + updateError.message);
    }

    console.log(
      `User ${targetProfile.email} role updated from ${targetProfile.role} to ${newRole} by ${requestingProfile.email}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `User role updated successfully to ${newRole}`,
        user: {
          id: userId,
          email: targetProfile.email,
          oldRole: targetProfile.role,
          newRole: newRole,
          fullName: newFullName || targetProfile.full_name,
        },
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
    console.error('Error in update-user-role function:', error);

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
