# 🔍 DEBUG: Erreur Sauvegarde Taxes

**Date**: 29 Octobre 2025  
**Problème**: Les taxes ne se sauvegardent pas  
**Status**: ✅ **LOGGING AMÉLIORÉ - PRÊT À DEBUGGER**

---

## 🎯 CE QUI A ÉTÉ FAIT

### 1. Vérifications Base de Données ✅

**Table `tax_settings` existe**: ✅
```
Colonnes:
- id (PK)
- organization_id (UNIQUE) ← Contrainte pour upsert
- gst_rate, qst_rate, pst_rate, hst_rate
- apply_gst, apply_qst, apply_pst, apply_hst
- tax_number_gst, tax_number_qst
- user_id
- created_at, updated_at
```

**Tu as déjà un enregistrement**: ✅
```
organization_id: 4286fe95-1cbe-4942-a4ba-4e7d569ad2fe
gst_rate: 5.000
qst_rate: 9.975
```

### 2. Logging Détaillé Ajouté ✅

**Dans `safeUpsert()`**:
- Log avant l'upsert (table, conflict column, data keys)
- Log d'erreur détaillé (message, code, details, hint)
- Log de succès

---

## 🚀 COMMENT DEBUGGER MAINTENANT

### Étape 1: Rafraîchis la Page
- Appuie sur **F5**

### Étape 2: Ouvre DevTools
- Appuie sur **F12**
- Onglet **Console**

### Étape 3: Va sur Réglages → Taxes
- Modifie un taux (ex: GST 5% → 5.5%)
- Clique **Sauvegarder**

### Étape 4: Regarde la Console

Tu verras maintenant des logs **TRÈS DÉTAILLÉS**:

#### Avant Sauvegarde
```javascript
[TaxSettings.save] Payload: {
  user_id: "e29bc700-3a29-4751-851d-9c099216bb87",
  organization_id: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe",
  gst_rate: 5.5,
  qst_rate: 9.975,
  ...
}

[TaxSettings.save] Types: {
  user_id: "string",
  organization_id: "string",
  gst_rate: "number",  ← Vérifie que c'est "number" et pas "string" ou "NaN"
  ...
}
```

#### Pendant Upsert
```javascript
[safeUpsert:tax_settings] Starting upsert with: {
  table: "tax_settings",
  conflictColumn: "organization_id",
  dataKeys: ["user_id", "organization_id", "gst_rate", ...],
  conflictValue: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe"
}
```

#### Si Erreur
```javascript
[safeUpsert:tax_settings] Error: {
  message: "...",
  code: "...",      ← CODE D'ERREUR IMPORTANT
  details: "...",
  hint: "...",
  cleanData: { ... } ← DONNÉES ENVOYÉES
}
```

#### Si Succès
```javascript
[safeUpsert:tax_settings] Success: {
  id: "ac8a8b77-a6c8-4495-8b89-9a9837b4c1ff",
  organization_id: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe",
  gst_rate: 5.5,
  ...
}

[TaxSettings.save] Success: { ... }
Toast: "Tax settings saved successfully"
```

---

## 🔧 SOLUTIONS PAR CODE D'ERREUR

### Code: PGRST116

**Message**: "The result contains 0 rows"

**Cause**: Enregistrement non trouvé après insert

**Solution**: Normal si premier insert, ignore cette erreur

---

### Code: 23505 (unique_violation)

**Message**: "duplicate key value violates unique constraint"

**Cause**: Conflit sur `organization_id` mais upsert n'a pas fonctionné

**Solution**:
```sql
-- Dans Supabase SQL Editor
-- Vérifie s'il y a des duplicates
SELECT organization_id, count(*)
FROM tax_settings
WHERE organization_id = '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe'
GROUP BY organization_id
HAVING count(*) > 1;

-- Si duplicates, nettoie:
DELETE FROM tax_settings
WHERE id NOT IN (
  SELECT MIN(id)
  FROM tax_settings
  GROUP BY organization_id
);
```

---

### Code: 42501 (insufficient_privilege)

**Message**: "permission denied for table tax_settings"

**Cause**: RLS trop strict

**Solution**:
```sql
-- Vérifier les policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'tax_settings';

-- Si besoin, ajuster policy UPDATE:
DROP POLICY IF EXISTS "Users can update own org tax settings" ON tax_settings;
CREATE POLICY "Users can update own org tax settings"
ON tax_settings FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);
```

---

### Code: 22P02 (invalid_text_representation)

