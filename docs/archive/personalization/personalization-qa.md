# Role-Based UI Personalization - QA Test Plan

**Project:** Pro-Remorque Warranty Management Platform
**Version:** 2.0
**Date:** 2025-10-27
**QA Lead:** Quality Assurance Team
**Status:** Ready for Testing

---

## 1. Testing Overview

### 1.1 Test Objectives

- Verify role-based permissions are correctly enforced
- Ensure UI elements show/hide based on role
- Validate product tours trigger at appropriate times
- Confirm WCAG AA accessibility compliance
- Test bilingual support (French/English)
- Verify progressive disclosure functionality
- Check analytics tracking accuracy

### 1.2 Test Environment Setup

**Prerequisites:**
- Staging environment with latest deployment
- Test accounts for each role: dealer, operator, support, admin
- Browser testing: Chrome, Firefox, Safari, Edge (latest versions)
- Screen readers: NVDA (Windows), VoiceOver (macOS)
- Mobile devices: iOS Safari, Android Chrome

**Test Data:**
- 10 sample warranties across different states
- 5 sample claims in various statuses
- 3 sample customers with transaction history
- Test user accounts with fresh profiles (no tour completion)

---

## 2. Role-Based Permission Tests

### 2.1 Dealer Role Tests

**Test ID:** ROLE-DEALER-001
**Priority:** Critical
**Description:** Verify dealer can create warranties but not edit plans

**Test Steps:**
1. Log in as dealer user
2. Navigate to "Create Warranty" page
3. Fill out warranty form
4. Attempt to save warranty
5. Navigate to Settings > Warranty Plans
6. Attempt to edit a warranty plan

**Expected Results:**
- ✅ Dealer can access warranty creation form
- ✅ Form shows simplified fields (no advanced options)
- ✅ Warranty saves successfully
- ❌ "Warranty Plans" menu item not visible in Settings
- ❌ If URL is manually entered, access is denied with appropriate message

---

**Test ID:** ROLE-DEALER-002
**Priority:** High
**Description:** Verify dealer cannot view all warranties

**Test Steps:**
1. Log in as dealer user
2. Navigate to Warranties list page
3. Check displayed warranties
4. Attempt to filter by "All Dealers"

**Expected Results:**
- ✅ Only warranties created by this dealer are visible
- ❌ "All Dealers" filter option not visible
- ✅ Warranty count matches dealer's created warranties

---

**Test ID:** ROLE-DEALER-003
**Priority:** Medium
**Description:** Verify dealer dashboard shows correct widgets

**Test Steps:**
1. Log in as dealer user
2. View dashboard

**Expected Results:**
- ✅ Shows: Sales KPI, Inventory Summary, Recent Warranties
- ❌ Does not show: Claims Processing Queue, System Analytics, User Management

---

### 2.2 Operator Role Tests

**Test ID:** ROLE-OPERATOR-001
**Priority:** Critical
**Description:** Verify operator can access advanced warranty options

**Test Steps:**
1. Log in as operator user
2. Navigate to "Create Warranty" page
3. Scroll to bottom of form
4. Click "Show advanced options"

**Expected Results:**
- ✅ "Show advanced options" button is visible
- ✅ Clicking reveals: Pricing override, Commission split, Internal notes
- ✅ Advanced fields are functional and save correctly

---

**Test ID:** ROLE-OPERATOR-002
**Priority:** Critical
**Description:** Verify operator can view all warranties

**Test Steps:**
1. Log in as operator user
2. Navigate to Warranties list page
3. Check filter options

**Expected Results:**
- ✅ Can see warranties from all dealers in organization
- ✅ "All Dealers" filter is available
- ✅ Can filter by specific dealer

---

**Test ID:** ROLE-OPERATOR-003
**Priority:** High
**Description:** Verify operator can process claims

**Test Steps:**
1. Log in as operator user
2. Navigate to Claims Center
3. Select a pending claim
4. Click "Approve" or "Reject"

**Expected Results:**
- ✅ Claims queue is visible
- ✅ Approve/Reject buttons are enabled
- ✅ Decision saves and updates claim status
- ✅ Notification is sent to dealer
- ✅ Audit trail records operator action

