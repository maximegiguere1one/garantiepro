# Comment Appliquer la Migration dans Supabase

## Méthode Simple - Copier/Coller

### Étape 1: Ouvrir Supabase SQL Editor
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **"SQL Editor"** dans le menu de gauche
4. Cliquez sur **"New query"**

### Étape 2: Copier la Migration
1. Ouvrez le fichier: `supabase/migrations/20251008030000_fix_warranty_claim_tokens_organization.sql`
2. Copiez **TOUT** le contenu (Ctrl+A puis Ctrl+C)

### Étape 3: Coller et Exécuter
1. Collez le contenu dans le SQL Editor de Supabase
2. Cliquez sur le bouton **"Run"** (ou Ctrl+Enter)
3. Attendez que l'exécution se termine (quelques secondes)

### Étape 4: Vérifier le Succès
Vous devriez voir un message comme:
```
Success. No rows returned
```
ou
```
UPDATE X (où X = nombre de tokens mis à jour)
```

---

## Vérification Rapide

Après avoir appliqué la migration, exécutez cette requête pour vérifier:

```sql
-- Vérifier que la colonne organization_id existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'warranty_claim_tokens'
AND column_name = 'organization_id';
```

**Résultat attendu**:
```
column_name      | data_type | is_nullable
-----------------+-----------+-------------
organization_id  | uuid      | NO
```

Si vous voyez cette ligne → La migration a réussi! ✅

---

## Vérification Avancée

Pour vérifier que tout fonctionne:

```sql
-- 1. Vérifier que tous les tokens ont organization_id
SELECT
  COUNT(*) as total_tokens,
  COUNT(organization_id) as tokens_with_org,
  COUNT(*) - COUNT(organization_id) as tokens_without_org
FROM warranty_claim_tokens;
```

**Résultat attendu**: `tokens_without_org = 0`

```sql
-- 2. Vérifier le trigger
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'warranties'
AND trigger_name = 'trigger_create_claim_token';
```

**Résultat attendu**: 1 ligne avec `AFTER` et `INSERT`

```sql
-- 3. Vérifier les politiques RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'warranty_claim_tokens'
ORDER BY policyname;
```

**Résultat attendu**: Plusieurs lignes avec les nouvelles politiques

---

## En Cas d'Erreur

### Erreur: "column organization_id already exists"

**Cause**: La migration a déjà été appliquée partiellement

**Solution**:
```sql
-- Vérifier l'état actuel
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'warranty_claim_tokens'
AND column_name = 'organization_id';
```

Si la colonne existe déjà mais est nullable (YES), exécutez seulement:
```sql
-- Backfill
UPDATE warranty_claim_tokens wct
SET organization_id = w.organization_id
FROM warranties w
WHERE wct.warranty_id = w.id
  AND wct.organization_id IS NULL;

-- Make NOT NULL
ALTER TABLE warranty_claim_tokens
  ALTER COLUMN organization_id SET NOT NULL;
```

### Erreur: "function generate_claim_token does not exist"

**Cause**: Une migration précédente n'a pas été appliquée

**Solution**: Appliquer d'abord la migration `20251004033318_add_public_claim_submission_system_fixed.sql`

### Erreur: "violates not null constraint"

**Cause**: Certains tokens n'ont pas pu être backfillés

**Solution**:
```sql
-- Identifier les tokens problématiques
SELECT wct.id, wct.warranty_id, wct.token
FROM warranty_claim_tokens wct
LEFT JOIN warranties w ON wct.warranty_id = w.id
WHERE wct.organization_id IS NULL;

-- Option 1: Supprimer les tokens orphelins
DELETE FROM warranty_claim_tokens
WHERE organization_id IS NULL;

-- Option 2: Assigner à une organisation par défaut
UPDATE warranty_claim_tokens
SET organization_id = '[UUID-DE-VOTRE-ORGANISATION]'
WHERE organization_id IS NULL;
```

---

## Après la Migration

### Test Immédiat

1. **Créer une garantie test**
   - Allez dans l'application
   - Cliquez sur "Nouvelle Garantie"
   - Remplissez le formulaire
   - Cliquez sur "Compléter la vente"

2. **Vérifier le résultat**
   - ✅ Aucune erreur "token pas valide"
   - ✅ Message de succès
   - ✅ Numéro de contrat généré

3. **Vérifier dans la base de données**
   ```sql
   SELECT
     w.contract_number,
     w.organization_id,
     wct.token,
     wct.organization_id
   FROM warranties w
   LEFT JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
   WHERE w.created_at > NOW() - INTERVAL '1 hour'
   ORDER BY w.created_at DESC
   LIMIT 5;
   ```

### Vérification des Logs Frontend

Ouvrez la console du navigateur (F12) et cherchez:
```
[NewWarranty] Starting warranty creation for organization: [UUID]
[NewWarranty] Creating warranty with organization_id: [UUID]
[NewWarranty] Warranty created successfully: [WARRANTY_ID]
```

---

## Rollback (Si Nécessaire)

Si vous devez annuler la migration:

```sql
-- 1. Supprimer les nouvelles politiques
DROP POLICY IF EXISTS "Users can view organization claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Users can create organization claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Users can update organization claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Public can access claim tokens by token value" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Public can update claim tokens by token value" ON warranty_claim_tokens;

-- 2. Restaurer l'ancien trigger
-- (voir migration 20251005202412_fix_claim_token_trigger_timing.sql)

-- 3. Optionnel: Supprimer la colonne organization_id
ALTER TABLE warranty_claim_tokens
  DROP COLUMN IF EXISTS organization_id;
```

---

## Checklist Finale

Après avoir appliqué la migration, vérifiez:

- [ ] La migration s'est exécutée sans erreur
- [ ] La colonne `organization_id` existe sur `warranty_claim_tokens`
- [ ] Tous les tokens existants ont un `organization_id`
- [ ] Le trigger `trigger_create_claim_token` existe
- [ ] Les nouvelles politiques RLS sont en place
- [ ] Une garantie test a été créée avec succès
- [ ] Aucune erreur "token pas valide" n'apparaît
- [ ] Le token est généré automatiquement

---

## Support

Si vous rencontrez des problèmes:

1. **Copiez le message d'erreur exact** de Supabase
2. **Vérifiez l'état de la table** avec les requêtes de vérification ci-dessus
3. **Consultez** `GUIDE_TEST_CREATION_GARANTIE.md` pour plus de détails
4. **Collectez les logs** de la console navigateur si le problème persiste

---

**Date**: 8 Octobre 2025
**Fichier de migration**: `supabase/migrations/20251008030000_fix_warranty_claim_tokens_organization.sql`
**Statut**: Prêt à appliquer
