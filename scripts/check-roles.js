const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGxkcmtrcXZwdXRkZ2ZwYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzE4NDUsImV4cCI6MjA3NTEwNzg0NX0.cfWvm-NeUcVONV1VWd6U65lwg-2JdEBMWhSFWUJZdxg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role')
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users and roles:');
    data.forEach(u => console.log(`  ${u.email}: ${u.role}`));
  }
}

main();
