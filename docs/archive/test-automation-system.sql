/*
  Test Script - Automation System

  Ce script teste que tous les composants du système d'automatisation
  sont correctement configurés et fonctionnels.
*/

-- ============================================================================
-- TEST 1: Vérifier que toutes les tables existent
-- ============================================================================

DO $$
DECLARE
  missing_tables text[];
  expected_tables text[] := ARRAY[
    'automation_workflows',
    'automation_executions',
    'notification_preferences',
    'scheduled_tasks',
    'automation_logs'
  ];
  table_name text;
BEGIN
  RAISE NOTICE '=== TEST 1: Vérification des tables ===';

  FOREACH table_name IN ARRAY expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = table_name
      AND table_schema = 'public'
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    ELSE
      RAISE NOTICE '✓ Table % existe', table_name;
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION '✗ Tables manquantes: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✓ Toutes les tables existent!';
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Vérifier les colonnes critiques
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: Vérification des colonnes ===';

  -- automation_workflows
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_workflows'
    AND column_name = 'trigger_type'
  ) THEN
    RAISE EXCEPTION '✗ Colonne trigger_type manquante dans automation_workflows';
  END IF;
  RAISE NOTICE '✓ automation_workflows.trigger_type existe';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_workflows'
    AND column_name = 'actions'
  ) THEN
    RAISE EXCEPTION '✗ Colonne actions manquante dans automation_workflows';
  END IF;
  RAISE NOTICE '✓ automation_workflows.actions existe';

  -- notification_preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name = 'email_enabled'
  ) THEN
    RAISE EXCEPTION '✗ Colonne email_enabled manquante dans notification_preferences';
  END IF;
  RAISE NOTICE '✓ notification_preferences.email_enabled existe';

  RAISE NOTICE '✓ Toutes les colonnes critiques existent!';
END $$;

-- ============================================================================
-- TEST 3: Vérifier les indexes
-- ============================================================================

DO $$
DECLARE
  index_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Vérification des indexes ===';

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN (
    'automation_workflows',
    'automation_executions',
    'notification_preferences',
    'scheduled_tasks',
    'automation_logs'
  );

  IF index_count < 10 THEN
    RAISE WARNING '⚠ Seulement % indexes trouvés (attendu: 10+)', index_count;
  ELSE
    RAISE NOTICE '✓ % indexes trouvés', index_count;
  END IF;

  -- Vérifier index important
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'automation_workflows'
    AND indexname LIKE '%org%'
  ) THEN
    RAISE EXCEPTION '✗ Index organization_id manquant sur automation_workflows';
  END IF;
  RAISE NOTICE '✓ Index organization_id existe sur automation_workflows';
END $$;

-- ============================================================================
-- TEST 4: Vérifier RLS est activé
-- ============================================================================

DO $$
DECLARE
  table_name text;
  tables_without_rls text[] := '{}';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Vérification RLS ===';

  FOR table_name IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'automation_workflows',
      'automation_executions',
      'notification_preferences',
      'scheduled_tasks',
      'automation_logs'
    )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = table_name
      AND rowsecurity = true
    ) THEN
      tables_without_rls := array_append(tables_without_rls, table_name);
    ELSE
      RAISE NOTICE '✓ RLS activé sur %', table_name;
    END IF;
  END LOOP;

  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE EXCEPTION '✗ RLS manquant sur: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE '✓ RLS activé sur toutes les tables!';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Vérifier les policies RLS
-- ============================================================================

DO $$
DECLARE
  policy_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: Vérification des policies RLS ===';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN (
    'automation_workflows',
    'automation_executions',
    'notification_preferences',
    'scheduled_tasks',
    'automation_logs'
  );

  IF policy_count < 8 THEN
    RAISE EXCEPTION '✗ Seulement % policies trouvées (attendu: 8+)', policy_count;
  ELSE
    RAISE NOTICE '✓ % policies RLS trouvées', policy_count;
  END IF;

  -- Vérifier qu'il y a des policies pour les admins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automation_workflows'
    AND policyname LIKE '%admin%'
  ) THEN
    RAISE WARNING '⚠ Aucune policy admin trouvée sur automation_workflows';
  ELSE
    RAISE NOTICE '✓ Policy admin existe sur automation_workflows';
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Vérifier les fonctions
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: Vérification des fonctions ===';

  -- update_workflow_execution_stats
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_workflow_execution_stats'
  ) THEN
    RAISE EXCEPTION '✗ Fonction update_workflow_execution_stats manquante';
  END IF;
  RAISE NOTICE '✓ Fonction update_workflow_execution_stats existe';

  -- create_default_notification_preferences
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_default_notification_preferences'
  ) THEN
    RAISE EXCEPTION '✗ Fonction create_default_notification_preferences manquante';
  END IF;
  RAISE NOTICE '✓ Fonction create_default_notification_preferences existe';

  -- create_default_automation_workflows
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_default_automation_workflows'
  ) THEN
    RAISE EXCEPTION '✗ Fonction create_default_automation_workflows manquante';
  END IF;
  RAISE NOTICE '✓ Fonction create_default_automation_workflows existe';

  RAISE NOTICE '✓ Toutes les fonctions critiques existent!';