**Message**: "invalid input syntax for type numeric"

**Cause**: Valeur non-numérique dans gst_rate, qst_rate, etc.

**Vérification dans Console**:
```javascript
// Regarde [TaxSettings.save] Types:
{
  gst_rate: "number"  ← OK
  gst_rate: "string"  ← PROBLÈME! Devrait être number
  gst_rate: "NaN"     ← PROBLÈME! NaN n'est pas valide
}
```

**Solution**: Déjà corrigée avec `sanitizeTaxSettings()` qui valide les nombres

---

### Pas d'Erreur mais Rien ne se Passe

**Causes possibles**:
1. Request bloquée par CORS
2. Supabase client mal configuré
3. Network error silencieux

**Vérification**:
```javascript
// Ouvre DevTools → Network
// Filtre: "tax_settings"
// Cherche la requête PATCH ou POST
// Vérifie:
- Status: 200 OK ✅ ou 4xx ❌
- Response: Données ou erreur
- Headers: Authorization présent?
```

---

## 🧪 TEST MANUEL DANS SUPABASE

Si le frontend ne marche toujours pas, teste directement dans Supabase:

```sql
-- Update direct
UPDATE tax_settings
SET 
  gst_rate = 5.5,
  qst_rate = 10.0,
  apply_gst = true,
  apply_qst = true,
  tax_number_gst = 'TEST-GST-123',
  updated_at = now()
WHERE organization_id = '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe'
RETURNING *;
```

**Si ça marche**: Problème côté frontend/RLS  
**Si ça ne marche pas**: Problème base de données

---

## 🔍 VÉRIFICATION RLS

```sql
-- Tester les permissions en tant que user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = 'e29bc700-3a29-4751-851d-9c099216bb87';

-- Essayer de lire
SELECT * FROM tax_settings 
WHERE organization_id = '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe';
-- Devrait retourner 1 ligne

-- Essayer d'update
UPDATE tax_settings
SET gst_rate = 5.5
WHERE organization_id = '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe';
-- Devrait réussir

RESET role;
```

---

## ✅ CHECKLIST DE DEBUG

- [ ] Rafraîchir la page (F5)
- [ ] Ouvrir DevTools Console (F12)
- [ ] Aller sur Réglages → Taxes
- [ ] Modifier un taux
- [ ] Cliquer Sauvegarder
- [ ] Copier TOUS les logs `[TaxSettings.save]` et `[safeUpsert]`
- [ ] Identifier le code d'erreur exact
- [ ] Appliquer la solution correspondante
- [ ] Partager les logs si besoin d'aide

---

## 📊 LOGS ATTENDUS (EXEMPLE COMPLET)

### Scénario Succès

```javascript
// 1. Préparation données
[TaxSettings.save] Payload: {
  user_id: "e29bc700-3a29-4751-851d-9c099216bb87",
  organization_id: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe",
  gst_rate: 5.5,
  qst_rate: 9.975,
  pst_rate: 0,
  hst_rate: 0,
  apply_gst: true,
  apply_qst: true,
  apply_pst: false,
  apply_hst: false,
  tax_number_gst: "",
  tax_number_qst: ""
}

// 2. Vérification types
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
  tax_number_qst: "string"
}

// 3. Démarrage upsert
[safeUpsert:tax_settings] Starting upsert with: {
  table: "tax_settings",
  conflictColumn: "organization_id",
  dataKeys: [
    "user_id", "organization_id", 
    "gst_rate", "qst_rate", "pst_rate", "hst_rate",
    "apply_gst", "apply_qst", "apply_pst", "apply_hst",
    "tax_number_gst", "tax_number_qst"
  ],
  conflictValue: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe"
}

// 4. Succès
[safeUpsert:tax_settings] Success: {
  id: "ac8a8b77-a6c8-4495-8b89-9a9837b4c1ff",
  organization_id: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe",
  gst_rate: 5.5,
  qst_rate: 9.975,
  ...
  updated_at: "2025-10-29T08:00:00.000Z"
}

[TaxSettings.save] Success: { ... }

// 5. Toast
Toast vert: "Tax settings saved successfully"
```

---

**TL;DR**:
- ✅ Logging super détaillé ajouté
- ✅ Table et contraintes vérifiées
- ✅ Solutions par code d'erreur fournies
- ✅ Tests SQL manuels fournis

**Maintenant: Rafraîchis, modifie taxes, sauvegarde, et partage les logs!** 🔍