---

### 2.3 Support Role Tests

**Test ID:** ROLE-SUPPORT-001
**Priority:** High
**Description:** Verify support can view but not modify data

**Test Steps:**
1. Log in as support user
2. Navigate to Warranties list
3. Open a warranty detail
4. Attempt to click "Edit" button

**Expected Results:**
- ✅ Can view all warranties across all organizations
- ✅ Warranty details are readable
- ❌ "Edit" button is not visible or disabled
- ❌ No form fields are editable

---

**Test ID:** ROLE-SUPPORT-002
**Priority:** Medium
**Description:** Verify support cannot create new records

**Test Steps:**
1. Log in as support user
2. Check for "Create Warranty" button
3. Attempt to create new customer
4. Attempt to submit new claim

**Expected Results:**
- ❌ "Create Warranty" button not visible
- ❌ "New Customer" button not visible
- ❌ "Submit Claim" button not visible

---

### 2.4 Admin Role Tests

**Test ID:** ROLE-ADMIN-001
**Priority:** Critical
**Description:** Verify admin has full access

**Test Steps:**
1. Log in as admin user
2. Check all navigation menu items
3. Access Settings > All sections
4. Access User Management

**Expected Results:**
- ✅ All menu items visible
- ✅ Can access all settings sections
- ✅ Can create/edit/delete users
- ✅ Can manage warranty plans
- ✅ Can configure integrations

---

**Test ID:** ROLE-ADMIN-002
**Priority:** Critical
**Description:** Verify admin can manage feature flags

**Test Steps:**
1. Log in as admin user
2. Navigate to Settings > Feature Flags
3. Toggle a feature flag on/off
4. Set rollout percentage to 50%

**Expected Results:**
- ✅ Feature flags page is accessible
- ✅ Can enable/disable flags
- ✅ Can set rollout percentages
- ✅ Changes take effect immediately

---

## 3. Product Tour Tests

### 3.1 Welcome Tour Tests

**Test ID:** TOUR-WELCOME-001
**Priority:** Critical
**Description:** Verify welcome tour triggers on first login for dealer

**Test Steps:**
1. Create new dealer test account
2. Log in for the first time
3. Wait for tour to auto-start

**Expected Results:**
- ✅ Tour starts automatically within 2 seconds
- ✅ Modal overlay appears with first step
- ✅ First step highlights dashboard area
- ✅ Tour text is in correct language (French default)
- ✅ Navigation buttons (Next, Skip) are visible and functional

---

**Test ID:** TOUR-WELCOME-002
**Priority:** High
**Description:** Verify tour can be navigated with keyboard

**Test Steps:**
1. Start welcome tour
2. Press Right Arrow key
3. Press Left Arrow key
4. Press Escape key

**Expected Results:**
- ✅ Right Arrow advances to next step
- ✅ Left Arrow goes to previous step
- ✅ Escape closes/skips tour
- ✅ Focus is managed correctly (no focus traps)

---

**Test ID:** TOUR-WELCOME-003
**Priority:** High
**Description:** Verify tour completion is tracked

**Test Steps:**
1. Start welcome tour
2. Complete all steps
3. Click "Finish" on last step
4. Check database `tour_progress` table

**Expected Results:**
- ✅ Tour completes successfully
- ✅ Database record shows `completed = true`
- ✅ `completed_at` timestamp is set
- ✅ Tour does not auto-start on next login

---

### 3.2 Warranty Creation Tour Tests

**Test ID:** TOUR-WARRANTY-001
**Priority:** High
**Description:** Verify warranty creation tour for dealer

**Test Steps:**
1. Log in as dealer (who has completed welcome tour)
2. Navigate to Create Warranty page
3. Tour should auto-start if never seen

**Expected Results:**
- ✅ Tour starts on page load (if never seen)
- ✅ Tour highlights: form, customer search, VIN decoder, plan selector, save button
- ✅ Tour uses simple language for dealer role
- ✅ Tour can be dismissed and resumed later

---

**Test ID:** TOUR-WARRANTY-002
**Priority:** High
**Description:** Verify advanced warranty tour for operator

