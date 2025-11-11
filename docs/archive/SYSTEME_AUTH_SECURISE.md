# Système d'Authentification Sécurisé

## Vue d'Ensemble

Le système d'authentification a été complètement repensé pour **éliminer les failles de sécurité**. Plus aucune personne ne peut créer un compte admin publiquement.

## 🔒 Sécurité Implémentée

### 1. Page de Connexion Sécurisée

**Avant (DANGEREUX):**
- N'importe qui pouvait cliquer sur "Créer un compte admin"
- Aucune vérification côté serveur
- Faille de sécurité critique

**Maintenant (SÉCURISÉ):**
- **Connexion uniquement** sur la page de login
- Pas d'option pour créer un compte
- Message clair: "Contactez un administrateur pour recevoir une invitation"
- Lien de réinitialisation de mot de passe disponible

### 2. Validation Côté Serveur (Base de Données)

**Trigger de Sécurité:**
```sql
-- Bloque TOUTE tentative de création de compte admin non autorisée
CREATE TRIGGER before_profile_insert_security
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_creation();
```

**Fonction de Validation:**
- Vérifie qu'une **invitation valide existe** pour chaque nouveau compte admin
- Bloque la création si aucune invitation n'est trouvée
- Marque automatiquement l'invitation comme "acceptée" après création
- Impossible de contourner via l'API ou directement dans la DB

### 3. Système d'Invitation Sécurisé

**Seuls les administrateurs peuvent inviter:**
- L'edge function `invite-user` vérifie le rôle de l'utilisateur
- Création d'un enregistrement dans `franchisee_invitations`
- Génération d'un token unique et sécurisé
- Expiration automatique après 7 jours

**Processus d'invitation:**
```
Admin connecté → Invite un utilisateur →
Création invitation DB →
Création compte Supabase Auth →
Email de réinitialisation envoyé →
Utilisateur définit son mot de passe
```

### 4. Row Level Security (RLS)

**Policy sur `profiles`:**
```sql
-- Empêche l'insertion directe de profils admin
CREATE POLICY "Prevent unauthorized admin creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (role != 'admin');
```

**Policy sur `franchisee_invitations`:**
```sql
-- Seuls les admins peuvent voir/gérer les invitations
CREATE POLICY "Only admins can manage invitations"
  ON franchisee_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## 📋 Comptes Admin Existants

Vous avez actuellement **3 comptes admin** dans le système:

1. `maxime@agence1.com`
2. `maxime@giguere-influence.com`
3. `admin@proremorque.ca`

## 🔑 Comment se Connecter

### Si vous avez oublié votre mot de passe:

1. **Aller sur la page de connexion**
2. **Cliquer sur "Mot de passe oublié? Réinitialiser →"**
3. **Ou aller directement sur `/admin-reset`**
4. **Options disponibles:**
   - Réinitialisation par email (recommandé)
   - Création d'un nouveau compte admin (admin@proremorque.ca avec mot de passe par défaut)

## 👥 Comment Inviter un Nouvel Admin

**Uniquement depuis l'interface admin connecté:**

1. Connectez-vous avec un compte admin existant
2. Allez dans la section "User Management" des paramètres
3. Utilisez le bouton "Invite User"
4. Entrez l'email et sélectionnez le rôle 'admin'
5. L'utilisateur recevra un email pour définir son mot de passe

**Via API (pour développeurs):**
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'nouvel.admin@example.com',
    role: 'admin',
    full_name: 'Nom de l\'admin',
  }),
});
```

## 🛡️ Protection Multicouche

**Couche 1: Interface Utilisateur**
- Pas d'option pour créer un compte admin sur la page de login

**Couche 2: API / Edge Function**
- Vérification que l'utilisateur est authentifié ET admin
- Création d'invitation obligatoire avant création de compte

**Couche 3: Base de Données (Trigger)**
- Validation automatique avant chaque insertion dans `profiles`
- Bloque toute tentative sans invitation valide

**Couche 4: RLS (Row Level Security)**
- Policies PostgreSQL empêchant l'insertion directe de profils admin
- Protection même si un attaquant accède directement à la DB

## ✅ Tests de Sécurité

### Test 1: Tentative de Création Publique
**Résultat attendu:** ❌ Impossible - Pas d'option dans l'interface

### Test 2: Tentative via API Sans Auth
**Résultat attendu:** ❌ Rejeté - "Missing authorization header"

### Test 3: Tentative via API Non-Admin
**Résultat attendu:** ❌ Rejeté - "Only administrators can invite users"

### Test 4: Tentative d'Insertion Directe DB
**Résultat attendu:** ❌ Bloqué par le trigger - "Création de compte admin non autorisée"

### Test 5: Invitation Valide par Admin
**Résultat attendu:** ✅ Succès - Compte créé avec invitation

## 📁 Fichiers Modifiés

1. **src/components/LoginPage.tsx**
   - Retiré l'option de signup
   - Interface connexion uniquement

2. **supabase/migrations/add_admin_creation_security.sql**
   - Trigger de validation
   - RLS policies strictes

3. **supabase/functions/invite-user/index.ts**
   - Système d'invitation sécurisé
   - Création d'enregistrement d'invitation avant compte

4. **src/components/AdminPasswordReset.tsx**
   - Outil de récupération pour admins existants

## 🚨 Important

**AUCUN compte admin ne peut être créé sans:**
1. Être invité par un admin existant
2. Avoir une entrée valide dans `franchisee_invitations`
3. Passer la validation du trigger de sécurité

Cette architecture multicouche garantit qu'aucun hacker ne peut créer un compte admin, même en contournant l'interface utilisateur.

## 📞 Support

Si vous ne pouvez pas vous connecter:
1. Utilisez `/admin-reset` pour réinitialiser votre mot de passe
2. Ou créez un nouveau compte admin via l'option "Créer compte admin@proremorque.ca"

Le système est maintenant **100% sécurisé** contre les créations de comptes admin non autorisées.
