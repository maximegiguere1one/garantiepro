# Plan d'Action: Restauration des Tables Manquantes

## Vue d'Ensemble

**Date:** 28 Octobre 2025
**Tables existantes:** 31 sur 86
**Tables manquantes:** 55
**Migrations disponibles:** 171 fichiers SQL

---

## Étape 1: Application du Script Prioritaire CRITIQUE ✅

### Tables à Créer (9 tables essentielles)

J'ai créé le fichier: `SCRIPT_APPLICATION_MIGRATIONS_MANQUANTES.sql`

Ce script contient les tables les plus critiques:

1. **email_queue** - File d'attente d'emails (ESSENTIEL pour notifications)
2. **error_logs** - Logs d'erreurs (ESSENTIEL pour debugging)
3. **warranty_claim_tokens** - Tokens de réclamation publique (ESSENTIEL)
4. **dealer_inventory** - Inventaire du dealer
5. **customer_products** - Produits clients
6. **warranty_download_tokens** - Tokens de téléchargement
7. **warranty_download_logs** - Logs de téléchargement
8. **warranty_templates** - Templates de garanties
9. **warranty_template_sections** - Sections de templates

### Comment Appliquer

1. Aller dans le tableau de bord Supabase
2. Menu: **Database → SQL Editor**
3. Créer un nouveau query
4. Copier-coller le contenu de `SCRIPT_APPLICATION_MIGRATIONS_MANQUANTES.sql`
5. Cliquer sur **Run**
6. Vérifier les messages de succès dans les logs

---

## Étape 2: Tables de Facturation (Priorité HAUTE)

### À appliquer manuellement via Supabase Dashboard

Tables à créer:
- **organization_billing_config**
- **franchise_invoices**
- **warranty_transactions**
- **franchise_payments**
- **stripe_customer_organizations**
- **warranty_commissions**

**Migration source:** `20251005010940_create_billing_tables.sql`

---

## Étape 3: Tables de Signatures (Priorité HAUTE)

Tables à créer:
- **employee_signatures**
- **signature_methods**
- **physical_signature_tracking**
- **scanned_documents**
- **signature_witnesses**
- **identity_verifications**
- **signature_audit_trail**

**Migrations sources:**
- `20251014211858_create_hybrid_signature_system.sql`
- `20251015000305_20251014235000_create_employee_signatures_system.sql`
- `20251005184601_create_signature_audit_trail_table.sql`

---

## Étape 4: Tables de Communication (Priorité MOYENNE)

Tables à créer:
- **chat_conversations**
- **chat_messages**
- **claim_status_updates**
- **push_subscriptions**
- **typing_indicators**

**Migration source:** `20251010210224_create_realtime_chat_system.sql`

---

## Étape 5: Tables d'Intégrations (Priorité MOYENNE)

Tables à créer:
- **integrations**
- **integration_credentials**
- **integration_logs**
- **webhook_endpoints**

**Migration source:** `20251004233835_create_integrations_system.sql`

---

## Étape 6: Tables d'Organisation Avancée (Priorité MOYENNE)

Tables à créer:
- **organization_activities**
- **organization_alerts**
- **organization_communications**
- **organization_notes**
- **organization_tags**
- **organization_tag_assignments**

**Migration source:** `20251005173648_create_organization_management_enhancements.sql`

---

## Étape 7: Tables de Performance (Priorité BASSE)

Tables à créer:
- **query_cache**
- **dashboard_stats**
- **query_performance_log**

**Migrations sources:**
- `20251007231021_fix_missing_cache_functions.sql`
- `20251007230000_ultra_performance_optimizations.sql`

---

## Étape 8: Tables de Statistiques (Priorité BASSE)

Tables à créer:
- **franchise_stats**
- **master_activity_log**
- **franchise_messages**
- **commission_rules**

**Migrations sources:**
- `20251012173436_create_hierarchical_multi_tenant_architecture_v2.sql`
- `20251012210000_create_franchise_messages_table.sql`
- `20251012200000_create_franchise_self_management_system.sql`

