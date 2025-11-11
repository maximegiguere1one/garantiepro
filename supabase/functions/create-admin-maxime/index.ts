import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-environment',
};

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

    console.log('🚀 Promoting Maxime to master role...');

    // Check if user exists with the new email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === 'maxime@giguere-influence.com');

    console.log('Users found:', existingUsers?.users?.length);
    console.log('Looking for:', 'maxime@giguere-influence.com');

    if (existingUser) {
      console.log('✅ User found:', existingUser.id);

      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      console.log('Profile query result:', { profile, error: profileError });

      if (!profile) {
        throw new Error('Profile not found for user');
      }

      console.log('Current role:', profile.role);

      // Update role to master
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'master' })
        .eq('user_id', existingUser.id)
        .select();

      console.log('Update result:', { updated, error: updateError });

      if (updateError) {
        console.error('❌ Error updating role:', updateError);
        throw updateError;
      }

      console.log('✅ Successfully promoted to master role');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Maxime promoted to master role successfully!',
          email: 'maxime@giguere-influence.com',
          user_id: existingUser.id,
          old_role: profile.role,
          new_role: 'master',
          updated_profile: updated,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // User not found
    console.log('❌ User not found');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'User maxime@giguere-influence.com not found. Please create the account first.',
        available_users: existingUsers?.users?.map(u => u.email) || [],
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 404,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
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