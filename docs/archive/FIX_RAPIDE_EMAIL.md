# Fix Rapide - Erreur Email

## Le Problème

**Erreur:** "Edge Function returned a non-2xx status code" dans Paramètres > Notifications

## La Cause

La clé API Resend n'est pas configurée dans Supabase.

## La Solution (10 minutes)

### 1. Créer un compte Resend

- Allez sur https://resend.com/signup
- Créez votre compte (gratuit: 3,000 emails/mois)

### 2. Obtenir la clé API

- Allez dans https://resend.com/api-keys
- Cliquez "Create API Key"
- Copiez la clé (format: `re_xxxxxxxxxxxxx`)

### 3. Configurer Supabase

- Allez dans https://supabase.com/dashboard
- Sélectionnez votre projet
- **Settings > Edge Functions > Secrets**
- Ajoutez ces 3 secrets:

```
RESEND_API_KEY = re_xxxxxxxxxxxxx (votre clé)
FROM_EMAIL = onboarding@resend.dev (ou votre domaine vérifié)
FROM_NAME = Pro-Remorque
```

### 4. Tester

- Allez dans Paramètres > Notifications
- Cliquez sur "Tester"
- ✅ Devrait fonctionner!

## Pour la Production

Vous DEVEZ vérifier votre propre domaine:

1. Allez dans https://resend.com/domains
2. Ajoutez votre domaine (ex: pro-remorque.com)
3. Configurez les DNS (SPF, DKIM)
4. Changez `FROM_EMAIL` dans Supabase vers `noreply@votre-domaine.com`

## Guide Détaillé

Voir `RESEND_SETUP_GUIDE.md` pour les instructions complètes.

## Analyse Complète

Voir `ANALYSE_ERREUR_EMAIL.md` pour l'analyse technique détaillée.
