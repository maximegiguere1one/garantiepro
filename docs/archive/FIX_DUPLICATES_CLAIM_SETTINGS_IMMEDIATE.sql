-- ============================================
-- FIX IMMÉDIAT - PGRST116 Centre de Réclamations
-- ============================================
-- Erreur: "Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row"
-- Cause: Duplicates dans claim_settings (ou autre table settings)
-- Date: 28 Octobre 2025

-- 1️⃣ DIAGNOSTIC: Identifier les duplicates
SELECT
    'claim_settings' as table_name,
    organization_id,
    COUNT(*) as duplicate_count
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- Vérifier les autres tables aussi
SELECT
    'company_settings' as table_name,
    organization_id,
    COUNT(*) as duplicate_count
FROM company_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT
    'pricing_settings' as table_name,
    organization_id,
    COUNT(*) as duplicate_count
FROM pricing_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT
    'tax_settings' as table_name,
    organization_id,
    COUNT(*) as duplicate_count
FROM tax_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT
    'claim_settings' as table_name,
    organization_id,
    COUNT(*) as duplicate_count
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- 2️⃣ NETTOYAGE: Supprimer les duplicates (garde le plus récent)

-- Nettoyer claim_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM claim_settings
)
DELETE FROM claim_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Nettoyer company_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM company_settings
)
DELETE FROM company_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Nettoyer pricing_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM pricing_settings
)
DELETE FROM pricing_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Nettoyer tax_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM tax_settings
)
DELETE FROM tax_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3️⃣ VÉRIFICATION: Confirmer qu'il n'y a plus de duplicates
DO $$
DECLARE
  v_claim_dupes INT;
  v_company_dupes INT;
  v_pricing_dupes INT;
  v_tax_dupes INT;
BEGIN
  SELECT COUNT(*) INTO v_claim_dupes FROM (
    SELECT organization_id FROM claim_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_company_dupes FROM (
    SELECT organization_id FROM company_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_pricing_dupes FROM (
    SELECT organization_id FROM pricing_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_tax_dupes FROM (
    SELECT organization_id FROM tax_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  RAISE NOTICE '========== VÉRIFICATION POST-NETTOYAGE ==========';
  RAISE NOTICE 'Duplicates restants:';
  RAISE NOTICE '  - claim_settings: %', v_claim_dupes;
  RAISE NOTICE '  - company_settings: %', v_company_dupes;
  RAISE NOTICE '  - pricing_settings: %', v_pricing_dupes;
  RAISE NOTICE '  - tax_settings: %', v_tax_dupes;

  IF v_claim_dupes = 0 AND v_company_dupes = 0 AND v_pricing_dupes = 0 AND v_tax_dupes = 0 THEN
    RAISE NOTICE '✅ SUCCÈS: Tous les duplicates ont été supprimés!';
  ELSE
    RAISE WARNING '⚠️ Des duplicates subsistent - vérification manuelle requise';
  END IF;

  RAISE NOTICE '=================================================';
END $$;

-- 4️⃣ PRÉVENTION: Ajouter contraintes UNIQUE pour éviter futurs duplicates
DO $$
BEGIN
  -- claim_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claim_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE claim_settings
      ADD CONSTRAINT claim_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✅ Contrainte unique ajoutée sur claim_settings.organization_id';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ Impossible d''ajouter contrainte sur claim_settings - duplicates restants';
    END;
  END IF;

  -- company_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE company_settings
      ADD CONSTRAINT company_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✅ Contrainte unique ajoutée sur company_settings.organization_id';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ Impossible d''ajouter contrainte sur company_settings - duplicates restants';
    END;
  END IF;

  -- pricing_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE pricing_settings
      ADD CONSTRAINT pricing_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✅ Contrainte unique ajoutée sur pricing_settings.organization_id';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ Impossible d''ajouter contrainte sur pricing_settings - duplicates restants';
    END;
  END IF;

  -- tax_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tax_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE tax_settings
      ADD CONSTRAINT tax_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✅ Contrainte unique ajoutée sur tax_settings.organization_id';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ Impossible d''ajouter contrainte sur tax_settings - duplicates restants';
    END;
  END IF;
END $$;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Après exécution, vous devriez voir:
-- ✅ SUCCÈS: Tous les duplicates ont été supprimés!
-- ✅ 4 contraintes uniques ajoutées
--
-- Testez ensuite l'application:
-- 1. Rechargez la page du centre de réclamations
-- 2. L'erreur PGRST116 devrait avoir disparu
-- ============================================
