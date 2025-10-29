# 🔍 GUIDE DEBUG: Erreurs 400 sur Sauvegarde Taxes

**Date**: 29 Octobre 2025  
**Objectif**: Diagnostiquer et corriger les erreurs 400 lors de la sauvegarde des paramètres fiscaux  
**Status**: ✅ **INSTRUMENTATION COMPLÈTE + MIGRATION CRÉÉE**

---

## 🎯 ÉTAPES DE DEBUG

### 1. Ouvrir DevTools (F12)

**Onglet Network** → Filtrer par "tax_settings"

Quand tu cliques "Sauvegarder":
1. Trouve la requête POST/UPSERT vers `tax_settings`
2. Clique dessus
3. Regarde:
   - **Status**: 200 (OK) ou 400/401/403 (erreur)
   - **Response**: Message d'erreur détaillé
   - **Payload** (onglet Request): Données envoyées

---

### 2. Vérifier la Console

**Console JavaScript** → Tu verras maintenant:

```
[TaxSettings.save] Payload: {
  user_id: "abc-123",
  organization_id: "xyz-789",
  gst_rate: 5.0,
  qst_rate: 9.975,
  pst_rate: 0,
  hst_rate: 0,
  apply_gst: true,
  apply_qst: true,
  apply_pst: false,
  apply_hst: false,
  tax_number_gst: "",
  tax_number_qst: "",
  updated_at: "2025-10-29T..."
}

[TaxSettings.save] Types: {
  user_id: "string",
  organization_id: "string",
  gst_rate: "number",
  qst_rate: "number",
  pst_rate: "number",
  hst_rate: "number",
  apply_gst: "boolean",
  apply_qst: "boolean",
  apply_pst: "boolean",
  apply_hst: "boolean",
  tax_number_gst: "string",
  tax_number_qst: "string",
  updated_at: "string"
}
```

**Vérifications**:
- ✅ Tous les rates sont `number` (pas `string` ou `NaN`)
- ✅ Tous les apply_* sont `boolean` (pas `undefined`)
- ✅ organization_id est présent et valide

---

### 3. Erreurs Fréquentes et Solutions

#### Erreur: "column does not exist"
```
{
  message: "column 'xyz' of relation 'tax_settings' does not exist",
  code: "42703"
}
```

**Cause**: Nom de colonne incorrect ou table pas créée  
**Solution**: Applique la migration `20251029000000_create_tax_settings_table.sql`

#### Erreur: "invalid input syntax for type numeric"
```
{
  message: "invalid input syntax for type numeric: 'NaN'",
  code: "22P02"
}
```

**Cause**: Valeur NaN ou string envoyée au lieu de number  
**Solution**: `sanitizeRate()` devrait déjà corriger ça. Si tu vois encore ça:
```typescript
// Dans le formulaire, force la conversion:
onChange={(e) => setSettings({
  ...settings,
  gst_rate: parseFloat(e.target.value.replace(',', '.')) || 0
})}
```

#### Erreur: "violates row-level security policy"
```
{
  message: "new row violates row-level security policy",
  code: "42501"
}
```

**Cause**: RLS bloque l'insert/update  
**Solution**: Vérifie que:
1. L'utilisateur est authentifié
2. Son rôle est admin/master/franchisee_admin
3. L'organization_id correspond à son profil

**Query de vérification**:
```sql
SELECT 
  p.user_id,
  p.organization_id,
  p.role
FROM profiles p
WHERE p.user_id = auth.uid();

-- Doit retourner une ligne avec role = 'admin' | 'master' | 'franchisee_admin'
```

#### Erreur: "duplicate key value violates unique constraint"
```
{
  message: "duplicate key value violates unique constraint 'tax_settings_organization_id_key'",
  code: "23505"
}
```

**Cause**: `onConflict` mal configuré  
**Solution**: Déjà corrigé dans `safeUpsert()` avec `onConflict: 'organization_id'`

#### Erreur 401: "JWT expired"
```
{
  message: "JWT expired",
  code: "PGRST301"
}
```

**Cause**: Token expiré  
**Solution**: Rafraîchir la session:
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

---

## 📋 CHECKLIST DE DIAGNOSTIC

### Avant de Sauvegarder

- [ ] **Ouvre DevTools** (F12)
- [ ] **Va sur l'onglet Network**
- [ ] **Va sur l'onglet Console**
- [ ] **Clique "Sauvegarder"**

