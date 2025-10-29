const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGxkcmtrcXZwdXRkZ2ZwYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzE4NDUsImV4cCI6MjA3NTEwNzg0NX0.cfWvm-NeUcVONV1VWd6U65lwg-2JdEBMWhSFWUJZdxg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updatePasswordViaSQL() {
  try {
    // First, let's try to login to get a session
    console.log('Tentative de connexion pour obtenir une session...');
    
    // We'll use SQL to update the password hash directly
    // This requires knowing the user's auth.users id
    const userId = 'e29bc700-3a29-4751-851d-9c099216bb87';
    
    console.log('Pour changer le mot de passe, vous devez:');
    console.log('1. Aller dans le dashboard Supabase');
    console.log('2. Aller dans Authentication > Users');
    console.log('3. Trouver maxime@giguere-influence.com');
    console.log('4. Cliquer sur les 3 points > Reset Password');
    console.log('');
    console.log('OU utiliser la fonction send-password-reset depuis l\'application');
    console.log('');
    console.log('Votre rôle est déjà: admin');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

updatePasswordViaSQL();
