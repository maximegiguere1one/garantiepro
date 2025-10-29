# 🚀 Fix Rapide - Erreur PGRST116

**Problème**: Erreur console "JSON object requested, multiple (or no) rows returned"

## ⚡ Solution en 3 Étapes

### Étape 1: Ouvrir Supabase SQL Editor
1. Allez sur: https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans le menu gauche

### Étape 2: Exécuter le Script de Diagnostic
Copiez-collez et exécutez:

```sql
-- Diagnostic: Vérifier s'il y a des duplicates
SELECT 'company_settings' as table_name, organization_id, COUNT(*) as duplicates
FROM company_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'pricing_settings', organization_id, COUNT(*)
FROM pricing_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'tax_settings', organization_id, COUNT(*)
FROM tax_settings
GROUP BY organization_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'claim_settings', organization_id, COUNT(*)
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;
```

### Étape 3A: Si Aucun Résultat
✅ **Aucun duplicate trouvé!**

Le problème vient probablement d'autre part. Envoyez-moi:
1. Une capture d'écran de l'erreur dans la console
2. La stack trace complète de l'erreur

### Étape 3B: Si Des Duplicates Sont Trouvés
⚠️ **Des duplicates existent!**

Exécutez le script de nettoyage:

```sql
-- NETTOYAGE: Supprimer les duplicates (garde le plus récent)

-- company_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) as rn
  FROM company_settings
)
DELETE FROM company_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- pricing_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) as rn
  FROM pricing_settings
)
DELETE FROM pricing_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- tax_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) as rn
  FROM tax_settings
)
DELETE FROM tax_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- claim_settings
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) as rn
  FROM claim_settings
)
DELETE FROM claim_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Étape 4: Vérification
Retournez dans l'application et testez:
1. Ouvrez la console du navigateur (F12)
2. Naviguez vers la liste des garanties
3. L'erreur PGRST116 devrait avoir disparu! ✅

## 🔧 Prévenir les Futurs Duplicates

Une fois les duplicates nettoyés, ajoutez des contraintes:

```sql
-- Ajouter des contraintes UNIQUE
ALTER TABLE company_settings ADD CONSTRAINT company_settings_organization_id_unique UNIQUE (organization_id);
ALTER TABLE pricing_settings ADD CONSTRAINT pricing_settings_organization_id_unique UNIQUE (organization_id);
ALTER TABLE tax_settings ADD CONSTRAINT tax_settings_organization_id_unique UNIQUE (organization_id);
ALTER TABLE claim_settings ADD CONSTRAINT claim_settings_organization_id_unique UNIQUE (organization_id);
```

## 📊 Résultats

### Avant
```
Successfully loaded 6 warranties
❌ Error: PGRST116 - JSON object requested, multiple rows returned
```

### Après
```
Successfully loaded 6 warranties
✅ Aucune erreur
```

---

**Documentation Complète**: Voir `SOLUTION_FINALE_PGRST116_OCT28_2025.md`
