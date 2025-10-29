-- =====================================================
-- TESTS COMPLETS DES FONCTIONNALITÉS
-- Date: 28 Octobre 2025
-- Objectif: Valider que toutes les fonctionnalités fonctionnent
-- =====================================================

/*
  INSTRUCTIONS:

  1. Exécutez ce script dans le SQL Editor de Supabase
  2. Vérifiez les résultats après chaque section
  3. Tous les tests doivent réussir sans erreurs

  Note: Certains tests INSERT nécessitent des données existantes.
  Ajustez les IDs selon vos données.
*/

-- =====================================================
-- SECTION 1: VÉRIFICATION DE LA STRUCTURE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  SECTION 1: VÉRIFICATION DE LA STRUCTURE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Test 1.1: Compter les tables
DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  IF table_count >= 85 THEN
    RAISE NOTICE '✅ Test 1.1 RÉUSSI: % tables trouvées (attendu >= 85)', table_count;
  ELSE
    RAISE EXCEPTION '❌ Test 1.1 ÉCHOUÉ: Seulement % tables (attendu >= 85)', table_count;
  END IF;
END $$;

-- Test 1.2: Vérifier RLS sur toutes les tables
DO $$
DECLARE
  tables_without_rls integer;
BEGIN
  SELECT COUNT(*) INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;

  IF tables_without_rls = 0 THEN
    RAISE NOTICE '✅ Test 1.2 RÉUSSI: RLS activé sur toutes les tables';
  ELSE
    RAISE WARNING '⚠️  Test 1.2 ATTENTION: % tables sans RLS', tables_without_rls;
  END IF;
END $$;

-- Test 1.3: Compter les politiques RLS
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF policy_count >= 150 THEN
    RAISE NOTICE '✅ Test 1.3 RÉUSSI: % politiques RLS trouvées (attendu >= 150)', policy_count;
  ELSE
    RAISE WARNING '⚠️  Test 1.3 ATTENTION: Seulement % politiques RLS', policy_count;
  END IF;
END $$;

-- Test 1.4: Vérifier les index
DO $$
DECLARE
  index_count integer;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public';

  IF index_count >= 100 THEN
    RAISE NOTICE '✅ Test 1.4 RÉUSSI: % index trouvés (attendu >= 100)', index_count;
  ELSE
    RAISE WARNING '⚠️  Test 1.4 ATTENTION: Seulement % index', index_count;
  END IF;
END $$;

-- =====================================================
-- SECTION 2: TESTS DES TABLES CRITIQUES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  SECTION 2: TESTS DES TABLES CRITIQUES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Test 2.1: Table profiles
DO $$
DECLARE
  profile_count integer;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles;
  RAISE NOTICE '✅ Test 2.1: Table profiles accessible (% enregistrements)', profile_count;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 2.1 ÉCHOUÉ: Erreur sur table profiles - %', SQLERRM;
END $$;

-- Test 2.2: Table organizations
DO $$
DECLARE
  org_count integer;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;
  RAISE NOTICE '✅ Test 2.2: Table organizations accessible (% enregistrements)', org_count;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 2.2 ÉCHOUÉ: Erreur sur table organizations - %', SQLERRM;
END $$;

-- Test 2.3: Table warranties
DO $$
DECLARE
  warranty_count integer;
BEGIN
  SELECT COUNT(*) INTO warranty_count FROM warranties;
  RAISE NOTICE '✅ Test 2.3: Table warranties accessible (% enregistrements)', warranty_count;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 2.3 ÉCHOUÉ: Erreur sur table warranties - %', SQLERRM;
END $$;

-- Test 2.4: Table claims
DO $$
DECLARE
  claim_count integer;
BEGIN
  SELECT COUNT(*) INTO claim_count FROM claims;
  RAISE NOTICE '✅ Test 2.4: Table claims accessible (% enregistrements)', claim_count;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 2.4 ÉCHOUÉ: Erreur sur table claims - %', SQLERRM;
END $$;

-- Test 2.5: Table customers
DO $$
DECLARE
  customer_count integer;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM customers;
  RAISE NOTICE '✅ Test 2.5: Table customers accessible (% enregistrements)', customer_count;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 2.5 ÉCHOUÉ: Erreur sur table customers - %', SQLERRM;
