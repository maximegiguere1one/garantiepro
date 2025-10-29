# 🚨 CORRECTION IMMÉDIATE - PGRST116 Centre de Réclamations

**Date**: 28 Octobre 2025
**Erreur exacte**: `Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row`
**Cause**: Duplicates dans les tables de settings (probablement `claim_settings`)

---

## ⚡ SOLUTION RAPIDE (5 minutes)

### Étape 1: Ouvrir Supabase SQL Editor (1 min)
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **"SQL Editor"** dans le menu de gauche
4. Cliquez sur **"New query"**

### Étape 2: Copier le Script SQL (30 sec)
1. Ouvrez le fichier: **`FIX_DUPLICATES_CLAIM_SETTINGS_IMMEDIATE.sql`**
2. Copiez **TOUT** le contenu (Ctrl+A puis Ctrl+C)

### Étape 3: Exécuter le Script (30 sec)
1. Collez le script dans l'éditeur SQL
2. Cliquez sur **"Run"** (ou Ctrl+Enter)
3. Attendez l'exécution (environ 5-10 secondes)

### Étape 4: Vérifier les Résultats (1 min)
Vous devriez voir dans les messages:
```
✅ SUCCÈS: Tous les duplicates ont été supprimés!
✅ Contrainte unique ajoutée sur claim_settings.organization_id
✅ Contrainte unique ajoutée sur company_settings.organization_id
✅ Contrainte unique ajoutée sur pricing_settings.organization_id
✅ Contrainte unique ajoutée sur tax_settings.organization_id
```

### Étape 5: Tester l'Application (2 min)
1. Retournez dans votre application
2. Rechargez la page (F5)
3. Allez dans **"Centre de réclamations"**
4. Ouvrez la console (F12)
5. **Vérifiez**: L'erreur PGRST116 devrait avoir **disparu** ✅

---

## 🔍 Comprendre le Problème

### Qu'est-ce qui s'est passé?
Votre base de données contenait **2 enregistrements** pour la même organisation dans les tables de paramètres:

```
claim_settings
┌─────────────────────┬──────────────────┐
│ organization_id     │ id               │
├─────────────────────┼──────────────────┤
│ abc-123...          │ record-1         │  ← Duplicate #1
│ abc-123...          │ record-2         │  ← Duplicate #2
└─────────────────────┴──────────────────┘
```

### Pourquoi ça causait l'erreur?
Quand le code demande les paramètres avec `.maybeSingle()`:
```typescript
const { data } = await supabase
  .from('claim_settings')
  .select('*')
  .eq('organization_id', 'abc-123...')
  .maybeSingle();  // ← Attend 0 ou 1 ligne, pas 2!
```

Supabase retourne une erreur **PGRST116** car il trouve **2 lignes** au lieu d'une seule.

### Ce que le script fait:
1. ✅ **Identifie** les duplicates dans toutes les tables settings
2. ✅ **Supprime** les duplicates (garde le plus récent)
3. ✅ **Vérifie** qu'il ne reste plus de duplicates
4. ✅ **Ajoute des contraintes UNIQUE** pour empêcher futurs duplicates

---

## 📊 Exemple de Sortie Attendue

### Avant le Fix
```sql
-- Diagnostic
SELECT organization_id, COUNT(*)
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;

Résultat:
┌─────────────────────┬───────┐
│ organization_id     │ count │
├─────────────────────┼───────┤
│ abc-123...          │ 2     │  ← PROBLÈME!
└─────────────────────┴───────┘
```

### Après le Fix
```sql
-- Diagnostic
SELECT organization_id, COUNT(*)
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;

Résultat:
(Aucune ligne)  ← ✅ PARFAIT!
```

---

## 🛡️ Prévention

Le script ajoute automatiquement des **contraintes UNIQUE** sur la colonne `organization_id` de chaque table:

```sql
ALTER TABLE claim_settings
ADD CONSTRAINT claim_settings_organization_id_unique
UNIQUE (organization_id);
```

**Résultat**: Il sera désormais **IMPOSSIBLE** de créer des duplicates dans ces tables.

Si quelqu'un essaie, PostgreSQL retournera une erreur:
```
ERROR: duplicate key value violates unique constraint
"claim_settings_organization_id_unique"
```

---

## ✅ Checklist de Validation

- [ ] Script SQL copié dans Supabase SQL Editor
- [ ] Script exécuté sans erreur
- [ ] Messages de succès affichés (4 contraintes + 0 duplicates)
- [ ] Application rechargée
- [ ] Centre de réclamations ouvert
- [ ] Console vérifiée (F12)
- [ ] Erreur PGRST116 disparue ✅

---

## 🆘 Si Ça Ne Marche Pas

### Scénario 1: Erreur d'exécution SQL
**Message**: `ERROR: duplicate key value violates unique constraint`

**Cause**: Il reste des duplicates que le script n'a pas pu supprimer

**Solution**:
1. Réexécutez seulement la section **1️⃣ DIAGNOSTIC** du script
2. Notez quelles tables ont encore des duplicates
3. Envoyez-moi les résultats

### Scénario 2: L'erreur PGRST116 persiste
**Cause**: L'erreur vient peut-être d'une autre table

**Solution**:
1. Ouvrez la console (F12)
2. Cliquez sur l'erreur PGRST116
3. Regardez l'URL de la requête (elle contient le nom de la table)
4. Envoyez-moi l'URL complète

Exemple:
```
https://xxx.supabase.co/rest/v1/autre_table?organization_id=eq.xxx
                                    ^^^^^^^^^^^
                                    Nom de la table problématique
```

### Scénario 3: Erreur de permissions
**Message**: `permission denied for table xxx`

**Cause**: Votre utilisateur SQL n'a pas les droits nécessaires

**Solution**: Exécutez le script en tant que propriétaire de la base de données (role postgres ou service_role)

---

## 📈 Impact Attendu

### Avant
```
Console Browser:
  ✅ [WarrantiesList] Successfully loaded 6 warranties
  ❌ Error loading data:
     Object { code: "PGRST116", details: "Results contain 2 rows..." }
```

### Après
```
Console Browser:
  ✅ [WarrantiesList] Successfully loaded 6 warranties
  ✅ [ClaimsCenter] Loaded successfully
  ✅ Aucune erreur PGRST116
```

---

## 📚 Fichiers de Référence

- **Script SQL**: `FIX_DUPLICATES_CLAIM_SETTINGS_IMMEDIATE.sql`
- **Documentation complète**: `LIRE_EN_PREMIER_PGRST116.md`
- **Outil de diagnostic**: `DETECTEUR_PGRST116_CONSOLE.md`

---

## 🎯 Action Immédiate

**FAITES CECI MAINTENANT** (5 minutes):
1. Ouvrez Supabase SQL Editor
2. Copiez-collez le script `FIX_DUPLICATES_CLAIM_SETTINGS_IMMEDIATE.sql`
3. Exécutez (Run)
4. Vérifiez les messages de succès
5. Testez le Centre de réclamations

**Temps total**: 5 minutes
**Difficulté**: Facile (copier-coller)
**Risque**: Aucun (le script ne supprime que les duplicates, garde les données les plus récentes)

---

**Date**: 28 Octobre 2025
**Status**: ✅ SOLUTION PRÊTE
**Priorité**: 🔴 CRITIQUE - À FAIRE IMMÉDIATEMENT
