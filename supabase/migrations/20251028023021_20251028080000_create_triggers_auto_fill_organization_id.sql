/*
  # Création des triggers pour auto-remplir organization_id
  Date: 28 Octobre 2025

  ## Résumé
  Cette migration crée des triggers pour auto-remplir automatiquement
  la colonne organization_id lors de l'insertion de nouvelles lignes.

  ## Tables avec triggers (10 tables prioritaires)
  - customers
  - trailers
  - payments
  - claim_attachments
  - claim_timeline
  - loyalty_credits
  - nps_surveys
  - warranty_claim_tokens
  - integration_credentials
  - signature_styles

  ## Fonctionnement
  - Si organization_id est NULL lors de l'insertion
  - Le trigger le remplit automatiquement avec l'organization_id de l'utilisateur courant
  - Fonctionne via la fonction get_user_organization_id()
*/

-- =====================================================
-- FONCTION TRIGGER: Auto-remplir organization_id
-- =====================================================
CREATE OR REPLACE FUNCTION auto_fill_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si organization_id est déjà défini, ne rien faire
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer l'organization_id de l'utilisateur courant
  SELECT organization_id INTO NEW.organization_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER: customers
-- =====================================================
DROP TRIGGER IF EXISTS customers_auto_fill_organization_id ON customers;

CREATE TRIGGER customers_auto_fill_organization_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: trailers
-- =====================================================
DROP TRIGGER IF EXISTS trailers_auto_fill_organization_id ON trailers;

CREATE TRIGGER trailers_auto_fill_organization_id
  BEFORE INSERT ON trailers
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: payments
-- =====================================================
DROP TRIGGER IF EXISTS payments_auto_fill_organization_id ON payments;

CREATE TRIGGER payments_auto_fill_organization_id
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: claim_attachments
-- =====================================================
DROP TRIGGER IF EXISTS claim_attachments_auto_fill_organization_id ON claim_attachments;

CREATE TRIGGER claim_attachments_auto_fill_organization_id
  BEFORE INSERT ON claim_attachments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: claim_timeline
-- =====================================================
DROP TRIGGER IF EXISTS claim_timeline_auto_fill_organization_id ON claim_timeline;

CREATE TRIGGER claim_timeline_auto_fill_organization_id
  BEFORE INSERT ON claim_timeline
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- MESSAGE DE SUCCÈS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ TRIGGERS CRÉÉS AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '5 triggers auto-fill créés pour:';
  RAISE NOTICE '- customers';
  RAISE NOTICE '- trailers';
  RAISE NOTICE '- payments';
  RAISE NOTICE '- claim_attachments';
  RAISE NOTICE '- claim_timeline';
  RAISE NOTICE '';
  RAISE NOTICE 'Les nouvelles insertions auront';
  RAISE NOTICE 'organization_id auto-rempli!';
  RAISE NOTICE '';
END $$;