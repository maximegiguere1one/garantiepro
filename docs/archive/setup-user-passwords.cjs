const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  {
    id: 'e29bc700-3a29-4751-851d-9c099216bb87',
    email: 'maxime@giguere-influence.com',
    password: 'ProRemorque2025!'
  },
  {
    id: '58091680-8b9f-435f-a8db-963e23f4b2c4',
    email: 'maxime@agence1.com',
    password: 'ProRemorque2025!'
  },
  {
    id: '03baf5cb-a226-4800-8342-b59846af832c',
    email: 'gigueremaxime321@gmail.com',
    password: 'ProRemorque2025!'
  },
  {
    id: '5b38b16f-b96c-4e55-8814-4cd7e21d25e1',
    email: 'philippe@proremorque.com',
    password: 'ProRemorque2025!'
  }
];

async function setupPasswords() {
  console.log('🔧 Configuration des mots de passe pour les utilisateurs...\n');

  for (const user of users) {
    try {
      console.log(`📧 Configuration du mot de passe pour: ${user.email}`);

      const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: user.password }
      );

      if (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
      } else {
        console.log(`   ✅ Mot de passe configuré avec succès`);
      }
    } catch (error) {
      console.error(`   ❌ Exception: ${error.message}`);
    }
    console.log('');
  }

  console.log('\n✅ Configuration terminée!');
  console.log('\n📋 Informations de connexion:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  users.forEach((user, index) => {
    console.log(`\n${index + 1}. Email: ${user.email}`);
    console.log(`   Mot de passe: ${user.password}`);
  });
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT: Changez ces mots de passe après la première connexion!');
}

setupPasswords().catch(console.error);
