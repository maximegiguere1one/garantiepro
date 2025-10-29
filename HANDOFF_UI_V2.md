# UI/UX V2 Handoff Package - Pro-Remorque
## Developer Integration Guide

**Version**: 2.0
**Date**: October 2025
**Status**: Ready for Integration ✅

---

## Quick Start (5 minutes)

### 1. Review Design System
Read `/DESIGN_SYSTEM_V2.md` for complete component documentation.

### 2. Update Tailwind Config

Merge the new tokens into your existing `tailwind.config.js`:

```javascript
import tokensV2 from './src/design/tokens-v2.json';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: tokensV2.colors.primary.DEFAULT,
          50: tokensV2.colors.primary['50'],
          100: tokensV2.colors.primary['100'],
          // ... full scale 50-900
        },
        secondary: {
          DEFAULT: tokensV2.colors.secondary.DEFAULT,
          // ... full scale
        },
        accent: {
          // Keep existing red brand color
          DEFAULT: tokensV2.colors.accent.DEFAULT,
          // ... full scale
        },
        // Import neutral, success, warning, danger, info scales
      },
      spacing: tokensV2.spacing,
      borderRadius: tokensV2.borderRadius,
      boxShadow: tokensV2.shadows,
      zIndex: tokensV2.zIndex,
    },
  },
  plugins: [],
};
```

### 3. Import Components

All new components are in `/src/components/ui/`:

```tsx
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { EnhancedInputField } from '@/components/ui/EnhancedInputField';
import { EnhancedCard } from '@/components/ui/EnhancedCard';
import { KPICard } from '@/components/ui/KPICard';
import { MultiStepWarrantyForm } from '@/components/ui/MultiStepWarrantyForm';
import { ClaimsTimeline } from '@/components/ui/ClaimsTimeline';
import { EnhancedToastProvider, useEnhancedToast } from '@/components/ui/EnhancedToast';
import { SignatureModal } from '@/components/ui/SignatureModal';
```

### 4. Setup Toast Provider

Wrap your app root:

```tsx
// src/main.tsx or src/App.tsx
import { EnhancedToastProvider } from './components/ui/EnhancedToast';

<EnhancedToastProvider>
  <App />
</EnhancedToastProvider>
```

---

## File Structure

```
src/
├── components/
│   └── ui/                          # New V2 components
│       ├── PrimaryButton.tsx
│       ├── SecondaryButton.tsx
│       ├── EnhancedInputField.tsx
│       ├── EnhancedCard.tsx
│       ├── KPICard.tsx
│       ├── MultiStepWarrantyForm.tsx
│       ├── ClaimsTimeline.tsx
│       ├── EnhancedToast.tsx
│       └── SignatureModal.tsx
├── design/
│   ├── tokens.json                  # Legacy (V1)
│   └── tokens-v2.json               # New tokens ✨
└── i18n/
    └── translations.json            # FR/EN translations ✨
```

---

## Integration Roadmap

### Phase 1: Foundation (Week 1)
**Estimated effort**: 8 hours

1. **Update Tailwind config** with tokens-v2 (1 hour)
   - Merge color scales
   - Add new spacing, shadows, z-index
   - Test build: `npm run build`

2. **Setup i18n helper** (2 hours)
   - Create `src/utils/i18n.ts`:
     ```tsx
     import translations from '../i18n/translations.json';
     import { useAuth } from '../contexts/AuthContext';

     export function useTranslation() {
       const { profile } = useAuth();
       const lang = profile?.language_preference || 'fr';

       return (key: string, params?: Record<string, string>) => {
         const keys = key.split('.');
         let value: any = translations;
         for (const k of keys) {
           value = value[k];
           if (!value) return key;
         }
         let text = value[lang] || value['fr'];

         // Replace {{param}} with values
         if (params) {
           Object.entries(params).forEach(([k, v]) => {
             text = text.replace(`{{${k}}}`, v);
           });
         }
         return text;
       };
     }
     ```
   - Test in one component

