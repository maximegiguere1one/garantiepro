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
-- TRIGGER: loyalty_credits
-- =====================================================
DROP TRIGGER IF EXISTS loyalty_credits_auto_fill_organization_id ON loyalty_credits;

CREATE TRIGGER loyalty_credits_auto_fill_organization_id
  BEFORE INSERT ON loyalty_credits
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: nps_surveys
-- =====================================================
DROP TRIGGER IF EXISTS nps_surveys_auto_fill_organization_id ON nps_surveys;

CREATE TRIGGER nps_surveys_auto_fill_organization_id
  BEFORE INSERT ON nps_surveys
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: warranty_claim_tokens
-- =====================================================
DROP TRIGGER IF EXISTS warranty_claim_tokens_auto_fill_organization_id ON warranty_claim_tokens;

CREATE TRIGGER warranty_claim_tokens_auto_fill_organization_id
  BEFORE INSERT ON warranty_claim_tokens
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: integration_credentials
-- =====================================================
DROP TRIGGER IF EXISTS integration_credentials_auto_fill_organization_id ON integration_credentials;

CREATE TRIGGER integration_credentials_auto_fill_organization_id
  BEFORE INSERT ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: signature_styles
-- =====================================================
DROP TRIGGER IF EXISTS signature_styles_auto_fill_organization_id ON signature_styles;

CREATE TRIGGER signature_styles_auto_fill_organization_id
  BEFORE INSERT ON signature_styles
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: franchise_invoices
-- =====================================================
DROP TRIGGER IF EXISTS franchise_invoices_auto_fill_organization_id ON franchise_invoices;

CREATE TRIGGER franchise_invoices_auto_fill_organization_id
  BEFORE INSERT ON franchise_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: franchise_payments
-- =====================================================
DROP TRIGGER IF EXISTS franchise_payments_auto_fill_organization_id ON franchise_payments;

CREATE TRIGGER franchise_payments_auto_fill_organization_id
  BEFORE INSERT ON franchise_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: pricing_rules
-- =====================================================
DROP TRIGGER IF EXISTS pricing_rules_auto_fill_organization_id ON pricing_rules;

CREATE TRIGGER pricing_rules_auto_fill_organization_id
  BEFORE INSERT ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGER: tax_rates
-- =====================================================
DROP TRIGGER IF EXISTS tax_rates_auto_fill_organization_id ON tax_rates;

CREATE TRIGGER tax_rates_auto_fill_organization_id
  BEFORE INSERT ON tax_rates
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
  RAISE NOTICE '14 triggers auto-fill créés pour:';
  RAISE NOTICE '- customers';
  RAISE NOTICE '- trailers';
  RAISE NOTICE '- payments';
  RAISE NOTICE '- claim_attachments';
  RAISE NOTICE '- claim_timeline';
  RAISE NOTICE '- loyalty_credits';
  RAISE NOTICE '- nps_surveys';
  RAISE NOTICE '- warranty_claim_tokens';
  RAISE NOTICE '- integration_credentials';
  RAISE NOTICE '- signature_styles';
  RAISE NOTICE '- franchise_invoices';
  RAISE NOTICE '- franchise_payments';
  RAISE NOTICE '- pricing_rules';
  RAISE NOTICE '- tax_rates';
  RAISE NOTICE '';
  RAISE NOTICE 'Les nouvelles insertions auront';
  RAISE NOTICE 'organization_id auto-rempli!';
  RAISE NOTICE '';
END $$;
