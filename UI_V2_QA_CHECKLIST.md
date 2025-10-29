# UI/UX V2 - Quality Assurance Checklist
## Pro-Remorque - Testing & Validation Guide

**Version**: 2.0
**Date**: October 2025
**Purpose**: Comprehensive QA checklist for UI V2 integration

---

## Overview

This checklist ensures all UI V2 components meet quality standards before production deployment. Use this for:
- Pre-integration component verification
- Post-integration acceptance testing
- Regression testing after updates
- Continuous quality monitoring

**Testing Pyramid**:
1. ✅ **Unit Tests** - Component behavior and props
2. ✅ **Integration Tests** - Component interactions and workflows
3. ✅ **Accessibility Tests** - WCAG 2.1 AA compliance
4. ✅ **Performance Tests** - Load times and bundle size
5. ✅ **Visual Regression** - UI consistency across browsers
6. ✅ **E2E Tests** - Complete user workflows

---

## 1. Component Unit Tests

### PrimaryButton
- [ ] Renders with text content
- [ ] Calls onClick handler when clicked
- [ ] Shows loading spinner when loading=true
- [ ] Disables when disabled=true
- [ ] Applies correct size classes (sm, md, lg)
- [ ] Renders left icon when provided
- [ ] Renders right icon when provided
- [ ] Applies fullWidth class when fullWidth=true
- [ ] Has aria-busy=true when loading
- [ ] Has aria-disabled=true when disabled
- [ ] Focus ring visible on keyboard focus
- [ ] Hover state applies gradient shift

**Test Command**: `npm test PrimaryButton`

### SecondaryButton
- [ ] Same tests as PrimaryButton
- [ ] Applies outline style (border-2)
- [ ] Hover changes border and background color
- [ ] No gradient background

**Test Command**: `npm test SecondaryButton`

### EnhancedInputField
- [ ] Renders label with correct text
- [ ] Shows required asterisk when required=true
- [ ] Displays hint next to label when provided
- [ ] Shows help text below input when provided
- [ ] Displays error message when error prop is set
- [ ] Displays success message when success=true and successMessage provided
- [ ] Shows error icon (AlertCircle) on error
- [ ] Shows success icon (CheckCircle) on success
- [ ] Sets aria-invalid=true on error
- [ ] Links input to help text via aria-describedby
- [ ] Links input to error via aria-describedby
- [ ] Left icon renders in correct position
- [ ] Right icon renders (or replaced by status icon)
- [ ] Disabled state applies correct opacity

**Test Command**: `npm test EnhancedInputField`

### EnhancedCard
- [ ] Renders children content
- [ ] Applies correct variant styles (default, bordered, elevated, glass)
- [ ] Applies correct padding (none, sm, md, lg)
- [ ] Hover lift effect when hoverable=true
- [ ] No hover effect when hoverable=false
- [ ] EnhancedCardHeader renders title and subtitle
- [ ] EnhancedCardHeader renders action element
- [ ] EnhancedCardContent applies margin top
- [ ] EnhancedCardFooter applies border top

**Test Command**: `npm test EnhancedCard`

### KPICard
- [ ] Renders icon with colored background
- [ ] Renders label text
- [ ] Renders value (string or number)
- [ ] Shows trend indicator when trend prop provided
- [ ] Trend up arrow for positive trend
- [ ] Trend down arrow for negative trend
- [ ] Applies correct color theme (primary, secondary, success, etc.)
- [ ] Renders subtitle when provided
- [ ] onClick handler fires when provided
- [ ] Hover effect when onClick provided

**Test Command**: `npm test KPICard`