---

## Étape 9: Tables Utilitaires (Priorité BASSE)

Tables à créer:
- **user_notification_preferences**
- **tour_progress**
- **ab_test_assignments**
- **trailer_brands**
- **trailer_models**
- **token_access_rate_limit**
- **public_claim_access_logs**
- **push_notification_logs**
- **invitation_logs**
- **employee_invitations**
- **document_generation_status**
- **system_health_checks**
- **email_history**

**Migrations sources:** Multiples (voir MEGA_ANALYSE_TABLES_SUPABASE_OCT28_2025.md)

---

## Vérification Post-Application

### Script de Vérification

```sql
-- Compter les tables
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Lister toutes les tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Vérifier les tables critiques
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_queue') THEN '✅'
    ELSE '❌'
  END as email_queue,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN '✅'
    ELSE '❌'
  END as error_logs,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warranty_claim_tokens') THEN '✅'
    ELSE '❌'
  END as warranty_claim_tokens,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dealer_inventory') THEN '✅'
    ELSE '❌'
  END as dealer_inventory,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_products') THEN '✅'
    ELSE '❌'
  END as customer_products;
```

---

## Ordre d'Exécution Recommandé

### Phase 1: Immédiat (Aujourd'hui)
1. ✅ Appliquer `SCRIPT_APPLICATION_MIGRATIONS_MANQUANTES.sql`
2. ✅ Vérifier les tables créées
3. ✅ Tester les fonctionnalités de base

### Phase 2: Court Terme (Cette Semaine)
4. Tables de facturation
5. Tables de signatures
6. Tables d'intégrations

### Phase 3: Moyen Terme (Ce Mois)
7. Tables de communication
8. Tables d'organisation avancée
9. Tables de performance

### Phase 4: Long Terme (Optionnel)
10. Tables de statistiques
11. Tables utilitaires
12. Optimisations avancées

---

## Commandes Utiles

### Vérifier la connexion Supabase
```bash
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Lister les migrations appliquées
```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;
```

### Vérifier les politiques RLS
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Points d'Attention

### ⚠️ Avertissements

1. **Dépendances entre tables** - Certaines tables dépendent d'autres
2. **Politiques RLS** - Toutes les tables doivent avoir des politiques RLS
3. **Index de performance** - Ne pas oublier les index
4. **Clés étrangères** - Vérifier l'intégrité référentielle
5. **Triggers** - Certaines tables ont des triggers automatiques

### ✅ Bonnes Pratiques

1. Appliquer les migrations une par une en phase de test
2. Vérifier les logs après chaque migration
3. Tester les fonctionnalités affectées après chaque groupe de tables
4. Faire un backup avant d'appliquer des migrations majeures
5. Documenter les tables intentionnellement omises

---

## Support et Debugging

### Si une migration échoue

1. Lire le message d'erreur complet
2. Vérifier les dépendances (tables référencées)
3. Vérifier si la table existe déjà
4. Consulter la migration source pour plus de détails
5. Appliquer les corrections nécessaires

### Logs à consulter

```sql
-- Voir les erreurs récentes
SELECT * FROM error_logs
ORDER BY created_at DESC
LIMIT 50;

-- Voir l'historique des modifications de paramètres
SELECT * FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 50;
```

---

## Résumé

**Actions Immédiates:**
1. ✅ Appliquer `SCRIPT_APPLICATION_MIGRATIONS_MANQUANTES.sql` (9 tables critiques)
2. Vérifier que les 9 tables sont créées
3. Tester les fonctionnalités de base

**Résultat attendu:**
- Passage de 31 tables à 40 tables (29% de progrès)
- Restauration des fonctionnalités critiques
- Base solide pour les prochaines étapes

**Objectif final:**
- 86 tables au total
- 100% des fonctionnalités opérationnelles
- Application complète et fonctionnelle
