# Inventaire des Edge Functions

## 📊 Vue d'Ensemble

**Total**: 24 Edge Functions
- ✅ **Sans Service Role Key**: 9 fonctions
- ⚠️  **Mode Dégradé**: 6 fonctions (fonctionnent avec ou sans)
- ❌ **Nécessite Service Role Key**: 9 fonctions (legacy)

## ✅ Fonctions Sans Service Role Key (100% Fonctionnelles)

### 1. **send-email** ⭐
- **Dépendances**: `RESEND_API_KEY` uniquement
- **Description**: Envoie des emails transactionnels via Resend
- **Usage**: Tous les emails de l'application
- **Sécurité**: RLS via token utilisateur

### 2. **admin-update-role** ⭐ NOUVEAU
- **Dépendances**: Aucune (utilise RPC PostgreSQL)
- **Description**: Met à jour le rôle d'un utilisateur
- **Usage**: Gestion des utilisateurs par les admins
- **Remplace**: `update-user-role`

### 3. **admin-promote-master** ⭐ NOUVEAU
- **Dépendances**: Aucune (utilise RPC PostgreSQL)
- **Description**: Promeut un utilisateur au rôle master
- **Usage**: Promotion administrative
- **Remplace**: `create-admin-maxime`

### 4. **check-config** ⭐ NOUVEAU
- **Dépendances**: Aucune
- **Description**: Vérifie l'état de toutes les configurations
- **Usage**: Diagnostic et monitoring
- **URL**: `/functions/v1/check-config`

### 5. **test-email-config**
- **Dépendances**: `RESEND_API_KEY`
- **Description**: Teste la configuration email
- **Usage**: Validation de la configuration Resend

### 6. **process-email-queue**
- **Dépendances**: `RESEND_API_KEY`, base de données
- **Description**: Traite la file d'attente d'emails
- **Usage**: Envoi d'emails en arrière-plan

### 7. **warranty-expiration-checker**
- **Dépendances**: Base de données uniquement
- **Description**: Vérifie les garanties expirées
- **Usage**: Tâche cron quotidienne

### 8. **download-warranty-documents**
- **Dépendances**: Storage Supabase
- **Description**: Génère et télécharge les documents de garantie
- **Usage**: Export de documents par les utilisateurs

### 9. **send-sms**
- **Dépendances**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- **Description**: Envoie des SMS via Twilio
- **Usage**: Notifications SMS (optionnel)

## ⚠️ Fonctions Mode Dégradé (Fonctionnent Sans Service Role)

### 10. **invite-user**
- **Avec Service Role**: Crée utilisateur + envoie email
- **Sans Service Role**: Génère lien d'invitation à partager manuellement
- **Dépendances**: `RESEND_API_KEY` (pour emails)
- **Recommandation**: Mode manuel acceptable pour petites équipes

### 11. **send-password-reset**
- **Avec Service Role**: Réinitialisation admin directe du mot de passe
- **Sans Service Role**: Envoie email de réinitialisation standard
- **Dépendances**: `RESEND_API_KEY`
- **Recommandation**: Mode standard préférable pour sécurité

### 12. **resend-invitation**
- **Avec Service Role**: Renvoie invitation complète
- **Sans Service Role**: Génère nouveau lien à partager
- **Dépendances**: `RESEND_API_KEY`

### 13. **onboard-franchisee**
- **Avec Service Role**: Création complète automatique
- **Sans Service Role**: Processus manuel guidé
- **Dépendances**: Multiples

### 14. **setup-initial-users**
- **Avec Service Role**: Création automatique des utilisateurs initiaux
- **Sans Service Role**: Création via interface web
- **Usage**: Configuration initiale uniquement

### 15. **test-invitation-debug**
- **Avec Service Role**: Tests complets
- **Sans Service Role**: Tests limités
- **Usage**: Debug uniquement

## ❌ Fonctions Legacy (Nécessitent Service Role Key)

### 16. **create-admin-maxime**
- **Remplacé par**: `admin-promote-master` (RPC)
- **Status**: Obsolète
- **Recommandation**: Utiliser la nouvelle fonction

### 17. **update-user-role**
- **Remplacé par**: `admin-update-role` (RPC)
- **Status**: Obsolète
- **Recommandation**: Utiliser la nouvelle fonction

### 18. **delete-user**
- **Remplacé par**: `admin_soft_delete_user` (RPC)
- **Status**: Peut être conservé pour hard delete
- **Recommandation**: Utiliser soft delete par défaut

### 19. **fix-profile**
- **Remplacé par**: Triggers automatiques + RPC
- **Status**: Obsolète
- **Recommandation**: Les profils se créent automatiquement

### 20. **generate-monthly-invoices**
- **Nécessite**: Service Role Key pour accès complet
- **Status**: Peut être refactorisé en RPC
- **Priorité**: Basse (fonctionnalité administrative)