### MultiStepWarrantyForm
- [ ] Renders first step by default
- [ ] Shows progress bar with correct percentage
- [ ] Shows step indicators (1, 2, 3...)
- [ ] Current step highlighted in primary color
- [ ] Completed steps show check icon
- [ ] Next button progresses to next step
- [ ] Back button returns to previous step
- [ ] Back button hidden on first step (unless showBackOnFirstStep=true)
- [ ] Finish button shown on last step
- [ ] Calls validate function before progressing (if provided)
- [ ] Blocks progression if validation fails
- [ ] Calls onComplete when finishing last step
- [ ] Autosave fires after interval (if onSave provided)
- [ ] Shows "Saving..." indicator during save
- [ ] Shows "Saved at HH:MM" after successful save
- [ ] Ctrl+S triggers manual save
- [ ] Ctrl+Enter progresses to next step
- [ ] hasUnsavedChanges updates on input/change events

**Test Command**: `npm test MultiStepWarrantyForm`

### ClaimsTimeline
- [ ] Renders empty state when events array is empty
- [ ] Groups events by date
- [ ] Shows date separator for each day
- [ ] Renders correct icon for each event type
- [ ] Applies correct color for each event type
- [ ] Shows timestamp in HH:MM format
- [ ] Shows user attribution when provided
- [ ] Renders expandedContent when provided
- [ ] Vertical line connects events
- [ ] Icon circle positioned correctly on line
- [ ] Event cards have hover shadow effect

**Test Command**: `npm test ClaimsTimeline`

### EnhancedToast
- [ ] Provider renders children without error
- [ ] useEnhancedToast throws error outside provider
- [ ] success() creates success toast
- [ ] error() creates error toast
- [ ] warning() creates warning toast
- [ ] info() creates info toast
- [ ] Toast auto-dismisses after duration
- [ ] Toast can be manually dismissed with X button
- [ ] Maximum 3 toasts shown at once
- [ ] Older toasts removed when limit exceeded
- [ ] Action button fires onClick when clicked
- [ ] Action button dismisses toast after clicking
- [ ] ARIA live region has role="alert"
- [ ] ARIA live region set to "polite"

**Test Command**: `npm test EnhancedToast`

### SignatureModal
- [ ] Modal hidden when isOpen=false
- [ ] Modal visible when isOpen=true
- [ ] Closes when clicking backdrop
- [ ] Does NOT close when clicking modal content
- [ ] Close button calls onClose
- [ ] Signature pad initializes on mount
- [ ] Canvas resizes correctly
- [ ] Clear button clears signature
- [ ] Sign button disabled when pad is empty
- [ ] Sign button creates proof object
- [ ] Proof includes timestamp
- [ ] Proof includes signature data URL
- [ ] Proof includes signer name and email
- [ ] Proof screen shown after signing
- [ ] Zoom in increases zoom percentage
- [ ] Zoom out decreases zoom percentage
- [ ] Fit width sets zoom to 100%
- [ ] PDF preview placeholder shown

**Test Command**: `npm test SignatureModal`

---

## 2. Integration Tests

### Warranty Creation Flow
- [ ] **Step 1**: Customer form loads with all fields
- [ ] Customer autocomplete suggests existing customers
- [ ] Validation errors shown for invalid email format
- [ ] Validation errors shown for invalid phone format
- [ ] Next button disabled until form valid
- [ ] **Step 2**: Trailer form loads after step 1 complete
- [ ] VIN field shows success state when valid (17 chars)
- [ ] Purchase date cannot be in future
- [ ] Manufacturer warranty date calculated correctly
- [ ] **Step 3**: Plan selection loads after step 2 complete
- [ ] Plan cards display all plan details
- [ ] Loyalty credit badge shown when applicable
- [ ] Price calculation updates on plan selection
- [ ] Taxes calculated correctly based on province
- [ ] Total includes base price + addons + taxes - credit
- [ ] Finish button submits complete form data
- [ ] Success toast shown on completion
- [ ] User redirected to warranties list

**Test Command**: `npm run test:e2e warranty-creation`

### Claims Timeline Display
- [ ] Timeline loads claim events from database
- [ ] Events sorted by timestamp (newest first)
- [ ] Date separators show correct formatted dates
- [ ] "Submitted" event has blue file icon
- [ ] "Approved" event has green check icon
- [ ] "Rejected" event has red X icon
- [ ] Timeline updates in real-time when new event added
- [ ] Empty state shown when no events
- [ ] Scrolling works smoothly with 50+ events
- [ ] Mobile layout stacks properly