**Test Steps:**
1. Log in as operator
2. Navigate to Create Warranty page
3. Start advanced features tour (manual trigger)

**Expected Results:**
- ✅ Tour includes advanced steps: override pricing, discount management, internal notes, commission split
- ✅ Tour language explains advanced concepts
- ✅ Tour does not trigger automatically for dealer role

---

### 3.3 Claims Tour Tests

**Test ID:** TOUR-CLAIMS-001
**Priority:** Medium
**Description:** Verify claims submission tour

**Test Steps:**
1. Log in as dealer
2. Navigate to Claims Center
3. Click "New Claim"
4. Tour should auto-start if never seen

**Expected Results:**
- ✅ Tour explains: claim details, file upload, status tracking
- ✅ Tour highlights relevant UI elements
- ✅ Tour is dismissible but resumable

---

**Test ID:** TOUR-CLAIMS-002
**Priority:** Medium
**Description:** Verify claims processing tour for operator

**Test Steps:**
1. Log in as operator
2. Navigate to Claims Center
3. Tour should show processing workflow

**Expected Results:**
- ✅ Tour explains: pending queue, SLA indicators, approval workflow, audit trail
- ✅ Tour uses operator-specific language
- ✅ Tour only available to operator/admin roles

---

## 4. Progressive Disclosure Tests

### 4.1 Advanced Options Tests

**Test ID:** PROG-DISC-001
**Priority:** Critical
**Description:** Verify "Show advanced options" for authorized roles

**Test Steps:**
1. Log in as operator
2. Create new warranty
3. Check for "Show advanced options" button
4. Click to expand
5. Log out and log in as dealer
6. Create new warranty
7. Check for "Show advanced options" button

**Expected Results:**
- ✅ Operator sees "Show advanced options" button
- ✅ Clicking reveals advanced fields
- ✅ Advanced fields are functional
- ❌ Dealer does not see "Show advanced options" button
- ❌ Advanced fields are not accessible to dealer

---

**Test ID:** PROG-DISC-002
**Priority:** High
**Description:** Verify state persistence of expanded sections

**Test Steps:**
1. Log in as operator
2. Expand advanced options
3. Refresh page
4. Check if section is still expanded

**Expected Results:**
- ✅ Expanded state persists across page refreshes (localStorage)
- ✅ User preference is remembered for next visit

---

### 4.2 Contextual Help Tests

**Test ID:** PROG-DISC-003
**Priority:** Medium
**Description:** Verify help tooltips appear on hover

**Test Steps:**
1. Hover over any field with help icon
2. Wait 500ms

**Expected Results:**
- ✅ Tooltip appears with helpful explanation
- ✅ Tooltip is readable and concise
- ✅ Tooltip disappears on mouse leave
- ✅ Tooltip is accessible via keyboard focus

---

## 5. Accessibility Tests (WCAG AA)

### 5.1 Keyboard Navigation Tests

**Test ID:** A11Y-KB-001
**Priority:** Critical
**Description:** Verify all interactive elements are keyboard accessible

**Test Steps:**
1. Load any page
2. Press Tab repeatedly to navigate through all interactive elements
3. Use Enter/Space to activate buttons
4. Use arrow keys in dropdowns

**Expected Results:**
- ✅ All buttons, links, inputs are reachable via Tab
- ✅ Focus indicator is visible on all elements
- ✅ Tab order is logical (top to bottom, left to right)
- ✅ Enter/Space activates buttons
- ✅ Escape closes modals and dropdowns
- ✅ No keyboard traps

---

**Test ID:** A11Y-KB-002
**Priority:** Critical
**Description:** Verify tour navigation with keyboard

**Test Steps:**
1. Start any product tour
2. Use arrow keys to navigate
3. Press Escape to close

**Expected Results:**
- ✅ Right Arrow = Next step
- ✅ Left Arrow = Previous step
- ✅ Escape = Close/Skip tour
- ✅ Focus returns to triggering element after tour closes

---

### 5.2 Screen Reader Tests

**Test ID:** A11Y-SR-001
**Priority:** Critical
**Description:** Verify screen reader announces tour content

**Test Steps:**
1. Enable screen reader (NVDA or VoiceOver)
2. Start welcome tour
3. Listen to announcements

