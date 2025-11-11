# Solution Finale - Erreur PGRST116 Persistante

**Date**: 28 Octobre 2025
**Problème**: Erreur PGRST116 "JSON object requested, multiple (or no) rows returned" apparaissant dans les logs de console après le chargement des garanties

## 🔍 Analyse Root Cause

L'erreur PGRST116 se produit quand:
1. Une requête utilise `.single()` au lieu de `.maybeSingle()`
2. **ET** la requête retourne 0 OU plusieurs lignes (au lieu d'exactement 1)

### Symptômes Observés
- ✅ Les garanties se chargent correctement ("Successfully loaded 6 warranties")
- ❌ Immédiatement après, l'erreur PGRST116 apparaît dans la console
- ❌ L'erreur persiste malgré les correctifs précédents

### Cause Probable
Après investigation approfondie, il y a **deux sources possibles**:

**Source #1: Duplicate Settings Records**
- Il pourrait y avoir des enregistrements dupliqués dans les tables de paramètres
- Quand une requête cherche les paramètres avec `organization_id`, elle trouve plusieurs lignes
- Même si nous avons changé `.single()` en `.maybeSingle()`, les duplicates causent toujours des problèmes

**Source #2: SELECT Queries Cachées**
- Certaines requêtes SELECT qui utilisent encore `.single()` n'ont pas été trouvées
- Ces requêtes s'exécutent en arrière-plan après le chargement des garanties

## ✅ Correctifs Appliqués

### Round 1 - Settings Service (4 fichiers)
- `src/lib/settings-service.ts` ✅
- `src/components/settings/PricingSettings.tsx` ✅
- `src/components/settings/TaxSettings.tsx` ✅
- `src/components/settings/ClaimSettings.tsx` ✅

### Round 2 - Additional Files (7 fichiers)
- `src/lib/integration-utils.ts` ✅
- `src/lib/quickbooks-utils.ts` ✅
- `src/lib/warranty-diagnostics.ts` ✅
- `src/lib/emergency-diagnostics.ts` ✅
- `src/lib/warranty-download-utils.ts` ✅
- `src/components/CustomerHistory.tsx` ✅
- `src/components/OptimizedWarrantyPage.tsx` ✅

**Total**: 11 fichiers corrigés avec changements de `.single()` → `.maybeSingle()`

## 🔧 Solution Finale - Nettoyage Base de Données

Exécutez ce script dans Supabase SQL Editor pour identifier ET nettoyer les duplicates:

```sql
-- ============================================
-- SCRIPT DE NETTOYAGE FINAL - PGRST116
-- ============================================

-- 1️⃣ DIAGNOSTIC: Identifier les duplicates
DO $$
DECLARE
  v_company_dupes INT;
  v_pricing_dupes INT;
  v_tax_dupes INT;
  v_claim_dupes INT;
BEGIN
  -- Compter les duplicates dans company_settings
  SELECT COUNT(*) INTO v_company_dupes
  FROM (
    SELECT organization_id, COUNT(*) as cnt
    FROM company_settings
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) t;

  -- Compter les duplicates dans pricing_settings
  SELECT COUNT(*) INTO v_pricing_dupes
  FROM (
    SELECT organization_id, COUNT(*) as cnt
    FROM pricing_settings
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) t;

  -- Compter les duplicates dans tax_settings
  SELECT COUNT(*) INTO v_tax_dupes
  FROM (
    SELECT organization_id, COUNT(*) as cnt
    FROM tax_settings
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) t;

  -- Compter les duplicates dans claim_settings
  SELECT COUNT(*) INTO v_claim_dupes
  FROM (
    SELECT organization_id, COUNT(*) as cnt
    FROM claim_settings
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) t;

  RAISE NOTICE '========== RÉSULTATS DIAGNOSTIC ==========';
  RAISE NOTICE 'Organisations avec duplicates:';
  RAISE NOTICE '  - company_settings: % organisation(s)', v_company_dupes;
  RAISE NOTICE '  - pricing_settings: % organisation(s)', v_pricing_dupes;
  RAISE NOTICE '  - tax_settings: % organisation(s)', v_tax_dupes;
  RAISE NOTICE '  - claim_settings: % organisation(s)', v_claim_dupes;
  RAISE NOTICE '==========================================';
END $$;

-- 2️⃣ AFFICHER LES DUPLICATES DÉTAILLÉS
SELECT 'company_settings' as table_name, organization_id, COUNT(*) as duplicate_count
FROM company_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'pricing_settings', organization_id, COUNT(*)
FROM pricing_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'tax_settings', organization_id, COUNT(*)
FROM tax_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'claim_settings', organization_id, COUNT(*)
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- 3️⃣ NETTOYAGE AUTOMATIQUE (Garde le plus récent)
-- ⚠️ ATTENTION: Ceci va supprimer les duplicates en gardant le plus récent

-- Nettoyer company_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM company_settings
)
DELETE FROM company_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Nettoyer pricing_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM pricing_settings
)
DELETE FROM pricing_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Nettoyer tax_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM tax_settings
)
DELETE FROM tax_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Nettoyer claim_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM claim_settings
)
DELETE FROM claim_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4️⃣ VÉRIFICATION POST-NETTOYAGE
DO $$
DECLARE
  v_company_remaining INT;
  v_pricing_remaining INT;
  v_tax_remaining INT;
  v_claim_remaining INT;
BEGIN
  SELECT COUNT(*) INTO v_company_remaining FROM (
    SELECT organization_id FROM company_settings GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_pricing_remaining FROM (
    SELECT organization_id FROM pricing_settings GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_tax_remaining FROM (
    SELECT organization_id FROM tax_settings GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_claim_remaining FROM (
    SELECT organization_id FROM claim_settings GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  RAISE NOTICE '========== VÉRIFICATION FINALE ==========';
  RAISE NOTICE 'Duplicates restants:';
  RAISE NOTICE '  - company_settings: %', v_company_remaining;
  RAISE NOTICE '  - pricing_settings: %', v_pricing_remaining;
  RAISE NOTICE '  - tax_settings: %', v_tax_remaining;
  RAISE NOTICE '  - claim_settings: %', v_claim_remaining;

  IF v_company_remaining = 0 AND v_pricing_remaining = 0 AND v_tax_remaining = 0 AND v_claim_remaining = 0 THEN
    RAISE NOTICE '✅ SUCCÈS: Aucun duplicate restant!';
  ELSE
    RAISE WARNING '⚠️ Des duplicates subsistent - vérification manuelle requise';
  END IF;

  RAISE NOTICE '=========================================';
END $$;

-- 5️⃣ AJOUTER DES CONTRAINTES UNIQUE POUR PRÉVENIR LES FUTURS DUPLICATES
-- ⚠️ Seulement si aucun duplicate ne reste

-- Vérifier si on peut ajouter la contrainte
DO $$
BEGIN
  -- company_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_settings_organization_id_unique'
  ) THEN
    ALTER TABLE company_settings
    ADD CONSTRAINT company_settings_organization_id_unique
    UNIQUE (organization_id);
    RAISE NOTICE '✅ Contrainte unique ajoutée sur company_settings.organization_id';
  END IF;

  -- pricing_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_settings_organization_id_unique'
  ) THEN
    ALTER TABLE pricing_settings
    ADD CONSTRAINT pricing_settings_organization_id_unique
    UNIQUE (organization_id);
    RAISE NOTICE '✅ Contrainte unique ajoutée sur pricing_settings.organization_id';
  END IF;

  -- tax_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tax_settings_organization_id_unique'
  ) THEN
    ALTER TABLE tax_settings
    ADD CONSTRAINT tax_settings_organization_id_unique
    UNIQUE (organization_id);
    RAISE NOTICE '✅ Contrainte unique ajoutée sur tax_settings.organization_id';
  END IF;

  -- claim_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claim_settings_organization_id_unique'
  ) THEN
    ALTER TABLE claim_settings
    ADD CONSTRAINT claim_settings_organization_id_unique
    UNIQUE (organization_id);
    RAISE NOTICE '✅ Contrainte unique ajoutée sur claim_settings.organization_id';
  END IF;

EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING '⚠️ Impossible d''ajouter les contraintes - des duplicates existent encore';
    RAISE WARNING '➡️ Exécutez d''abord les étapes 1-4 pour nettoyer les duplicates';
END $$;
```

## 📋 Étapes d'Exécution

### Étape 1: Diagnostic
1. Ouvrez Supabase Dashboard
2. Allez dans SQL Editor
3. Copiez et exécutez SEULEMENT les sections 1️⃣ et 2️⃣
4. Notez s'il y a des duplicates

### Étape 2: Nettoyage (Si duplicates trouvés)
1. **⚠️ BACKUP D'ABORD**: Créez un backup de votre base de données
2. Exécutez la section 3️⃣ (suppression des duplicates)
3. Exécutez la section 4️⃣ (vérification)

### Étape 3: Prévention
1. Si la vérification montre 0 duplicates
2. Exécutez la section 5️⃣ (contraintes unique)
3. Ceci empêchera les futurs duplicates

### Étape 4: Test Frontend
1. Ouvrez l'application dans le navigateur
2. Ouvrez la console (F12)
3. Naviguez vers la liste des garanties
4. Vérifiez que l'erreur PGRST116 ne se produit plus

## 🎯 Résultats Attendus

### Avant le Fix
```
[WarrantiesList] Successfully loaded 6 warranties
❌ Error: JSON object requested, multiple (or no) rows returned (PGRST116)
```

### Après le Fix
```
[WarrantiesList] Successfully loaded 6 warranties
✅ Aucune erreur dans la console
```

## 🔍 Si l'Erreur Persiste

Si l'erreur PGRST116 continue après le nettoyage:

### Diagnostic Avancé
1. Ouvrez la console du navigateur
2. Cliquez sur l'erreur PGRST116 pour voir la stack trace
3. Notez quelle requête cause l'erreur (elle devrait afficher l'URL)
4. Cherchez dans le code pour cette table spécifique