END $$;

-- ============================================================================
-- TEST 7: Vérifier les triggers
-- ============================================================================

DO $$
DECLARE
  trigger_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 7: Vérification des triggers ===';

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname LIKE '%workflow%' OR tgname LIKE '%notification%';

  IF trigger_count < 2 THEN
    RAISE WARNING '⚠ Seulement % triggers trouvés (attendu: 2+)', trigger_count;
  ELSE
    RAISE NOTICE '✓ % triggers trouvés', trigger_count;
  END IF;

  -- Vérifier trigger spécifique
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_workflow_stats'
  ) THEN
    RAISE WARNING '⚠ Trigger trigger_update_workflow_stats manquant';
  ELSE
    RAISE NOTICE '✓ Trigger trigger_update_workflow_stats existe';
  END IF;
END $$;

-- ============================================================================
-- TEST 8: Test d'insertion basique
-- ============================================================================

DO $$
DECLARE
  test_org_id uuid := gen_random_uuid();
  test_workflow_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 8: Test d''insertion ===';

  -- Créer une organisation de test
  INSERT INTO organizations (id, name, slug, type)
  VALUES (test_org_id, 'Test Org', 'test-org', 'franchisee');
  RAISE NOTICE '✓ Organisation de test créée';

  -- Tester création de workflow
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    actions,
    is_active
  )
  VALUES (
    test_org_id,
    'Test Workflow',
    'Test description',
    'warranty_created',
    '[{"type": "send_email", "to": "customer"}]'::jsonb,
    true
  )
  RETURNING id INTO test_workflow_id;
  RAISE NOTICE '✓ Workflow de test créé: %', test_workflow_id;

  -- Tester création d'exécution
  INSERT INTO automation_executions (
    workflow_id,
    organization_id,
    trigger_data,
    status
  )
  VALUES (
    test_workflow_id,
    test_org_id,
    '{"test": true}'::jsonb,
    'pending'
  );
  RAISE NOTICE '✓ Exécution de test créée';

  -- Nettoyage
  DELETE FROM automation_executions WHERE organization_id = test_org_id;
  DELETE FROM automation_workflows WHERE organization_id = test_org_id;
  DELETE FROM organizations WHERE id = test_org_id;
  RAISE NOTICE '✓ Données de test nettoyées';

  RAISE NOTICE '✓ Tests d''insertion réussis!';
END $$;

-- ============================================================================
-- TEST 9: Test de la fonction create_default_automation_workflows
-- ============================================================================

DO $$
DECLARE
  test_org_id uuid := gen_random_uuid();
  workflow_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 9: Test create_default_automation_workflows ===';

  -- Créer une organisation de test
  INSERT INTO organizations (id, name, slug, type)
  VALUES (test_org_id, 'Test Org 2', 'test-org-2', 'franchisee');
  RAISE NOTICE '✓ Organisation de test créée';

  -- Appeler la fonction
  PERFORM create_default_automation_workflows(test_org_id);
  RAISE NOTICE '✓ Fonction create_default_automation_workflows appelée';

  -- Vérifier que les workflows ont été créés
  SELECT COUNT(*) INTO workflow_count
  FROM automation_workflows
  WHERE organization_id = test_org_id;

  IF workflow_count < 6 THEN
    RAISE EXCEPTION '✗ Seulement % workflows créés (attendu: 6)', workflow_count;
  ELSE
    RAISE NOTICE '✓ % workflows par défaut créés', workflow_count;
  END IF;

  -- Vérifier que tous sont actifs
  IF EXISTS (
    SELECT 1 FROM automation_workflows
    WHERE organization_id = test_org_id
    AND is_active = false
  ) THEN
    RAISE WARNING '⚠ Certains workflows ne sont pas actifs';
  ELSE
    RAISE NOTICE '✓ Tous les workflows sont actifs';
  END IF;

  -- Nettoyage
  DELETE FROM automation_workflows WHERE organization_id = test_org_id;
  DELETE FROM organizations WHERE id = test_org_id;
  RAISE NOTICE '✓ Données de test nettoyées';

  RAISE NOTICE '✓ Fonction create_default_automation_workflows fonctionne!';
END $$;

-- ============================================================================
-- RÉSUMÉ FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TOUS LES TESTS SONT PASSÉS!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Le système d''automatisation est prêt à être utilisé!';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes:';
  RAISE NOTICE '1. Déployer les Edge Functions';
  RAISE NOTICE '   supabase functions deploy automation-engine';
  RAISE NOTICE '   supabase functions deploy warranty-expiration-checker-advanced';
  RAISE NOTICE '';
  RAISE NOTICE '2. Initialiser les workflows pour vos organisations';
  RAISE NOTICE '   SELECT create_default_automation_workflows(''your-org-id'');';
  RAISE NOTICE '';
  RAISE NOTICE '3. Accéder au dashboard: /automation';
  RAISE NOTICE '';
END $$;
