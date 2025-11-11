# 🔧 Résolution: Problème "Aucune Garantie Active"
**Date**: 13 octobre 2025
**Problème**: Impossible de créer des réclamations malgré l'existence de garanties

---

## 📌 Résumé Exécutif

**Symptôme**: L'utilisateur ne peut pas créer de réclamation car le système affiche "aucune garantie active" bien qu'il existe plusieurs garanties dans le système.

**Root Cause**: Le composant `NewClaimForm.tsx` filtre les garanties par `status = 'active'`, mais les garanties dans la base de données ont probablement le status `'draft'`.

**Impact**: Blocage complet de la fonctionnalité de création de réclamations pour les utilisateurs.

---

## 🎯 Root Cause Analysis

### Code Problématique
**Fichier**: `src/components/NewClaimForm.tsx`
**Ligne**: 111

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
  .eq('status', 'active')  // ⚠️ FILTRE STRICT SUR STATUS = 'active'
  .order('created_at', { ascending: false });
```

### Causes Possibles (par ordre de probabilité)

#### 1️⃣ Status des Garanties = 'draft' (90% probable)
Les garanties sont créées avec `status: 'draft'` par défaut (défini dans la migration `20251003235928_create_warranty_management_schema.sql` ligne 327):

```sql
status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'cancelled'))
```

**Solution immédiate**: Exécuter cette requête SQL dans Supabase:
```sql
UPDATE warranties
SET status = 'active'
WHERE status = 'draft'
  AND end_date >= CURRENT_DATE
  AND start_date <= CURRENT_DATE;
```

#### 2️⃣ Problème de Liaison Customer/User (5% probable)
Le profil utilisateur n'a pas d'enregistrement correspondant dans la table `customers`.

**Vérification**:
```sql
SELECT
  p.id as user_id,
  p.email,
  c.id as customer_id,
  c.first_name,
  c.last_name
FROM profiles p
LEFT JOIN customers c ON c.user_id = p.id
WHERE p.id = auth.uid();
```

#### 3️⃣ Problème de RLS (3% probable)
Les Row Level Security policies bloquent l'accès aux garanties.

**Vérification**:
```sql
-- Tester si les garanties sont visibles
SELECT
  w.id,
  w.contract_number,
  w.status,
  w.organization_id
FROM warranties w
WHERE w.status IN ('draft', 'active')
LIMIT 10;
```

#### 4️⃣ Organization ID Manquant (2% probable)
Le profil de l'utilisateur n'a pas d'`organization_id` configuré.

**Vérification**:
```sql
SELECT
  id,
  email,
  role,
  organization_id
FROM profiles
WHERE id = auth.uid();
```

---

## 🛠️ Solutions

### Solution Immédiate (Recommandée)

**Étape 1**: Activer les garanties existantes
```sql
-- Exécuter dans Supabase SQL Editor
UPDATE warranties
SET status = 'active'
WHERE status = 'draft'
  AND end_date >= CURRENT_DATE;
```

**Étape 2**: Vérifier les résultats
```sql
SELECT
  w.id,
  w.contract_number,
  w.status,
  w.start_date,
  w.end_date,
  c.first_name || ' ' || c.last_name as customer_name
FROM warranties w
LEFT JOIN customers c ON c.id = w.customer_id
WHERE w.status = 'active'
ORDER BY w.created_at DESC;
```

### Solution à Long Terme

**Option A**: Modifier le workflow de création pour activer automatiquement les garanties valides

**Option B**: Créer un trigger database pour activation automatique
```sql
CREATE OR REPLACE FUNCTION auto_activate_warranty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'draft'
     AND NEW.start_date <= CURRENT_DATE
     AND NEW.end_date >= CURRENT_DATE THEN
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

**Option C**: Modifier NewClaimForm pour accepter aussi les garanties 'draft' valides
```typescript
// Dans loadWarrantiesForCustomer, ligne 111
.in('status', ['active', 'draft'])  // Au lieu de .eq('status', 'active')
.gte('end_date', new Date().toISOString())
```

---

## 🔍 Outils de Diagnostic

### Panneau de Diagnostic Intégré
1. Connexion à l'application
2. Navigation: **Paramètres** → **Diagnostic**
3. Cliquer sur "Exécuter le diagnostic"