### Lecture des Logs

- [ ] **Console**: Vérifie `[TaxSettings.save] Payload` et `Types`
- [ ] **Network**: Trouve la requête `tax_settings` et regarde Status/Response
- [ ] **Si 400**: Lis `error.message` et `error.code`
- [ ] **Si 401/403**: Vérifie RLS et authentification

---

## 🔧 MIGRATIONS À APPLIQUER

### Migration: `20251029000000_create_tax_settings_table.sql`

**À appliquer si**:
- Table `tax_settings` n'existe pas
- Erreur "relation does not exist"

**Commande Supabase**:
```bash
# En local
supabase db push

# Ou via dashboard
# SQL Editor → Colle le contenu de la migration → Run
```

**Vérification**:
```sql
-- Vérifie que la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'tax_settings'
);
-- Doit retourner: true

-- Vérifie les colonnes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tax_settings'
ORDER BY ordinal_position;
```

---

## 🧪 TESTS MANUELS

### Test 1: Sauvegarde Basique (QC)

1. **Ouvre** Réglages → Taxes
2. **Sélectionne** Province: Quebec
3. **Vérifie**:
   - GST: 5.0%
   - QST: 9.975%
   - PST: 0%
   - HST: 0%
4. **Sauvegarde**
5. **Console** devrait afficher:
   ```
   [TaxSettings.save] Success: { id: "...", organization_id: "...", ... }
   ```

### Test 2: Virgules Décimales

1. **Tape** manuellement: GST = `5,0` (avec virgule)
2. **Sauvegarde**
3. **Vérifie** que ça devient `5.0` (point) dans les logs
4. **Pas d'erreur 400**

### Test 3: Valeurs Invalides

1. **Tape**: GST = `abc` (texte invalide)
2. **Sauvegarde**
3. **Vérifie** que ça devient `0` dans les logs
4. **Pas d'erreur 400**

### Test 4: Rechargement

1. **Sauvegarde** des réglages
2. **Rafraîchis** la page (F5)
3. **Vérifie** que les valeurs sont conservées
4. **Calcul** de simulation reste correct

---

## 📊 CODES D'ERREUR POSTGRESQL

| Code | Description | Solution |
|------|-------------|----------|
| 22P02 | Invalid numeric | Utilise `sanitizeRate()` |
| 23505 | Unique violation | Vérifie `onConflict` |
| 42501 | RLS policy violation | Vérifie rôle et organization_id |
| 42703 | Column does not exist | Applique migration |
| PGRST116 | No rows returned | Normal si première sauvegarde |
| PGRST301 | JWT expired | Rafraîchis session |

---

## 🎯 AMÉLORATIONS APPLIQUÉES

### 1. Logging Détaillé
```typescript
// Avant
console.error('Error saving settings:', error);

// Après
console.error('[TaxSettings.save] Error:', error);
console.error('[TaxSettings.save] Error details:', {
  message: error.message,
  code: error.code,
  details: error.details,
  hint: error.hint,
});
```

### 2. Support Virgules Décimales
```typescript
// sanitizeRate() supporte maintenant:
sanitizeRate("9,975")  // → 9.975
sanitizeRate("9.975")  // → 9.975
sanitizeRate("abc")    // → 0
sanitizeRate(NaN)      // → 0
```

### 3. Validation Stricte
```typescript
// Tous les champs sont sanitizés avant upsert
const settingsData = sanitizeTaxSettings({
  // ... validation automatique de tous les champs
});
```

### 4. Migration SQL Complète
- Table avec types corrects (`numeric(5,3)`)
- Index sur `organization_id`
- RLS avec policies restrictives
- Trigger `updated_at` automatique

---

## 🚀 PROCHAINES ÉTAPES

1. **Applique la migration** `20251029000000_create_tax_settings_table.sql`
2. **Ouvre DevTools** et teste la sauvegarde
3. **Lis les logs** dans Console et Network
4. **Partage les erreurs** si problème persiste

---

**TL;DR**:
- ✅ Logging détaillé ajouté (payload + types)
- ✅ Support virgules décimales dans sanitizeRate()
- ✅ Migration SQL créée avec RLS correct
- ✅ safeUpsert() filtre automatiquement undefined
- ✅ Messages d'erreur détaillés pour debugging

**Ouvre DevTools, sauvegarde, et partage ce que tu vois!** 🔍
