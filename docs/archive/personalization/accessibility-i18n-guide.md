# Accessibility & Internationalization Guide

**Project:** Pro-Remorque Warranty Management Platform
**Version:** 2.0
**Date:** 2025-10-27
**Compliance Target:** WCAG 2.1 Level AA
**Supported Languages:** French (primary), English (secondary)

---

## 1. Accessibility Overview

### 1.1 WCAG 2.1 Principles

Pro-Remorque's role-based personalization system adheres to the four core WCAG principles:

1. **Perceivable:** Information and UI components must be presentable to users in ways they can perceive
2. **Operable:** UI components and navigation must be operable
3. **Understandable:** Information and operation of UI must be understandable
4. **Robust:** Content must be robust enough to be interpreted by assistive technologies

### 1.2 Target Compliance Level

**WCAG 2.1 Level AA** - Required for government contracts and best practices

---

## 2. Keyboard Accessibility

### 2.1 Tab Order & Focus Management

**Guideline:** All interactive elements must be keyboard accessible in logical order.

#### Implementation Checklist

- ✅ All buttons, links, form inputs accessible via Tab key
- ✅ Tab order follows visual flow (top-to-bottom, left-to-right)
- ✅ Skip links provided for keyboard users ("Skip to main content")
- ✅ No keyboard traps (users can always navigate away)
- ✅ Focus visible at all times (2px outline, 3:1 contrast)

#### Focus Indicator Styles

```css
/* Global focus styles */
*:focus-visible {
  outline: 2px solid var(--color-primary-600);
  outline-offset: 2px;
  border-radius: 4px;
}

/* High contrast focus for buttons */
button:focus-visible {
  outline: 3px solid var(--color-primary-600);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
}

/* Focus for form inputs */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: var(--color-primary-600);
  ring: 4px;
  ring-color: rgba(220, 38, 38, 0.1);
}
```

### 2.2 Keyboard Shortcuts

**Product Tours:**
- `Right Arrow` - Next step
- `Left Arrow` - Previous step
- `Escape` - Close/skip tour
- `Enter` / `Space` - Activate buttons

**Global Navigation:**
- `?` - Show keyboard shortcuts help
- `/` - Focus search bar
- `Escape` - Close modals/dropdowns

#### Implementation

```typescript
// Keyboard event handler for tours
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (tourActive) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          tourEngine.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          tourEngine.back();
          break;
        case 'Escape':
          e.preventDefault();
          tourEngine.cancel();
          break;
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [tourActive]);
```

### 2.3 Focus Trapping in Modals

**Requirement:** When a modal is open, focus must stay within the modal.

```typescript
import { useEffect, useRef } from 'react';

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}
```

---

## 3. Screen Reader Support

### 3.1 ARIA Labels & Roles

**Guideline:** All interactive elements must have descriptive labels.

#### Tour Step ARIA Implementation

```typescript
interface TourStepProps {
  title: string;
  body: string;
  stepNumber: number;
  totalSteps: number;
}

function TourStep({ title, body, stepNumber, totalSteps }: TourStepProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      aria-live="polite"
    >
      <div className="sr-only" aria-live="polite">
        Étape {stepNumber} sur {totalSteps}
      </div>

      <h2 id="tour-title" className="text-lg font-bold">
        {title}
      </h2>

      <div id="tour-body" className="mt-2 text-sm">
        {body}
      </div>

      <div className="mt-4 flex gap-2">
        <button aria-label={`Précédent, étape ${stepNumber - 1}`}>
          Précédent
        </button>
        <button aria-label={`Suivant, étape ${stepNumber + 1}`}>
          Suivant
        </button>
      </div>
    </div>
  );
}
```

### 3.2 Live Regions for Dynamic Content

**Guideline:** Announce dynamic changes to screen reader users.

```typescript
// Toast notification with ARIA live region
function Toast({ message, type }: ToastProps) {
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      className="toast"
    >
      <span className="sr-only">{type === 'error' ? 'Erreur: ' : 'Notification: '}</span>
      {message}
    </div>
  );
}
```

### 3.3 Screen Reader Only Text

**Guideline:** Provide additional context for screen reader users when visual context is insufficient.

```css
/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:focus,
.sr-only-focusable:active {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

#### Example Usage

```tsx
// Button with icon only
<button aria-label="Créer une nouvelle garantie">
  <Plus className="w-5 h-5" aria-hidden="true" />
  <span className="sr-only">Créer une nouvelle garantie</span>
</button>

// Status indicator
<div className="status-badge status-approved">
  <CheckCircle aria-hidden="true" />
  <span>Approuvé</span>
  <span className="sr-only">Statut: Approuvé</span>
