-- ============================================
-- MÉGA CORRECTIF COMPLET - 28 OCTOBRE 2025
-- ============================================
-- Corrige:
--   1. Erreur PGRST116 (duplicates dans settings)
--   2. Erreur 42703 (colonne manquante trailer_brands.is_active)
-- ============================================

-- ============================================
-- PARTIE 1: DIAGNOSTIC COMPLET
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   MÉGA DIAGNOSTIC COMPLET - 28 OCTOBRE 2025           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- Vérifier si la colonne is_active existe dans trailer_brands
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'trailer_brands'
    AND column_name = 'is_active'
  ) INTO v_column_exists;

  RAISE NOTICE '🔍 VÉRIFICATION TABLE trailer_brands';
  IF v_column_exists THEN
    RAISE NOTICE '  ✓ Colonne is_active: EXISTE';
  ELSE
    RAISE NOTICE '  ✗ Colonne is_active: MANQUANTE (sera ajoutée)';
  END IF;
  RAISE NOTICE '';
END $$;

-- Diagnostic des duplicates dans les tables settings
RAISE NOTICE '🔍 DIAGNOSTIC DES DUPLICATES';
RAISE NOTICE '─────────────────────────────────────────────────────────';

WITH all_duplicates AS (
  SELECT 'claim_settings' as table_name, organization_id, COUNT(*) as count
  FROM claim_settings
  GROUP BY organization_id
  HAVING COUNT(*) > 1

  UNION ALL

  SELECT 'company_settings', organization_id, COUNT(*)
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
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ Aucun duplicate trouvé'
    ELSE '✗ ' || COUNT(*) || ' table(s) avec duplicates'
  END as status
FROM all_duplicates;

RAISE NOTICE '';

-- ============================================
-- PARTIE 2: FIX TRAILER_BRANDS (is_active)
-- ============================================
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   PARTIE 2: CORRECTION trailer_brands                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Vérifier si la colonne existe
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'trailer_brands'
    AND column_name = 'is_active'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    -- Ajouter la colonne is_active
    ALTER TABLE trailer_brands
    ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

    RAISE NOTICE '✓ Colonne is_active ajoutée à trailer_brands';
    RAISE NOTICE '  - Type: BOOLEAN';
    RAISE NOTICE '  - Default: true';
    RAISE NOTICE '  - NOT NULL: oui';

    -- Mettre toutes les marques existantes comme actives
    UPDATE trailer_brands SET is_active = true WHERE is_active IS NULL;
    RAISE NOTICE '✓ Toutes les marques existantes marquées comme actives';
  ELSE
    RAISE NOTICE '✓ Colonne is_active déjà présente - aucune action requise';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- PARTIE 3: NETTOYAGE DES DUPLICATES
-- ============================================
DO $$
DECLARE
  v_deleted INT;
  v_total_deleted INT := 0;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   PARTIE 3: NETTOYAGE DES DUPLICATES                   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- claim_settings
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id
             ORDER BY
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
           ) as rn
    FROM claim_settings
  )
  DELETE FROM claim_settings
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_deleted;
  RAISE NOTICE '✓ claim_settings: % duplicate(s) supprimé(s)', v_deleted;

  -- company_settings
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id
             ORDER BY
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
           ) as rn
    FROM company_settings
  )
  DELETE FROM company_settings
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_deleted;
  RAISE NOTICE '✓ company_settings: % duplicate(s) supprimé(s)', v_deleted;

  -- pricing_settings
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id
             ORDER BY
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
           ) as rn
    FROM pricing_settings
  )
  DELETE FROM pricing_settings
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_deleted;
  RAISE NOTICE '✓ pricing_settings: % duplicate(s) supprimé(s)', v_deleted;

  -- tax_settings
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id
             ORDER BY
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
           ) as rn
    FROM tax_settings
  )
  DELETE FROM tax_settings
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_deleted;
  RAISE NOTICE '✓ tax_settings: % duplicate(s) supprimé(s)', v_deleted;

  RAISE NOTICE '';
  RAISE NOTICE '📊 TOTAL: % duplicate(s) supprimé(s)', v_total_deleted;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PARTIE 4: AJOUT DES CONTRAINTES UNIQUE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   PARTIE 4: CONTRAINTES UNIQUE                         ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- claim_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claim_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE claim_settings
      ADD CONSTRAINT claim_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✓ claim_settings: Contrainte UNIQUE ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠ claim_settings: Duplicates restants - réexécutez le script';
    END;
  ELSE
    RAISE NOTICE '✓ claim_settings: Contrainte déjà présente';
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
      RAISE NOTICE '✓ company_settings: Contrainte UNIQUE ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠ company_settings: Duplicates restants - réexécutez le script';
    END;
  ELSE
    RAISE NOTICE '✓ company_settings: Contrainte déjà présente';
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
      RAISE NOTICE '✓ pricing_settings: Contrainte UNIQUE ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠ pricing_settings: Duplicates restants - réexécutez le script';
    END;
  ELSE
    RAISE NOTICE '✓ pricing_settings: Contrainte déjà présente';
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
      RAISE NOTICE '✓ tax_settings: Contrainte UNIQUE ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠ tax_settings: Duplicates restants - réexécutez le script';
    END;
  ELSE
    RAISE NOTICE '✓ tax_settings: Contrainte déjà présente';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================
