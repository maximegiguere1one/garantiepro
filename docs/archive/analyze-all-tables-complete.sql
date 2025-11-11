/*
  ANALYSE COMPLÈTE DE TOUTES LES TABLES SUPABASE
  Date: 28 Octobre 2025

  Ce script analyse en profondeur toutes les tables de la base de données
  et génère un rapport détaillé de leur structure.
*/

-- =====================================================
-- PARTIE 1: LISTE DE TOUTES LES TABLES
-- =====================================================
SELECT
  '=== TOUTES LES TABLES DANS SUPABASE ===' as section,
  '' as details
UNION ALL
SELECT
  table_name::text as section,
  table_type::text as details
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY section;

-- =====================================================
-- PARTIE 2: DÉTAIL DE TOUTES LES COLONNES PAR TABLE
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: profiles ===' as info,
  '' as colonne,
  '' as type,
  '' as nullable,
  '' as defaut
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type,
  is_nullable::text as nullable,
  COALESCE(column_default::text, 'NULL') as defaut
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 3: COLONNES DE LA TABLE organizations
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: organizations ===' as info,
  '' as colonne,
  '' as type,
  '' as nullable
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type,
  is_nullable::text as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 4: COLONNES DE LA TABLE warranties
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: warranties ===' as info,
  '' as colonne,
  '' as type
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'warranties'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 5: COLONNES DE LA TABLE warranty_plans
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: warranty_plans ===' as info,
  '' as colonne,
  '' as type
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'warranty_plans'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 6: COLONNES DE LA TABLE customers
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: customers ===' as info,
  '' as colonne,
  '' as type
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 7: COLONNES DE LA TABLE claims
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: claims ===' as info,
  '' as colonne,
  '' as type
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'claims'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 8: COLONNES DE LA TABLE company_settings
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: company_settings ===' as info,
  '' as colonne,
  '' as type
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_settings'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 9: COLONNES DE LA TABLE franchisee_invitations
-- =====================================================
SELECT
  '=== STRUCTURE DÉTAILLÉE: franchisee_invitations ===' as info,
  '' as colonne,
  '' as type
UNION ALL
SELECT
  '' as info,
  column_name::text as colonne,
  data_type::text as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'franchisee_invitations'
ORDER BY ordinal_position;

-- =====================================================
-- PARTIE 10: VÉRIFICATION DES COLONNES organization_id
-- =====================================================
SELECT
  '=== TABLES AVEC organization_id ===' as info,
  table_name::text as table_avec_org_id,
  column_name::text as colonne
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
ORDER BY table_name;

-- =====================================================
-- PARTIE 11: VÉRIFICATION DES COLONNES user_id
-- =====================================================
SELECT
  '=== TABLES AVEC user_id ===' as info,
  table_name::text as table_avec_user_id,
  column_name::text as colonne
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
ORDER BY table_name;

-- =====================================================
-- PARTIE 12: TOUTES LES TABLES DE SETTINGS
-- =====================================================
SELECT
  '=== TOUTES LES TABLES *_settings ===' as info,
  table_name::text as table_settings
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%_settings'
ORDER BY table_name;

-- =====================================================
-- PARTIE 13: CONTRAINTES ET INDEX
-- =====================================================
SELECT
  '=== CONTRAINTES PRIMARY KEY ===' as info,
  tc.table_name::text as table_name,
  tc.constraint_name::text as constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name;

-- =====================================================
-- PARTIE 14: COLONNES DE TOUTES LES TABLES (RÉSUMÉ)
-- =====================================================
SELECT
  table_name::text as table_name,
  COUNT(*)::text as nombre_colonnes
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- =====================================================
-- PARTIE 15: DÉTECTION DES TABLES MANQUANTES CRITIQUES
-- =====================================================
SELECT
  '=== VÉRIFICATION DES TABLES CRITIQUES ===' as info,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_queue')
    THEN '✓ email_queue existe'
    ELSE '✗ email_queue MANQUANTE'
  END as email_queue,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs')
    THEN '✓ error_logs existe'
    ELSE '✗ error_logs MANQUANTE'
  END as error_logs,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warranty_claim_tokens')
    THEN '✓ warranty_claim_tokens existe'
    ELSE '✗ warranty_claim_tokens MANQUANTE'
  END as warranty_claim_tokens;