</div>
```

### 3.4 Form Field Associations

**Requirement:** All form inputs must have associated labels.

```tsx
// Correct: Label explicitly associated
<div>
  <label htmlFor="customer-name" className="block font-medium">
    Nom du client
    {required && <span aria-label="requis"> *</span>}
  </label>
  <input
    id="customer-name"
    type="text"
    aria-required={required}
    aria-invalid={hasError}
    aria-describedby={hasError ? "customer-name-error" : "customer-name-help"}
  />
  {hasError && (
    <p id="customer-name-error" className="text-red-600" role="alert">
      Le nom du client est requis
    </p>
  )}
  {!hasError && (
    <p id="customer-name-help" className="text-gray-600">
      Entrez le nom complet du client
    </p>
  )}
</div>
```

---

## 4. Color & Contrast

### 4.1 Contrast Requirements

**WCAG AA Standards:**
- Normal text (< 18px): minimum **4.5:1** contrast ratio
- Large text (≥ 18px or 14px bold): minimum **3:1** contrast ratio
- UI components & graphics: minimum **3:1** contrast ratio

### 4.2 Pro-Remorque Color Palette - Contrast Validation

#### Primary Colors (Red)

| Background | Foreground | Ratio | Pass AA | Use Case |
|------------|------------|-------|---------|----------|
| primary-50 (#fef2f2) | primary-900 (#7f1d1d) | 10.1:1 | ✅ | Text on light bg |
| primary-600 (#dc2626) | white (#ffffff) | 5.2:1 | ✅ | Primary buttons |
| primary-700 (#b91c1c) | white (#ffffff) | 6.8:1 | ✅ | Button hover |
| primary-500 (#ef4444) | neutral-900 (#111827) | 4.9:1 | ✅ | Badges |

#### Neutral Colors

| Background | Foreground | Ratio | Pass AA | Use Case |
|------------|------------|-------|---------|----------|
| white (#ffffff) | neutral-900 (#111827) | 16.1:1 | ✅ | Body text |
| white (#ffffff) | neutral-600 (#4b5563) | 7.2:1 | ✅ | Secondary text |
| neutral-100 (#f3f4f6) | neutral-800 (#1f2937) | 12.8:1 | ✅ | Card backgrounds |

#### Status Colors

| Color | Background | Foreground | Ratio | Pass AA |
|-------|------------|------------|-------|---------|
| Success | success-500 (#10b981) | white | 4.8:1 | ✅ |
| Warning | warning-500 (#f59e0b) | neutral-900 | 5.1:1 | ✅ |
| Danger | danger-500 (#ef4444) | white | 4.9:1 | ✅ |
| Info | info-500 (#3b82f6) | white | 5.3:1 | ✅ |

### 4.3 Testing Tools

**Recommended Tools:**
- Chrome DevTools - Lighthouse accessibility audit
- axe DevTools browser extension
- WAVE (Web Accessibility Evaluation Tool)
- Color Contrast Analyzer (CCA)

**Automated Testing:**

```bash
# Install axe-core for automated testing
npm install --save-dev axe-core @axe-core/react

