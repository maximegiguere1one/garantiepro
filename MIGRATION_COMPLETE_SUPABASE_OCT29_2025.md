# 🗄️ MIGRATION COMPLÈTE SUPABASE - Consolidation du Schéma

**Date**: 29 Octobre 2025  
**Fichier**: `supabase/migrations/20251029100000_complete_schema_consolidation.sql`  
**Lignes**: 1053  
**Status**: ✅ **PRÊT À APPLIQUER**

---

## 🎯 OBJECTIF

Cette migration consolide **TOUT** le schéma Supabase en un seul fichier SQL complet.

**Utilisations**:
- ✅ Créer une nouvelle base de données de zéro
- ✅ Vérifier que toutes les tables existent
- ✅ Référence complète du schéma
- ✅ Faciliter les déploiements futurs

---

## 📋 CONTENU DE LA MIGRATION

### 1. Extensions (2)
- `uuid-ossp` - Génération UUID
- `pg_trgm` - Recherche full-text

### 2. Types Enum (5)
- `user_role` - Rôles utilisateurs
- `warranty_status` - Statuts garanties
- `claim_status` - Statuts réclamations
- `invitation_status` - Statuts invitations
- `notification_type` - Types notifications

### 3. Tables Principales (28)

#### Auth & Profiles (3)
- `organizations` - Franchises/organisations
- `profiles` - Utilisateurs
- `franchisee_invitations` - Invitations

#### Customers & Products (4)
- `customers` - Clients
- `trailer_brands` - Marques remorques
- `dealer_inventory` - Inventaire concessionnaires
- `customer_products` - Produits clients

#### Warranties & Plans (4)
- `warranty_plans` - Plans de garantie
- `warranty_options` - Options/add-ons
- `warranties` - Garanties
- `warranty_claim_tokens` - Tokens publics

#### Claims (1)
- `warranty_claims` - Réclamations

#### Settings (6)
- `company_settings` - Paramètres entreprise
- `tax_settings` - Paramètres fiscaux
- `claim_settings` - Paramètres réclamations
- `email_settings` - Paramètres email
- `notification_settings` - Paramètres notifications

#### Communication (4)
- `notifications` - Notifications
- `email_queue` - File d'attente emails
- `email_templates` - Modèles emails
- `response_templates` - Modèles réponses

#### Signatures & Audit (4)
- `signature_styles` - Styles signatures
- `employee_signatures` - Signatures employés
- `signature_audit_trail` - Audit signatures
- `audit_logs` - Logs audit

#### Billing & Integrations (3)
- `subscription_plans` - Plans abonnement
- `billing_transactions` - Transactions
- `integrations` - Intégrations

### 4. Index de Performance (25+)

**Principaux**:
- Profiles: `user_id`, `organization_id`, `email`, `role`
- Warranties: `organization_id`, `customer_id`, `warranty_number`, `vin`, `status`
- Claims: `organization_id`, `warranty_id`, `status`
- Notifications: `user_id`, `read`, `created_at`
- Full-text search: `customers`, `warranties`

### 5. RLS (Row Level Security)

**Toutes les tables ont**:
- ✅ RLS activé
- ✅ Policies restrictives par `organization_id`
- ✅ Isolation multi-tenant stricte
- ✅ Accès public contrôlé (tokens)

### 6. Triggers & Functions

- `update_updated_at_column()` - Auto-update timestamps
- `generate_warranty_number()` - Génération numéros garantie
- `generate_claim_number()` - Génération numéros réclamation
- `get_user_organization_id()` - Helper RLS

### 7. Données par Défaut

- 3 plans d'abonnement
- 10 marques de remorques communes

---

## 🚀 COMMENT APPLIQUER

### Option A: Dashboard Supabase (Recommandé)

1. **Ouvre** le dashboard Supabase
2. **Va sur** SQL Editor
3. **New Query**
4. **Colle** le contenu de `20251029100000_complete_schema_consolidation.sql`
5. **Clique** "Run"
6. **Attends** ~30 secondes
7. **Vérifie** le message de succès

### Option B: CLI Supabase (Local)