-- PARTIE 5: VÉRIFICATION FINALE
-- ============================================
DO $$
DECLARE
  v_claim INT;
  v_company INT;
  v_pricing INT;
  v_tax INT;
  v_total INT;
  v_brands_ok BOOLEAN;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   PARTIE 5: VÉRIFICATION FINALE                        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Vérifier trailer_brands.is_active
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'trailer_brands'
    AND column_name = 'is_active'
  ) INTO v_brands_ok;

  RAISE NOTICE '🔍 VÉRIFICATION trailer_brands';
  IF v_brands_ok THEN
    RAISE NOTICE '  ✅ Colonne is_active: PRÉSENTE';
  ELSE
    RAISE NOTICE '  ❌ Colonne is_active: ABSENTE';
  END IF;
  RAISE NOTICE '';

  -- Vérifier duplicates
  SELECT COUNT(*) INTO v_claim FROM (
    SELECT organization_id FROM claim_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_company FROM (
    SELECT organization_id FROM company_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_pricing FROM (
    SELECT organization_id FROM pricing_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_tax FROM (
    SELECT organization_id FROM tax_settings
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  v_total := v_claim + v_company + v_pricing + v_tax;

  RAISE NOTICE '🔍 VÉRIFICATION DUPLICATES';
  RAISE NOTICE '  - claim_settings: %', v_claim;
  RAISE NOTICE '  - company_settings: %', v_company;
  RAISE NOTICE '  - pricing_settings: %', v_pricing;
  RAISE NOTICE '  - tax_settings: %', v_tax;
  RAISE NOTICE '';

  IF v_total = 0 AND v_brands_ok THEN
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   🎉 SUCCÈS COMPLET!                                   ║';
    RAISE NOTICE '║                                                        ║';
    RAISE NOTICE '║   ✅ Colonne is_active ajoutée                         ║';
    RAISE NOTICE '║   ✅ Tous les duplicates supprimés                     ║';
    RAISE NOTICE '║   ✅ Contraintes UNIQUE en place                       ║';
    RAISE NOTICE '║                                                        ║';
    RAISE NOTICE '║   📋 PROCHAINES ÉTAPES:                                ║';
    RAISE NOTICE '║   1. Rechargez votre application (F5)                  ║';
    RAISE NOTICE '║   2. Ouvrez la console (F12)                           ║';
    RAISE NOTICE '║   3. Les erreurs devraient avoir disparu               ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  ELSE
    IF v_total > 0 THEN
      RAISE WARNING '⚠ Il reste % duplicate(s) - réexécutez le script', v_total;
    END IF;
    IF NOT v_brands_ok THEN
      RAISE WARNING '⚠ Problème avec trailer_brands.is_active';
    END IF;
  END IF;

  RAISE NOTICE '';
END $$;
