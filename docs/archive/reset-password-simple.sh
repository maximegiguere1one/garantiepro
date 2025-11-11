#!/bin/bash

echo "=== Réinitialisation du mot de passe ==="
echo ""
echo "Pour utiliser ce script, vous avez besoin de votre clé service_role"
echo "Trouvez-la sur: https://app.supabase.com → Settings → API"
echo ""
read -p "Entrez votre SUPABASE_SERVICE_ROLE_KEY: " SERVICE_KEY
echo ""
read -p "Email de l'utilisateur (défaut: maxime@giguere-influence.com): " USER_EMAIL
USER_EMAIL=${USER_EMAIL:-maxime@giguere-influence.com}
echo ""
read -p "Nouveau mot de passe (défaut: ProRemorque2025!): " NEW_PASSWORD
NEW_PASSWORD=${NEW_PASSWORD:-ProRemorque2025!}
echo ""

SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" node << 'EOFNODE'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.USER_EMAIL || 'maxime@giguere-influence.com';
const newPassword = process.env.NEW_PASSWORD || 'ProRemorque2025!';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

(async () => {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error('❌ Utilisateur non trouvé:', email);
    process.exit(1);
  }
  
  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );
  
  if (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Mot de passe réinitialisé!');
  console.log('📧 Email:', email);
  console.log('🔑 Nouveau mot de passe:', newPassword);
})();
EOFNODE
