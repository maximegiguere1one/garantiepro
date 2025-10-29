/*
  # Ajout des Triggers Manquants - 7 Tables Finales
  Date: 28 Octobre 2025

  ## Tables de cette migration
  1. profiles - Profils utilisateurs (SPÉCIAL)
  2. public_claim_access_logs - Logs accès réclamations publiques
  3. stripe_customer_organizations - Organisations clients Stripe
  4. system_health_checks - Vérifications santé système
  5. trailer_brands - Marques de remorques
  6. trailer_models - Modèles de remorques
  7. webhook_endpoints - Points de terminaison webhooks

  ## Note sur profiles
  La table profiles a déjà organization_id rempli lors de la création via trigger.
  On ajoute un trigger de sécurité supplémentaire.
*/

-- =====================================================
-- TABLE: profiles (déjà géré mais on ajoute pour cohérence)
-- =====================================================
DROP TRIGGER IF EXISTS profiles_auto_fill_organization_id ON profiles;
CREATE TRIGGER profiles_auto_fill_organization_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TABLE: public_claim_access_logs
-- =====================================================
DROP TRIGGER IF EXISTS public_claim_access_logs_auto_fill_organization_id ON public_claim_access_logs;
CREATE TRIGGER public_claim_access_logs_auto_fill_organization_id
  BEFORE INSERT ON public_claim_access_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TABLE: stripe_customer_organizations
-- =====================================================
DROP TRIGGER IF EXISTS stripe_customer_organizations_auto_fill_organization_id ON stripe_customer_organizations;
CREATE TRIGGER stripe_customer_organizations_auto_fill_organization_id
  BEFORE INSERT ON stripe_customer_organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TABLE: system_health_checks
-- =====================================================
DROP TRIGGER IF EXISTS system_health_checks_auto_fill_organization_id ON system_health_checks;
CREATE TRIGGER system_health_checks_auto_fill_organization_id
  BEFORE INSERT ON system_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TABLE: trailer_brands
-- =====================================================
DROP TRIGGER IF EXISTS trailer_brands_auto_fill_organization_id ON trailer_brands;
CREATE TRIGGER trailer_brands_auto_fill_organization_id
  BEFORE INSERT ON trailer_brands
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TABLE: trailer_models
-- =====================================================
DROP TRIGGER IF EXISTS trailer_models_auto_fill_organization_id ON trailer_models;
CREATE TRIGGER trailer_models_auto_fill_organization_id
  BEFORE INSERT ON trailer_models
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TABLE: webhook_endpoints
-- =====================================================
DROP TRIGGER IF EXISTS webhook_endpoints_auto_fill_organization_id ON webhook_endpoints;
CREATE TRIGGER webhook_endpoints_auto_fill_organization_id
  BEFORE INSERT ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();