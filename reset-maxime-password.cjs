const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGxkcmtrcXZwdXRkZ2ZwYXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUzMTg0NSwiZXhwIjoyMDc1MTA3ODQ1fQ.rb_ASs-pfk-2Z80u2ZrqhnC9xuJaSbPBYfaHj3CeL8o';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  try {
    console.log('🔍 Recherche de l\'utilisateur maxime@giguere-influence.com...');

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Erreur lors de la liste des utilisateurs:', listError);
      process.exit(1);
    }

    console.log(`📊 Total d'utilisateurs trouvés: ${users.length}`);

    const user = users.find(u => u.email === 'maxime@giguere-influence.com');

    if (!user) {
      console.error('❌ Utilisateur non trouvé: maxime@giguere-influence.com');
      console.log('\n📋 Utilisateurs disponibles:');
      users.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
      process.exit(1);
    }

    console.log('✅ Utilisateur trouvé!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Créé le: ${new Date(user.created_at).toLocaleString('fr-CA')}`);

    console.log('\n🔐 Réinitialisation du mot de passe...');

    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: 'ProRemorque2025!' }
    );

    if (updateError) {
      console.error('❌ Erreur lors de la réinitialisation:', updateError);
      process.exit(1);
    }

    console.log('\n✅ ✅ ✅ MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS! ✅ ✅ ✅');
    console.log('\n📧 Email: maxime@giguere-influence.com');
    console.log('🔑 Nouveau mot de passe: ProRemorque2025!');
    console.log('\n🎉 Vous pouvez maintenant vous connecter avec ces identifiants!');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

resetPassword();
