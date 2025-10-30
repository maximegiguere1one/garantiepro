const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGxkcmtrcXZwdXRkZ2ZwYXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUzMTg0NSwiZXhwIjoyMDc1MTA3ODQ1fQ.rb_ASs-pfk-2Z80u2ZrqhnC9xuJaSbPBYfaHj3CeL8o';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkEverything() {
  try {
    console.log('=== DIAGNOSTIC COMPLET ===\n');

    // 1. Vérifier l'utilisateur
    console.log('1️⃣ Vérification utilisateur maxime@giguere-influence.com...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur liste utilisateurs:', listError);
      return;
    }

    const user = users.find(u => u.email === 'maxime@giguere-influence.com');
    if (!user) {
      console.error('❌ Utilisateur non trouvé!');
      return;
    }

    console.log('✅ Utilisateur trouvé:', user.email);
    console.log('   ID:', user.id);

    // 2. Vérifier le profil
    console.log('\n2️⃣ Vérification profil...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Erreur profil:', profileError.message);
    } else {
      console.log('✅ Profil trouvé:');
      console.log('   Nom:', profile.full_name);
      console.log('   Role:', profile.role);
      console.log('   Organization ID:', profile.organization_id);
    }

    // 3. Vérifier company_settings
    console.log('\n3️⃣ Vérification company_settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (settingsError) {
      console.error('❌ Erreur company_settings:', settingsError.message);
      console.log('\n🔧 Création de company_settings...');
      
      const { error: insertError } = await supabase
        .from('company_settings')
        .insert({
          organization_id: profile.organization_id,
          company_name: 'Location Pro-Remorque',
          company_address: '123 Rue Example',
          company_phone: '514-123-4567',
          company_email: 'info@proremorque.com'
        });

      if (insertError) {
        console.error('❌ Erreur création:', insertError.message);
      } else {
        console.log('✅ company_settings créé!');
      }
    } else {
      console.log('✅ company_settings trouvés:', settings.length, 'enregistrement(s)');
      if (settings.length > 0) {
        console.log('   Nom:', settings[0].company_name);
      }
    }

    // 4. Tester l'authentification
    console.log('\n4️⃣ Test authentification...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'maxime@giguere-influence.com',
      password: 'ProRemorque2025!'
    });

    if (authError) {
      console.error('❌ Erreur auth:', authError.message);
    } else {
      console.log('✅ Authentification réussie!');
      console.log('   Session:', authData.session ? 'Active' : 'Inactive');
    }

    console.log('\n=== FIN DIAGNOSTIC ===');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

checkEverything();
