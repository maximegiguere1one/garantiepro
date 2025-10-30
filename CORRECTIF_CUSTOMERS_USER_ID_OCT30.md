# ✅ CORRECTIF: Erreur "duplicate key value violates unique constraint"

## 🚨 PROBLÈME

Lors de l'utilisation du nouveau formulaire de garantie, l'erreur suivante apparaît:

```
duplicate key value violates unique constraint "customers_user_id_key"
```

## 🔍 CAUSE ROOT

La table `customers` avait une contrainte `UNIQUE` sur la colonne `user_id`:

```sql
UNIQUE (user_id)
```

**Pourquoi c'est un problème:**

- `user_id` représente **QUI A CRÉÉ** le client (le vendeur/dealer)
- Un vendeur peut créer **PLUSIEURS clients différents**
- La contrainte UNIQUE empêchait un vendeur de créer plus d'un client

**Exemple:**
```
Vendeur: maxime@giguere-influence.com (user_id: abc-123)
Client 1: Jean Tremblay    → ✅ OK (premier client créé)
Client 2: Marie Leblanc    → ❌ ERREUR (même user_id)
```

## ✅ SOLUTION APPLIQUÉE

Suppression de la contrainte UNIQUE sur `customers.user_id`:

```sql
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_user_id_key;
```

**Ce qui reste:**
- ✅ FOREIGN KEY vers `profiles.id` (référentiel intact)
- ✅ Contrainte UNIQUE sur `(email, organization_id)` (empêche les doublons)

## 🎯 COMPORTEMENT CORRECT

**Avant le correctif:**
```sql
-- Premier client
INSERT INTO customers (user_id, email, ...) 
VALUES ('abc-123', 'jean@example.com', ...);  -- ✅ OK

-- Deuxième client (MÊME vendeur, client DIFFÉRENT)
INSERT INTO customers (user_id, email, ...) 
VALUES ('abc-123', 'marie@example.com', ...);  -- ❌ ERREUR
```

**Après le correctif:**
```sql
-- Premier client
INSERT INTO customers (user_id, email, ...) 
VALUES ('abc-123', 'jean@example.com', ...);  -- ✅ OK

-- Deuxième client (MÊME vendeur, client DIFFÉRENT)
INSERT INTO customers (user_id, email, ...) 
VALUES ('abc-123', 'marie@example.com', ...);  -- ✅ OK

-- Duplicate client (MÊME email dans MÊME organisation)
INSERT INTO customers (user_id, email, organization_id, ...) 
VALUES ('abc-123', 'jean@example.com', 'org-1', ...);  -- ❌ ERREUR (correct!)
```

## 📊 MIGRATION APPLIQUÉE

**Fichier:** `fix_customers_user_id_unique_constraint_oct30_2025.sql`

**Contenu:**
- Suppression de la contrainte UNIQUE sur `user_id`
- Conservation de la FOREIGN KEY vers `profiles.id`
- Ajout de commentaire explicatif

## ✅ VÉRIFICATION

Pour vérifier que le correctif est appliqué:

```sql
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'customers'::regclass
  AND conname LIKE '%user_id%';
```

**Résultat attendu:**
```
constraint_name          | constraint_type
-------------------------+----------------
customers_user_id_fkey   | f (FOREIGN KEY)
```

**PAS de:** `customers_user_id_key` (UNIQUE)

## 🧪 TEST

Maintenant vous pouvez:

1. Créer une première garantie avec un nouveau client ✅
2. Créer une deuxième garantie avec un autre client ✅
3. Le même vendeur peut créer autant de clients qu'il veut ✅

## 📝 RÉSUMÉ

**Problème:** Un vendeur ne pouvait créer qu'un seul client  
**Cause:** Contrainte UNIQUE incorrecte sur `user_id`  
**Solution:** Suppression de la contrainte UNIQUE  
**Status:** ✅ Corrigé et testé

---

**Date:** 30 Octobre 2025  
**Migration:** Appliquée avec succès  
**Impact:** Aucun sur les données existantes
