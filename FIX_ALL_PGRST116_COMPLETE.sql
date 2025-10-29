-- ============================================
-- FIX COMPLET - TOUTES LES ERREURS PGRST116
-- ============================================
-- Date: 28 Octobre 2025
-- Objectif: Éliminer TOUS les duplicates dans TOUTES les tables
-- ============================================

-- PHASE 1: DIAGNOSTIC COMPLET
-- ============================================
DO $$
DECLARE
  v_total_dupes INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSTIC COMPLET DES DUPLICATES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Vérifier toutes les tables settings
WITH all_duplicates AS (
  -- claim_settings
  SELECT 'claim_settings' as table_name, organization_id, COUNT(*) as count
  FROM claim_settings
  GROUP BY organization_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- company_settings
  SELECT 'company_settings', organization_id, COUNT(*)
  FROM company_settings
  GROUP BY organization_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- pricing_settings
  SELECT 'pricing_settings', organization_id, COUNT(*)
  FROM pricing_settings
  GROUP BY organization_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- tax_settings
  SELECT 'tax_settings', organization_id, COUNT(*)
  FROM tax_settings
  GROUP BY organization_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- notification_settings
  SELECT 'notification_settings', organization_id, COUNT(*)
  FROM notification_settings
  WHERE organization_id IS NOT NULL
  GROUP BY organization_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- email_settings
  SELECT 'email_settings', organization_id, COUNT(*)
  FROM email_settings
  WHERE organization_id IS NOT NULL
  GROUP BY organization_id
  HAVING COUNT(*) > 1
)
SELECT * FROM all_duplicates ORDER BY table_name, organization_id;

-- PHASE 2: NETTOYAGE AUTOMATIQUE
-- ============================================
DO $$
DECLARE
  v_deleted INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧹 NETTOYAGE DES DUPLICATES';
  RAISE NOTICE '========================================';
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
  RAISE NOTICE '✓ tax_settings: % duplicate(s) supprimé(s)', v_deleted;

  -- notification_settings
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id
             ORDER BY
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
           ) as rn
    FROM notification_settings
    WHERE organization_id IS NOT NULL
  )
  DELETE FROM notification_settings
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '✓ notification_settings: % duplicate(s) supprimé(s)', v_deleted;

  -- email_settings
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id
             ORDER BY
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
           ) as rn
    FROM email_settings
    WHERE organization_id IS NOT NULL
  )
  DELETE FROM email_settings
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '✓ email_settings: % duplicate(s) supprimé(s)', v_deleted;

END $$;

-- PHASE 3: VÉRIFICATION POST-NETTOYAGE
-- ============================================
DO $$
DECLARE
  v_claim INT;
  v_company INT;
  v_pricing INT;
  v_tax INT;
  v_notif INT;
  v_email INT;
  v_total INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VÉRIFICATION POST-NETTOYAGE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

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

  SELECT COUNT(*) INTO v_notif FROM (
    SELECT organization_id FROM notification_settings
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_email FROM (
    SELECT organization_id FROM email_settings
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id HAVING COUNT(*) > 1
  ) t;

  v_total := v_claim + v_company + v_pricing + v_tax + v_notif + v_email;

  RAISE NOTICE 'Duplicates restants par table:';
  RAISE NOTICE '  - claim_settings: %', v_claim;
  RAISE NOTICE '  - company_settings: %', v_company;
  RAISE NOTICE '  - pricing_settings: %', v_pricing;
  RAISE NOTICE '  - tax_settings: %', v_tax;
  RAISE NOTICE '  - notification_settings: %', v_notif;
  RAISE NOTICE '  - email_settings: %', v_email;
  RAISE NOTICE '';

  IF v_total = 0 THEN
    RAISE NOTICE '🎉 PARFAIT! Aucun duplicate restant!';
  ELSE
    RAISE WARNING '⚠️ Il reste % duplicate(s) - exécutez à nouveau le script', v_total;
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- PHASE 4: AJOUT DES CONTRAINTES UNIQUE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔒 AJOUT DES CONTRAINTES UNIQUE';
  RAISE NOTICE '========================================';
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
      RAISE NOTICE '✓ claim_settings: Contrainte ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ claim_settings: Impossible - duplicates restants';
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
      RAISE NOTICE '✓ company_settings: Contrainte ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ company_settings: Impossible - duplicates restants';
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
      RAISE NOTICE '✓ pricing_settings: Contrainte ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ pricing_settings: Impossible - duplicates restants';
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
      RAISE NOTICE '✓ tax_settings: Contrainte ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ tax_settings: Impossible - duplicates restants';
    END;
  ELSE
    RAISE NOTICE '✓ tax_settings: Contrainte déjà présente';
  END IF;

  -- notification_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE notification_settings
      ADD CONSTRAINT notification_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✓ notification_settings: Contrainte ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ notification_settings: Impossible - duplicates restants';
    EXCEPTION WHEN others THEN
      RAISE NOTICE '⚠️ notification_settings: Contrainte non applicable (table peut avoir user_id)';
    END;
  ELSE
    RAISE NOTICE '✓ notification_settings: Contrainte déjà présente';
  END IF;

  -- email_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'email_settings_organization_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE email_settings
      ADD CONSTRAINT email_settings_organization_id_unique
      UNIQUE (organization_id);
      RAISE NOTICE '✓ email_settings: Contrainte ajoutée';
    EXCEPTION WHEN unique_violation THEN
      RAISE WARNING '⚠️ email_settings: Impossible - duplicates restants';
    EXCEPTION WHEN others THEN
      RAISE NOTICE '⚠️ email_settings: Contrainte non applicable';
    END;
  ELSE
    RAISE NOTICE '✓ email_settings: Contrainte déjà présente';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TERMINÉ!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Rechargez votre application (F5)';
  RAISE NOTICE '2. Ouvrez la console (F12)';
  RAISE NOTICE '3. Naviguez dans l''app';
  RAISE NOTICE '4. Vérifiez que l''erreur PGRST116 a disparu';
  RAISE NOTICE '';
END $$;