```bash
# Si tu as le CLI installé
supabase db push

# Ou applique directement le fichier
psql $DATABASE_URL -f supabase/migrations/20251029100000_complete_schema_consolidation.sql
```

### Option C: API Supabase

```typescript
// Via edge function ou script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, serviceRoleKey);

const sql = await fetch('./supabase/migrations/20251029100000_complete_schema_consolidation.sql')
  .then(r => r.text());

const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
```

---

## ✅ VÉRIFICATIONS POST-MIGRATION

### 1. Vérifier les Tables

```sql
-- Compter les tables créées
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
-- Devrait retourner: 28

-- Lister toutes les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 2. Vérifier les Index

```sql
-- Compter les index
SELECT count(*) FROM pg_indexes 
WHERE schemaname = 'public';
-- Devrait retourner: 25+

-- Lister les index sur warranties
SELECT indexname FROM pg_indexes 
WHERE tablename = 'warranties';
```

### 3. Vérifier RLS

```sql
-- Vérifier que RLS est activé partout
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true;
-- Devrait retourner: 28 tables

-- Compter les policies
SELECT count(*) FROM pg_policies;
-- Devrait retourner: 20+
```

### 4. Vérifier les Functions

```sql
-- Lister les fonctions créées
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
  'update_updated_at_column',
  'generate_warranty_number',
  'generate_claim_number',
  'get_user_organization_id'
);
-- Devrait retourner: 4 fonctions
```

### 5. Vérifier les Données par Défaut

```sql
-- Vérifier les plans d'abonnement
SELECT count(*) FROM subscription_plans;
-- Devrait retourner: 3

-- Vérifier les marques de remorques
SELECT count(*) FROM trailer_brands;
-- Devrait retourner: 10
```

---

## 🔧 EN CAS D'ERREUR

### Erreur: "relation already exists"

**Cause**: Table déjà créée  
**Solution**: Migration utilise `IF NOT EXISTS` - safe à ré-exécuter

### Erreur: "duplicate key value"

**Cause**: Données par défaut déjà insérées  
**Solution**: Migration utilise `ON CONFLICT DO NOTHING` - safe

### Erreur: "permission denied"

**Cause**: Pas les droits admin  
**Solution**: Utilise le service role key ou connecte-toi en admin

### Erreur: "syntax error"

**Cause**: Version PostgreSQL incompatible  
**Solution**: Requiert PostgreSQL 12+

---

## 📊 SCHÉMA RELATIONNEL

```
organizations (hub)
├── profiles (users)
│   ├── franchisee_invitations
│   ├── employee_signatures
│   └── notification_settings
├── customers
│   ├── customer_products
│   └── warranties
│       ├── warranty_claims
│       └── warranty_claim_tokens
├── warranty_plans
│   └── warranty_options
├── dealer_inventory
│   └── trailer_brands
├── settings (6 tables)
│   ├── company_settings
│   ├── tax_settings
│   ├── claim_settings
│   ├── email_settings
│   └── notification_settings
├── communication (4 tables)
│   ├── notifications
│   ├── email_queue
│   ├── email_templates
│   └── response_templates
├── audit (3 tables)
│   ├── signature_audit_trail
│   └── audit_logs
└── billing (2 tables)
    ├── billing_transactions
    └── subscription_plans
