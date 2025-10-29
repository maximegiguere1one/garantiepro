# Guide de Déploiement Sans Service Role Key

## 📋 Vue d'ensemble

Ce guide explique comment déployer et utiliser l'application **garantieproremorque** sans avoir besoin de la clé `SUPABASE_SERVICE_ROLE_KEY`. Notre architecture améliorée utilise des fonctions RPC PostgreSQL sécurisées pour remplacer les opérations administratives qui nécessitaient auparavant la Service Role Key.

## ✅ Configurations Requises

### Variables d'Environnement OBLIGATOIRES

```env
# Supabase (OBLIGATOIRE)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_publique

# Resend pour les emails (OBLIGATOIRE pour les emails)
RESEND_API_KEY=re_votre_cle_resend

# URL du site (RECOMMANDÉ pour les redirections)
SITE_URL=https://votre-domaine.com
```

### Variables d'Environnement OPTIONNELLES

```env
# Service Role Key (OPTIONNEL - pour compatibilité legacy uniquement)
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Stripe (OPTIONNEL - pour paiements)
STRIPE_SECRET_KEY=sk_test_votre_cle

# Twilio (OPTIONNEL - pour SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# QuickBooks (OPTIONNEL - pour comptabilité)
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
```

## 🚀 Étapes de Déploiement

### 1. Vérifier la Configuration

Avant de déployer, vérifiez que vos configurations sont correctes:

```bash
# Option A: Via l'application (une fois déployée)
curl https://votre-projet.supabase.co/functions/v1/check-config

# Option B: Manuellement
echo "VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "RESEND_API_KEY: ${RESEND_API_KEY:0:10}..."
```

### 2. Configurer Resend (Email)

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez votre domaine email (`locationproremorque.ca`)
3. Générez une clé API dans Resend Dashboard
4. Ajoutez la clé dans Supabase:
   ```
   Supabase Dashboard → Project Settings → Edge Functions → Secrets
   → Add Secret: RESEND_API_KEY = re_...
   ```

### 3. Appliquer les Migrations

```bash
# Assurez-vous que toutes les migrations sont appliquées
# Particulièrement importante:
supabase/migrations/20251028090000_create_admin_rpc_functions_without_service_role.sql
```

Cette migration crée les fonctions RPC PostgreSQL nécessaires:
- `admin_update_user_role()` - Mise à jour des rôles
- `admin_promote_user_to_master()` - Promotion au rôle master
- `admin_soft_delete_user()` - Suppression logique des utilisateurs
- `get_user_permissions()` - Vérification des permissions
- `can_manage_role()` - Validation des permissions de rôle

### 4. Configurer l'URL du Site

Dans Supabase Auth Settings:
```
Supabase Dashboard → Authentication → URL Configuration
→ Site URL: https://votre-domaine.com
→ Redirect URLs: https://votre-domaine.com/*
```

### 5. Déployer les Edge Functions

Les nouvelles fonctions qui NE NÉCESSITENT PAS Service Role Key:

```bash
# Fonctions administratives modernes (RPC-based)
- admin-update-role
- admin-promote-master
- check-config

# Fonctions email (nécessitent uniquement RESEND_API_KEY)
- send-email
- invite-user (mode dégradé gracieux)
- send-password-reset
- resend-invitation
```

## 🔄 Migration depuis l'Ancienne Architecture

### Fonctions Remplacées

| Ancienne Fonction | Nouvelle Fonction | Nécessite Service Role? |
|-------------------|-------------------|-------------------------|
| `update-user-role` | `admin-update-role` | ❌ Non |
| `create-admin-maxime` | `admin-promote-master` | ❌ Non |
| `delete-user` | `admin-soft-delete-user` (RPC) | ❌ Non |
| `fix-profile` | Fonction RPC intégrée | ❌ Non |

### Fonctions Qui Fonctionnent en Mode Dégradé

**invite-user**:
- ✅ AVEC Service Role Key: Crée l'utilisateur + envoie email
- ✅ SANS Service Role Key: Retourne lien d'invitation à partager manuellement

**send-password-reset**:
- ✅ AVEC Service Role Key: Réinitialisation admin directe
- ✅ SANS Service Role Key: Envoie email de réinitialisation standard

## 📊 Vérification de l'État du Système

### Via Edge Function

```bash
curl https://votre-projet.supabase.co/functions/v1/check-config \
  -H "Authorization: Bearer VOTRE_ANON_KEY"
```

Réponse attendue:
```json
{
  "timestamp": "2025-10-28T...",
  "overall_status": "healthy",
  "configs": [
    {
      "name": "SUPABASE_URL",
      "available": true,
      "required": true,
      "message": "Configuré: https://..."
    },
    {
      "name": "RESEND_API_KEY",
      "available": true,
      "required": true,
      "message": "Configuré (re_...)..."
    },
    {
      "name": "SUPABASE_SERVICE_ROLE_KEY",
      "available": false,
      "required": false,
      "message": "Non configuré - Mode dégradé gracieux activé"
    }
  ],
  "available_features": [
    "Base de données",
    "Authentification de base",
    "Emails transactionnels",
    "Fonctions admin via RPC"
  ],
  "unavailable_features": [
    "Fonctions admin legacy"
  ],
  "recommendations": [
    "✅ EXCELLENT: Toutes les configurations obligatoires sont en place!",
    "INFO: Utiliser les nouvelles fonctions admin-* qui n'ont pas besoin de Service Role Key"
  ]
}
```

