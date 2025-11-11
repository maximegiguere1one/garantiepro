# Guide de Test - Gestion des Utilisateurs Multi-Organisation

## Vue d'ensemble
Ce document décrit comment tester le workflow complet de création et gestion d'utilisateurs dans le système multi-tenant.

## Architecture Implémentée

### 1. Edge Function: `invite-user`
- **URL**: `{SUPABASE_URL}/functions/v1/invite-user`
- **Authentification**: Requiert JWT Bearer token
- **Rôle requis**: admin seulement

### 2. Database Trigger: `handle_new_user()`
- Se déclenche automatiquement lors de la création d'un utilisateur dans `auth.users`
- Crée automatiquement le profil dans la table `profiles`
- Assigne l'`organization_id` depuis les `user_metadata`
- Définit le rôle par défaut

### 3. RLS Policies
- Les admins ne voient que les utilisateurs de leur organisation
- Phil (owner) peut voir tous les utilisateurs de toutes les organisations
- Les utilisateurs peuvent toujours voir leur propre profil

## Scénarios de Test

### Scénario 1: Invitation d'un utilisateur dans l'organisation principale

**Pré-requis**:
- Être connecté en tant que Phil (admin de l'organisation owner)

**Étapes**:
1. Aller dans Paramètres > Utilisateurs
2. Remplir le formulaire:
   - Nom complet: "Marie Tremblay"
   - Email: "marie.tremblay@example.com"
   - Rôle: "F&I"
3. Cliquer sur "Envoyer l'invitation"

**Résultat attendu**:
- Message de succès affiché
- L'utilisateur apparaît dans la liste
- L'utilisateur reçoit un email pour définir son mot de passe
- L'utilisateur est assigné à l'organisation principale (type: owner)

**Vérification en DB**:
```sql
SELECT
  p.email,
  p.role,
  p.full_name,
  o.name as organization_name,
  o.type as organization_type
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
WHERE p.email = 'marie.tremblay@example.com';
```

### Scénario 2: Invitation d'un utilisateur dans une franchisé

**Pré-requis**:
- Être connecté en tant qu'admin d'un franchisé
- OU être connecté en tant que Phil et sélectionner un franchisé

**Étapes**:
1. Se connecter avec un compte admin de franchisé
2. Aller dans Paramètres > Utilisateurs
3. Remplir le formulaire:
   - Nom complet: "Jean Dupont"
   - Email: "jean.dupont@franchisee.com"
   - Rôle: "Operations"
4. Cliquer sur "Envoyer l'invitation"

**Résultat attendu**:
- Message de succès affiché
- L'utilisateur apparaît dans la liste des utilisateurs du franchisé
- L'utilisateur est assigné au franchisé spécifique
- Phil peut voir cet utilisateur depuis l'organisation principale
- Les autres franchisés ne peuvent PAS voir cet utilisateur

**Vérification isolation**:
```sql
-- En tant qu'admin du franchisé A, ne devrait voir que ses users
SELECT COUNT(*) FROM profiles
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
);
```

### Scénario 3: Connexion du nouvel utilisateur

**Étapes**:
1. Le nouvel utilisateur reçoit un email avec lien magique
2. Il clique sur le lien
3. Il est redirigé vers une page pour définir son mot de passe
4. Il définit son mot de passe
5. Il se connecte avec email + nouveau mot de passe

**Résultat attendu**:
- L'utilisateur peut se connecter
- Son profil est correctement créé avec:
  - Le bon `organization_id`
  - Le bon `role`
  - Le bon `full_name`
- Il ne voit que les données de son organisation
- Il a accès aux fonctionnalités selon son rôle

### Scénario 4: Isolation des données

**Test**: Vérifier qu'un admin de franchisé A ne peut pas voir les utilisateurs du franchisé B

**Étapes**:
1. Créer 2 utilisateurs dans franchisé A
2. Créer 2 utilisateurs dans franchisé B
3. Se connecter en tant qu'admin du franchisé A
4. Aller dans Paramètres > Utilisateurs

**Résultat attendu**:
- L'admin A voit SEULEMENT les 2 utilisateurs de son franchisé
- L'admin A ne voit PAS les utilisateurs du franchisé B
- Phil (owner) voit TOUS les utilisateurs de tous les franchisés

## Cas d'erreur à tester

### 1. Email déjà utilisé
**Test**: Inviter un utilisateur avec un email qui existe déjà
**Résultat attendu**: Message d'erreur "A user with this email already exists"

### 2. Non-admin essaie d'inviter
**Test**: Un utilisateur avec rôle "operations" essaie d'inviter quelqu'un
**Résultat attendu**: Message d'erreur "Only administrators can invite users"

### 3. Session expirée
**Test**: Inviter un utilisateur avec une session expirée
**Résultat attendu**: Message d'erreur "No active session"

## Points de vérification techniques

### 1. Vérifier le trigger
```sql
-- Le trigger doit exister
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

### 2. Vérifier les RLS policies
```sql
-- Doit avoir les policies pour isolation
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles';
```

### 3. Vérifier la Edge Function
```bash
# Test avec curl
curl -X POST \
  https://{PROJECT_REF}.supabase.co/functions/v1/invite-user \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "role": "f_and_i",
    "full_name": "Test User"
  }'
```

## Workflow complet testé

✅ **Création d'utilisateur**:
1. Admin remplit le formulaire d'invitation
2. Frontend appelle l'Edge Function `invite-user`
3. Edge Function vérifie les permissions (admin only)
4. Edge Function crée l'utilisateur dans `auth.users` avec metadata
5. Trigger `handle_new_user()` crée automatiquement le profil
6. Profil est créé avec le bon `organization_id` et `role`
7. Email magique envoyé à l'utilisateur

✅ **Premier login**:
1. Utilisateur clique sur le lien dans l'email
2. Définit son mot de passe
3. Se connecte
4. Profil existe déjà avec les bonnes données

✅ **Isolation des données**:
1. RLS policies filtrent automatiquement les requêtes
2. Chaque admin ne voit que ses utilisateurs
3. Phil (owner) voit tout le monde
4. Pas de fuite de données entre organisations

## Notes importantes

- ⚠️ Le système utilise les **RLS policies** pour l'isolation, pas de filtres dans le code
- ⚠️ L'`organization_id` est assigné via les **user_metadata** lors de la création
- ⚠️ Seuls les **admins** peuvent inviter des utilisateurs
- ⚠️ Phil (organization type='owner') a une visibilité **globale**
- ⚠️ Les utilisateurs reçoivent un **magic link** pour définir leur mot de passe

## Commandes de debug

```sql
-- Voir tous les utilisateurs et leurs organisations
SELECT
  p.email,
  p.role,
  p.full_name,
  o.name as org_name,
  o.type as org_type
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY o.type, o.name;

-- Voir les users sans organization (problème!)
SELECT * FROM profiles WHERE organization_id IS NULL;

-- Voir les organizations
SELECT id, name, type, status FROM organizations;
```
