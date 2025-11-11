# ✅ GUIDE: Sécuriser les Requêtes Supabase (Éviter 400)

**Date**: 29 Octobre 2025  
**Objectif**: Éliminer les erreurs 400 causées par des paramètres invalides  
**Status**: ✅ **UTILS CRÉÉES + TAXES CORRIGÉES**

---

## 🎯 PROBLÈMES RÉSOLUS

### 1. Erreurs 400 avec Valeurs Invalides

**Causes fréquentes**:
- `undefined` ou `null` dans les requêtes
- `NaN` dans les champs numériques
- Chaînes vides dans les filtres
- Paramètres de recherche mal construits

### 2. Calcul de Taxes QC Incorrect

**Avant**: QST calculée sur le montant de base
**Après**: QST calculée sur (base + GST) → **Formule légale correcte**

---

## 📦 NOUVELLES UTILITIES

### A. `src/lib/tax-utils.ts`

Gère tous les calculs de taxes canadiennes avec validation stricte.

#### Fonctions Principales

**1. `sanitizeRate(value)` - Évite NaN**
```typescript
sanitizeRate(5.0)      // → 5.0
sanitizeRate("5")      // → 0 (string non valide)
sanitizeRate(NaN)      // → 0
sanitizeRate(undefined)// → 0
sanitizeRate(-5)       // → 0 (négatif rejeté)
```

**2. `computeQcTaxes(subtotal, gstRate, qstRate)` - Calcul QC Correct**
```typescript
const result = computeQcTaxes(100, 5.0, 9.975);
// {
//   gst: 5.00,              // 100 × 5%
//   qst: 10.47,             // 105 × 9.975% (sur TTC!)
//   total: 115.47
// }
```

**Formule QC**:
```
GST = Subtotal × (GST% / 100)
QST = (Subtotal + GST) × (QST% / 100)  ← Sur montant TTC!
Total = Subtotal + GST + QST
```

**3. `calculateCanadianTaxes(subtotal, rates)` - Tous Types de Taxes**
```typescript
const taxes = calculateCanadianTaxes(100, {
  gst_rate: 5.0,
  qst_rate: 9.975,
  apply_gst: true,
  apply_qst: true,
});
// {
//   subtotal: 100.00,
//   gst: 5.00,
//   qst: 10.47,
//   pst: 0.00,
//   hst: 0.00,
//   total: 115.47
// }
```

**4. `sanitizeTaxSettings(settings)` - Validation Avant Upsert**
```typescript
const clean = sanitizeTaxSettings({
  user_id: 'abc',
  organization_id: 'xyz',
  gst_rate: 5.0,
  qst_rate: "9.975",  // ❌ String
  pst_rate: NaN,       // ❌ Invalid
  apply_gst: true,
  tax_number_gst: '  123  ',
});

// Résultat:
// {
//   user_id: 'abc',
//   organization_id: 'xyz',
//   gst_rate: 5.0,
//   qst_rate: 0,              // ✅ Converti
//   pst_rate: 0,              // ✅ Sanitized
//   apply_gst: true,
//   apply_qst: false,
//   apply_pst: false,
//   apply_hst: false,
//   tax_number_gst: '123',    // ✅ Trimmed
//   tax_number_qst: '',
//   updated_at: '2025-10-29T...'
// }
```

---

### B. `src/lib/supabase-safe-query.ts`

Utilitaires pour requêtes Supabase sécurisées.

#### Fonctions Principales

**1. `buildIlikePattern(search)` - Recherche Sécurisée**
```typescript
buildIlikePattern('')           // → '%' (match all)
buildIlikePattern('  test  ')   // → '%test%'
buildIlikePattern('50%')        // → '%50\\%%' (escape %)
buildIlikePattern(undefined)    // → '%'
```

**2. `safeUpsert(supabase, table, data, conflictColumn)`**
```typescript
// ✅ Supprime automatiquement les undefined
await safeUpsert(supabase, 'tax_settings', {
  organization_id: 'abc',
  gst_rate: 5.0,
  qst_rate: undefined,  // ← Sera retiré automatiquement
}, 'organization_id');

// ✅ Évite les erreurs 400 causées par undefined
```

**3. `safeMaybeSingle(supabase, table, select, filters)`**
```typescript
// ✅ Ignore les filtres undefined/null automatiquement
const settings = await safeMaybeSingle(
  supabase,
  'tax_settings',
  '*',
  {
    organization_id: 'abc',
    user_id: undefined,  // ← Ignoré automatiquement
  }
);
```

**4. `validateNumber(value, defaultValue)`**
```typescript
validateNumber(5)          // → 5
validateNumber("5")        // → 5
validateNumber("abc")      // → 0 (default)
validateNumber(NaN)        // → 0
validateNumber(undefined)  // → 0
```

**5. `getSafeBrands(supabase, search?)`**
```typescript
// Exemple de requête sécurisée
const brands = await getSafeBrands(supabase, '');
// ✅ Pas d'erreur 400 même avec search vide
```

---

## 🔧 MODIFICATIONS APPLIQUÉES

### TaxSettings Component (`src/components/settings/TaxSettings.tsx`)

#### AVANT (Risques 400):
```typescript
const { error } = await supabase
  .from('tax_settings')
  .upsert({
    gst_rate: settings.gst_rate,  // ❌ Peut être NaN
    qst_rate: settings.qst_rate,  // ❌ Peut être undefined
    // ...
  });
```

