# Microcopy Implementation Guide

## Overview

This guide explains the improved microcopy system implemented across the warranty management application. The enhancements focus on clarity, user guidance, and improved task completion rates.

## What's Been Implemented

### 1. Centralized Microcopy System (`src/lib/microcopy.ts`)

A comprehensive, type-safe microcopy configuration that provides:

- **Error Messages**: Contextual, actionable error messages with clear next steps
- **Success Messages**: Confirmations with next-step guidance
- **Form Labels & Hints**: Clear field descriptions with inline help
- **Button Labels**: Action-oriented, outcome-focused button text
- **Status Descriptions**: User-friendly status labels with explanations
- **Empty States**: Encouraging messages with clear calls-to-action
- **Search & Filter Text**: Helpful placeholders and result counts
- **Loading States**: Descriptive loading messages
- **Tooltips**: Contextual information bubbles

### 2. Reusable UI Components

#### `FormFieldWithHint`
Enhanced form field wrapper that provides:
- Required/optional field indicators
- Inline validation feedback
- Contextual hints
- Error and success states
- Accessible labeling

```tsx
<FormFieldWithHint
  label="Adresse courriel"
  hint="Le client recevra les documents à cette adresse"
  required
  error={emailError}
>
  <input type="email" {...} />
</FormFieldWithHint>
```

#### `ConfirmDialog`
Replaces generic `confirm()` alerts with rich dialogs:
- Clear title and message
- Action-oriented button labels
- Visual hierarchy with icons
- Loading states
- Variant support (danger, warning, info)

```tsx
<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Confirmer la suppression"
  message="Cette action est irréversible..."
  confirmText="Oui, supprimer définitivement"
  cancelText="Annuler"
  variant="danger"
/>
```

#### `ErrorMessage`
Comprehensive error display component:
- Clear error title and message
- Actionable suggestions
- Retry and help actions
- Visual feedback with icons

```tsx
<ErrorMessage
  title="Impossible de charger les données"
  message={error.message}
  suggestion="Vérifiez votre connexion et réessayez"
  onRetry={loadData}
  onHelp={openDiagnostics}
/>
```

#### `SuccessMessage`
Success confirmation with guidance:
- Success title and message
- Next steps information
- Optional action button
- Positive visual feedback

```tsx
<SuccessMessage
  title={microcopy.success.warranty.created.title}
  message={microcopy.success.warranty.created.message(contractNumber)}
  nextSteps={microcopy.success.warranty.created.nextSteps}
  onAction={viewWarranty}
  actionText="Voir la garantie"
/>
```

#### `EmptyState`
Improved empty state displays:
- Icon and title
- Clear message
- Optional suggestion
- Primary and secondary actions

```tsx
<EmptyState
  icon={Shield}
  title={microcopy.emptyStates.warranties.title}
  message={microcopy.emptyStates.warranties.message}
  action={{
    label: microcopy.emptyStates.warranties.action,
    onClick: createWarranty
  }}
/>
```

## Components Updated

### NewClaimForm
**Improvements:**
- Form field labels use microcopy system
- Validation messages are more descriptive
- Success messages include next steps
- Empty states have clear guidance
- Button labels describe specific actions

**Before:** "Attention - Veuillez sélectionner une garantie"
**After:** "Informations requises - Veuillez sélectionner la garantie concernée par cette réclamation"

### WarrantiesList
**Improvements:**
- Search placeholder is more descriptive
- Filter labels use status descriptions
- Empty states differentiate between no data and no results
- Error messages include recovery suggestions
- Loading states are more informative

**Before:** "Aucune garantie trouvée"
**After:** "Aucun résultat trouvé - Essayez d'ajuster vos filtres ou modifiez votre recherche"

### CustomersPage
**Improvements:**
- Search functionality has descriptive placeholders
- Empty states provide context
- Result counts are displayed

### LoginPage
**Improvements:**
- Field placeholders are examples of correct format
- Error messages are more specific
- Visual feedback for different error types

### SettingsPage
**Improvements:**
- Tab navigation includes ARIA labels
- Coming soon messages are more encouraging
- Better wayfinding with tooltips

## Key Microcopy Principles Applied

### 1. Be Action-Oriented
❌ Bad: "Submit"
✅ Good: "Soumettre la réclamation"

### 2. Provide Context
❌ Bad: "Error"
✅ Good: "Impossible de charger les garanties - Vérifiez votre connexion et réessayez"

