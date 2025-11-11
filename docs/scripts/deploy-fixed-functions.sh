#!/bin/bash

# Script pour déployer les Edge Functions corrigées
# Ce script déploie les 4 fonctions qui ont été modifiées pour corriger le problème des liens localhost

echo "🚀 Déploiement des Edge Functions corrigées..."
echo ""

# Vérifier si Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI trouvé"
echo ""

# Déployer invite-user
echo "📤 Déploiement de invite-user..."
supabase functions deploy invite-user
if [ $? -eq 0 ]; then
    echo "✅ invite-user déployé avec succès"
else
    echo "❌ Erreur lors du déploiement de invite-user"
fi
echo ""

# Déployer resend-invitation
echo "📤 Déploiement de resend-invitation..."
supabase functions deploy resend-invitation
if [ $? -eq 0 ]; then
    echo "✅ resend-invitation déployé avec succès"
else
    echo "❌ Erreur lors du déploiement de resend-invitation"
fi
echo ""

# Déployer send-password-reset
echo "📤 Déploiement de send-password-reset..."
supabase functions deploy send-password-reset
if [ $? -eq 0 ]; then
    echo "✅ send-password-reset déployé avec succès"
else
    echo "❌ Erreur lors du déploiement de send-password-reset"
fi
echo ""

# Déployer onboard-franchisee
echo "📤 Déploiement de onboard-franchisee..."
supabase functions deploy onboard-franchisee
if [ $? -eq 0 ]; then
    echo "✅ onboard-franchisee déployé avec succès"
else
    echo "❌ Erreur lors du déploiement de onboard-franchisee"
fi
echo ""

echo "🎉 Déploiement terminé!"
echo ""
echo "📋 Résumé des corrections:"
echo "  • Ajout de SITE_URL avec fallback vers production"
echo "  • Remplacement forcé du paramètre redirect_to dans les liens"
echo "  • Tous les liens pointent maintenant vers: https://www.garantieproremorque.com"
echo ""
echo "🧪 Test: Invitez un nouvel utilisateur et vérifiez l'email"