#### APRÈS (Sécurisé):
```typescript
import { sanitizeTaxSettings, calculateCanadianTaxes } from '../../lib/tax-utils';
import { safeUpsert } from '../../lib/supabase-safe-query';

// Sanitize avant upsert
const settingsData = sanitizeTaxSettings({
  user_id: profile.user_id,
  organization_id: organization.id,
  gst_rate: settings.gst_rate,
  qst_rate: settings.qst_rate,
  // ... tous les champs
});

// Upsert sécurisé
await safeUpsert(supabase, 'tax_settings', settingsData, 'organization_id');
```

---

## 📊 EXEMPLE: Calcul QC Correct

### Simulation $100

**Avec GST 5% + QST 9.975%**:

```typescript
const result = computeQcTaxes(100, 5.0, 9.975);

console.log(result);
// {
//   gst: 5.00,     // 100.00 × 5%
//   qst: 10.47,    // 105.00 × 9.975% ← sur TTC!
//   total: 115.47  // 100 + 5 + 10.47
// }
```

**Interface utilisateur**:
```
Base           100.00 $
GST (5%)       +  5.00 $
QST (9.975%)   + 10.47 $ (sur TTC)
─────────────────────────
Total          115.47 $
```

---

## ✅ CHECKLIST DE SÉCURITÉ

### Avant d'Envoyer une Requête Supabase

- [ ] **Valider les nombres** avec `sanitizeRate()` ou `validateNumber()`
- [ ] **Nettoyer les strings** avec `validateString()` ou `.trim()`
- [ ] **Filtrer les undefined** avec `safeUpsert()` ou manuellement
- [ ] **Escape la recherche** avec `buildIlikePattern()`
- [ ] **Utiliser `.select()`** après `.upsert()` pour voir les erreurs détaillées
- [ ] **Utiliser `.maybeSingle()`** au lieu de `.single()` si 0 résultat possible

### Pattern Recommandé

```typescript
// ✅ BON
const { data, error } = await supabase
  .from('table')
  .select('*')
  .ilike('name', buildIlikePattern(search))
  .order('name', { ascending: true });

// ❌ MAUVAIS
const { data, error } = await supabase
  .from('table')
  .select('*')
  .ilike('name', `%${search}%`)  // Si search est undefined → 400!
  .order('name', { ascending: true });
```

---

## 🧪 TESTS

### Test 1: Sanitization

```typescript
import { sanitizeRate, sanitizeTaxSettings } from './lib/tax-utils';

// Test sanitizeRate
console.assert(sanitizeRate(5.0) === 5.0);
console.assert(sanitizeRate(NaN) === 0);
console.assert(sanitizeRate("abc") === 0);
console.assert(sanitizeRate(-5) === 0);
console.log('✅ sanitizeRate tests pass');

// Test sanitizeTaxSettings
const clean = sanitizeTaxSettings({
  user_id: 'test',
  organization_id: 'org1',
  gst_rate: NaN,
  qst_rate: undefined,
});
console.assert(clean.gst_rate === 0);
console.assert(clean.qst_rate === 0);
console.log('✅ sanitizeTaxSettings tests pass');
```

### Test 2: Calcul QC

```typescript
import { computeQcTaxes } from './lib/tax-utils';

const result = computeQcTaxes(100, 5.0, 9.975);
console.assert(result.gst === 5.00);
console.assert(result.qst === 10.47);
console.assert(result.total === 115.47);
console.log('✅ computeQcTaxes correct');
```

### Test 3: Safe Query

```typescript
import { buildIlikePattern } from './lib/supabase-safe-query';

console.assert(buildIlikePattern('') === '%');
console.assert(buildIlikePattern('test') === '%test%');
console.assert(buildIlikePattern(undefined) === '%');
console.log('✅ buildIlikePattern tests pass');
```

---

## 🎯 RÉSUMÉ

### Ce Qui a Été Fait

1. **✅ Créé `tax-utils.ts`**
   - Validation stricte des taux (évite NaN)
   - Calcul QC correct (QST sur TTC)
   - Sanitization avant upsert

2. **✅ Créé `supabase-safe-query.ts`**
   - Recherche sécurisée avec escape
   - Upsert sans undefined
   - Validators pour tous les types

3. **✅ Mis à Jour `TaxSettings.tsx`**
   - Utilise `sanitizeTaxSettings()` avant save
   - Utilise `safeUpsert()` pour éviter 400
   - Affiche calcul QC correct (QST sur TTC)

### Bénéfices

- ✅ **Zéro erreur 400** causée par valeurs invalides
- ✅ **Calcul fiscal correct** (conforme à la loi QC)
- ✅ **Messages d'erreur clairs** si problème persiste
- ✅ **Code réutilisable** pour toutes les requêtes

---

## 📚 DOCUMENTATION ADDITIONNELLE

### Taux de Taxes Canadiens 2025

| Province | GST | PST | QST | HST | Total |
|----------|-----|-----|-----|-----|-------|
| QC       | 5%  | -   | 9.975% | - | 15.47% |
| ON       | -   | -   | -   | 13% | 13% |
| BC       | 5%  | 7%  | -   | -   | 12% |
| AB       | 5%  | -   | -   | -   | 5% |

**Note QC**: QST s'applique sur montant TTC (incluant GST) donc le total effectif est **15.47%** et non 14.975%.

---

**TL;DR**:
- ✅ Nouvelles utils `tax-utils.ts` et `supabase-safe-query.ts`
- ✅ Validation stricte évite tous les NaN/undefined → pas de 400
- ✅ Calcul QC correct: QST sur (base + GST)
- ✅ TaxSettings mis à jour et sécurisé
- ✅ Build réussi - prêt à déployer!

**Utilise ces utils partout pour zéro erreur 400!** 🚀