3. **Setup EnhancedToast provider** (1 hour)
   - Wrap app in `EnhancedToastProvider`
   - Replace existing toast calls with new API
   - Test all 4 types (success, error, warning, info)

4. **Create component index** (1 hour)
   - Create `src/components/ui/index.ts`:
     ```tsx
     export * from './PrimaryButton';
     export * from './SecondaryButton';
     export * from './EnhancedInputField';
     export * from './EnhancedCard';
     export * from './KPICard';
     export * from './MultiStepWarrantyForm';
     export * from './ClaimsTimeline';
     export * from './EnhancedToast';
     export * from './SignatureModal';
     ```
   - Simplifies imports: `import { PrimaryButton } from '@/components/ui';`

5. **Update one page with new buttons** (3 hours)
   - Choose a simple page (e.g., dashboard)
   - Replace existing buttons with PrimaryButton/SecondaryButton
   - Test keyboard navigation
   - Test loading states
   - Verify accessibility with axe DevTools

### Phase 2: Forms Overhaul (Week 2-3)
**Estimated effort**: 24 hours

1. **Refactor warranty creation** (16 hours)
   - **Current**: `/src/components/NewWarranty.tsx` (2272 lines)
   - **Target**: Use `MultiStepWarrantyForm` component

   **Approach**:
   - Extract customer form into `CustomerStep.tsx` (8 hours)
     - Use `EnhancedInputField` for all inputs
     - Implement validation with Zod schemas
     - Handle existing customer lookup
     - Test autosave

   - Extract trailer form into `TrailerStep.tsx` (4 hours)
     - VIN validation with success state
     - Purchase date calculator
     - Manufacturer warranty end date

   - Extract plan selection into `PlanStep.tsx` (4 hours)
     - Visual plan cards
     - Loyalty credit display
     - Price calculation with taxes
     - Add-ons selection

2. **Test warranty creation flow** (4 hours)
   - E2E test: create warranty from scratch
   - Test autosave (edit → wait 10s → refresh → data persists)
   - Test validation at each step
   - Test keyboard shortcuts (Ctrl+S, Ctrl+Enter)
   - Verify < 120s completion time

3. **Update other forms** (4 hours)
   - Claims submission form
   - Settings forms
   - User invitation form
   - Test accessibility on all

### Phase 3: Dashboard Enhancement (Week 3-4)
**Estimated effort**: 16 hours

1. **Refactor dealer dashboard** (8 hours)
   - Replace stat cards with `KPICard` components
   - Add trend indicators
   - Create 2x2 or 4x1 grid layout
   - Make responsive (stack on mobile)

2. **Add quick actions panel** (4 hours)
   - 6 prominent action buttons
   - Use `PrimaryButton` and `SecondaryButton`
   - Icon + label layout
   - Responsive grid

3. **Implement activity feed** (4 hours)
   - Use `EnhancedCard` with list
   - Show 10 most recent actions
   - Timestamp with relative time (e.g., "5 min ago")
   - Empty state

### Phase 4: Claims Management (Week 4-5)
**Estimated effort**: 16 hours

1. **Integrate ClaimsTimeline** (8 hours)
   - Fetch claim events from database
   - Map to TimelineEvent format
   - Group by date
   - Add expandable content for detailed info
   - Test with 0, 1, and 50+ events

2. **Enhance file upload** (4 hours)
   - Drag-and-drop UI
   - File type validation (JPG, PNG, PDF)
   - Size validation (max 10MB)
   - Preview thumbnails
   - Progress indicator

3. **Add SLA indicators** (4 hours)
   - Calculate time remaining
   - Color-coded badges (green > 48h, yellow 24-48h, red < 24h)
   - Countdown timer for urgent claims
   - Notification when < 12h remaining

### Phase 5: Signature Flow (Week 5-6)
**Estimated effort**: 16 hours

