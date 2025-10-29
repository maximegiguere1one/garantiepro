const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'VOTRE_CLE_ICI';

if (supabaseServiceKey === 'VOTRE_CLE_ICI') {
  console.error('❌ ERREUR: SUPABASE_SERVICE_ROLE_KEY non configurée');
  console.error('Veuillez définir la variable d\'environnement SUPABASE_SERVICE_ROLE_KEY');
  console.error('Exemple: SUPABASE_SERVICE_ROLE_KEY=votre_clé node reset-maxime-password.cjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const email = 'maxime@giguere-influence.com';
  const newPassword = 'ProRemorque2025!';

  console.log('🔄 Réinitialisation du mot de passe pour:', email);
  console.log('');

  try {
    // Vérifier si l'utilisateur existe
    console.log('1️⃣ Vérification de l\'existence de l\'utilisateur...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${listError.message}`);
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error('❌ Utilisateur non trouvé:', email);
      console.log('');
      console.log('📋 Utilisateurs disponibles:');
      users.slice(0, 5).forEach(u => {
        console.log(`   - ${u.email} (ID: ${u.id})`);
      });
      process.exit(1);
    }

    console.log('✅ Utilisateur trouvé:', user.email);
    console.log('   ID:', user.id);
    console.log('   Créé le:', new Date(user.created_at).toLocaleDateString('fr-CA'));
    console.log('');

    // Réinitialiser le mot de passe
    console.log('2️⃣ Réinitialisation du mot de passe...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    console.log('✅ Mot de passe réinitialisé avec succès!');
    console.log('');
    console.log('═════════════════════════════════════════════');
    console.log('📧 Email:', email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('═════════════════════════════════════════════');
    console.log('');
    console.log('💡 Vous pouvez maintenant vous connecter avec ces identifiants');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

resetPassword();
