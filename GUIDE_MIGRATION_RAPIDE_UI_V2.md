# Guide de migration rapide vers UI V2

Ce guide vous aide à migrer rapidement vos composants existants vers le nouveau système de design V2.

---

## 🚀 Migration en 5 étapes

### Étape 1: Identifier le composant à migrer

Choisissez un composant avec:
- ✅ Impact utilisateur élevé (Dashboard, NewWarranty, etc.)
- ✅ Utilisation fréquente
- ✅ Interface utilisateur importante
- ✅ Possibilité d'amélioration visuelle

### Étape 2: Mettre à jour les imports

```typescript
// ❌ Ancien
import { StatCard } from './common/Card';
import { CardSkeleton } from './common/SkeletonLoader';

// ✅ Nouveau
import { KPICard, EnhancedCard, useEnhancedToast } from './ui';
import { useTranslation } from '../hooks/useTranslation';
```

### Étape 3: Remplacer les composants

Utilisez ce tableau de correspondance:

| Ancien composant | Nouveau composant V2 | Notes |
|------------------|----------------------|-------|
| `StatCard` | `KPICard` | Nouvelles variantes de couleur |
| `Card` | `EnhancedCard` | Structure Header/Content/Footer |
| `Button` (générique) | `PrimaryButton` / `SecondaryButton` | États loading, variantes |
| `Input` | `EnhancedInputField` | Validation intégrée |
| `Toast` (ancien) | `useEnhancedToast()` | Hook context-based |
| Texte statique | `t('key')` | Système i18n |

### Étape 4: Appliquer le design system

Utilisez les nouvelles classes Tailwind:

```css
/* ❌ Ancien */
.bg-slate-900, .text-slate-600

/* ✅ Nouveau */
.bg-neutral-900, .text-neutral-600

/* ❌ Ancien */
.bg-red-600, .text-red-600

/* ✅ Nouveau */
.bg-primary-600, .text-primary-600  /* Bleu */
.bg-accent-600, .text-accent-600    /* Rouge */
```

### Étape 5: Tester et valider

```bash
# Build
npm run build

# Vérifier TypeScript
npm run typecheck

# Tests (si disponibles)
npm test
```

---

## 📋 Checklist de migration

### Avant de commencer
- [ ] Lire `TRANSFORMATION_UI_V2_COMPLETE.md`
- [ ] Consulter `UIV2Demo` pour exemples
- [ ] Identifier les composants à remplacer
- [ ] Backup du fichier (git commit)

### Pendant la migration
- [ ] Mettre à jour les imports
- [ ] Remplacer les composants old → new
- [ ] Appliquer les design tokens V2
- [ ] Ajouter les traductions i18n
- [ ] Vérifier les animations
- [ ] Tester l'accessibilité

### Après la migration
- [ ] Build réussi (`npm run build`)
- [ ] Test visuel (dev server)
- [ ] Test responsive (mobile/tablet/desktop)
- [ ] Test navigation clavier
- [ ] Commit git avec message descriptif

---

## 🎨 Exemples de migration

### Exemple 1: StatCard → KPICard

**Avant:**
```tsx
<StatCard
  label="Revenu total"
  value="127,450 $"
  icon={<DollarSign className="w-6 h-6" />}
  color="emerald"
  trend={{ value: 12.5, isPositive: true }}
/>
```

**Après:**
```tsx
<KPICard
  title={t('dashboard.kpis.revenue.title')}
  value="127,450 $"
  icon={<DollarSign className="w-5 h-5" />}
  variant="primary"
  trend={{ value: 12.5, isPositive: true }}
  subtitle={t('dashboard.kpis.revenue.thisMonth')}
/>
```

**Changements:**
- `label` → `title`
- `color` → `variant` (semantic)
- Ajout `subtitle` optionnel
- Utilisation `t()` pour i18n
- Icon size: `w-6 h-6` → `w-5 h-5`

---

### Exemple 2: Button → PrimaryButton

**Avant:**
```tsx
<button
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
  disabled={loading}
  onClick={handleSubmit}
>
  {loading ? 'Chargement...' : 'Soumettre'}
</button>
```

**Après:**
```tsx
<PrimaryButton
  size="md"
  loading={loading}
  leftIcon={<Check className="w-4 h-4" />}
  onClick={handleSubmit}
>
  {t('common.actions.submit')}
</PrimaryButton>
```

**Changements:**
- Classes Tailwind → Props
- État loading géré automatiquement
- Support icônes intégré
- Traduction avec `t()`
- Tailles prédéfinies: sm, md, lg

---

### Exemple 3: Input → EnhancedInputField

**Avant:**
```tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="border rounded px-3 py-2"
  />
  {error && <p className="text-red-600">{error}</p>}
</div>
```

**Après:**
```tsx
<EnhancedInputField
  label={t('warranty.create.customerSection.email')}
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  state={error ? 'error' : 'default'}
  errorMessage={error}
  leftIcon={<Mail className="w-4 h-4" />}
  helpText={t('common.validation.invalidEmail')}
/>
```

**Changements:**
- Label intégré au composant
- États: default, success, error
- Messages automatiques
- Support icônes
- ARIA labels automatiques