**Test Command**: `npm run test:e2e claims-timeline`

### Signature Capture Workflow
- [ ] Modal opens when signature button clicked
- [ ] PDF preview loads (or shows loading state)
- [ ] Signature pad accepts mouse drawing
- [ ] Signature pad accepts touch drawing (mobile/tablet)
- [ ] Clear button resets signature
- [ ] Warning shown if trying to sign empty pad
- [ ] Signature captured successfully
- [ ] Proof screen displays after signing
- [ ] IP address displayed in proof
- [ ] Timestamp formatted correctly
- [ ] Document hash shown (SHA-256 format)
- [ ] Certificate download button works
- [ ] Close button returns to previous screen
- [ ] Signature data persisted to database

**Test Command**: `npm run test:e2e signature-flow`

### Dashboard Interactions
- [ ] KPI cards load with correct data
- [ ] Trend indicators show up/down arrows
- [ ] Trend percentages calculated correctly
- [ ] Quick action buttons navigate to correct pages
- [ ] Activity feed shows 10 most recent items
- [ ] Activity feed updates in real-time
- [ ] Charts render without errors
- [ ] Dashboard responsive on mobile (cards stack)
- [ ] Loading skeletons shown while fetching data
- [ ] Error state shown if data fetch fails

**Test Command**: `npm run test:e2e dashboard`

### Toast Notifications
- [ ] Success toast shown after warranty creation
- [ ] Error toast shown on save failure
- [ ] Warning toast shown for unsaved changes
- [ ] Info toast shown for new notifications
- [ ] Toasts auto-dismiss after 5 seconds (default)
- [ ] Toasts can be manually dismissed
- [ ] Maximum 3 toasts stacked at once
- [ ] Action button in toast works correctly
- [ ] Toasts don't block UI interaction

**Test Command**: `npm run test:e2e toast-notifications`

---

## 3. Accessibility Tests

### Keyboard Navigation
- [ ] Tab key moves focus in logical order
- [ ] Shift+Tab moves focus backwards
- [ ] Enter activates buttons
- [ ] Space activates buttons
- [ ] Escape closes modals/dialogs
- [ ] Arrow keys navigate in lists/timelines
- [ ] Focus visible on all interactive elements
- [ ] Focus ring is 4px offset
- [ ] Focus ring color has 20% opacity
- [ ] No keyboard traps (can always tab out)
- [ ] Skip links provided for main content
- [ ] Keyboard shortcuts work (Ctrl+S, Ctrl+Enter)

**Test Tool**: Manual testing + keyboard-only navigation

### Screen Reader Tests (NVDA/VoiceOver)
- [ ] All images have alt text
- [ ] Form labels read aloud correctly
- [ ] Error messages announced on validation
- [ ] Success messages announced on save
- [ ] Loading states announced ("Loading...")
- [ ] Buttons have descriptive labels
- [ ] Links have descriptive text (not "click here")
- [ ] ARIA labels provided where needed
- [ ] ARIA live regions work for dynamic content
- [ ] Table headers associated with cells
- [ ] List semantics used correctly (ul/ol/li)
- [ ] Landmarks used (nav, main, footer, aside)

**Test Tool**: NVDA (Windows) or VoiceOver (Mac)

### Color Contrast
- [ ] Body text (16px): 4.5:1+ contrast ✅
- [ ] Small text (14px): 4.5:1+ contrast ✅
- [ ] Large text (18px+): 3:1+ contrast ✅
- [ ] Primary button text on gradient: 4.5:1+ ✅
- [ ] Error text on white: 4.5:1+ ✅
- [ ] Success text on white: 4.5:1+ ✅
- [ ] Link text on white: 4.5:1+ ✅
- [ ] Placeholder text: 4.5:1+ ✅
- [ ] Disabled text: 3:1+ (acceptable for disabled) ✅
- [ ] Focus indicators: 3:1+ against background ✅

