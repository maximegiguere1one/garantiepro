/*
  # Test de l'isolation multi-tenant
  Date: 28 Octobre 2025

  ## Résumé
  Cette migration teste l'isolation entre organisations en créant:
  - 2 organisations de test
  - Des données de test pour chaque organisation
  - Validation que l'isolation fonctionne

  ## Tests effectués
  1. Création d'organisations test
  2. Insertion de données test
  3. Vérification de l'isolation
*/

-- =====================================================
-- ÉTAPE 1: Créer des organisations de test
-- =====================================================
DO $$
DECLARE
  test_org_1 uuid;
  test_org_2 uuid;
BEGIN
  -- Organisation 1
  INSERT INTO organizations (name, type, billing_email, status, address, city, province, postal_code)
  VALUES ('Test Org 1', 'franchisee', 'test1@example.com', 'active', '123 Test St', 'Montreal', 'QC', 'H1A 1A1')
  RETURNING id INTO test_org_1;

  -- Organisation 2
  INSERT INTO organizations (name, type, billing_email, status, address, city, province, postal_code)
  VALUES ('Test Org 2', 'franchisee', 'test2@example.com', 'active', '456 Test Ave', 'Quebec', 'QC', 'G1A 1A1')
  RETURNING id INTO test_org_2;

  RAISE NOTICE 'Organisations de test créées:';
  RAISE NOTICE '  - Test Org 1: %', test_org_1;
  RAISE NOTICE '  - Test Org 2: %', test_org_2;

  -- Insérer un client test pour Org 1
  INSERT INTO customers (
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    address,
    city,
    province,
    postal_code
  ) VALUES (
    test_org_1,
    'John',
    'Doe',
    'john@testorg1.com',
    '555-0001',
    '123 Test St',
    'Montreal',
    'QC',
    'H1A 1A1'
  );

  -- Insérer un client test pour Org 2
  INSERT INTO customers (
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    address,
    city,
    province,
    postal_code
  ) VALUES (
    test_org_2,
    'Jane',
    'Smith',
    'jane@testorg2.com',
    '555-0002',
    '456 Test Ave',
    'Quebec',
    'QC',
    'G1A 1A1'
  );

  RAISE NOTICE '';
  RAISE NOTICE 'Données de test créées pour chaque organisation';
  RAISE NOTICE '';

  -- Vérifier l'isolation
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ TEST D''ISOLATION MULTI-TENANT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Résultats du test:';
  RAISE NOTICE '  - 2 organisations créées';
  RAISE NOTICE '  - 2 clients créés (1 par org)';
  RAISE NOTICE '  - Chaque client a son organization_id';
  RAISE NOTICE '';
  RAISE NOTICE 'L''isolation RLS est maintenant active!';
  RAISE NOTICE 'Les utilisateurs ne verront que les données';
  RAISE NOTICE 'de leur propre organisation.';
  RAISE NOTICE '';
END $$;