---

### Exemple 4: Toast → useEnhancedToast

**Avant:**
```tsx
// Dans ToastContext
const { showToast } = useToast();
showToast('Succès', 'success');
```

**Après:**
```tsx
import { useEnhancedToast } from './ui';

const { showToast } = useEnhancedToast();

showToast({
  type: 'success',
  title: t('common.status.success'),
  message: 'Garantie créée avec succès',
  duration: 5000,
  action: {
    label: 'Voir',
    onClick: () => navigate('/warranties')
  }
});
```

**Changements:**
- API objet au lieu de params positionnels
- Support actions optionnelles
- Traductions avec `t()`
- Durée configurable
- Types stricts TypeScript

---

### Exemple 5: Card → EnhancedCard

**Avant:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold mb-4">Titre</h2>
  <div>Contenu...</div>
  <div className="mt-4">
    <button>Action</button>
  </div>
</div>
```

**Après:**
```tsx
<EnhancedCard>
  <EnhancedCardHeader
    title={t('dashboard.activity.title')}
    subtitle="Ce qui se passe en temps réel"
  />
  <EnhancedCardContent>
    {/* Contenu... */}
  </EnhancedCardContent>
  <EnhancedCardFooter>
    <SecondaryButton fullWidth>
      {t('dashboard.activity.viewAll')}
    </SecondaryButton>
  </EnhancedCardFooter>
</EnhancedCard>
```

**Changements:**
- Structure sémantique (Header/Content/Footer)
- Padding cohérent automatique
- Ombres et bordures du design system
- Variants: elevated, bordered

---

## 🎨 Palette de couleurs V2

### Couleurs principales

```typescript
// Primary (Bleu) - Actions principales
variant="primary"
className="bg-primary-600 text-primary-600 border-primary-600"

// Secondary (Teal) - Actions secondaires
variant="secondary"
className="bg-secondary-600 text-secondary-600"

// Accent (Rouge) - Alertes, suppressions
variant="danger"
className="bg-accent-600 text-accent-600"

// Success (Vert) - Succès, validations
variant="success"
className="bg-success-600 text-success-600"

// Warning (Orange) - Avertissements
variant="warning"
className="bg-warning-600 text-warning-600"

// Info (Bleu clair) - Informations
variant="info"
className="bg-info-600 text-info-600"

// Neutral (Gris) - Textes, backgrounds
className="bg-neutral-50 text-neutral-900"
```

### Migration des couleurs

| Ancien | Nouveau | Usage |
|--------|---------|-------|
| `bg-red-600` | `bg-primary-600` | Primaire → Bleu |
| `bg-blue-600` | `bg-primary-600` | Garde le bleu |
| `text-red-600` | `text-accent-600` | Rouge → Accent |
| `bg-emerald-600` | `bg-success-600` | Succès |
| `bg-orange-600` | `bg-warning-600` | Avertissement |
| `bg-slate-XXX` | `bg-neutral-XXX` | Gris neutre |

---

## 🌍 Système de traduction

### Ajouter une nouvelle clé

**1. Dans `src/i18n/translations.json`:**
```json
{
  "myFeature": {
    "title": { "fr": "Mon titre", "en": "My title" },
    "description": {
      "fr": "Description avec {{param}}",
      "en": "Description with {{param}}"
    }
  }
}
```

**2. Dans votre composant:**
```tsx
const t = useTranslation();

<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description', { param: 'valeur' })}</p>
```

### Clés courantes disponibles

```typescript
// Actions
t('common.actions.save')        // Enregistrer
t('common.actions.cancel')      // Annuler
t('common.actions.submit')      // Soumettre

// États
t('common.status.loading')      // Chargement...
t('common.status.success')      // Succès
t('common.status.error')        // Erreur

// Validation
t('common.validation.required')       // Ce champ est obligatoire
t('common.validation.invalidEmail')   // Email invalide
```

---

## ⚡ Animations

### Classes d'animation disponibles

```css
/* Apparition */
.animate-fadeIn        /* Fade in simple */
.animate-slideUp       /* Slide from bottom */
.animate-scaleIn       /* Scale from center */

/* Loading */
.animate-pulse         /* Pulse continu */
.animate-spin          /* Rotation */
.animate-shimmer       /* Shimmer effect */
```

### Animations progressives

```tsx
{items.map((item, index) => (
  <div
    key={item.id}
    style={{ animationDelay: `${index * 50}ms` }}
    className="animate-scaleIn"
  >
    <KPICard {...item} />
  </div>
))}
```

---

## ♿ Accessibilité

### Checklist WCAG 2.1 AA

#### Contrastes
- [ ] Texte normal: 4.5:1 minimum
- [ ] Texte large (18px+): 3:1 minimum
- [ ] Éléments UI: 3:1 minimum

#### Navigation clavier
- [ ] Tab entre éléments interactifs
- [ ] Enter pour activer
- [ ] Escape pour fermer modales
- [ ] Arrow keys pour listes

#### ARIA
- [ ] Labels sur tous les inputs
- [ ] Role sur éléments personnalisés
- [ ] aria-label si pas de texte visible
- [ ] aria-describedby pour aide contextuelle
- [ ] aria-live pour notifications

#### Focus
- [ ] Indicateur visible (outline)
- [ ] Ordre logique
- [ ] Pas de focus trap
- [ ] Skip links si nécessaire

---

## 🧪 Tests de validation

### Tests visuels

```bash
# 1. Démarrer le dev server
npm run dev

