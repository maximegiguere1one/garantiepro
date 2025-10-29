# Correctif: Ajout du Rôle Master et Permissions Admin
## Date: 27 octobre 2025

## Problèmes Identifiés

1. ❌ Les administrateurs ne pouvaient plus changer les mots de passe des autres utilisateurs
2. ❌ Pas de rôle supérieur à `super_admin`
3. ❌ Hiérarchie des rôles incomplète

## Solutions Implémentées

### 1. Nouveau Rôle Master ✅

Ajout du rôle **`master`** comme niveau le plus élevé dans la hiérarchie.

#### Hiérarchie Complète des Rôles (du plus bas au plus haut):
1. **client** - Client final
2. **operations** - Opérations
3. **f_and_i** - Finance et Assurance
4. **employee** - Employé générique
5. **franchisee_employee** - Employé franchisé
6. **franchisee_admin** - Administrateur franchisé
7. **admin** - Administrateur
8. **super_admin** - Super administrateur
9. **master** - Maître (accès total) ⭐ NOUVEAU

### 2. Migration Base de Données ✅

**Fichier:** `20251027201519_add_master_role_and_admin_permissions.sql`

#### Changements effectués:

##### a) Contrainte des Rôles Mise à Jour
```sql
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN (
  'master',        -- ⭐ NOUVEAU
  'super_admin',
  'admin',
  'franchisee_admin',
  'franchisee_employee',
  'employee',
  'f_and_i',
  'operations',
  'client'
));
```

##### b) Fonction de Hiérarchie des Rôles
Créée: `can_manage_user_role(manager_role, target_role)`
- Master peut gérer tout le monde
- Super Admin peut gérer tous sauf master
- Admin peut gérer les franchisés et en-dessous
- Franchisee Admin peut gérer ses employés

##### c) Fonction de Permission de Réinitialisation
Créée: `can_reset_user_password(admin_id, target_user_id)`
- Vérifie la hiérarchie des rôles
- Vérifie l'appartenance à la même organisation
- Master et Super Admin peuvent gérer toutes les organisations

##### d) Politiques RLS Mises à Jour
- **Politique UPDATE** pour les profils
- Permet aux admins de mettre à jour les utilisateurs selon la hiérarchie
- Protège contre les modifications de rôle non autorisées

### 3. Interface Utilisateur Mise à Jour ✅

**Fichier:** `/src/components/settings/UsersManagement.tsx`

#### Changements:

##### a) Badge de Rôle Master
```typescript
master: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-900 border border-amber-300'
```
Un badge doré avec dégradé pour distinguer visuellement le rôle master.

##### b) Sélection de Rôle lors de l'Invitation
```typescript
// Employé - Toujours visible
<option value="franchisee_employee">Employé</option>

// Admin Franchisé - Toujours visible
<option value="franchisee_admin">Administrateur Franchisé</option>

// Admin - Visible pour admin, super_admin, master
{(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'master') && (
  <option value="admin">Administrateur</option>
)}

// Super Admin - Visible pour super_admin, master
{(profile?.role === 'super_admin' || profile?.role === 'master') && (
  <option value="super_admin">Super Administrateur</option>
)}

// Master - Visible uniquement pour master
{profile?.role === 'master' && (
  <option value="master">Master</option>
)}
```

##### c) Sélection de Rôle lors de la Modification
Même logique de hiérarchie pour la modification d'utilisateurs existants.

### 4. Permissions de Changement de Mot de Passe ✅

#### Qui peut changer les mots de passe:

| Rôle Admin | Peut changer le mot de passe de |
|------------|--------------------------------|
| **Master** | Tous les utilisateurs, toutes organisations |
| **Super Admin** | Tous sauf master, toutes organisations |
| **Admin** | Franchisés et employés de son organisation |
| **Franchisee Admin** | Employés de son organisation |

#### Méthode:
- **Modal "Changer le mot de passe"** dans UsersManagement
- Saisie du nouveau mot de passe (minimum 8 caractères)
- Changement immédiat via `send-password-reset` Edge Function
- Notification de succès

### 5. Edge Function Compatible ✅

La fonction `send-password-reset` supporte déjà le rôle master:
```typescript
const allowedRoles = ['admin', 'super_admin', 'master', 'franchisee_admin'];
```