### Via Application Frontend

Une fois l'application déployée, accédez à:
```
https://votre-domaine.com/system-diagnostics
```

Cette page affiche:
- État de toutes les configurations
- Fonctionnalités disponibles/indisponibles
- Recommandations de configuration
- Tests de connectivité

## 🔒 Sécurité Sans Service Role Key

### Comment ça Marche?

1. **Authentification Standard**: Toutes les requêtes utilisent le token JWT de l'utilisateur connecté

2. **Validation Côté Base de Données**: Les fonctions RPC PostgreSQL vérifient les permissions:
   ```sql
   -- Exemple: Seuls les admins peuvent changer les rôles
   IF v_requesting_role NOT IN ('master', 'super_admin', 'admin') THEN
     RAISE EXCEPTION 'Permission refusée';
   END IF;
   ```

3. **Row Level Security (RLS)**: Toutes les tables utilisent RLS pour protéger les données

4. **Audit Logging**: Toutes les opérations sensibles sont loggées dans `audit_logs`

### Avantages de cette Approche

✅ **Plus Sécurisé**: Pas de clé Service Role exposée dans les edge functions
✅ **Meilleure Traçabilité**: Toutes les opérations sont liées à un utilisateur authentifié
✅ **Performance**: Les RPC PostgreSQL sont plus rapides que les appels API multiples
✅ **Maintenance**: Logique métier centralisée dans la base de données

## 🎯 Fonctionnalités par Configuration

### Configuration Minimale (SUPABASE_URL + ANON_KEY + RESEND_API_KEY)

✅ Authentification utilisateurs
✅ Gestion des garanties
✅ Gestion des réclamations
✅ Invitations par email
✅ Réinitialisation mot de passe
✅ Notifications par email
✅ Gestion des rôles via RPC
✅ Analytics de base
✅ Téléchargement de documents

❌ Paiements en ligne (nécessite STRIPE_SECRET_KEY)
❌ SMS (nécessite TWILIO)
❌ Synchronisation QuickBooks

### Avec Service Role Key (Optionnel)

✅ Toutes les fonctionnalités ci-dessus
✅ Fonctions admin legacy (compatibilité)
✅ Debug avancé
✅ Contournement RLS pour diagnostic

## 🐛 Dépannage

### Problème: Les emails ne sont pas envoyés

**Vérification**:
```bash
# 1. Vérifier que RESEND_API_KEY est configuré
curl https://votre-projet.supabase.co/functions/v1/send-email \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"checkConfigOnly": true}'

# 2. Vérifier le domaine dans Resend
# Allez sur resend.com → Domains → Vérifier le statut
```

**Solutions**:
1. Vérifier que le domaine est vérifié dans Resend
2. Vérifier que RESEND_API_KEY est bien configuré dans Supabase Secrets
3. Vérifier les logs: `Supabase Dashboard → Edge Functions → send-email → Logs`

### Problème: Impossible de modifier les rôles des utilisateurs

**Vérification**:
```sql
-- Dans Supabase SQL Editor
SELECT * FROM get_user_permissions();
```

**Solutions**:
1. Vérifier que la migration RPC a été appliquée
2. Vérifier votre rôle actuel dans la table `profiles`
3. Utiliser la nouvelle fonction `admin-update-role` au lieu de `update-user-role`

### Problème: Utilisateurs ne peuvent pas se connecter

**Vérification**:
```bash
# Vérifier l'état de Supabase Auth
curl https://votre-projet.supabase.co/auth/v1/health
```

**Solutions**:
1. Vérifier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
2. Vérifier que l'email de l'utilisateur est confirmé
3. Vérifier les politiques RLS sur la table `profiles`

## 📚 Documentation des Fonctions RPC

### admin_update_user_role

Met à jour le rôle d'un utilisateur.

```typescript
// Utilisation depuis le client
const { data, error } = await supabase.rpc('admin_update_user_role', {
  p_target_user_id: 'uuid-de-l-utilisateur',
  p_new_role: 'admin',
  p_new_full_name: 'Nouveau Nom' // optionnel
});
```

**Permissions requises**: admin, super_admin, master

### admin_promote_user_to_master

Promeut un utilisateur au rôle master.

```typescript
const { data, error } = await supabase.rpc('admin_promote_user_to_master', {
  p_target_email: 'user@example.com'
});
```

**Permissions requises**: master, super_admin

### get_user_permissions

Récupère les permissions de l'utilisateur actuel.

```typescript
const { data, error } = await supabase.rpc('get_user_permissions');

// Retourne:
// {
//   user_id: 'uuid',
//   role: 'admin',
//   can_manage_users: true,
//   can_delete_users: true,
//   ...
// }
```

## 🎉 Félicitations!

Votre application est maintenant configurée pour fonctionner sans Service Role Key! Les fonctions administratives utilisent des RPC PostgreSQL sécurisées, et toutes les fonctionnalités essentielles sont opérationnelles.

## 📞 Support

- Documentation complète: `/docs`
- Tests système: `https://votre-domaine.com/system-diagnostics`
- Logs edge functions: `Supabase Dashboard → Edge Functions → Logs`
- Vérification config: `curl https://votre-projet.supabase.co/functions/v1/check-config`