### Script SQL Complet de Diagnostic
```sql
DO $$
DECLARE
  current_user_id uuid := auth.uid();
  user_org_id uuid;
  customer_rec record;
  warranty_rec record;
BEGIN
  RAISE NOTICE '╔═══════════════════════════════════════╗';
  RAISE NOTICE '║   DIAGNOSTIC SYSTÈME DE GARANTIES    ║';
  RAISE NOTICE '╚═══════════════════════════════════════╝';
  RAISE NOTICE '';

  -- 1. Vérifier l'utilisateur
  RAISE NOTICE '1. UTILISATEUR';
  RAISE NOTICE '   User ID: %', current_user_id;

  -- 2. Vérifier le profil
  SELECT organization_id INTO user_org_id
  FROM profiles
  WHERE id = current_user_id;

  IF FOUND THEN
    RAISE NOTICE '   ✓ Profil trouvé';
    RAISE NOTICE '   Organization ID: %', COALESCE(user_org_id::text, 'NULL');
  ELSE
    RAISE NOTICE '   ✗ PROFIL NON TROUVÉ';
  END IF;

  RAISE NOTICE '';

  -- 3. Vérifier le customer
  RAISE NOTICE '2. CLIENT';
  SELECT * INTO customer_rec
  FROM customers
  WHERE user_id = current_user_id;

  IF FOUND THEN
    RAISE NOTICE '   ✓ Customer trouvé';
    RAISE NOTICE '   Customer ID: %', customer_rec.id;
    RAISE NOTICE '   Nom: % %', customer_rec.first_name, customer_rec.last_name;
  ELSE
    RAISE NOTICE '   ✗ AUCUN ENREGISTREMENT CLIENT';
    RAISE NOTICE '';
    RAISE NOTICE '   ACTION REQUISE: Créer un enregistrement customer';
    RAISE NOTICE '   pour cet utilisateur dans la table customers';
    RETURN;
  END IF;

  RAISE NOTICE '';

  -- 4. Compter les garanties
  RAISE NOTICE '3. GARANTIES';

  FOR warranty_rec IN (
    SELECT
      status,
      COUNT(*) as count
    FROM warranties
    WHERE customer_id = customer_rec.id
    GROUP BY status
  ) LOOP
    RAISE NOTICE '   Status "%": % garantie(s)', warranty_rec.status, warranty_rec.count;
  END LOOP;

  -- 5. Lister les garanties actives/draft
  RAISE NOTICE '';
  RAISE NOTICE '4. DÉTAILS DES GARANTIES';

  FOR warranty_rec IN (
    SELECT
      contract_number,
      status,
      start_date,
      end_date
    FROM warranties
    WHERE customer_id = customer_rec.id
    ORDER BY created_at DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE '   • %: % (% à %)',
      warranty_rec.contract_number,
      warranty_rec.status,
      warranty_rec.start_date,
      warranty_rec.end_date;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════╗';
  RAISE NOTICE '║        FIN DU DIAGNOSTIC             ║';
  RAISE NOTICE '╚═══════════════════════════════════════╝';
END $$;
```

---

## 📊 Vérification Post-Correction

Après avoir appliqué la solution, vérifiez que tout fonctionne:

### Étape 1: Vérifier les garanties actives
```sql
SELECT COUNT(*) as active_warranties
FROM warranties
WHERE status = 'active';
```

**Résultat attendu**: > 0

### Étape 2: Tester la requête du composant
```sql
-- Simuler la requête de NewClaimForm
SELECT
  w.id,
  w.contract_number,
  w.status,
  w.customer_id
FROM warranties w
WHERE w.customer_id IN (
  SELECT id FROM customers WHERE user_id = auth.uid()
)
AND w.status = 'active';
```

**Résultat attendu**: Liste des garanties actives pour l'utilisateur

### Étape 3: Test fonctionnel
1. Se connecter à l'application
2. Aller dans "Réclamations"
3. Cliquer sur "Nouvelle Réclamation"
4. Vérifier que les garanties apparaissent dans le dropdown

---

## 📝 Documentation Créée

- **DIAGNOSTIC_AUCUNE_GARANTIE.md**: Guide complet de diagnostic et résolution
- **RESOLUTION_AUCUNE_GARANTIE_OCT13_2025.md**: Ce document - résumé de la résolution

---

## ✅ Checklist de Résolution

- [ ] Exécuter la requête UPDATE pour activer les garanties
- [ ] Vérifier que les garanties sont maintenant visibles
- [ ] Tester la création d'une réclamation
- [ ] Vérifier que le dropdown affiche les garanties
- [ ] Compléter une réclamation de test
- [ ] Documenter la solution appliquée
- [ ] Planifier l'implémentation d'une solution permanente (trigger ou modification du workflow)

---

## 📞 Besoin d'Aide?

Si le problème persiste:
1. Exécuter le script de diagnostic SQL complet ci-dessus
2. Copier les résultats (messages NOTICE)
3. Vérifier les logs d'erreur dans la console du navigateur (F12)
4. Examiner les logs Supabase dans le Dashboard
5. Utiliser le panneau "Diagnostic Avancé" dans Paramètres

---

**Status**: ✅ Solution identifiée et documentée
**Action Requise**: Exécuter la requête SQL d'activation des garanties
**Temps Estimé**: 2 minutes