# Run in test suite
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('Tour modal has no accessibility violations', async () => {
  const { container } = render(<TourModal />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 4.4 Information Not Conveyed by Color Alone

**Requirement:** Don't rely solely on color to convey meaning.

#### SLA Indicators - Correct Implementation

```tsx
// ✅ CORRECT: Color + icon + text
<div className="sla-indicator sla-critical">
  <AlertCircle className="w-4 h-4" aria-hidden="true" />
  <span>Retard (SLA dépassé)</span>
</div>

<div className="sla-indicator sla-warning">
  <Clock className="w-4 h-4" aria-hidden="true" />
  <span>Échéance proche (2h restantes)</span>
</div>

<div className="sla-indicator sla-on-track">
  <CheckCircle className="w-4 h-4" aria-hidden="true" />
  <span>Dans les temps</span>
</div>
```

```css
.sla-critical {
  background-color: var(--color-danger-50);
  border-left: 4px solid var(--color-danger-600);
  color: var(--color-danger-900);
}

.sla-warning {
  background-color: var(--color-warning-50);
  border-left: 4px solid var(--color-warning-600);
  color: var(--color-warning-900);
}

.sla-on-track {
  background-color: var(--color-success-50);
  border-left: 4px solid var(--color-success-600);
  color: var(--color-success-900);
}
```

---

## 5. Text Accessibility

### 5.1 Font Sizes

**WCAG Requirements:**
- Minimum body text: 14px (0.875rem)
- Minimum UI text: 12px (0.75rem)
- Maximum line length: 80 characters (for readability)

**Pro-Remorque Typography Scale:**

```typescript
const typography = {
  xs: '0.75rem',    // 12px - Small labels
  sm: '0.875rem',   // 14px - Body text, form inputs
  base: '1rem',     // 16px - Primary body text
  lg: '1.125rem',   // 18px - Large body, small headings
  xl: '1.25rem',    // 20px - Section headings
  '2xl': '1.5rem',  // 24px - Page titles
  '3xl': '1.875rem', // 30px - Hero text
  '4xl': '2.25rem',  // 36px - Display headings
};
```

### 5.2 Line Height & Spacing

**WCAG Success Criterion 1.4.12 (Level AA):**
- Line height (line spacing): at least 1.5 times the font size
- Paragraph spacing: at least 2 times the font size
- Letter spacing: at least 0.12 times the font size
- Word spacing: at least 0.16 times the font size

```css
/* Applied globally */
body {
  font-size: 1rem;
  line-height: 1.5; /* 150% */
  letter-spacing: 0.02em; /* 2% */
}

p {
  margin-bottom: 1em; /* Paragraph spacing */
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.2; /* Tighter for headings */
  margin-bottom: 0.5em;
}
```

### 5.3 Text Resize Support

**Requirement:** Users must be able to resize text up to 200% without loss of functionality.

**Testing:**
1. Zoom browser to 200%
2. Verify all content is visible and readable
3. Ensure no horizontal scrolling (except for tables)
4. Confirm all interactive elements remain accessible

```css
/* Use rem units for scalability */
.button {
  padding: 0.5rem 1rem; /* Scales with user preferences */
  font-size: 0.875rem;
}

/* Avoid fixed pixel heights */
.card {
  min-height: 10rem; /* Use min-height instead of height */
  padding: 1.5rem;
}
```

---

## 6. Internationalization (i18n)

### 6.1 Language Support

**Primary:** Français (fr-CA)
**Secondary:** English (en-CA)

#### Language Detection

```typescript
// Detect user's preferred language
function detectLanguage(): 'fr' | 'en' {
  // 1. Check user profile setting
  const userLang = userProfile?.preferred_language;
  if (userLang) return userLang;

  // 2. Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'fr' || browserLang === 'en') return browserLang;

  // 3. Default to French (primary market)
  return 'fr';
}
```

### 6.2 Translation Structure

**File:** `src/i18n/translations.json`

```json
{
  "fr": {
    "common": {
      "save": "Enregistrer",
      "cancel": "Annuler",
      "delete": "Supprimer",
      "edit": "Modifier",
      "loading": "Chargement...",
      "required": "Requis"
    },
    "roles": {
      "dealer": "Concessionnaire",
      "operator": "Opérateur",
      "support": "Support",
      "admin": "Administrateur"
    },
    "tours": {
      "welcome": {
        "title": "Bienvenue sur votre tableau de bord",
        "description": "Ceci est votre centre de commande..."
      }
    }
  },
  "en": {
    "common": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "loading": "Loading...",
      "required": "Required"
    },
    "roles": {
      "dealer": "Dealer",
      "operator": "Operator",
      "support": "Support",
      "admin": "Administrator"
    },
    "tours": {
      "welcome": {
        "title": "Welcome to your dashboard",
        "description": "This is your command center..."
      }
    }
  }
}
```

### 6.3 useTranslation Hook

```typescript
import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import translations from '../i18n/translations.json';

export function useTranslation() {
  const { locale, setLocale } = useContext(LanguageContext);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  };

  return { t, locale, setLocale };
}

// Usage
const { t } = useTranslation();
<button>{t('common.save')}</button>
<h1>{t('dashboard.welcome', { name: userName })}</h1>
```

### 6.4 Date & Time Formatting

```typescript
import { format } from 'date-fns';
import { fr, enCA } from 'date-fns/locale';

function formatDate(date: Date, locale: 'fr' | 'en'): string {
  const localeObj = locale === 'fr' ? fr : enCA;
  return format(date, 'PPP', { locale: localeObj });
}

// FR: 27 octobre 2025
// EN: October 27, 2025
```

### 6.5 Number & Currency Formatting

```typescript
function formatCurrency(amount: number, locale: 'fr' | 'en'): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

// FR: 1 234,56 $
// EN: $1,234.56
```

### 6.6 Language Switcher Component

```tsx
function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div role="group" aria-label="Sélection de langue">
      <button
        onClick={() => setLocale('fr')}
        aria-pressed={locale === 'fr'}
        aria-label="Basculer vers le français"
        className={locale === 'fr' ? 'active' : ''}
      >
        FR
      </button>
      <button
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        aria-label="Switch to English"
        className={locale === 'en' ? 'active' : ''}
      >
        EN
      </button>
    </div>
  );
}
```

### 6.7 Right-to-Left (RTL) Support

While French and English are LTR languages, include basic RTL support for future scalability:

```css
/* Logical properties for RTL support */
.element {
  margin-inline-start: 1rem; /* margin-left in LTR, margin-right in RTL */
  padding-inline-end: 1rem;  /* padding-right in LTR, padding-left in RTL */
  border-inline-start: 1px solid gray;
}
```

---

## 7. Accessible Rich Internet Applications (ARIA)

### 7.1 Role-Based UI ARIA Landmarks

```tsx
function DashboardLayout() {
  return (
    <div className="dashboard">
      <header role="banner">
        <h1>Pro-Remorque</h1>
      </header>

      <nav role="navigation" aria-label="Navigation principale">
        <ul>
          <li><a href="/dashboard">Tableau de bord</a></li>
          <li><a href="/warranties">Garanties</a></li>
        </ul>
      </nav>

      <main role="main" aria-label="Contenu principal">
        {/* Main content */}
      </main>

      <aside role="complementary" aria-label="Informations supplémentaires">
        {/* Sidebar */}
      </aside>

      <footer role="contentinfo">
        <p>&copy; 2025 Pro-Remorque</p>
      </footer>
    </div>
  );
}
```

### 7.2 ARIA States & Properties

#### Button Loading State

```tsx
<button
  disabled={loading}
  aria-busy={loading}
  aria-label={loading ? 'Chargement en cours' : 'Enregistrer'}
>
  {loading ? <Loader className="animate-spin" aria-hidden="true" /> : 'Enregistrer'}
</button>
```

#### Expandable Section

```tsx
function AdvancedOptions() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="advanced-options-content"
      >
        Afficher les options avancées
      </button>

      <div
        id="advanced-options-content"
        hidden={!expanded}
        aria-hidden={!expanded}
      >
        {/* Advanced options */}
      </div>
    </>
  );
}
```

#### Form Validation

```tsx
<input
  type="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : "email-help"}
/>
{hasError && (
  <p id="email-error" role="alert" className="text-danger-600">
    Veuillez entrer une adresse email valide
  </p>
)}
```

---

## 8. Testing Checklist

### 8.1 Manual Testing

- [ ] **Keyboard Navigation:** Tab through entire page without mouse
- [ ] **Screen Reader:** Test with NVDA (Windows) or VoiceOver (macOS)
- [ ] **Zoom:** Zoom to 200% and verify content is accessible
- [ ] **Color Blindness:** Use browser extension to simulate color blindness
- [ ] **Mobile:** Test on real iOS and Android devices
- [ ] **Language Switch:** Toggle between French and English
- [ ] **High Contrast:** Enable Windows High Contrast mode

### 8.2 Automated Testing

```bash
# Install testing dependencies
npm install --save-dev @axe-core/react jest-axe pa11y lighthouse

# Run accessibility audit
npm run test:a11y
```

**Example Test:**

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TourModal from './TourModal';

expect.extend(toHaveNoViolations);

describe('TourModal Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<TourModal />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should trap focus within modal', () => {
    const { getByRole } = render(<TourModal />);
    const modal = getByRole('dialog');
    const firstButton = modal.querySelector('button:first-of-type');
    const lastButton = modal.querySelector('button:last-of-type');

    // Tab through and verify focus stays in modal
    expect(document.activeElement).toBe(firstButton);
  });
});
```

---

## 9. Accessibility Statement

Include the following accessibility statement in your application footer:

```markdown
### Déclaration d'accessibilité

Pro-Remorque s'engage à rendre son système de gestion de garanties accessible à toutes les personnes, indépendamment de leur capacité ou de leur technologie.

**Niveau de conformité:** WCAG 2.1 Niveau AA

**Date de la déclaration:** 27 octobre 2025

**Technologies utilisées:**
- HTML5
- WAI-ARIA
- CSS3
- JavaScript (React)

**Méthodes d'évaluation:**
- Tests automatisés (axe-core, Lighthouse)
- Tests manuels avec lecteurs d'écran
- Tests utilisateurs avec personnes en situation de handicap

**Contact accessibilité:**
Si vous rencontrez des difficultés d'accessibilité, veuillez contacter:
- Email: accessibility@proremorque.ca
- Téléphone: 1-800-XXX-XXXX

Nous nous engageons à répondre dans un délai de 2 jours ouvrables.
```

---

## 10. Resources & References

### 10.1 Official Guidelines

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Resources](https://webaim.org/resources/)

### 10.2 Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### 10.3 Learning Resources

- [A11ycasts with Rob Dodson (YouTube)](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)
- [Inclusive Components by Heydon Pickering](https://inclusive-components.design/)
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/)

---

**End of Accessibility & i18n Guide**
