const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  console.log('🔍 Checking profiles in database...\n');

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_id, role, organization_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    console.log(`Found ${profiles.length} profiles:\n`);

    const incomplete = [];
    const complete = [];

    profiles.forEach(profile => {
      const status = {
        email: profile.email || 'N/A',
        full_name: profile.full_name || 'N/A',
        role: profile.role || 'N/A',
        has_user_id: !!profile.user_id,
        user_id: profile.user_id || 'NULL',
      };

      if (!profile.user_id) {
        incomplete.push(status);
      } else {
        complete.push(status);
      }
    });

    console.log('✅ Complete profiles (with user_id):');
    console.table(complete);

    if (incomplete.length > 0) {
      console.log('\n⚠️  Incomplete profiles (missing user_id):');
      console.table(incomplete);
      console.log('\n💡 Ces profils doivent être supprimés ou réparés.');
      console.log('   Ils empêchent la réinitialisation des mots de passe.');
    } else {
      console.log('\n✅ Tous les profils sont complets!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProfiles();