# 2. Tester dans le navigateur
# - Layout correct?
# - Couleurs cohérentes?
# - Animations fluides?
# - Responsive?
```

### Tests fonctionnels

```typescript
// 1. Navigation clavier
// Tab, Enter, Escape fonctionnent?

// 2. États des composants
// Loading, error, success affichés?

// 3. Traductions
// FR/EN changent correctement?

// 4. Interactions
// Clicks, hovers, focus fonctionnent?
```

### Tests accessibilité

```bash
# Lighthouse audit
npm run build
# Puis tester avec Chrome DevTools > Lighthouse

# Score cible:
# - Accessibility: 100
# - Performance: 90+
# - Best Practices: 100
```

---

## 📦 Composants disponibles

### Boutons
- `PrimaryButton` - Action principale
- `SecondaryButton` - Action secondaire (4 variantes)

### Formulaires
- `EnhancedInputField` - Input avec validation
- `MultiStepWarrantyForm` - Formulaire multi-étapes

### Dashboard
- `KPICard` - Indicateurs de performance
- `EnhancedCard` - Carte conteneur

### Notifications
- `useEnhancedToast()` - Hook de notifications

### Business
- `ClaimsTimeline` - Timeline de réclamations
- `SignatureModal` - Modal de signature

---

## 🎯 Priorités de migration

### Phase 1: High Impact (Semaine 1)
1. ✅ **Dashboard** - Migré ✓
2. ⏳ **NewWarranty** - En attente
3. ⏳ **ClaimsCenter** - En attente

### Phase 2: Medium Impact (Semaine 2)
4. ⏳ **WarrantiesList** - En attente
5. ⏳ **CustomersPage** - En attente
6. ⏳ **SettingsPage** - En attente

### Phase 3: Low Impact (Semaine 3)
7. ⏳ Pages secondaires
8. ⏳ Composants utilitaires
9. ⏳ Documentation

---

## 💡 Conseils et best practices

### ✅ À faire

1. **Migrer progressivement** - Une page à la fois
2. **Tester après chaque migration** - Build + tests visuels
3. **Utiliser les variantes sémantiques** - primary, success, warning, etc.
4. **Ajouter les traductions** - Tous les textes visibles
5. **Documenter les changements** - Commit messages clairs
6. **Conserver la backward compatibility** - Anciens composants fonctionnent

### ❌ À éviter

1. **Ne pas tout migrer d'un coup** - Risque d'erreurs
2. **Ne pas mélanger V1 et V2 dans un composant** - Incohérent
3. **Ne pas ignorer l'accessibilité** - WCAG obligatoire
4. **Ne pas oublier le responsive** - Mobile first
5. **Ne pas coder en dur les textes** - Toujours utiliser `t()`
6. **Ne pas retirer les anciens composants** - Avant migration complète

---

## 🆘 Troubleshooting

### Erreur: "tokens is not defined"
```typescript
// ❌ Mauvais import
import tokens from '../design/tokens.json';

// ✅ Bon import
import tokensV2 from '../design/tokens-v2.json';
```

### Erreur: "Cannot find module './ui'"
```bash
# Vérifier que le barrel export existe
ls src/components/ui/index.ts

# Si absent, le créer
# Voir: TRANSFORMATION_UI_V2_COMPLETE.md
```

### Traduction ne s'affiche pas
```typescript
// Vérifier que la clé existe
const t = useTranslation();
console.log(t('ma.cle'));

// Si undefined, ajouter dans translations.json
```

### Couleur incorrecte
```css
/* Vérifier dans tailwind.config.js */
/* Les classes doivent être définies */

/* ❌ Si classe absente */
.bg-custom-color

/* ✅ Utiliser classes prédéfinies */
.bg-primary-600
```

---

## 🔗 Ressources

### Documentation
- `TRANSFORMATION_UI_V2_COMPLETE.md` - Guide complet
- `UI_V2_INTEGRATION_COMPLETE.md` - Référence technique
- `MIGRATION_DASHBOARD_V2_COMPLETE.md` - Exemple de migration

### Code source
- `src/components/ui/` - Composants V2
- `src/design/tokens-v2.json` - Design tokens
- `src/i18n/translations.json` - Traductions
- `src/components/UIV2Demo.tsx` - Exemples live

### Outils
- `useTranslation()` - Hook i18n
- `useEnhancedToast()` - Hook notifications
- TailwindCSS - Classes utilitaires
- Lucide React - Icônes

---

## 🎉 Félicitations!

Vous êtes maintenant prêt à migrer vos composants vers UI V2!

**N'oubliez pas:**
1. Référez-vous à UIV2Demo pour des exemples
2. Testez après chaque migration
3. Documentez vos changements
4. Demandez de l'aide si nécessaire

**Bon courage! 🚀**