**Expected Results:**
- ✅ Tour title is announced
- ✅ Tour body text is announced
- ✅ Current step number is announced (e.g., "Step 1 of 5")
- ✅ Button labels are announced correctly
- ✅ Role and state are announced (dialog, modal)

---

**Test ID:** A11Y-SR-002
**Priority:** High
**Description:** Verify form field labels are associated

**Test Steps:**
1. Enable screen reader
2. Navigate to warranty creation form
3. Tab through each field

**Expected Results:**
- ✅ Each field label is announced
- ✅ Required status is announced
- ✅ Error messages are announced
- ✅ Help text is announced

---

### 5.3 Color Contrast Tests

**Test ID:** A11Y-COLOR-001
**Priority:** Critical
**Description:** Verify all text meets WCAG AA contrast ratios

**Test Steps:**
1. Use browser extension (WAVE, axe DevTools)
2. Scan all pages
3. Check contrast ratios

**Expected Results:**
- ✅ Normal text: minimum 4.5:1 contrast ratio
- ✅ Large text (18pt+): minimum 3:1 contrast ratio
- ✅ UI components: minimum 3:1 contrast ratio
- ✅ Focus indicators: minimum 3:1 contrast ratio

---

**Test ID:** A11Y-COLOR-002
**Priority:** High
**Description:** Verify information is not conveyed by color alone

**Test Steps:**
1. Check SLA indicators (green, yellow, red)
2. Check status badges
3. Check error states

**Expected Results:**
- ✅ SLA indicators use icons + text + color
- ✅ Status badges use text labels
- ✅ Error states use icons + text + border + color

---

### 5.4 ARIA Tests

**Test ID:** A11Y-ARIA-001
**Priority:** High
**Description:** Verify ARIA live regions for dynamic content

**Test Steps:**
1. Submit a form
2. Trigger a toast notification
3. Enable screen reader

**Expected Results:**
- ✅ Success messages announced via `aria-live="polite"`
- ✅ Error messages announced via `aria-live="assertive"`
- ✅ Loading states announced
- ✅ Dynamic content changes are announced

---

**Test ID:** A11Y-ARIA-002
**Priority:** High
**Description:** Verify modal dialogs have correct ARIA attributes

**Test Steps:**
1. Open any modal dialog
2. Inspect ARIA attributes

**Expected Results:**
- ✅ `role="dialog"`
- ✅ `aria-modal="true"`
- ✅ `aria-labelledby` points to title
- ✅ `aria-describedby` points to description
- ✅ Focus is trapped within modal

---

## 6. Internationalization Tests

### 6.1 Language Switching Tests

**Test ID:** I18N-LANG-001
**Priority:** High
**Description:** Verify UI switches between French and English

**Test Steps:**
1. Log in with French locale
2. Start a product tour
3. Switch to English in settings
4. Start the same tour again

**Expected Results:**
- ✅ All UI text updates to English
- ✅ Tour text displays in English
- ✅ Date formats change appropriately
- ✅ Currency formats update ($ vs $CA)

---

**Test ID:** I18N-LANG-002
**Priority:** Medium
**Description:** Verify all role names are translated

**Test Steps:**
1. Check Settings > User Management
2. View role dropdown
3. Switch language

**Expected Results:**
- ✅ French: Concessionnaire, Opérateur, Support, Administrateur
- ✅ English: Dealer, Operator, Support, Admin

---

### 6.2 Content Tests

**Test ID:** I18N-CONTENT-001
**Priority:** Medium
**Description:** Verify no hardcoded strings in tours

**Test Steps:**
1. Inspect `in-app-guides-complete.json`
2. Check each step for language objects

**Expected Results:**
- ✅ All tour steps have `{ en: "...", fr: "..." }` structure
- ❌ No hardcoded English-only text
- ✅ Translations are culturally appropriate

---

## 7. Analytics Tests

### 7.1 Event Tracking Tests

**Test ID:** ANALYTICS-001
**Priority:** Medium
**Description:** Verify tour completion events are tracked

**Test Steps:**
1. Open browser console
2. Start and complete a tour
3. Check console logs for analytics events

