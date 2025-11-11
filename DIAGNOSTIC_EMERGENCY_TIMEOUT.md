# 🚨 Diagnostic: EMERGENCY TIMEOUT - Force stopping loading

## Symptôme

```
[ERROR] [AuthContext] EMERGENCY TIMEOUT - Force stopping loading undefined
```

L'écran reste bloqué sur "Chargement du profil..." pendant 60-120 secondes avant de timeout.

## Cause Racine Probable

Le profil utilisateur ne peut pas être chargé depuis Supabase. Causes possibles:

### 1. Migration RPC Manquante (PLUS PROBABLE)
La fonction `get_my_profile()` n'existe pas dans votre base de données de production.

### 2. Problème RLS
Les policies Row Level Security bloquent l'accès au profil.

### 3. Problème Réseau
Timeout réseau entre votre serveur et Supabase.

### 4. Profil Inexistant
L'utilisateur existe dans `auth.users` mais pas dans `profiles`.

## ✅ Solution Immédiate

### Option 1: Vérifier et Appliquer la Migration RPC

1. **Aller sur Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/[votre-projet]/editor
   ```

2. **Aller dans SQL Editor**

3. **Vérifier si la fonction existe:**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'get_my_profile';
   ```

4. **Si la fonction N'EXISTE PAS, l'exécuter:**

   Copier le contenu de:
   `supabase/migrations/20251110033724_create_get_my_profile_function_nov10.sql`

   Ou directement:

   ```sql
   DROP FUNCTION IF EXISTS get_my_profile();

   CREATE OR REPLACE FUNCTION get_my_profile()
   RETURNS TABLE (
     id uuid,
     email text,
     full_name text,
     role text,
     organization_id uuid,
     phone text,
     is_master_account boolean,
     last_sign_in_at timestamptz,
     created_at timestamptz,
     updated_at timestamptz
   )
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       p.id,
       p.email,
       p.full_name,
       p.role,
       p.organization_id,
       p.phone,
       p.is_master_account,
       p.last_sign_in_at,
       p.created_at,
       p.updated_at
     FROM profiles p
     WHERE p.id = auth.uid()
     LIMIT 1;
   END;
   $$;

   GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated;
   ```

5. **Exécuter** et **redémarrer l'application**

### Option 2: Fallback Automatique (Déjà Implémenté)

Le code a maintenant un fallback automatique:
- Essaie d'abord le RPC `get_my_profile()`
- Si le RPC n'existe pas, utilise une requête directe sur `profiles`

**Cependant**, la requête directe peut aussi timeout si RLS est mal configuré.

### Option 3: Vérifier les Policies RLS

```sql
-- Vérifier les policies sur profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Policy minimale nécessaire pour que ça fonctionne:
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

## 🔍 Diagnostic Détaillé

### Étape 1: Vérifier les Logs Console

Après login, cherchez dans la console:

```
[AuthContext] Calling get_my_profile() RPC...
[AuthContext] Profile RPC result: { data: 'NULL', error: { ... } }
```

Si vous voyez un error avec "function does not exist", c'est la migration qui manque.

Si vous voyez "row level security policy", c'est un problème RLS.

### Étape 2: Tester Manuellement dans Supabase

Dashboard → SQL Editor:

```sql
-- Test 1: La fonction existe?
SELECT get_my_profile();

-- Test 2: Accès direct fonctionne?
SELECT * FROM profiles WHERE id = auth.uid();

-- Test 3: Y a-t-il des profils?
SELECT COUNT(*) FROM profiles;
```

### Étape 3: Vérifier l'Ordre des Migrations

```bash
ls -la supabase/migrations/ | grep "profile"
```

La migration `20251110033724_create_get_my_profile_function_nov10.sql` doit être la plus récente.

## 🛠️ Corrections Appliquées dans le Code

### 1. Fallback Automatique (AuthContext.tsx)

```typescript
// Try RPC first
let result = await supabase.rpc('get_my_profile').limit(1).maybeSingle();

// Fallback to direct query if RPC doesn't exist
if (result.error?.message?.includes('function') &&
    result.error?.message?.includes('does not exist')) {
  console.warn('RPC not found, using direct query');
  result = await supabase
    .from('profiles')
    .select('...')
    .eq('id', userId)
    .maybeSingle();
}
```

### 2. Meilleurs Messages d'Erreur

```typescript
// Message clair en production
if (timeout) {
  console.error('Check if get_my_profile() RPC exists and RLS is correct');
  setProfileError('Erreur de chargement. Vérifiez connexion ou contactez support.');
}
```

### 3. Logs Détaillés

Tous les logs nécessaires pour diagnostic sont maintenant présents.

## 📋 Checklist de Résolution

- [ ] Vérifier que `get_my_profile()` existe dans Supabase
- [ ] Si manquant, exécuter la migration SQL
- [ ] Vérifier les policies RLS sur `profiles`
- [ ] Tester login après correction
- [ ] Vérifier console - plus d'EMERGENCY TIMEOUT
- [ ] Profil charge en < 2 secondes

## ⚡ Test Rapide

Après avoir appliqué la migration:

1. **Vider le cache:**
   ```javascript
   // Dans console navigateur
   sessionStorage.clear();
   localStorage.clear();
   location.reload();
   ```

2. **Login**

3. **Vérifier console:**
   ```
   ✓ [AuthContext] Profile RPC result: { data: 'EXISTS' }
   ✓ [AuthContext] Profile loaded successfully: user@example.com
   ```

## 🔄 Si le Problème Persiste

### Scénario 1: RPC existe mais timeout quand même

**Cause:** Problème RLS ou performance

**Solution:**
```sql
-- Vérifier qu'il n'y a pas de récursion dans RLS
SELECT * FROM pg_policies
WHERE tablename = 'profiles'
AND policyname LIKE '%recursive%';

-- Supprimer policies récursives et recréer simple
DROP POLICY IF EXISTS "problematic_policy" ON profiles;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());
```

### Scénario 2: "Profile not found"

**Cause:** Profil n'existe pas dans la table

**Solution:**
```sql
-- Créer les profils manquants
INSERT INTO profiles (id, email, full_name, role, organization_id)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'user',
  (SELECT id FROM organizations LIMIT 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

### Scénario 3: Problème Network/CORS

**Cause:** Cloudflare ou firewall bloque Supabase

**Solution:**
- Vérifier Cloudflare cache
- Purge Everything
- Vérifier que Supabase URL est bien configurée dans `.env`

## 📞 Support

Si aucune solution ne fonctionne:

1. **Exporter les logs:**
   ```javascript
   // Console navigateur
   copy(console.logs)
   ```

2. **Partager:**
   - Logs console complets
   - Screenshot de l'erreur
   - Résultat des requêtes SQL de diagnostic

3. **Information nécessaire:**
   - URL de l'app
   - User email qui rencontre le problème
   - Timestamp exact du problème

---

**Date:** 2025-11-11
**Status:** Correctifs appliqués, en attente de test production
