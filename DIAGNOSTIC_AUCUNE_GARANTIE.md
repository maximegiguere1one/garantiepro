# 🔍 Diagnostic: Aucune Garantie Active - Root Cause Analysis

## Problème Signalé
Impossible de créer une réclamation car le système affiche "aucune garantie active" malgré l'existence de plusieurs garanties actives dans le système.

## Root Cause Identifié

Le problème se trouve dans le composant `NewClaimForm.tsx` à la ligne 111:

```typescript
const { data: warrantiesData, error: warrantiesError } = await supabase
  .from('warranties')
  .select(`
    id,
    contract_number,
    status,
    customer_id,
    trailers(make, model, year)
  `)
  .eq('customer_id', custId)
  .eq('status', 'active')  // ⚠️ PROBLÈME ICI
  .order('created_at', { ascending: false });
```

## 4 Causes Possibles

### 1. ⚠️ Status des Garanties = 'draft' au lieu de 'active' (Cause la plus probable)
**Symptôme**: Les garanties existent dans la base de données mais avec `status = 'draft'`

**Comment vérifier**:
```sql
-- Exécuter dans Supabase SQL Editor
SELECT
  id,
  contract_number,
  status,
  customer_id,
  organization_id,
  created_at
FROM warranties
WHERE status = 'draft'
ORDER BY created_at DESC;
```

**Solution**: Mettre à jour le status des garanties
```sql
-- Mettre à jour toutes les garanties draft en active
UPDATE warranties
SET status = 'active'
WHERE status = 'draft'
  AND end_date >= CURRENT_DATE;
```

### 2. ⚠️ Problème de liaison Customer
**Symptôme**: Le `customer_id` dans la requête ne correspond pas au customer_id des garanties

**Comment vérifier**:
```sql
-- Vérifier les customers et leurs garanties
SELECT
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.user_id,
  COUNT(w.id) as total_warranties,
  COUNT(CASE WHEN w.status = 'active' THEN 1 END) as active_warranties,
  COUNT(CASE WHEN w.status = 'draft' THEN 1 END) as draft_warranties
FROM customers c
LEFT JOIN warranties w ON w.customer_id = c.id
GROUP BY c.id, c.first_name, c.last_name, c.email, c.user_id;
```

**Solution**: Vérifier que l'utilisateur a bien un enregistrement dans la table `customers`

### 3. ⚠️ Problème de RLS (Row Level Security)
**Symptôme**: Les policies RLS bloquent l'accès aux garanties

**Comment vérifier**:
```sql
-- Vérifier le profil de l'utilisateur
SELECT
  id,
  email,
  role,
  organization_id,
  organizations.name as org_name
FROM profiles
LEFT JOIN organizations ON organizations.id = profiles.organization_id
WHERE id = auth.uid();
```

**Vérifier les garanties visibles**:
```sql
-- Cette requête doit retourner des résultats
SELECT
  w.id,
  w.contract_number,
  w.status,
  w.organization_id,
  w.customer_id,
  c.first_name,
  c.last_name
FROM warranties w
LEFT JOIN customers c ON c.id = w.customer_id
WHERE w.status = 'active';
```

### 4. ⚠️ Problème d'Organisation
**Symptôme**: `organization_id` manquant ou ne correspond pas

**Comment vérifier**:
```sql
-- Vérifier les organization_id
SELECT
  w.id,
  w.contract_number,
  w.organization_id as warranty_org_id,
  c.first_name,
  c.last_name,
  p.organization_id as user_org_id,
  p.email as user_email
FROM warranties w
LEFT JOIN customers c ON c.id = w.customer_id
LEFT JOIN profiles p ON p.id = c.user_id
WHERE w.status = 'active';
```

## 🔧 Solution Rapide - Diagnostics Automatique

### Étape 1: Utiliser le panneau de diagnostic intégré
1. Connectez-vous à l'application
2. Allez dans **Paramètres** → **Diagnostic**
3. Cliquez sur "Exécuter le diagnostic"
4. Vérifiez les résultats

### Étape 2: Requête SQL de diagnostic complète
```sql
-- Diagnostic complet du système de garanties
DO $$
DECLARE
  current_user_id uuid := auth.uid();
  user_org_id uuid;
  customer_rec record;
  warranty_count int;
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC COMPLET ===';
  RAISE NOTICE 'User ID: %', current_user_id;

  -- Vérifier le profil
  SELECT organization_id INTO user_org_id
  FROM profiles
  WHERE id = current_user_id;

  RAISE NOTICE 'Organization ID: %', user_org_id;

  -- Vérifier le customer
  SELECT * INTO customer_rec
  FROM customers
  WHERE user_id = current_user_id;

  IF FOUND THEN
    RAISE NOTICE 'Customer ID: %', customer_rec.id;
    RAISE NOTICE 'Customer Name: % %', customer_rec.first_name, customer_rec.last_name;

    -- Compter les garanties
    SELECT COUNT(*) INTO warranty_count
    FROM warranties
    WHERE customer_id = customer_rec.id;

    RAISE NOTICE 'Total warranties: %', warranty_count;

    -- Compter par status
    FOR rec IN (
      SELECT status, COUNT(*) as count
      FROM warranties
      WHERE customer_id = customer_rec.id
      GROUP BY status
    ) LOOP
      RAISE NOTICE 'Status %: % warranties', rec.status, rec.count;
    END LOOP;
  ELSE
    RAISE NOTICE 'NO CUSTOMER RECORD FOUND FOR THIS USER';
  END IF;
END $$;
```

## 📋 Actions Recommandées

### Action Immédiate
Exécutez cette requête pour activer toutes les garanties valides:
```sql
UPDATE warranties
SET status = 'active'
WHERE status = 'draft'
  AND end_date >= CURRENT_DATE
  AND start_date <= CURRENT_DATE;
```

### Vérification Post-Fix
```sql
-- Vérifier que les garanties sont maintenant visibles
SELECT
  w.id,
  w.contract_number,
  w.status,
  w.start_date,
  w.end_date,
  c.first_name || ' ' || c.last_name as customer_name,
  c.email
FROM warranties w
LEFT JOIN customers c ON c.id = w.customer_id
WHERE w.status = 'active'
ORDER BY w.created_at DESC;
```

## 🎯 Solution Permanente

### Modifier le workflow de création de garanties
Les garanties devraient automatiquement passer en status 'active' lors de leur création si les conditions sont remplies:

1. **Option A**: Modifier le composant `NewWarranty.tsx` pour créer directement avec `status: 'active'`

2. **Option B**: Créer un trigger database:
```sql
CREATE OR REPLACE FUNCTION auto_activate_warranty()
RETURNS TRIGGER AS $$
BEGIN
  -- Activer automatiquement si les dates sont valides
  IF NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warranty_auto_activate
  BEFORE INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_warranty();
```

## 📞 Support
Si le problème persiste après ces vérifications, examinez:
- Les logs d'erreur dans la console du navigateur
- Les erreurs RLS dans Supabase Dashboard
- Le panneau "Diagnostic Avancé" dans l'application
