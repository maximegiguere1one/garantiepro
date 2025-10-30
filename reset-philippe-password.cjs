const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('ERREUR: La clé SUPABASE_SERVICE_ROLE_KEY est requise');
  console.log('\nPour obtenir cette clé:');
  console.log('1. Allez sur https://app.supabase.com');
  console.log('2. Sélectionnez votre projet');
  console.log('3. Settings → API → service_role key');
  console.log('4. Exécutez: SUPABASE_SERVICE_ROLE_KEY=votre_cle node reset-philippe-password.cjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  try {
    const email = 'philippe@proremorque.com';
    const newPassword = 'ProRemorque2025!';
    
    console.log(`Réinitialisation du mot de passe pour ${email}...`);
    
    // Trouver l'utilisateur
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`Utilisateur ${email} non trouvé`);
    }
    
    // Réinitialiser le mot de passe
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (error) {
      throw error;
    }
    
    console.log('\n✅ Mot de passe réinitialisé avec succès!');
    console.log('\nVous pouvez maintenant vous connecter avec:');
    console.log(`Email: ${email}`);
    console.log(`Mot de passe: ${newPassword}`);
    console.log('\nPensez à changer ce mot de passe après connexion!');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

resetPassword();