## 💳 Fonctions Paiement (Stripe)

### 21. **create-payment-intent**
- **Dépendances**: `STRIPE_SECRET_KEY`
- **Service Role**: Non requis
- **Status**: ✅ Fonctionne sans Service Role

### 22. **create-refund**
- **Dépendances**: `STRIPE_SECRET_KEY`
- **Service Role**: Non requis
- **Status**: ✅ Fonctionne sans Service Role

## 🔄 Fonctions Intégrations

### 23. **sync-quickbooks**
- **Dépendances**: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`
- **Service Role**: Optionnel
- **Status**: ✅ Peut fonctionner sans Service Role

### 24. **send-push-notification**
- **Dépendances**: VAPID keys
- **Service Role**: Non requis (utilise service role en interne mais pas exposé)
- **Status**: ⚠️ Peut être refactorisé

## 📈 Matrice de Dépendances

| Fonction | SUPABASE_URL | ANON_KEY | SERVICE_ROLE | RESEND | STRIPE | TWILIO | QB |
|----------|--------------|----------|--------------|--------|--------|--------|-----|
| send-email | ✅ | ✅ | ❌ | ✅ | - | - | - |
| admin-update-role | ✅ | ✅ | ❌ | - | - | - | - |
| admin-promote-master | ✅ | ✅ | ❌ | - | - | - | - |
| check-config | ✅ | ✅ | ❌ | - | - | - | - |
| invite-user | ✅ | ✅ | ⚠️ | ✅ | - | - | - |
| send-password-reset | ✅ | ✅ | ⚠️ | ✅ | - | - | - |
| delete-user | ✅ | ✅ | ✅ | - | - | - | - |
| create-payment-intent | ✅ | ✅ | ❌ | - | ✅ | - | - |
| send-sms | ✅ | ✅ | ❌ | - | - | ✅ | - |
| sync-quickbooks | ✅ | ✅ | ❌ | - | - | - | ✅ |

**Légende**:
- ✅ Requis
- ⚠️ Optionnel (mode dégradé disponible)
- ❌ Non requis
- - Non applicable

## 🎯 Recommandations de Déploiement

### Configuration Minimale (Production Ready)

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
SITE_URL=...
```

**Fonctionnalités disponibles**:
- ✅ Authentification complète
- ✅ Gestion des garanties
- ✅ Gestion des utilisateurs (via RPC)
- ✅ Emails transactionnels
- ✅ Invitations (mode manuel acceptable)
- ✅ Réinitialisation mots de passe
- ✅ Analytics et rapports

### Configuration Complète (Toutes Fonctionnalités)

```env
# Configuration minimale +
STRIPE_SECRET_KEY=...          # Pour paiements
TWILIO_ACCOUNT_SID=...         # Pour SMS
TWILIO_AUTH_TOKEN=...
QUICKBOOKS_CLIENT_ID=...       # Pour comptabilité
QUICKBOOKS_CLIENT_SECRET=...
```

### Configuration Legacy (Si Nécessaire)

```env
# Configuration complète +
SUPABASE_SERVICE_ROLE_KEY=...  # Pour fonctions legacy
```

**Note**: La Service Role Key n'est recommandée que pour:
1. Maintenir la compatibilité avec ancien code
2. Debug avancé en développement
3. Tests automatisés nécessitant contournement RLS

## 🔄 Plan de Migration

### Phase 1: Déploiement Initial ✅
- [x] Créer les fonctions RPC PostgreSQL
- [x] Déployer les nouvelles edge functions (admin-*, check-config)
- [x] Documenter les changements

### Phase 2: Migration Graduelle
- [ ] Mettre à jour le frontend pour utiliser les nouvelles fonctions
- [ ] Ajouter des alertes pour les appels aux fonctions legacy
- [ ] Tester en environnement de staging

### Phase 3: Nettoyage
- [ ] Supprimer les fonctions legacy obsolètes
- [ ] Mettre à jour toute la documentation
- [ ] Former les utilisateurs administrateurs

## 📞 Support

Pour toute question sur les edge functions:

1. **Vérifier la configuration**:
   ```bash
   curl https://votre-projet.supabase.co/functions/v1/check-config
   ```

2. **Consulter les logs**:
   ```
   Supabase Dashboard → Edge Functions → [nom-fonction] → Logs
   ```

3. **Tester une fonction**:
   ```bash
   curl https://votre-projet.supabase.co/functions/v1/[nom-fonction] \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

## 🎉 Résumé

✅ **9 fonctions** fonctionnent 100% sans Service Role Key
⚠️  **6 fonctions** offrent un mode dégradé gracieux
❌ **9 fonctions** legacy peuvent être remplacées par des RPC

**Recommandation**: Déployer avec la configuration minimale (sans Service Role Key) pour une sécurité maximale et des performances optimales.