```

---

## 🎯 ISOLATION MULTI-TENANT

Toutes les tables principales incluent `organization_id`:

```sql
-- Pattern RLS standard
CREATE POLICY "Users can read own org data"
ON table_name FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);
```

**Garanties**:
- ✅ Un utilisateur ne voit QUE les données de son organisation
- ✅ Les admins d'une franchise ne voient PAS les autres franchises
- ✅ Masters voient tout leur réseau
- ✅ Accès public contrôlé par tokens

---

## 🔐 SÉCURITÉ

### Niveaux d'Accès

| Rôle | Accès |
|------|-------|
| **customer** | Lecture seule ses propres données |
| **employee** | Lecture + modification org |
| **admin** | Gestion complète org |
| **franchisee_admin** | Gestion franchise |
| **master** | Gestion réseau complet |

### Accès Public (anon)

- ✅ Création de réclamations avec token valide
- ✅ Lecture de garanties avec token valide
- ❌ Aucun autre accès

### Encryption

- Mots de passe SMTP: `smtp_password_encrypted`
- Credentials intégrations: `credentials_encrypted`
- Utilise `pgcrypto` pour encryption

---

## 📈 PERFORMANCE

### Index Critiques

**Warranties** (table la plus volumineuse):
- `organization_id` - Isolation
- `customer_id` - Lookup client
- `warranty_number` - Recherche unique
- `vin` - Recherche véhicule
- `status` - Filtrage
- `(start_date, end_date)` - Range queries

**Full-Text Search**:
- `customers` - Recherche nom/email
- `warranties` - Recherche numéro/VIN

### Query Optimization

```sql
-- Optimisé avec index
SELECT * FROM warranties 
WHERE organization_id = $1 
AND status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Utilise: idx_warranties_organization_id + idx_warranties_status
```

---

## 🧪 TESTS DE VALIDATION

### Test 1: Créer Organisation

```sql
-- Devrait réussir
INSERT INTO organizations (name, slug) 
VALUES ('Test Franchise', 'test-franchise')
RETURNING id;
```

### Test 2: Créer Profil

```sql
-- Devrait réussir
INSERT INTO profiles (user_id, organization_id, email, role)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM organizations WHERE slug = 'test-franchise'),
  'test@example.com',
  'admin'
)
RETURNING id;
```

### Test 3: Créer Garantie

```sql
-- Devrait réussir
INSERT INTO warranties (
  organization_id,
  warranty_number,
  customer_id,
  vin,
  make,
  model,
  year,
  start_date,
  end_date,
  purchase_price,
  warranty_cost,
  total_cost
)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'test-franchise'),
  generate_warranty_number(),
  (SELECT id FROM customers LIMIT 1),
  'TEST123456789',
  'Test Make',
  'Test Model',
  2024,
  now()::date,
  (now() + interval '12 months')::date,
  50000,
  2500,
  2500
)
RETURNING id, warranty_number;
```

### Test 4: RLS Isolation

```sql
-- En tant qu'utilisateur org A
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = '<user_a_id>';

-- Ne devrait retourner QUE les données de org A
SELECT count(*) FROM warranties;

-- Switch vers utilisateur org B
SET LOCAL request.jwt.claims.sub = '<user_b_id>';

-- Ne devrait retourner QUE les données de org B
SELECT count(*) FROM warranties;
```

---

## 📚 DOCUMENTATION COMPLÉMENTAIRE

- **Schéma visuel**: Utilise [dbdiagram.io](https://dbdiagram.io) avec l'export SQL
- **API docs**: Auto-générées par Supabase à partir du schéma
- **Types TypeScript**: Générer avec `supabase gen types typescript`

---

## 🎉 RÉSUMÉ

### Ce Que Cette Migration Fait

- ✅ Crée 28 tables avec relations
- ✅ Configure 25+ index de performance
- ✅ Active RLS sur toutes les tables
- ✅ Crée 20+ policies de sécurité
- ✅ Configure triggers auto-update
- ✅ Ajoute fonctions helper
- ✅ Insert données par défaut

### Ce Qu'Elle Ne Fait PAS

- ❌ Ne supprime aucune donnée existante
- ❌ Ne modifie pas les données existantes
- ❌ Ne crée pas de comptes utilisateurs
- ❌ Ne configure pas les intégrations

### Prochaines Étapes

1. **Applique la migration** via Dashboard
2. **Vérifie** que tout fonctionne
3. **Teste** avec TaxSettings
4. **Crée** la première organisation
5. **Configure** les settings

---

**TL;DR**:
- ✅ Migration complète de 1053 lignes
- ✅ 28 tables + 25 index + 20 policies
- ✅ Prêt pour production
- ✅ Safe à ré-exécuter (IF NOT EXISTS)
- ✅ Documentation complète

**Applique via Dashboard Supabase → SQL Editor → Run!** 🚀
