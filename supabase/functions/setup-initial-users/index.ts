import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-environment',
};

const ORG_ID = '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe';

const users = [
  {
    email: 'maxime@giguere-influence.com',
    full_name: 'Maxime Giguere',
    password: 'ProRemorque2025!',
    role: 'admin'
  },
  {
    email: 'maxime@agence1.com',
    full_name: 'maxime',
    password: 'ProRemorque2025!',
    role: 'admin'
  },
  {
    email: 'gigueremaxime321@gmail.com',
    full_name: 'gigueremaxime321',
    password: 'ProRemorque2025!',
    role: 'admin'
  },
  {
    email: 'philippe@proremorque.com',
    full_name: 'Philippe Jacob',
    password: 'ProRemorque2025!',
    role: 'admin'
  }
];

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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`Creating user: ${user.email}`);

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', user.email)
          .maybeSingle();

        if (existingUser) {
          console.log(`User ${user.email} already exists, skipping...`);
          results.push({
            success: true,
            email: user.email,
            message: 'User already exists',
            password: user.password
          });
          successCount++;
          continue;
        }

        // Create user in auth.users
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
            organization_id: ORG_ID,
          },
        });

        if (createError) {
          console.error(`Error creating user ${user.email}:`, createError);
          throw createError;
        }

        if (!authUser.user) {
          throw new Error('No user returned from createUser');
        }

        console.log(`User ${user.email} created in auth.users, ID: ${authUser.user.id}`);

        // Wait for profile to be created by trigger
        let profileCreated = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!profileCreated && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 500));

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, organization_id')
            .eq('id', authUser.user.id)
            .maybeSingle();

          if (profile) {
            console.log(`Profile found for ${user.email} after ${attempts} attempts`);
            
            // Ensure organization_id is set
            if (profile.organization_id !== ORG_ID) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ organization_id: ORG_ID })
                .eq('id', authUser.user.id);

              if (updateError) {
                console.error(`Error updating organization_id:`, updateError);
              } else {
                console.log(`Organization ID updated for ${user.email}`);
              }
            }

            profileCreated = true;
          }
        }

        if (!profileCreated) {
          throw new Error('Profile was not created by trigger');
        }

        results.push({
          success: true,
          email: user.email,
          password: user.password,
          userId: authUser.user.id
        });
        successCount++;

      } catch (error) {
        console.error(`Failed to create user ${user.email}:`, error);
        results.push({
          success: false,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `${successCount} utilisateur(s) créé(s), ${errorCount} erreur(s)`,
        successCount,
        errorCount,
        results,
        credentials: results.filter(r => r.success).map(r => ({
          email: r.email,
          password: r.password
        }))
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
    console.error('Error in setup-initial-users:', error);
    
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
        status: 500,
      }
    );
  }
});