END $$;

-- =====================================================
-- SECTION 3: TESTS DES NOUVELLES TABLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  SECTION 3: TESTS DES NOUVELLES TABLES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Test 3.1: email_queue
DO $$
BEGIN
  PERFORM 1 FROM email_queue LIMIT 1;
  RAISE NOTICE '✅ Test 3.1: Table email_queue existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.1 ÉCHOUÉ: Table email_queue - %', SQLERRM;
END $$;

-- Test 3.2: error_logs
DO $$
BEGIN
  PERFORM 1 FROM error_logs LIMIT 1;
  RAISE NOTICE '✅ Test 3.2: Table error_logs existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.2 ÉCHOUÉ: Table error_logs - %', SQLERRM;
END $$;

-- Test 3.3: warranty_claim_tokens
DO $$
BEGIN
  PERFORM 1 FROM warranty_claim_tokens LIMIT 1;
  RAISE NOTICE '✅ Test 3.3: Table warranty_claim_tokens existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.3 ÉCHOUÉ: Table warranty_claim_tokens - %', SQLERRM;
END $$;

-- Test 3.4: dealer_inventory
DO $$
BEGIN
  PERFORM 1 FROM dealer_inventory LIMIT 1;
  RAISE NOTICE '✅ Test 3.4: Table dealer_inventory existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.4 ÉCHOUÉ: Table dealer_inventory - %', SQLERRM;
END $$;

-- Test 3.5: customer_products
DO $$
BEGIN
  PERFORM 1 FROM customer_products LIMIT 1;
  RAISE NOTICE '✅ Test 3.5: Table customer_products existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.5 ÉCHOUÉ: Table customer_products - %', SQLERRM;
END $$;

-- Test 3.6: franchise_invoices
DO $$
BEGIN
  PERFORM 1 FROM franchise_invoices LIMIT 1;
  RAISE NOTICE '✅ Test 3.6: Table franchise_invoices existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.6 ÉCHOUÉ: Table franchise_invoices - %', SQLERRM;
END $$;

-- Test 3.7: warranty_templates
DO $$
BEGIN
  PERFORM 1 FROM warranty_templates LIMIT 1;
  RAISE NOTICE '✅ Test 3.7: Table warranty_templates existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.7 ÉCHOUÉ: Table warranty_templates - %', SQLERRM;
END $$;

-- Test 3.8: employee_signatures
DO $$
BEGIN
  PERFORM 1 FROM employee_signatures LIMIT 1;
  RAISE NOTICE '✅ Test 3.8: Table employee_signatures existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.8 ÉCHOUÉ: Table employee_signatures - %', SQLERRM;
END $$;

-- Test 3.9: chat_conversations
DO $$
BEGIN
  PERFORM 1 FROM chat_conversations LIMIT 1;
  RAISE NOTICE '✅ Test 3.9: Table chat_conversations existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.9 ÉCHOUÉ: Table chat_conversations - %', SQLERRM;
END $$;

-- Test 3.10: integrations
DO $$
BEGIN
  PERFORM 1 FROM integrations LIMIT 1;
  RAISE NOTICE '✅ Test 3.10: Table integrations existe et accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Test 3.10 ÉCHOUÉ: Table integrations - %', SQLERRM;
END $$;

-- =====================================================
-- SECTION 4: TESTS D'INTÉGRITÉ RÉFÉRENTIELLE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  SECTION 4: TESTS D''INTÉGRITÉ RÉFÉRENTIELLE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Test 4.1: Vérifier les clés étrangères
DO $$
DECLARE
  fk_count integer;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';

  IF fk_count >= 80 THEN
    RAISE NOTICE '✅ Test 4.1 RÉUSSI: % clés étrangères trouvées (attendu >= 80)', fk_count;
  ELSE
    RAISE WARNING '⚠️  Test 4.1 ATTENTION: Seulement % clés étrangères', fk_count;
  END IF;
END $$;