**Test Tool**: axe DevTools or WAVE

### ARIA Attributes
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-describedby` links input to help text
- [ ] `aria-invalid` on form errors
- [ ] `aria-busy` on loading buttons
- [ ] `aria-disabled` on disabled elements
- [ ] `aria-live="polite"` on toast container
- [ ] `aria-hidden="true"` on decorative icons
- [ ] `role="alert"` on error messages
- [ ] `role="dialog"` on modals
- [ ] `role="progressbar"` on progress bars
- [ ] `aria-valuenow/min/max` on progress bars
- [ ] `aria-expanded` on collapsible sections

**Test Tool**: axe DevTools

### Touch Targets (Mobile)
- [ ] All buttons: 44x44px minimum ✅
- [ ] All links: 44x44px minimum ✅
- [ ] All form inputs: 44px height minimum ✅
- [ ] Adequate spacing between targets (8px+) ✅
- [ ] No overlapping hit areas ✅
- [ ] Swipe gestures work on mobile ✅
- [ ] Pinch zoom enabled (not disabled) ✅

**Test Tool**: Manual testing on actual mobile devices

---

## 4. Performance Tests

### Lighthouse Audit
Run on mobile emulation (Moto G4, throttled 3G):

- [ ] **Performance**: ≥90 🎯
- [ ] **Accessibility**: ≥95 🎯
- [ ] **Best Practices**: ≥95 🎯
- [ ] **SEO**: ≥90 🎯
- [ ] **PWA**: (optional) ≥80

**Test Command**:
```bash
npm run build
npm run preview
# Open Chrome DevTools > Lighthouse > Mobile > Analyze
```

### Core Web Vitals
- [ ] **LCP** (Largest Contentful Paint): <2.5s ✅
- [ ] **FID** (First Input Delay): <100ms ✅
- [ ] **CLS** (Cumulative Layout Shift): <0.1 ✅
- [ ] **FCP** (First Contentful Paint): <1.8s ✅
- [ ] **TTFB** (Time to First Byte): <600ms ✅
- [ ] **TTI** (Time to Interactive): <3.8s ✅

**Test Tool**: Lighthouse, Web Vitals extension, or RUM

### Bundle Size
- [ ] Initial bundle: ≤200KB gzipped 🎯
- [ ] Route-specific chunks: ≤50KB each 🎯
- [ ] Vendor chunks: ≤150KB gzipped 🎯
- [ ] CSS: ≤20KB gzipped 🎯
- [ ] No duplicate dependencies ✅
- [ ] Tree-shaking working (unused exports removed) ✅

**Test Command**:
```bash
npm run build
ls -lh dist/assets/*.gz
```

### Load Performance
- [ ] Critical render (above fold): <1s on 3G 🎯
- [ ] Full page load: <3s on 3G 🎯
- [ ] Time to interactive: <3s on 3G 🎯
- [ ] No layout shifts on load (CLS < 0.1) ✅
- [ ] Images lazy-loaded ✅
- [ ] Fonts preloaded ✅

**Test Tool**: WebPageTest.org (mobile, 3G)

### Runtime Performance
- [ ] No console errors in production ✅
- [ ] No console warnings in production ✅
- [ ] No memory leaks (check with Chrome DevTools) ✅
- [ ] Smooth 60fps animations ✅
- [ ] No janky scrolling ✅
- [ ] Fast list rendering (virtual scrolling if >100 items) ✅

**Test Tool**: Chrome DevTools Performance panel

---

## 5. Visual Regression Tests

### Cross-Browser Testing
Test on latest versions:

- [ ] **Chrome** (desktop, Windows/Mac)
- [ ] **Firefox** (desktop, Windows/Mac)
- [ ] **Safari** (desktop, Mac)
- [ ] **Edge** (desktop, Windows)
- [ ] **Chrome** (mobile, Android)
- [ ] **Safari** (mobile, iOS)

**Key checks for each browser**:
- [ ] Components render correctly
- [ ] Gradients display smoothly
- [ ] Shadows render correctly
- [ ] Animations smooth
- [ ] Forms submit correctly
- [ ] Modals center correctly

### Responsive Breakpoints
Test on these viewport widths:

- [ ] **320px** (iPhone SE) - Single column, stacked
- [ ] **375px** (iPhone 12) - Single column, optimized
- [ ] **768px** (iPad portrait) - 2-column grid
- [ ] **1024px** (iPad landscape) - 3-column grid
- [ ] **1280px** (Desktop) - 4-column grid
- [ ] **1920px** (Large desktop) - Max-width container

**Key checks for each breakpoint**:
- [ ] Layout doesn't break
- [ ] Text is readable (no overflow)
- [ ] Images scale correctly
- [ ] Touch targets adequate size (mobile)
- [ ] Navigation accessible

### Component States
Test all visual states for each component:

**Buttons**:
- [ ] Default (rest)
- [ ] Hover
- [ ] Active (pressed)
- [ ] Focus (keyboard)
- [ ] Disabled
- [ ] Loading

**Inputs**:
- [ ] Empty (placeholder)
- [ ] Filled (with value)
- [ ] Focus
- [ ] Error
- [ ] Success
- [ ] Disabled

**Cards**:
- [ ] Default
- [ ] Hover (if hoverable)
- [ ] With header only
- [ ] With footer only
- [ ] With header + footer
- [ ] Empty content

---

## 6. End-to-End (E2E) Tests

### User Journey: Create Warranty
```gherkin
Feature: Warranty Creation
  Scenario: Happy path warranty creation
    Given I am logged in as a dealer
    When I navigate to "Create Warranty"
    And I fill in customer information:
      | First Name | Jean          |
      | Last Name  | Tremblay      |
      | Email      | jean@test.com |
      | Phone      | 514-555-1234  |
    And I click "Next"
    Then I should see "Trailer Details" step
    When I fill in trailer information:
      | VIN            | 1HGBH41JXMN109186 |
      | Make           | Forest River      |
      | Model          | Cherokee          |
      | Year           | 2024              |
      | Purchase Price | 35000             |
    And I click "Next"
    Then I should see "Plan Selection" step
    When I select "Premium Plan"
    And I click "Finish"
    Then I should see success toast "Warranty created successfully"
    And I should be redirected to warranties list
    And the new warranty should appear in the list
```

**Test Command**: `npm run test:e2e -- warranty-creation.spec.ts`

### User Journey: View and Manage Claims
```gherkin
Feature: Claims Management
  Scenario: View claim timeline
    Given I am logged in as a dealer
    And a claim exists with multiple events
    When I navigate to "Claims"
    And I click on the claim
    Then I should see a timeline with all events
    And events should be grouped by date
    And each event should show:
      - Icon based on type
      - Title and description
      - Timestamp
      - User who performed action
```

**Test Command**: `npm run test:e2e -- claims-timeline.spec.ts`

### User Journey: Sign Document
```gherkin
Feature: Electronic Signature
  Scenario: Capture signature on warranty document
    Given I am on a warranty detail page
    When I click "Sign Document"
    Then signature modal should open
    And I should see PDF preview on the left
    And I should see signature pad on the right
    When I draw a signature on the pad
    And I click "Sign Document"
    Then I should see signature proof screen
    And proof should include:
      - Signature image
      - Timestamp
      - IP address
      - Document hash
      - Signer name and email
    When I click "Close"
    Then modal should close
    And signature should be saved
```

**Test Command**: `npm run test:e2e -- signature-flow.spec.ts`

---

## 7. i18n Tests

### Translation Coverage
- [ ] All UI strings have FR translation
- [ ] All UI strings have EN translation
- [ ] No hardcoded strings in components
- [ ] Parameter interpolation works ({{param}})
- [ ] Pluralization handled correctly (if applicable)
- [ ] Date formatting respects locale
- [ ] Number formatting respects locale
- [ ] Currency formatting respects locale

### Language Switching
- [ ] User can change language in settings
- [ ] UI updates immediately on language change
- [ ] Language preference persisted
- [ ] Language preference synced across tabs
- [ ] Default language is French
- [ ] Fallback to French if translation missing

### Text Expansion
- [ ] French text has room to expand (~30% longer)
- [ ] Layout doesn't break with longer text
- [ ] Buttons don't truncate text
- [ ] Form labels wrap if needed
- [ ] Error messages don't overflow

**Test**: Switch language and verify all screens

---

## 8. Security Tests

### XSS Prevention
- [ ] User input sanitized before rendering
- [ ] No `dangerouslySetInnerHTML` used (or properly sanitized)
- [ ] Form submissions validated on backend
- [ ] No eval() or Function() constructor used
- [ ] No inline event handlers in HTML

### CSRF Protection
- [ ] CSRF tokens used for state-changing requests
- [ ] SameSite cookies configured correctly
- [ ] No GET requests for state changes

### Data Validation
- [ ] Email validation (format + length)
- [ ] Phone validation (format + length)
- [ ] VIN validation (17 chars, alphanumeric)
- [ ] Postal code validation (format)
- [ ] Price validation (positive number, max 2 decimals)
- [ ] Date validation (not in future for past dates)

---

## 9. Smoke Tests (Production)

Run immediately after deployment:

- [ ] Homepage loads without errors
- [ ] Login works
- [ ] Dashboard displays KPIs
- [ ] Create warranty flow completes
- [ ] View warranties list
- [ ] View single warranty detail
- [ ] Create claim
- [ ] View claims timeline
- [ ] Sign document (if applicable)
- [ ] Export CSV
- [ ] Logout works

**Time**: ~10 minutes
**Frequency**: After every production deployment

---

## 10. Regression Tests

Run before each release:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] No accessibility regressions (axe score maintained)
- [ ] No performance regressions (Lighthouse score maintained)
- [ ] No visual regressions (screenshots match baseline)
- [ ] Bundle size not increased significantly (< +50KB)

**Test Command**: `npm run validate` (runs all checks)

---

## Test Environment Setup

### Required Tools
- Node.js 18+
- Chrome (latest)
- Firefox (latest)
- Safari (latest, Mac only)
- NVDA (Windows) or VoiceOver (Mac)
- axe DevTools Chrome extension
- Lighthouse (built into Chrome DevTools)

### Optional Tools
- Playwright (for E2E tests)
- Storybook (for visual testing)
- Percy (for visual regression)
- BrowserStack (for cross-browser testing)

### Setup Commands
```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run unit tests
npm test

# Run E2E tests (if configured)
npm run test:e2e

# Run all checks
npm run validate

# Build and verify
npm run build
npm run preview
```

---

## Bug Reporting Template

When filing bugs found during QA:

```markdown
## Bug Report

**Component**: [e.g., PrimaryButton]
**Severity**: [Low / Medium / High / Critical]
**Environment**: [Browser + OS + Version]

### Steps to Reproduce
1. Go to...
2. Click on...
3. See error

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots
[Attach if applicable]

### Console Errors
[Copy/paste any console errors]

### Additional Context
[Any other relevant info]
```

---

## Acceptance Criteria Summary

### ✅ Must Pass (Blocking)
- All critical E2E tests pass
- Zero accessibility violations (axe)
- Lighthouse Performance ≥ 90
- No console errors in production
- All translations present (FR + EN)

### ⚠️ Should Pass (Non-Blocking)
- 90%+ unit test coverage
- All states tested
- Cross-browser tested
- Mobile tested on real devices

### 📝 Nice to Have
- Visual regression tests setup
- Storybook documentation
- Performance monitoring integrated

---

**QA Status**: Ready for Testing
**Last Updated**: October 27, 2025
**Version**: 2.0