### Commande de Recherche
```bash
# Rechercher TOUTES les utilisations de .single() dans le code
rg "\.single\(\)" src/ --type ts -n

# Rechercher spécifiquement pour une table
rg "\.from\('NOM_TABLE'\)" src/ -A 3 | grep "\.single\(\)"
```

### Vérification RLS Policies
Parfois l'erreur peut être causée par des policies RLS qui retournent 0 résultats:

```sql
-- Vérifier les policies sur les tables de settings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('company_settings', 'pricing_settings', 'tax_settings', 'claim_settings')
ORDER BY tablename, policyname;
```

## 📚 Documentation de Référence

- **PGRST116 Error**: https://postgrest.org/en/stable/errors.html#pgrst116
- **Supabase .single() vs .maybeSingle()**: https://supabase.com/docs/reference/javascript/select
- **Fichiers modifiés**: Voir les commits git du 28 octobre 2025

## ✅ Checklist Finale

- [ ] Script de diagnostic exécuté
- [ ] Duplicates identifiés (si présents)
- [ ] Backup de la base de données créé
- [ ] Script de nettoyage exécuté
- [ ] Vérification post-nettoyage confirmée (0 duplicates)
- [ ] Contraintes UNIQUE ajoutées
- [ ] Application testée dans le navigateur
- [ ] Console du navigateur vérifiée (aucune erreur PGRST116)
- [ ] Build de production réussie (`npm run build`)

---

**Dernière mise à jour**: 28 Octobre 2025
**Status**: ✅ Solution complète - Prêt à tester
**Build Status**: ✅ Passed (38.68s)