**Expected Results:**
- ✅ `tour:started` event fired with tourId
- ✅ `tour:step_viewed` fired for each step
- ✅ `tour:completed` or `tour:skipped` fired at end
- ✅ Events include: userId, role, timestamp

---

**Test ID:** ANALYTICS-002
**Priority:** Medium
**Description:** Verify feature discovery events

**Test Steps:**
1. Click "Show advanced options"
2. Modify an advanced field
3. Check analytics

**Expected Results:**
- ✅ `feature:discovered` event fired
- ✅ `advanced:shown` event fired
- ✅ `advanced:used` event fired when field modified

---

### 7.2 Performance Tracking Tests

**Test ID:** ANALYTICS-003
**Priority:** High
**Description:** Verify time-to-first-success tracking

**Test Steps:**
1. Create new test user
2. Log in
3. Create first warranty
4. Check analytics

**Expected Results:**
- ✅ `warranty:created:time` event recorded
- ✅ Time calculated from login to warranty save
- ✅ User role included in event data

---

## 8. Feature Flag Tests

### 8.1 Flag Enforcement Tests

**Test ID:** FLAG-001
**Priority:** High
**Description:** Verify feature flag controls feature visibility

**Test Steps:**
1. Log in as admin
2. Set feature flag `new_claim_workflow` to disabled
3. Log in as operator
4. Check if new claim workflow is visible

**Expected Results:**
- ❌ New workflow not visible
- ✅ Falls back to old workflow
- ✅ No console errors

---

**Test ID:** FLAG-002
**Priority:** High
**Description:** Verify role-based feature flags

**Test Steps:**
1. Create flag enabled only for admin role
2. Log in as dealer
3. Check if feature is visible
4. Log in as admin
5. Check if feature is visible

**Expected Results:**
- ❌ Dealer cannot see feature
- ✅ Admin can see feature

---

**Test ID:** FLAG-003
**Priority:** Medium
**Description:** Verify percentage rollout

**Test Steps:**
1. Set feature flag to 50% rollout
2. Test with 10 different users
3. Track how many see the feature

**Expected Results:**
- ✅ Approximately 50% of users see feature
- ✅ Same user always gets same result (deterministic)

---

## 9. Integration Tests

### 9.1 Database Integration Tests

**Test ID:** DB-INT-001
**Priority:** Critical
**Description:** Verify tour progress saves to database

**Test Steps:**
1. Complete a tour
2. Query `tour_progress` table
3. Check for record

**Expected Results:**
- ✅ Record exists with correct user_id
- ✅ `completed = true`
- ✅ `completed_at` timestamp is accurate
- ✅ `steps_completed = total_steps`

---

**Test ID:** DB-INT-002
**Priority:** Critical
**Description:** Verify role is read from profiles table

**Test Steps:**
1. Update user role in database
2. Log out and log back in
3. Check dashboard widgets

**Expected Results:**
- ✅ New role takes effect immediately
- ✅ Dashboard shows correct widgets for new role
- ✅ Permissions update correctly

---

### 9.2 RLS Policy Tests

**Test ID:** RLS-001
**Priority:** Critical
**Description:** Verify dealer cannot access other dealers' data via API

**Test Steps:**
1. Log in as Dealer A
2. Get Dealer A's JWT token
3. Use API to query warranties table
4. Attempt to filter by Dealer B's ID

**Expected Results:**
- ✅ Only Dealer A's warranties returned
- ❌ Dealer B's warranties not accessible
- ❌ No error message reveals existence of Dealer B's data

---

**Test ID:** RLS-002
**Priority:** Critical
**Description:** Verify operator can access all dealers' data in their org

**Test Steps:**
1. Log in as operator
2. Query warranties table
3. Check returned data

**Expected Results:**
- ✅ Warranties from all dealers in operator's organization are returned
- ❌ Warranties from other organizations are not returned

---

## 10. Regression Tests

### 10.1 Existing Functionality Tests

**Test ID:** REGRESSION-001
**Priority:** Critical
**Description:** Verify warranty creation still works after personalization changes

**Test Steps:**
1. Log in as dealer
2. Create a warranty with all required fields
3. Save