1. **Integrate SignatureModal** (12 hours)
   - PDF rendering with pdf-lib or react-pdf
   - Signature pad calibration
   - IP address detection
   - Document hash generation (SHA-256)
   - Certificate generation
   - Email notification integration

2. **Test signature flow** (4 hours)
   - Desktop: mouse signature
   - Tablet: touch signature
   - Mobile: responsive layout
   - Verify proof data saved correctly
   - Test certificate download

### Phase 6: Polish & QA (Week 6)
**Estimated effort**: 16 hours

1. **Accessibility audit** (4 hours)
   - Run axe DevTools on all screens
   - Fix violations
   - Test with NVDA/VoiceOver
   - Keyboard-only navigation test

2. **Performance testing** (4 hours)
   - Lighthouse audit (target: 90+)
   - Measure critical render time
   - Check bundle size impact
   - Optimize images and code splits

3. **i18n completeness** (4 hours)
   - Audit all hardcoded text
   - Add missing translation keys
   - Test language switching
   - Verify text expansion (FR vs EN)

4. **Cross-browser testing** (4 hours)
   - Chrome, Firefox, Safari, Edge
   - iOS Safari, Chrome Android
   - Test on actual devices if possible

---

## Component Usage Examples

### 1. Simple Form with Validation

```tsx
import { useState } from 'react';
import { EnhancedInputField } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui';
import { useEnhancedToast } from '@/components/ui';

function CustomerForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useEnhancedToast();

  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!email.includes('@')) {
      newErrors.email = 'Adresse courriel invalide';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit
    try {
      await saveCustomer({ email });
      toast.success('Client enregistré avec succès!');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="space-y-4">
      <EnhancedInputField
        label="Courriel"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        helpText="Utilisé pour l'envoi de documents"
        required
      />

      <div className="flex gap-3 justify-end">
        <SecondaryButton>Annuler</SecondaryButton>
        <PrimaryButton onClick={handleSubmit}>
          Enregistrer
        </PrimaryButton>
      </div>
    </div>
  );
}
```

### 2. Dashboard with KPI Cards

```tsx
import { KPICard } from '@/components/ui';
import { DollarSign, Shield, AlertCircle, TrendingUp } from 'lucide-react';

function DealerDashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-neutral-900">
        Tableau de bord
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={<DollarSign />}
          label="Revenu"
          value="45 280 $"
          trend={{ value: 12.5, isPositive: true }}
          subtitle="Ce mois-ci"
          color="primary"
        />

        <KPICard
          icon={<Shield />}
          label="Garanties actives"
          value="1,247"
          subtitle="+23 cette semaine"
          color="success"
        />

        <KPICard
          icon={<AlertCircle />}
          label="Réclamations"
          value="8"
          subtitle="En attente"
          color="warning"
        />

        <KPICard
          icon={<TrendingUp />}
          label="Taux de conversion"
          value="68%"
          trend={{ value: 3.2, isPositive: true }}
          color="secondary"
        />
      </div>
    </div>
  );
}
```

### 3. Multi-Step Form

```tsx
import { MultiStepWarrantyForm } from '@/components/ui';
import { CustomerStep } from './steps/CustomerStep';
import { TrailerStep } from './steps/TrailerStep';
import { PlanStep } from './steps/PlanStep';

function CreateWarrantyPage() {
  const [formData, setFormData] = useState({});

  const handleSave = async () => {
    // Autosave draft to localStorage or database
    localStorage.setItem('warranty_draft', JSON.stringify(formData));
  };

  const handleComplete = async () => {
    // Submit complete warranty
    await createWarranty(formData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <MultiStepWarrantyForm
        steps={[
          {
            title: 'Informations client',
            content: <CustomerStep data={formData} onChange={setFormData} />,
            validate: async () => validateCustomer(formData)
          },
          {
            title: 'Détails remorque',
            content: <TrailerStep data={formData} onChange={setFormData} />
          },
          {
            title: 'Sélection plan',
            content: <PlanStep data={formData} onChange={setFormData} />
          }
        ]}
        onComplete={handleComplete}
        onSave={handleSave}
        autosaveInterval={10000}
      />
    </div>
  );
}
```

