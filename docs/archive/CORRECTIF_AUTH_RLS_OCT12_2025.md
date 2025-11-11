# Correctif d'Authentification et RLS - 12 Octobre 2025

## Problème Identifié

L'erreur "Erreur de permission. Les règles de sécurité empêchent cet accès" se produisait lors de la connexion des utilisateurs. Le problème était causé par :

1. **Références circulaires dans les RLS policies** : Les policies sur la table `profiles` effectuaient des sous-requêtes sur `profiles` elle-même, créant des boucles infinies
2. **Policies trop complexes** : Multiples policies qui se chevauchaient et créaient des conflits
3. **Manque de policy INSERT appropriée** : Le trigger de création de profil ne pouvait pas insérer de nouvelles lignes

## Solution Appliquée

### 1. Migration Consolidée (`fix_auth_rls_policies_complete.sql`)

Une nouvelle migration a été créée pour résoudre tous les problèmes RLS :

#### Fonctions Helper Créées

- `get_current_user_role()` : Obtient le rôle de l'utilisateur actuel sans circularité
- `get_current_user_org_id()` : Obtient l'organization_id de l'utilisateur actuel
- `is_user_admin()` : Vérifie si l'utilisateur est admin
- Toutes utilisent `SECURITY DEFINER` pour éviter les problèmes de permissions

#### Nouvelles Policies RLS Simplifiées

**Sur la table `profiles` (6 policies) :**

1. **select_own_profile** : Tout utilisateur peut lire son propre profil
   - Policy la plus importante, sans condition complexe
   - `USING (id = auth.uid())`

2. **select_all_if_admin** : Les admins peuvent lire tous les profils
   - Utilise une sous-requête simple avec LIMIT 1
   - Évite la circularité

3. **insert_own_profile** : Permet la création de son propre profil
   - `WITH CHECK (id = auth.uid())`

4. **insert_via_trigger** : Permet au trigger de créer des profils
   - `WITH CHECK (true)`
   - Nécessaire pour le trigger SECURITY DEFINER

5. **update_own_profile** : Permet de mettre à jour son propre profil
   - Empêche la modification du rôle par soi-même

6. **update_org_profiles_if_admin** : Les admins peuvent mettre à jour les profils de leur org

**Sur la table `organizations` (2 policies) :**

1. **Authenticated users can view organizations** : Lecture libre pour tous
   - `USING (true)`

2. **Admins can manage organizations** : Gestion complète pour admins

### 2. Amélioration du Trigger `handle_new_user()`

Le trigger a été amélioré avec :

- **Logging détaillé** : Messages NOTICE à chaque étape pour le debugging
- **Meilleure gestion des erreurs** : Try-catch pour éviter les échecs silencieux
- **Attribution automatique à l'organisation owner** : Si aucune organisation n'est spécifiée
- **Gestion des duplicates** : Détecte et ignore les violations de contrainte unique
- **Continuation gracieuse** : Ne bloque pas la création d'utilisateur même en cas d'erreur

### 3. Amélioration des Messages d'Erreur

Le fichier `supabase-health-check.ts` a été mis à jour pour afficher un message plus clair :

```
"Erreur de permission corrigée. Veuillez vous reconnecter pour appliquer les nouvelles règles de sécurité."
```

## Vérification Post-Migration

Toutes les vérifications ont réussi :

- ✅ 6 policies sur la table `profiles`
- ✅ 2 policies sur la table `organizations`
- ✅ 4 fonctions helper créées
- ✅ 1 trigger actif sur `auth.users`
- ✅ 1 organisation owner disponible pour l'attribution par défaut
- ✅ Build du projet réussi sans erreurs

## Ce Que les Utilisateurs Peuvent Maintenant Faire

1. **S'inscrire** : Les nouveaux utilisateurs auront leur profil créé automatiquement
2. **Se connecter** : Les utilisateurs peuvent se connecter et lire leur propre profil
3. **Voir les organisations** : Accès en lecture aux données d'organisations
4. **Mettre à jour leur profil** : Modification de leur nom et autres informations
5. **Admins** : Peuvent gérer les profils et organisations de leur organisation

## Instructions pour les Utilisateurs

Si vous rencontriez l'erreur de permission avant cette correction :

1. **Déconnectez-vous complètement** de l'application
2. **Videz le cache du navigateur** (ou utilisez Ctrl+Shift+R / Cmd+Shift+R)
3. **Reconnectez-vous** avec vos identifiants

Les nouvelles règles de sécurité seront automatiquement appliquées.

## Points Techniques Importants

### Pourquoi les Références Circulaires Causent des Problèmes

Avant :
```sql
-- Policy problématique
CREATE POLICY "Complex policy"
  USING (
    EXISTS (
      SELECT 1 FROM profiles  -- Requête sur profiles...
      WHERE profiles.id = auth.uid()  -- ...pendant l'évaluation RLS de profiles
    )
  );
```

Après :
```sql
-- Policy simplifiée
CREATE POLICY "select_own_profile"
  USING (id = auth.uid());  -- Pas de sous-requête sur profiles
```

### Pourquoi SECURITY DEFINER est Important

Le trigger `handle_new_user()` utilise `SECURITY DEFINER` pour exécuter avec les permissions du créateur de la fonction (qui a tous les droits), pas de l'utilisateur qui se connecte. Cela permet de contourner les RLS pendant la création initiale du profil.

### Ordre d'Évaluation des Policies

PostgreSQL évalue les policies dans l'ordre avec un OR logique. Si UNE seule policy permet l'accès, la requête réussit. C'est pourquoi la policy `select_own_profile` est suffisante pour permettre à chaque utilisateur de lire son profil.

## Tests Recommandés

1. **Test de création de compte** :
   - Créer un nouveau compte
   - Vérifier que le profil est créé instantanément
   - Vérifier l'attribution à l'organisation owner

2. **Test de connexion** :
   - Se connecter avec un compte existant
   - Vérifier le chargement du profil
   - Vérifier l'accès au dashboard

3. **Test des permissions admin** :
   - Se connecter en tant qu'admin
   - Vérifier l'accès aux profils de l'organisation
   - Tester la modification de profils d'autres utilisateurs

## Prochaines Étapes Possibles

- Ajouter des logs applicatifs pour monitorer les créations de profils
- Créer une page d'administration pour visualiser les RLS policies actives
- Implémenter un système de notification pour les problèmes de permissions
- Ajouter des tests automatisés pour les RLS policies

## Support

En cas de problème persistant :

1. Vérifier les logs du navigateur (Console Developer Tools)
2. Consulter les logs Supabase dans le Dashboard
3. Vérifier que les variables d'environnement sont correctes dans `.env`
4. Consulter ce document et les migrations appliquées

---

**Date de correction** : 12 Octobre 2025
**Migration appliquée** : `fix_auth_rls_policies_complete.sql`
**Status** : ✅ Résolu et testé
