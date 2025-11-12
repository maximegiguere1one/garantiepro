#!/bin/bash

# Script de déploiement de l'Edge Function SMS
# Novembre 12, 2025

echo "🚀 Déploiement de l'Edge Function send-sms"
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo ""
    echo "Installation:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "✓ Supabase CLI trouvé"
echo ""

# Vérifier que le fichier existe
if [ ! -f "supabase/functions/send-sms/index.ts" ]; then
    echo "❌ Fichier send-sms/index.ts non trouvé"
    echo "Assurez-vous d'être dans le répertoire du projet"
    exit 1
fi

echo "✓ Fichier send-sms/index.ts trouvé"
echo ""

# Demander confirmation
echo "📋 Cette commande va:"
echo "  1. Déployer l'Edge Function send-sms"
echo "  2. Utiliser le projet: fkxldrkkqvputdgfpayi"
echo ""
read -p "Continuer? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé"
    exit 0
fi

echo ""
echo "🔧 Déploiement en cours..."
echo ""

# Déployer la fonction
supabase functions deploy send-sms --project-ref fkxldrkkqvputdgfpayi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function déployée avec succès!"
    echo ""
    echo "📝 Prochaines étapes:"
    echo ""
    echo "1. Configurez les secrets Twilio dans Supabase Dashboard:"
    echo "   → Project Settings → Edge Functions → Secrets"
    echo ""
    echo "   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX"
    echo ""
    echo "2. Testez via l'interface:"
    echo "   → Paramètres → Test SMS → Envoyer Test Rapide"
    echo ""
    echo "3. Vérifiez les logs dans la console (F12)"
    echo ""
    echo "🎉 Le système SMS est prêt!"
else
    echo ""
    echo "❌ Erreur lors du déploiement"
    echo ""
    echo "Vérifiez que vous êtes connecté:"
    echo "  supabase login"
    echo ""
    echo "Et que le projet est lié:"
    echo "  supabase link --project-ref fkxldrkkqvputdgfpayi"
    echo ""
    exit 1
fi