**Expected Results:**
- ✅ Warranty saves successfully
- ✅ PDF generates correctly
- ✅ Email is sent
- ✅ Warranty appears in list

---

**Test ID:** REGRESSION-002
**Priority:** High
**Description:** Verify claims processing workflow unchanged

**Test Steps:**
1. Log in as operator
2. Process a pending claim
3. Approve it

**Expected Results:**
- ✅ Claim status updates
- ✅ Notifications sent
- ✅ Audit trail records action
- ✅ No breaking changes to workflow

---

## 11. Mobile Responsiveness Tests

### 11.1 Tour Display Tests

**Test ID:** MOBILE-TOUR-001
**Priority:** High
**Description:** Verify tours display correctly on mobile

**Test Steps:**
1. Open site on mobile device (or DevTools mobile view)
2. Start welcome tour
3. Navigate through steps

**Expected Results:**
- ✅ Tour modal fits screen without horizontal scroll
- ✅ Text is readable (minimum 14px font)
- ✅ Buttons are easily tappable (minimum 44x44px)
- ✅ Tour arrow points to correct elements
- ✅ Can navigate with touch gestures

---

**Test ID:** MOBILE-TOUR-002
**Priority:** Medium
**Description:** Verify progressive disclosure on mobile

**Test Steps:**
1. Open warranty form on mobile
2. Tap "Show advanced options"

**Expected Results:**
- ✅ Section expands smoothly
- ✅ Page scrolls to show expanded content
- ✅ All fields are accessible
- ✅ No layout breaking

---

## 12. Performance Tests

### 12.1 Load Time Tests

**Test ID:** PERF-001
**Priority:** Medium
**Description:** Verify personalization doesn't slow page load

**Test Steps:**
1. Open Network tab in DevTools
2. Load dashboard page
3. Measure time to interactive

**Expected Results:**
- ✅ Page loads in under 2 seconds
- ✅ `rules-per-role.json` loads quickly (<100ms)
- ✅ No blocking requests
- ✅ Tour scripts load asynchronously

---

**Test ID:** PERF-002
**Priority:** Medium
**Description:** Verify tour engine doesn't cause memory leaks

**Test Steps:**
1. Open Performance tab
2. Take heap snapshot
3. Start and complete 10 tours
4. Take another heap snapshot
5. Compare memory usage

**Expected Results:**
- ✅ Memory usage increases minimally
- ✅ No detached DOM nodes
- ✅ Event listeners cleaned up after tour completes

---

## 13. Test Execution Summary Template

### Manual Test Execution Tracker

| Test ID | Status | Tester | Date | Notes | Severity |
|---------|--------|--------|------|-------|----------|
| ROLE-DEALER-001 | ⬜ Pass / ❌ Fail | | | | |
| ROLE-DEALER-002 | ⬜ Pass / ❌ Fail | | | | |
| TOUR-WELCOME-001 | ⬜ Pass / ❌ Fail | | | | |
| A11Y-KB-001 | ⬜ Pass / ❌ Fail | | | | |
| ... | | | | | |

### Defect Template

```markdown
**Defect ID:** BUG-001
**Title:** Tour does not start automatically on first login
**Severity:** High
**Priority:** P1
**Steps to Reproduce:**
1. Create new dealer account
2. Log in for first time
3. Wait 5 seconds

**Expected:** Tour starts automatically
**Actual:** Tour does not start
**Environment:** Staging, Chrome 120
**Screenshots:** [Attach]
**Assigned To:**
**Status:** Open
```

---

## 14. Sign-Off Checklist

### Pre-Production Release Checklist

- [ ] All Critical priority tests pass
- [ ] All High priority tests pass
- [ ] 95%+ of Medium priority tests pass
- [ ] No P0 or P1 bugs remain open
- [ ] Accessibility audit completed (WCAG AA)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness verified (iOS, Android)
- [ ] Performance metrics meet targets
- [ ] Analytics tracking verified
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Support team trained
- [ ] Documentation updated

### Sign-Off

**QA Lead:** _________________________ Date: _________

**Product Owner:** _________________________ Date: _________

**Engineering Lead:** _________________________ Date: _________

---

**End of QA Test Plan**
