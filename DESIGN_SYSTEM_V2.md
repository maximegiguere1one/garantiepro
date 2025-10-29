# Design System V2 - Pro-Remorque
## Professional UI/UX Component Library

**Version:** 2.0
**Date:** October 2025
**Status:** Production Ready ✅

---

## Table of Contents

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [Components](#components)
4. [Patterns & Compositions](#patterns--compositions)
5. [Accessibility](#accessibility)
6. [i18n Integration](#i18n-integration)
7. [Best Practices](#best-practices)

---

## Overview

The Pro-Remorque Design System V2 is a comprehensive UI/UX library designed to achieve a 10x improvement in professionalism, simplicity, and user experience. Built on React 18, TypeScript, and Tailwind CSS, it provides production-ready components with full WCAG 2.1 AA compliance.

### Key Principles

- **Accessibility First**: Every component meets WCAG 2.1 AA standards
- **Performance Optimized**: Minimal bundle impact, lazy loading where appropriate
- **Bilingual Ready**: Full FR/EN support with i18n integration
- **Mobile First**: Responsive design from 320px to 2560px
- **Professional**: Blue primary (#0B6EF6), teal secondary (#0F766E), red accent (#DC2626)

---

## Design Tokens

### Location
- Primary: `/src/design/tokens-v2.json`
- Legacy: `/src/design/tokens.json` (for backward compatibility)

### Color Palette

#### Primary (Blue)
Professional blue for main CTAs and interactive elements.
- `primary-600`: `#0B6EF6` (default)
- `primary-700`: `#0A58D6` (hover)
- Full scale: 50-900

#### Secondary (Teal)
Complementary color for secondary actions and accents.
- `secondary-600`: `#0F766E` (default)
- Full scale: 50-900

#### Accent (Red)
Brand red for warnings, errors, and important highlights.
- `accent-600`: `#DC2626` (default)
- Full scale: 50-900

#### Semantic Colors
- **Success**: Green (#16A34A) - confirmations, approvals
- **Warning**: Orange (#F59E0B) - cautions, pending states
- **Danger**: Red (#DC2626) - errors, rejections
- **Info**: Blue (#3B82F6) - informational messages

#### Neutral Scale
- `neutral-50`: `#FBFBFC` (backgrounds)
- `neutral-900`: `#111827` (text)
- Full scale: 50-900

### Spacing System (4px base unit)

```
1  = 4px   (xs)
2  = 8px   (sm)
3  = 12px
4  = 16px  (md)
5  = 20px
6  = 24px  (lg)
8  = 32px  (xl)
12 = 48px  (2xl)
16 = 64px  (3xl)
```

### Typography

**Font Family**: Inter (sans-serif)

**Size Scale**:
- `xs`: 12px (captions, help text)
- `sm`: 14px (secondary text)
- `base`: 16px (body text) ← default
- `lg`: 18px (emphasized text)
- `xl`: 20px (small headings)
- `2xl`: 24px (section headings)
- `3xl`: 30px (page headings)
- `4xl`: 36px (hero headings)

**Line Height**:
- `tight`: 1.2 (headings)
- `normal`: 1.5 (body) ← default
- `relaxed`: 1.75 (reading content)

**Font Weight**:
- `normal`: 400 (body text)
- `medium`: 500 (emphasis)
- `semibold`: 600 (labels, buttons)
- `bold`: 700 (headings)

### Border Radius

- `sm`: 4px (small elements)
- `DEFAULT/md`: 6px (buttons, inputs)
- `lg`: 8px (cards)
- `xl`: 12px (large cards)
- `pill`: 9999px (badges, pills)

### Shadows

Professional depth for elevation hierarchy.

- `sm`: Subtle lift
- `DEFAULT/md`: Standard cards
- `lg`: Elevated panels
- `xl`: Modal dialogs
- `focus`: Focus ring (4px, primary-500/20)

### Z-Index Scale

```
dropdown:      1000
sticky:        1020
fixed:         1030
modalBackdrop: 1040
modal:         1050
popover:       1060
tooltip:       1070
toast:         1080
```

---

## Components

### 1. PrimaryButton

**Location**: `/src/components/ui/PrimaryButton.tsx`

**Purpose**: Main call-to-action button with gradient background.

**Usage**:
```tsx
<PrimaryButton onClick={handleSubmit} loading={isSubmitting}>
  Enregistrer
</PrimaryButton>

<PrimaryButton size="lg" leftIcon={<Plus />} fullWidth>
  Créer une garantie
</PrimaryButton>
```

**Props**:
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `loading`: boolean (shows spinner)
- `leftIcon`, `rightIcon`: ReactNode
- `fullWidth`: boolean
- All standard button HTML attributes

**Accessibility**:
- `aria-busy` when loading
- `aria-disabled` when disabled
- Focus ring with 4px offset
- Keyboard accessible

**When to use**:
- Primary action on each screen (max 1 per view)
- Submit buttons for forms
- Confirmation actions

**When NOT to use**:
- Cancel or back actions (use SecondaryButton)
- Destructive actions (use danger variant)
- Multiple equal-priority actions

---

### 2. SecondaryButton

**Location**: `/src/components/ui/SecondaryButton.tsx`

**Purpose**: Secondary actions with outline style.

**Usage**:
```tsx
<SecondaryButton onClick={handleCancel}>
  Annuler
</SecondaryButton>

<SecondaryButton leftIcon={<ArrowLeft />} onClick={goBack}>
  Retour
</SecondaryButton>
```

**Props**: Same as PrimaryButton

**When to use**:
- Cancel actions
- Back navigation
- Secondary actions on forms
- Alternative options

---

### 3. EnhancedInputField

**Location**: `/src/components/ui/EnhancedInputField.tsx`

**Purpose**: Professional input with validation, help text, and full accessibility.

**Usage**:
```tsx
<EnhancedInputField
  label="Courriel"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  helpText="Utilisé pour l'envoi de documents"
  required
/>

<EnhancedInputField
  label="NIV"
  value={vin}
  success={vinValidated}
  successMessage="NIV valide"
  leftIcon={<Shield />}
  maxLength={17}
/>
```

**Props**:
- `label`: string (required)
- `error`: string (error message)
- `success`: boolean
- `successMessage`: string
- `helpText`: string (shown below input)
- `hint`: string (shown next to label)
- `leftIcon`, `rightIcon`: ReactNode
- All standard input HTML attributes

**Validation States**:
- **Default**: Neutral border, hover effect
- **Error**: Red border, red background, error icon, error message
- **Success**: Green border, green background, check icon, success message

**Accessibility**:
- Proper label association with `htmlFor`
- `aria-invalid` on error
- `aria-describedby` linking to help text and error
- Required indicator with `aria-label`

---

### 4. EnhancedCard

**Location**: `/src/components/ui/EnhancedCard.tsx`

**Purpose**: Flexible card container with variants and sub-components.

**Usage**:
```tsx
<EnhancedCard>
  <EnhancedCardHeader
    title="Informations client"
    subtitle="Détails et coordonnées"
    action={<Button size="sm">Modifier</Button>}
  />
  <EnhancedCardContent>
    Content goes here
  </EnhancedCardContent>
  <EnhancedCardFooter>
    Footer actions
  </EnhancedCardFooter>
</EnhancedCard>

<EnhancedCard variant="elevated" hoverable>
  Interactive card with hover lift
</EnhancedCard>
```

**Variants**:
- `default`: White bg, subtle border and shadow
- `bordered`: White bg, 2px border
- `elevated`: White bg, large shadow
- `glass`: Semi-transparent with backdrop blur

**Sub-components**:
- `EnhancedCardHeader`: Title, subtitle, optional action
- `EnhancedCardContent`: Main content area
- `EnhancedCardFooter`: Actions or metadata

---

### 5. KPICard

**Location**: `/src/components/ui/KPICard.tsx`

**Purpose**: Dashboard metric display with icon, value, and trend.

**Usage**:
```tsx
<KPICard
  icon={<DollarSign />}
  label="Revenu"
  value="45 280 $"
  trend={{ value: 12.5, isPositive: true }}
  subtitle="Ce mois-ci"
  color="primary"
/>
```

**Props**:
- `icon`: ReactNode (displayed in colored circle)
- `label`: string (metric name)
- `value`: string | number (main value)
- `trend`: { value: number, isPositive: boolean }
- `color`: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral'
- `subtitle`: string (optional description)

**Layout**: Use in 2-4 column grids on dashboards

---

### 6. MultiStepWarrantyForm

**Location**: `/src/components/ui/MultiStepWarrantyForm.tsx`

**Purpose**: Multi-step form with progress bar, navigation, and autosave.

**Usage**:
```tsx
<MultiStepWarrantyForm
  steps={[
    {
      title: 'Informations client',
      content: <CustomerStep />,
      validate: async () => validateCustomer()
    },
    {
      title: 'Détails remorque',
      content: <TrailerStep />
    },
    {
      title: 'Sélection plan',
      content: <PlanStep />
    }
  ]}
  onComplete={handleSubmit}
  onSave={handleAutosave}
  autosaveInterval={10000}
/>
```

**Features**:
- Visual progress bar with step indicators
- Back/Next navigation with validation
- Autosave every 10s (configurable)
- "Saved at HH:MM" indicator
- Keyboard shortcuts (Ctrl+S, Ctrl+Enter)
- Step validation before progression

**Props**:
- `steps`: FormStep[] (required)
- `onComplete`: () => void | Promise<void>
- `onSave`: () => void | Promise<void> (optional)
- `autosaveInterval`: number (ms, default: 10000)

---

### 7. ClaimsTimeline

**Location**: `/src/components/ui/ClaimsTimeline.tsx`

**Purpose**: Vertical timeline for claim event history.

**Usage**:
```tsx
<ClaimsTimeline
  events={[
    {
      id: '1',
      type: 'submitted',
      title: 'Réclamation soumise',
      description: 'Client: Jean Tremblay',
      timestamp: new Date(),
      user: 'System'
    },
    {
      id: '2',
      type: 'status_change',
      title: 'Statut changé: En révision',
      timestamp: new Date(),
      user: 'Marie Dubois'
    }
  ]}
/>
```

**Event Types**:
- `submitted`: File icon, blue
- `status_change`: Clock icon, orange
- `comment`: Message icon, gray
- `document`: File icon, primary
- `approved`: Check icon, green
- `rejected`: X icon, red
- `closed`: Check icon, gray

**Features**:
- Grouped by date with separators
- Icons color-coded by type
- User attribution
- Expandable content (optional)
- Empty state handling

---

### 8. EnhancedToast

**Location**: `/src/components/ui/EnhancedToast.tsx`

**Purpose**: Toast notification system with auto-dismiss and stacking.

**Setup**:
```tsx
// In app root:
import { EnhancedToastProvider } from './components/ui/EnhancedToast';

<EnhancedToastProvider>
  <App />
</EnhancedToastProvider>
```

**Usage**:
```tsx
import { useEnhancedToast } from './components/ui/EnhancedToast';

const toast = useEnhancedToast();

// Success notification
toast.success('Garantie créée avec succès!');

// Error with longer duration
toast.error('Erreur lors de l\'enregistrement', {
  duration: 10000
});

// Warning with action
toast.warning('Données non sauvegardées', {
  description: 'Modifications en attente',
  action: {
    label: 'Enregistrer',
    onClick: handleSave
  }
});

// Info notification
toast.info('3 nouvelles notifications');
```

**Features**:
- 4 types: success, error, warning, info
- Auto-dismiss (default: 5s, configurable)
- Max 3 toasts stacked
- Action buttons (optional)
- Slide-in animation
- ARIA live region (polite)

**Best Practices**:
- Use sparingly for important feedback
- Keep messages concise (< 60 chars)
- Success for confirmations
- Error for failures
- Warning for cautions
- Info for non-critical updates

---

### 9. SignatureModal

**Location**: `/src/components/ui/SignatureModal.tsx`

**Purpose**: Signature capture modal with PDF preview and proof display.

**Usage**:
```tsx
<SignatureModal
  isOpen={showSignature}
  onClose={() => setShowSignature(false)}
  documentUrl="/path/to/warranty.pdf"
  onSign={async (proof) => {
    await saveSignature(proof);
  }}
  customerName="Jean Tremblay"
  customerEmail="jean@example.com"
/>
```

**Features**:
- Split layout: PDF preview (left) + signature pad (right)
- Zoom controls (50%-200%)
- Signature pad with clear/redo
- Signature proof with:
  - Timestamp
  - IP address
  - Document hash (SHA-256)
  - Signer name and email
- Success confirmation screen
- Responsive: single column on mobile

**Props**:
- `isOpen`: boolean
- `onClose`: () => void
- `documentUrl`: string
- `onSign`: (proof: SignatureProof) => Promise<void>
- `customerName`: string
- `customerEmail`: string

---

## Patterns & Compositions

### Form Layout Pattern

**Recommended structure for multi-section forms:**

```tsx
<div className="max-w-4xl mx-auto space-y-6 p-6">
  {/* Page Header */}
  <div className="mb-8">
    <h1 className="text-3xl font-bold text-neutral-900">
      Créer une garantie
    </h1>
    <p className="text-neutral-600 mt-2">
      Enregistrer une nouvelle garantie pour un client
    </p>
  </div>

  {/* Form Sections in Cards */}
  <EnhancedCard>
    <EnhancedCardHeader title="Informations client" />
    <EnhancedCardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EnhancedInputField label="Prénom" {...} />
        <EnhancedInputField label="Nom" {...} />
        {/* More fields */}
      </div>
    </EnhancedCardContent>
  </EnhancedCard>

  <EnhancedCard>
    <EnhancedCardHeader title="Détails de la remorque" />
    <EnhancedCardContent>
      {/* Trailer fields */}
    </EnhancedCardContent>
  </EnhancedCard>

  {/* Actions */}
  <div className="flex items-center justify-end gap-3 pt-6">
    <SecondaryButton onClick={handleCancel}>
      Annuler
    </SecondaryButton>
    <PrimaryButton onClick={handleSubmit} loading={isSubmitting}>
      Enregistrer
    </PrimaryButton>
  </div>
</div>
```

### Dashboard Layout Pattern

**Recommended structure for dashboards:**

```tsx
<div className="p-6 space-y-6">
  {/* Header with Actions */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold text-neutral-900">
        Tableau de bord
      </h1>
      <p className="text-neutral-600 mt-1">
        Bienvenue, {userName}
      </p>
    </div>
    <PrimaryButton leftIcon={<Plus />} onClick={onCreate}>
      Créer une garantie
    </PrimaryButton>
  </div>

  {/* KPI Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <KPICard {...revenue} />
    <KPICard {...warranties} />
    <KPICard {...claims} />
    <KPICard {...conversion} />
  </div>

  {/* Content Sections */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <EnhancedCard>
        <EnhancedCardHeader title="Activité récente" />
        <EnhancedCardContent>
          {/* Activity list */}
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
    <div>
      <EnhancedCard>
        <EnhancedCardHeader title="Actions rapides" />
        <EnhancedCardContent>
          {/* Quick actions */}
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
  </div>
</div>
```

---

## Accessibility

### WCAG 2.1 AA Compliance Checklist

✅ **Color Contrast**:
- Text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- All components meet or exceed requirements

✅ **Keyboard Navigation**:
- Tab order follows visual order
- Focus indicators visible (4px ring, 20% opacity)
- Escape closes modals/dialogs
- Enter/Space activates buttons

✅ **Screen Reader Support**:
- Semantic HTML (`button`, not `div`)
- ARIA labels where needed
- `aria-invalid` for errors
- `aria-busy` for loading states
- `aria-live` for dynamic updates
- `aria-describedby` for help text

✅ **Form Accessibility**:
- Labels properly associated
- Required fields indicated
- Error messages announced
- Help text provided
- Validation feedback

✅ **Touch Targets**:
- Minimum 44x44px on mobile
- Adequate spacing between interactive elements
- No overlapping hit areas

### Testing Tools

**Automated**:
- axe DevTools (Chrome extension)
- WAVE (Web Accessibility Evaluation Tool)
- Lighthouse Accessibility audit

**Manual**:
- NVDA (Windows screen reader)
- VoiceOver (macOS/iOS screen reader)
- Keyboard-only navigation test
- Color contrast analyzer

---

## i18n Integration

### Translation Files

**Location**: `/src/i18n/translations.json`

**Structure**:
```json
{
  "common": {
    "actions": {
      "save": { "fr": "Enregistrer", "en": "Save" }
    }
  },
  "warranty": {
    "create": {
      "title": { "fr": "Créer une garantie", "en": "Create Warranty" }
    }
  }
}
```

### Usage Pattern

```tsx
import translations from '../i18n/translations.json';

// Get user language from profile
const { profile } = useAuth();
const lang = profile?.language_preference || 'fr';

// Translation helper
const t = (key: string) => {
  const keys = key.split('.');
  let value: any = translations;
  for (const k of keys) {
    value = value[k];
    if (!value) return key; // Fallback to key
  }
  return value[lang] || value['fr']; // Fallback to French
};

// Use in component
<PrimaryButton>
  {t('common.actions.save')}
</PrimaryButton>
```

### Text Expansion

French text is typically 30% longer than English. Design with this in mind:
- Use flexible layouts (not fixed widths)
- Test with longest translation
- Allow text wrapping where appropriate

---

## Best Practices

### Do's ✅

1. **Use semantic HTML**: `button` for buttons, `a` for links
2. **Follow spacing system**: Use tokens (4, 8, 16, 24px)
3. **Single CTA per screen**: One PrimaryButton max
4. **Progressive disclosure**: Hide complexity behind interactions
5. **Provide feedback**: Loading states, success confirmations, error messages
6. **Test with real data**: Use production-like content lengths
7. **Mobile first**: Design for 375px, scale up
8. **Accessible by default**: Every component meets WCAG AA

### Don'ts ❌

1. **Don't use arbitrary colors**: Use design tokens only
2. **Don't skip loading states**: Always show feedback
3. **Don't rely on color alone**: Use icons + text
4. **Don't ignore empty states**: Design for zero data
5. **Don't use vague labels**: "Click here" → "Créer une garantie"
6. **Don't nest CTAs**: One action hierarchy per view
7. **Don't forget error states**: Plan for failures
8. **Don't skip keyboard testing**: Tab through every flow

### Performance

**Bundle Impact**:
- PrimaryButton: ~2KB
- EnhancedInputField: ~3KB
- EnhancedCard: ~1KB
- MultiStepWarrantyForm: ~5KB
- ClaimsTimeline: ~4KB
- EnhancedToast: ~4KB
- SignatureModal: ~8KB (includes signature_pad)

**Total**: ~27KB for all components (gzipped)

**Optimization Tips**:
- Lazy load SignatureModal (only when needed)
- Tree-shake unused components
- Use React.memo for expensive renders
- Implement virtual scrolling for long lists

---

## Migration from V1

### Color Changes

**Before** (V1):
- Primary: #DC2626 (red)
- No secondary color

**After** (V2):
- Primary: #0B6EF6 (blue)
- Secondary: #0F766E (teal)
- Accent: #DC2626 (red, kept for brand)

**Migration**: Update `tailwind.config.js` to use `tokens-v2.json`. V1 colors remain available under `accent-*` scale.

### Component Replacements

| V1 Component | V2 Replacement | Notes |
|--------------|----------------|-------|
| `Button` | `PrimaryButton` or `SecondaryButton` | Split into two components |
| `FormField` | `EnhancedInputField` | Enhanced validation states |
| `Card` | `EnhancedCard` | More variants, sub-components |
| `Toast` | `EnhancedToast` | Context-based, stacking |

---

## Support & Questions

For questions or issues with the design system:
1. Check this documentation first
2. Review component code for inline examples
3. Test in Storybook (if available)
4. Open an issue with reproduction steps

**Maintainers**: Pro-Remorque Development Team
**Last Updated**: October 2025
**Version**: 2.0
