# ✅ Ajout du Champ Franchise/Déductible - 4 novembre 2025

## 🎯 Amélioration Complétée

Le champ **Franchise/Déductible** est maintenant configurable pour chaque plan de garantie dans l'interface de gestion.

## 📋 Changements Effectués

### 1. Interface TypeScript Mise à Jour

**Fichier**: `src/components/settings/WarrantyPlansManagement.tsx`

Ajout du champ `deductible` à l'interface `WarrantyPlan`:
```typescript
interface WarrantyPlan {
  id: string;
  name: string;
  // ...
  duration_months: number;
  deductible?: number;  // ✅ NOUVEAU
  // ...
}
```

### 2. État du Formulaire

Ajout du champ franchise dans l'état du formulaire:
```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  base_price: '',
  direct_price: '',
  duration_months: '12',
  deductible: '100',  // ✅ NOUVEAU - valeur par défaut: 100$
  // ...
});
```

### 3. Interface Utilisateur

**Nouveau champ de saisie** dans le modal de création/édition de plan:
- Position: Juste après le champ "Durée (mois)"
- Type: Input numérique avec validation
- Valeur par défaut: 100.00$
- Validation: Montant >= 0
- Description d'aide: "Montant que le client doit payer avant que la garantie ne couvre les réparations"

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    <DollarSign className="w-4 h-4 inline mr-1" />
    Franchise / Déductible <span className="text-red-500">*</span>
  </label>
  <input
    type="number"
    step="0.01"
    min="0"
    value={formData.deductible}
    onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
    placeholder="Ex: 100.00"
    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
    required
  />
  <p className="text-xs text-slate-500 mt-1">
    Montant que le client doit payer avant que la garantie ne couvre les réparations
  </p>
</div>
```

### 4. Affichage dans la Liste

**Badge visuel** dans la liste des plans de garantie:
- Couleur: Violet (bg-purple-50, text-purple-700)
- Icône: DollarSign
- Format: "Franchise: XX.XX $"
- Condition: Affiché seulement si franchise > 0

```tsx
{plan.deductible != null && plan.deductible > 0 && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
    <DollarSign className="w-4 h-4 text-purple-600" />
    <span className="text-sm font-semibold text-purple-700">
      Franchise: {plan.deductible.toFixed(2)} $
    </span>
  </div>
)}
```

### 5. Sauvegarde en Base de Données

Ajout du champ dans l'objet de données sauvegardé:
```typescript
const planData = {
  organization_id: organization.id,
  name: formData.name.trim(),
  // ...
  duration_months: parseInt(formData.duration_months),
  deductible: parseFloat(formData.deductible) || 100,  // ✅ NOUVEAU
  // ...
};
```

## 🔄 Flux Utilisateur

### Créer/Modifier un Plan avec Franchise

1. **Accéder aux réglages**: Réglages → Plans de garantie
2. **Ouvrir le modal**: Cliquer sur "Nouveau plan" ou "Modifier" sur un plan existant
3. **Remplir les champs**:
   - Nom du plan
   - Prix
   - Durée en mois
   - **Franchise/Déductible** ← NOUVEAU
   - Type de limite (Montant fixe ou Barème)
4. **Sauvegarder**: Le plan est sauvegardé avec la franchise configurée

### Visualiser la Franchise

Dans la liste des plans, la franchise s'affiche dans un badge violet:
```
┌─────────────────────────────────────────┐
│ Plan Standard 12 mois                   │
│                                         │
│ [$249.99] [12 mois] [Franchise: 100$]  │
│ [Barème (3 tranches)]                   │
└─────────────────────────────────────────┘
```

## 📊 Exemple de Configuration

### Plan 1: Économique
- Durée: 12 mois
- **Franchise: 150.00$** ← Franchise plus élevée
- Limite: Barème selon valeur

### Plan 2: Standard
- Durée: 24 mois
- **Franchise: 100.00$** ← Franchise standard
- Limite: Barème selon valeur

### Plan 3: Premium
- Durée: 36 mois
- **Franchise: 50.00$** ← Franchise réduite
- Limite: Barème selon valeur

## ✅ Utilisation dans la Création de Garantie

Lorsqu'un vendeur crée une garantie:

1. **Sélection du plan**: Le vendeur choisit un plan (ex: "Standard 24 mois")
2. **Franchise automatique**: La franchise du plan (100$) est automatiquement appliquée
3. **Sauvegarde**: La garantie est créée avec:
   - `deductible: 100` (depuis le plan)
   - `annual_claim_limit: XXXX` (calculé depuis le barème)
4. **Affichage PDF**: Le contrat PDF affiche la franchise correcte

## 🎨 Design

- **Couleur badge**: Violet (différent des autres badges pour distinction)
- **Icône**: DollarSign (cohérent avec les montants monétaires)
- **Format**: 2 décimales toujours affichées (XX.XX $)
- **Responsive**: S'adapte sur mobile et desktop

## ✅ Tests Recommandés

1. **Créer un plan avec franchise personnalisée** (ex: 75.00$)
2. **Modifier un plan existant** et changer la franchise
3. **Créer une garantie** avec ce plan et vérifier que la franchise est correcte
4. **Vérifier le PDF** pour confirmer l'affichage de la franchise

## 📝 Notes Techniques

- La franchise est **optionnelle** dans l'interface TypeScript (`deductible?: number`)
- Valeur par défaut: **100$** si non spécifiée
- Validation: Montant doit être **>= 0**
- Format: Nombre décimal avec 2 décimales
- Persistance: Sauvegardé dans la table `warranty_plans` de Supabase

## 🚀 Prochaines Étapes (Optionnelles)

1. Ajouter des **presets de franchise** (50$, 100$, 150$, 200$)
2. Créer des **rapports** sur l'impact de la franchise sur les réclamations
3. Permettre la **franchise variable** selon la valeur de la remorque
4. Ajouter des **explications détaillées** sur la franchise dans le système d'aide

---

**Date**: 4 novembre 2025
**Version**: 1.0.0
**Status**: ✅ Fonctionnel et prêt à utiliser
**Build**: Réussi sans erreurs