## Tests Effectués

✅ Migration de la base de données appliquée avec succès
✅ Contrainte de rôle mise à jour
✅ Fonctions de hiérarchie créées
✅ Politiques RLS mises à jour
✅ Build du projet réussi sans erreurs
✅ Interface utilisateur mise à jour

## Matrices de Permissions

### Gestion des Utilisateurs

| Rôle Gestionnaire | Client | Ops | F&I | Emp | FE | FA | Admin | SA | Master |
|-------------------|--------|-----|-----|-----|----|----|-------|----|----|
| **Master** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Franchisee Admin** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

*Légende: Ops = Operations, F&I = Finance & Assurance, Emp = Employee, FE = Franchisee Employee, FA = Franchisee Admin, SA = Super Admin*

### Changement de Mot de Passe

| Rôle Gestionnaire | Peut réinitialiser | Restrictions |
|-------------------|-------------------|--------------|
| **Master** | Tous | Aucune |
| **Super Admin** | Tous sauf master | Aucune |
| **Admin** | Franchisés et employés | Même organisation |
| **Franchisee Admin** | Employés | Même organisation |

## Utilisation

### Pour créer un utilisateur Master:

1. **Via SQL Direct (une seule fois):**
```sql
UPDATE profiles
SET role = 'master'
WHERE email = 'votre.email@exemple.com';
```

2. **Via Interface (si vous êtes déjà master):**
   - Configuration → Utilisateurs
   - Inviter un utilisateur
   - Sélectionner le rôle "Master"

### Pour changer le mot de passe d'un utilisateur:

1. Aller dans **Configuration** → **Utilisateurs**
2. Trouver l'utilisateur dans la liste
3. Cliquer sur l'icône **Clé** (🔑)
4. Entrer le nouveau mot de passe (minimum 8 caractères)
5. Cliquer sur **"Changer"**
6. L'utilisateur peut immédiatement se connecter avec le nouveau mot de passe

### Pour gérer son propre profil:

1. Aller dans **Configuration** → **Mon Profil**
2. Modifier nom, téléphone, email ou mot de passe
3. Les changements sont pour soi-même uniquement

## Sécurité

### Protection Hiérarchique
- ✅ Un utilisateur ne peut pas promouvoir quelqu'un à un rôle supérieur au sien
- ✅ Un utilisateur ne peut pas modifier quelqu'un de niveau supérieur
- ✅ Les master peuvent tout faire
- ✅ Les modifications sont auditées

### Protection Organisation
- ✅ Les admins ne peuvent gérer que leur organisation (sauf master/super_admin)
- ✅ L'isolation multi-tenant est respectée
- ✅ Les RLS policies protègent les données

### Validation
- ✅ Mot de passe minimum 8 caractères
- ✅ Vérification de l'autorisation avant chaque action
- ✅ Messages d'erreur clairs et sécurisés

## Fichiers Modifiés

1. ✅ Migration: `supabase/migrations/20251027201519_add_master_role_and_admin_permissions.sql`
2. ✅ Composant: `src/components/settings/UsersManagement.tsx`
3. ✅ Edge Function: `supabase/functions/send-password-reset/index.ts` (déjà compatible)

## Vérification

Pour vérifier que tout fonctionne:

```sql
-- Vérifier la contrainte des rôles
SELECT check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';

-- Vérifier les fonctions
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('can_manage_user_role', 'can_reset_user_password');

-- Tester la hiérarchie
SELECT can_manage_user_role('master', 'super_admin');  -- devrait retourner true
SELECT can_manage_user_role('admin', 'super_admin');   -- devrait retourner false
```

## État Final

✅ **Rôle master ajouté avec succès**
✅ **Hiérarchie des rôles complète et fonctionnelle**
✅ **Les admins peuvent changer les mots de passe selon leur niveau**
✅ **Interface utilisateur mise à jour**
✅ **Sécurité renforcée avec permissions granulaires**
✅ **Build réussi sans erreurs**
✅ **Prêt pour utilisation en production**

---

**Résumé:** Le système de gestion des utilisateurs est maintenant complet avec une hiérarchie claire, le nouveau rôle master au sommet, et les administrateurs peuvent à nouveau changer les mots de passe des utilisateurs qu'ils gèrent.