### 3. Guide Next Steps
❌ Bad: "Success!"
✅ Good: "Réclamation soumise - Vous recevrez une réponse dans les 48 heures ouvrables"

### 4. Use Plain Language
❌ Bad: "PGRST116: RLS policy violation"
✅ Good: "Vous n'avez pas les permissions nécessaires pour effectuer cette action"

### 5. Show Don't Tell
❌ Bad: "Invalid"
✅ Good: "Format attendu: XXX-XXX-XXXX"

### 6. Be Encouraging, Not Negative
❌ Bad: "No data found"
✅ Good: "Créez votre première garantie pour commencer"

## Usage Examples

### Adding Validation Feedback

```tsx
import { microcopy } from '../lib/microcopy';

// In your validation logic
if (!email) {
  setError(microcopy.errors.validation.required('Courriel'));
} else if (!isValidEmail(email)) {
  setError(microcopy.errors.validation.email);
}
```

### Displaying Status

```tsx
import { microcopy } from '../lib/microcopy';

const statusConfig = microcopy.status.warranty[warranty.status];

<span
  className={statusClassName}
  title={statusConfig.description}
>
  {statusConfig.label}
</span>
```

### Creating Search Interfaces

```tsx
import { microcopy } from '../lib/microcopy';

<input
  type="search"
  placeholder={microcopy.search.warranties.placeholder}
  onChange={handleSearch}
/>

{results.length > 0 && (
  <p>{microcopy.search.warranties.resultsCount(results.length)}</p>
)}
```

### Handling Errors

```tsx
import { microcopy } from '../lib/microcopy';

try {
  await submitData();
  toast.success(
    microcopy.success.claim.submitted.title,
    microcopy.success.claim.submitted.message(claimNumber)
  );
} catch (error) {
  toast.error(
    microcopy.errors.generic.title,
    microcopy.errors.generic.message
  );
}
```

## Benefits

### For Users
- **Reduced Confusion**: Clear, contextual guidance at every step
- **Faster Task Completion**: Inline hints and examples reduce trial-and-error
- **Increased Confidence**: Positive, encouraging language builds trust
- **Better Error Recovery**: Actionable error messages help users fix issues
- **Improved Accessibility**: ARIA labels and semantic HTML improve screen reader support

### For Development
- **Consistency**: Centralized microcopy ensures uniform language
- **Maintainability**: Easy to update messaging across the application
- **Type Safety**: TypeScript ensures correct usage
- **Internationalization Ready**: Structure supports easy translation
- **Testability**: Microcopy can be tested independently

## Best Practices

1. **Always import from microcopy**: Use `microcopy.buttons.save` instead of hardcoded strings
2. **Provide context in errors**: Include what went wrong AND what to do next
3. **Use FormFieldWithHint**: For all form inputs to maintain consistency
4. **Replace alerts**: Use ConfirmDialog instead of native `alert()` and `confirm()`
5. **Add ARIA labels**: For better accessibility, especially on interactive elements
6. **Test with users**: Validate that microcopy improves comprehension

## Future Enhancements

- [ ] Add multilingual support (English translations)
- [ ] Create microcopy testing suite
- [ ] Add microcopy analytics to track which messages users see most
- [ ] Implement progressive disclosure for complex forms
- [ ] Add contextual help system with expandable tooltips
- [ ] Create microcopy style guide for adding new features

## Metrics to Track

Monitor these KPIs to measure microcopy effectiveness:

1. **Task Completion Rate**: % of users who successfully complete forms
2. **Error Rate**: Frequency of validation errors per session
3. **Time to Complete**: Average time to complete key workflows
4. **Support Ticket Volume**: Number of tickets related to confusion
5. **User Satisfaction**: NPS scores and user feedback
6. **Abandonment Rate**: % of users who abandon forms mid-flow

## Contributing

When adding new features or components:

1. Add new microcopy to `src/lib/microcopy.ts`
2. Use semantic, descriptive keys
3. Provide both singular and plural forms where applicable
4. Include contextual hints and descriptions
5. Test microcopy with actual users when possible
6. Update this guide with new patterns

## Support

For questions or suggestions about microcopy:
- Review existing patterns in `src/lib/microcopy.ts`
- Check component examples in `src/components/common/`
- Refer to form implementations in `NewClaimForm.tsx` and `NewWarranty.tsx`