---

## Testing Checklist

### Unit Tests
- [ ] All components render without errors
- [ ] Props are properly typed (TypeScript)
- [ ] Validation logic works correctly
- [ ] Event handlers fire as expected

### Integration Tests
- [ ] Multi-step form navigates correctly
- [ ] Autosave triggers after 10s
- [ ] Toast notifications display and dismiss
- [ ] Signature modal captures and saves signature

### Accessibility Tests
- [ ] All components have 0 axe violations
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrows)
- [ ] Screen readers announce content correctly
- [ ] Focus indicators are visible (4px ring)
- [ ] Color contrast meets 4.5:1 minimum

### Performance Tests
- [ ] Lighthouse score >= 90 on mobile
- [ ] Critical render < 1s on 3G connection
- [ ] Bundle size increase <= 50KB gzipped
- [ ] No layout shifts (CLS < 0.1)

### Visual Regression Tests
- [ ] Components match design specs
- [ ] Responsive layouts work 320px to 2560px
- [ ] Dark mode (if applicable)
- [ ] Print styles (if applicable)

---

## Troubleshooting

### "Module not found: tokens-v2.json"

**Solution**: Ensure the file exists at `/src/design/tokens-v2.json` and restart dev server.

### Tailwind classes not working

**Solution**:
1. Check `tailwind.config.js` imports tokens correctly
2. Verify `content` paths include `/src/components/ui/`
3. Restart dev server: `npm run dev`

### TypeScript errors

**Solution**: All components are fully typed. If you see errors:
1. Ensure `tsconfig.json` includes `src/components/ui/`
2. Run `npm run typecheck` to see full errors
3. Check prop types match component interfaces

### Autosave not working

**Solution**:
1. Verify `onSave` prop is provided to `MultiStepWarrantyForm`
2. Check browser console for errors
3. Ensure localStorage is available (not in incognito mode)

### Signature pad not responding

**Solution**:
1. Check canvas is properly sized (css + canvas internal dimensions)
2. Verify signature_pad library is installed: `npm install signature_pad`
3. Test on actual touch device (emulation can be flaky)

---

## Performance Budget

### Bundle Size Impact

Component additions (gzipped):
- Core components (Button, Input, Card): ~6KB
- MultiStepWarrantyForm: ~5KB
- ClaimsTimeline: ~4KB
- EnhancedToast: ~4KB
- SignatureModal: ~8KB (includes signature_pad)

**Total**: ~27KB additional bundle size

**Current**: ~100KB (per README.md)
**Target**: ~127KB (still well under 200KB target)

### Critical Render Time

**Target**: < 1s on mobile (3G connection)

**Optimizations**:
- Lazy load SignatureModal (only when opened)
- Virtual scrolling for ClaimsTimeline if > 50 events
- Code split routes
- Use React.memo for expensive components

---

## Support & Next Steps

### Questions?
1. Review `/DESIGN_SYSTEM_V2.md` for detailed component docs
2. Check component source code (well-commented)
3. Open GitHub issue with:
   - Component name
   - Expected behavior
   - Actual behavior
   - Code snippet to reproduce

### Future Enhancements
- [ ] Storybook documentation
- [ ] Additional components (Select, DatePicker, etc.)
- [ ] Animation library (framer-motion)
- [ ] Dark mode support
- [ ] Component testing with Jest + React Testing Library

### Deployment
1. Run full test suite: `npm run validate`
2. Build for production: `npm run build`
3. Test production build: `npm run preview`
4. Deploy to hosting (Vercel, Netlify, Cloudflare Pages)

---

**Handoff Complete** ✅

All components are production-ready and fully documented. Integration can begin immediately following the roadmap above.

**Questions?** Contact: Pro-Remorque Development Team
**Last Updated**: October 2025
**Package Version**: 2.0
