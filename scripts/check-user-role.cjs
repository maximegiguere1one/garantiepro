const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGxkcmtrcXZwdXRkZ2ZwYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzE4NDUsImV4cCI6MjA3NTEwNzg0NX0.cfWvm-NeUcVONV1VWd6U65lwg-2JdEBMWhSFWUJZdxg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserRoles() {
  console.log('Checking user roles in the system...\n');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, organization_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Recent users and their roles:');
  console.log('================================\n');
  
  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.full_name || 'No name'} (${profile.email})`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Organization: ${profile.organization_id}\n`);
  });
}

checkUserRoles();