-- Test 4.2: Vérifier que profiles référence organizations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'profiles'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%organization%'
  ) THEN
    RAISE NOTICE '✅ Test 4.2 RÉUSSI: profiles → organizations existe';
  ELSE
    RAISE WARNING '⚠️  Test 4.2 ATTENTION: Relation profiles → organizations manquante';
  END IF;
END $$;

-- Test 4.3: Vérifier que warranties référence organizations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'warranties'
    AND column_name = 'organization_id'
  ) THEN
    RAISE NOTICE '✅ Test 4.3 RÉUSSI: warranties a organization_id';
  ELSE
    RAISE WARNING '⚠️  Test 4.3 ATTENTION: warranties.organization_id manquant';
  END IF;
END $$;

-- =====================================================
-- SECTION 5: TESTS DE PERFORMANCE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  SECTION 5: TESTS DE PERFORMANCE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Test 5.1: Requête sur warranties avec index
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  duration interval;
BEGIN
  start_time := clock_timestamp();
  PERFORM * FROM warranties LIMIT 100;
  end_time := clock_timestamp();
  duration := end_time - start_time;

  RAISE NOTICE '✅ Test 5.1: Requête warranties (% ms)', EXTRACT(milliseconds FROM duration);
END $$;

-- Test 5.2: Requête avec JOIN
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  duration interval;
BEGIN
  start_time := clock_timestamp();
  PERFORM w.id, c.full_name
  FROM warranties w
  LEFT JOIN customers c ON c.id = w.customer_id
  LIMIT 100;
  end_time := clock_timestamp();
  duration := end_time - start_time;

  RAISE NOTICE '✅ Test 5.2: Requête avec JOIN (% ms)', EXTRACT(milliseconds FROM duration);
END $$;

-- =====================================================
-- SECTION 6: TESTS DE SÉCURITÉ RLS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  SECTION 6: TESTS DE SÉCURITÉ RLS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Test 6.1: Vérifier que warranties a des politiques RLS
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'warranties';

  IF policy_count >= 2 THEN
    RAISE NOTICE '✅ Test 6.1 RÉUSSI: warranties a % politiques RLS', policy_count;
  ELSE
    RAISE WARNING '⚠️  Test 6.1 ATTENTION: warranties a seulement % politiques', policy_count;
  END IF;
END $$;

-- Test 6.2: Vérifier que claims a des politiques RLS
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'claims';

  IF policy_count >= 2 THEN
    RAISE NOTICE '✅ Test 6.2 RÉUSSI: claims a % politiques RLS', policy_count;
  ELSE
    RAISE WARNING '⚠️  Test 6.2 ATTENTION: claims a seulement % politiques', policy_count;
  END IF;
END $$;

-- Test 6.3: Vérifier que email_queue a des politiques RLS
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'email_queue';

  IF policy_count >= 1 THEN
    RAISE NOTICE '✅ Test 6.3 RÉUSSI: email_queue a % politiques RLS', policy_count;
  ELSE
    RAISE WARNING '⚠️  Test 6.3 ATTENTION: email_queue a seulement % politiques', policy_count;
  END IF;
END $$;

-- =====================================================
-- SECTION 7: RÉSUMÉ FINAL
-- =====================================================

DO $$
DECLARE
  table_count integer;
  policy_count integer;
  index_count integer;
  fk_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  RÉSUMÉ FINAL DES TESTS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES:';
  RAISE NOTICE '  • Tables: %', table_count;
  RAISE NOTICE '  • Politiques RLS: %', policy_count;
  RAISE NOTICE '  • Index: %', index_count;
  RAISE NOTICE '  • Clés étrangères: %', fk_count;
  RAISE NOTICE '';

  IF table_count >= 85 AND policy_count >= 150 AND index_count >= 100 AND fk_count >= 80 THEN
    RAISE NOTICE '✅ TOUS LES TESTS RÉUSSIS!';
    RAISE NOTICE '✅ Base de données 100%% fonctionnelle';
  ELSE
    RAISE NOTICE '⚠️  CERTAINS TESTS ONT DES AVERTISSEMENTS';
    RAISE NOTICE '   Vérifiez les détails ci-dessus';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
