# Visual Mockups Description - Role-Based Personalization

**Project:** Pro-Remorque Warranty Management Platform
**Version:** 2.0
**Date:** 2025-10-27
**Viewports:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x812)

---

## 1. Overview

This document provides detailed visual descriptions of the personalized interfaces for each user role. While actual Figma mockups would be ideal, these detailed descriptions serve as comprehensive blueprints for design and development.

### 1.1 Design System Reference

**Colors:**
- Primary (Red): #dc2626 to #b91c1c gradient
- Secondary (Teal): #14b8a6
- Accent (Blue): #3b82f6
- Neutral: #111827 (text), #f3f4f6 (backgrounds)
- Status: Success (#10b981), Warning (#f59e0b), Danger (#ef4444)

**Typography:**
- Font Family: Inter, system-ui, sans-serif
- Headings: Bold, tight line-height (1.2)
- Body: Regular, relaxed line-height (1.5)
- Sizes: 14px (body), 16px (base), 20px (headings), 24px+ (page titles)

**Spacing System:** 8px base unit (8, 16, 24, 32, 48, 64px)

**Shadows:**
- Cards: 0 1px 3px rgba(0,0,0,0.1)
- Buttons: 0 4px 12px rgba(220,38,38,0.3)
- Elevated: 0 10px 30px rgba(0,0,0,0.15)

---

## 2. Desktop Views (1920x1080)

### 2.1 Dealer Dashboard (Simplified)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ [Logo] Pro-Remorque        [Search]    [Notifications] [Help] [Profile]    │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────────────────────┐
│          │                                                                   │
│ SIDEBAR  │  MAIN CONTENT AREA                                               │
│          │                                                                   │
│ 📊 Tableau│  ┌────────────────────────────────────────────────────────────┐ │
│ 🛡️ Garanties│  WELCOME BANNER (First Login Only)                          │ │
│ 📋 Réclamations│ "Bienvenue! Commençons un tour guidé de 3 minutes"     │ │
│ 📦 Inventaire│  [Démarrer le tour]  [Plus tard]                          │ │
│ 👥 Clients │  └────────────────────────────────────────────────────────────┘ │
│          │                                                                   │
│ ⚙️ Réglages│  KPI CARDS (3 columns)                                          │
│ ❓ Aide   │  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│          │  │ Revenue  │ │Garanties │ │ Clients  │                         │
│          │  │ 12,450 $ │ │   34     │ │   127    │                         │
│          │  │ 📈 +12%  │ │ 📈 +8%   │ │ 📈 +15%  │                         │
│          │  └──────────┘ └──────────┘ └──────────┘                         │
│          │                                                                   │
│          │  QUICK ACTIONS                                                   │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │  [+ Créer une garantie]  [Rechercher un client]            ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  RECENT WARRANTIES (Table)                                       │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ # Garantie  | Client      | Véhicule    | Statut  | Date   ││
│          │  │ WAR-1234   | Jean Tremblay| Toyota Tacoma| ✅ Active| Oct 26││
│          │  │ WAR-1233   | Marie Dubois | Ford F-150  | ✅ Active| Oct 25││
│          │  │ WAR-1232   | Pierre Gagnon| Chevy 2500  | ✅ Active| Oct 25││
│          │  └─────────────────────────────────────────────────────────────┘│
└──────────┴──────────────────────────────────────────────────────────────────┘
```

**Key Visual Characteristics:**

**Navigation Sidebar (Left, 240px width):**
- Fixed position, light gray background (#f9fafb)
- Menu items: Icon (24px) + Label, 16px font, neutral-700 color
- Active item: Red background gradient, white text, left border accent
- Hover: Subtle gray background, smooth 200ms transition
- Only essential items visible: Dashboard, Warranties, Claims, Inventory, Customers, Settings, Help
- ❌ Hidden items: User Management, Organizations, System Analytics, Billing

**Header (72px height):**
- White background, thin bottom border (#e5e7eb)
- Logo: Left-aligned, 40px height
- Search bar: Center, 400px width, rounded, icon inside
- Right actions: Notification bell (with red badge if unread), Help icon, Profile avatar (32px circle)

**KPI Cards:**
- White background, rounded-xl (12px), shadow-sm
- Icon: Colored circle background (48px), 24px icon inside
- Title: 14px, neutral-600, uppercase, letter-spacing
- Value: 32px, bold, neutral-900
- Trend: Small badge, green for positive (↑12%), icon + percentage
- Hover: Slight lift (-2px), shadow-md

**Quick Action Buttons:**
- Primary button (Create Warranty): Red gradient, white text, shadow
- Secondary button (Search): Teal outline, teal text, transparent background
- Both: 44px height, rounded-lg, font-semibold

**Recent Warranties Table:**
- Clean rows, alternating subtle backgrounds
- Header: Bold, neutral-700, uppercase, 12px
- Status badges: Colored background, rounded-full, 8px padding
- Row hover: Light gray background, pointer cursor

---

### 2.2 Operator Dashboard (Advanced)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER (Same as Dealer)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────────────────────┐
│          │                                                                   │
│ SIDEBAR  │  MAIN CONTENT AREA                                               │
│ (Extended)│                                                                  │
│          │  KPI CARDS (4 columns - more metrics)                            │
│ 📊 Tableau│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│ 🛡️ Garanties│ Revenue │Garanties│ Récl.   │ Clients │                   │
│ 📋 Réclamations│ ALL    │  ALL    │ Pending │  ALL    │                   │
│ 📦 Inventaire│ 45,200$│  234    │   12    │  892    │                   │
│ 👥 Clients │  └────────┘ └────────┘ └────────┘ └────────┘                   │
│ 📊 Analytiques│                                                             │
│ 👤 Utilisateurs│ CLAIMS PROCESSING QUEUE                                    │
│ 🏢 Organisations│┌────────────────────────────────────────────────────────┐│
│          │  │ SLA Status | Claim # | Customer    | Priority | Actions   ││
│ ⚙️ Réglages│  │ 🟢 2h left│ CL-234 | Jean T.     | 🔴 High  │[Review]   ││
│ ❓ Aide   │  │ 🟡 30m left│CL-233  | Marie D.    | 🟡 Medium│[Review]   ││
│          │  │ 🔴 OVERDUE│ CL-232 | Pierre G.   | 🔴 High  │[URGENT]   ││
│          │  └────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  DEALER PERFORMANCE (Chart)                                      │
│          │  ┌────────────────────────────────────────────────────────────┐ │
│          │  │  Bar chart showing warranty volume by dealer                │ │
│          │  └────────────────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

**Key Differences from Dealer:**

**Extended Sidebar:**
- ✅ Additional items: Analytics, User Management, Organizations
- Visual separator between core features and admin features
- Subtle badge on "Claims" showing pending count (red circle, white text)

**KPI Cards:**
- 4 cards instead of 3, smaller width
- "View All" label visible (dealer sees only "own data")
- More detailed metrics in hover tooltips

**Claims Processing Queue:**
- Prominent placement (dealers don't see this)
- Color-coded SLA status: 🟢 Green (on track), 🟡 Yellow (approaching), 🔴 Red (overdue)
- Priority badges: High (red), Medium (yellow), Low (gray)
- Action buttons: [Review] (secondary), [URGENT] (danger variant)
- Sortable columns, live updates via websocket

**Analytics Section:**
- Bar chart or line graph showing trends
- Interactive, drill-down capabilities
- Export button in top-right

---

### 2.3 Warranty Creation Form - Dealer View (Simplified)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────────────────────┐
│ SIDEBAR  │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ BREADCRUMB: Garanties > Créer une garantie                  ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  PRODUCT TOUR STEP (Highlighted element)                         │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ TOUR MODAL (Floating, attached to element)                  ││
│          │  │ ┌─────────────────────────────────┐                         ││
│          │  │ │ Étape 2 sur 5                   │                         ││
│          │  │ │ Rechercher ou ajouter un client │                         ││
│          │  │ │                                 │                         ││
│          │  │ │ Commencez à taper pour chercher │                         ││
│          │  │ │ un client existant...           │                         ││
│          │  │ │                                 │                         ││
│          │  │ │ [Précédent] [Suivant]           │                         ││
│          │  │ └─────────────────────────────────┘                         ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  FORM CARD (White, rounded, shadow)                              │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ INFORMATIONS CLIENT                                         ││
│          │  │                                                             ││
│          │  │ Nom du client *                                             ││
│          │  │ [Input with autocomplete dropdown]                          ││
│          │  │ 💡 Entrez 3 lettres pour voir les suggestions              ││
│          │  │                                                             ││
│          │  │ Téléphone *          Email                                  ││
│          │  │ [Input]              [Input]                                ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ INFORMATIONS VÉHICULE                                       ││
│          │  │                                                             ││
│          │  │ NIV (VIN) *                                                 ││
│          │  │ [Input with decoder icon]  [Décoder]                       ││
│          │  │ ⚡ Le décodeur remplira automatiquement les champs          ││
│          │  │                                                             ││
│          │  │ Marque *        Modèle *        Année *                     ││
│          │  │ [Select]        [Select]        [Select]                    ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ PLAN DE GARANTIE                                            ││
│          │  │                                                             ││
│          │  │ ┌───────────┐ ┌───────────┐ ┌───────────┐                 ││
│          │  │ │ Basic     │ │ Premium   │ │ Ultimate  │                 ││
│          │  │ │ 1,200 $   │ │ 1,800 $   │ │ 2,400 $   │                 ││
│          │  │ │ 1 an      │ │ 2 ans     │ │ 3 ans     │                 ││
│          │  │ │[Sélectionner]│[Sélectionner]│[Sélectionner]│             ││
│          │  │ └───────────┘ └───────────┘ └───────────┘                 ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  ❌ PAS DE SECTION "OPTIONS AVANCÉES" POUR LE DEALER            │
│          │                                                                   │
│          │  ACTIONS                                                         │
│          │  [Annuler]  [Enregistrer le brouillon]  [Créer la garantie] ← Primary│
└──────────┴──────────────────────────────────────────────────────────────────┘
```

**Key Visual Characteristics:**

**Tour Modal:**
- White background, rounded-xl, shadow-xl
- Arrow pointing to highlighted element
- Step counter: Small gray text, top-left
- Title: 18px, bold, neutral-900
- Body: 14px, neutral-600, line-height 1.5
- Buttons: Secondary (Précédent), Primary (Suivant)
- Close icon: Top-right, only if tour is dismissible
- Backdrop: Semi-transparent black (0.5 opacity), blurs background

**Form Sections:**
- Each section in separate card, 24px margin between
- Section headers: 16px, bold, neutral-900, bottom border
- Required fields: Red asterisk, aria-label="requis"
- Inline help text: Small font, neutral-500, icon prefix
- Input fields: 44px height, rounded-lg, border neutral-300, focus: red ring

**Plan Selector Cards:**
- 3 columns, equal width
- Hover: Lift effect, shadow-lg
- Selected: Red border (3px), checkmark icon
- Radio button visually hidden, card acts as label

**Smart Features:**
- Autocomplete dropdown: Smooth slide-down, max 5 results
- VIN decoder: Loading spinner while decoding, success animation
- Real-time validation: Green checkmark or red X on blur
- Character counter on textarea: "245 / 500 caractères"

---

### 2.4 Warranty Creation Form - Operator View (Advanced)

**Additional Elements (vs. Dealer):**

```
│          │  [... Same sections as Dealer ...]                               │
│          │                                                                   │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ OPTIONS AVANCÉES (Collapsed by default)                     ││
│          │  │ [▶ Afficher les options avancées] ← Expand/collapse         ││
│          │  └─────────────────────────────────────────────────────────────┘│
│          │                                                                   │
│          │  ↓ WHEN EXPANDED ↓                                               │
│          │                                                                   │
│          │  ┌─────────────────────────────────────────────────────────────┐│
│          │  │ OPTIONS AVANCÉES                                            ││
│          │  │                                                             ││
│          │  │ 💰 AJUSTEMENT DES PRIX                                      ││
│          │  │ Prix standard: 1,800 $                                      ││
│          │  │ Ajustement:    [  -200  ] $  (Remise de 11%)                ││
│          │  │ ⚠️ Remise >10% requiert approbation manager                 ││
│          │  │                                                             ││
│          │  │ 💼 COMMISSION                                                ││
│          │  │ Taux de commission: [20] %                                  ││
│          │  │ Montant estimé: 320 $                                       ││
│          │  │                                                             ││
│          │  │ 📝 NOTES INTERNES                                           ││
│          │  │ [Textarea - visible uniquement à l'équipe]                  ││
│          │  │ Ex: "Client fidèle, remise négociée"                        ││
│          │  │                                                             ││
│          │  │ [▲ Masquer les options avancées]                            ││
│          │  └─────────────────────────────────────────────────────────────┘│
```

**Visual Treatment:**
- Collapsed state: Single line, secondary button, subtle border
- Expanded state: Light gray background (#f9fafb), 16px padding
- Smooth height animation (300ms ease-in-out)
- Warning badges: Yellow background, alert icon
- Pricing calculator: Live update as user types
- Commission: Read-only field, calculated automatically

---

## 3. Tablet Views (768x1024)

### 3.1 Dealer Dashboard (Tablet)

**Layout Changes:**

```
┌───────────────────────────────────────────────────────┐
│ HEADER (Hamburger menu replaces always-visible sidebar)│
│ [☰]  Pro-Remorque     [Search]    [👤]                │
└───────────────────────────────────────────────────────┘
│                                                        │
│ KPI CARDS (2 columns, stacked)                        │
│ ┌──────────────┐ ┌──────────────┐                    │
│ │ Revenue      │ │ Garanties    │                    │
│ │ 12,450 $     │ │   34         │                    │
│ └──────────────┘ └──────────────┘                    │
│ ┌──────────────┐                                      │
│ │ Clients      │                                      │
│ │   127        │                                      │
│ └──────────────┘                                      │
│                                                        │
│ QUICK ACTIONS (Stacked vertically)                    │
│ [+ Créer une garantie] (Full width)                   │
│ [Rechercher un client] (Full width)                   │
│                                                        │
│ RECENT WARRANTIES (Card view instead of table)        │
│ ┌────────────────────────────────────────────────┐   │
│ │ WAR-1234 | Jean Tremblay                       │   │
│ │ Toyota Tacoma | ✅ Active | Oct 26             │   │
│ │ [Voir détails]                                  │   │
│ └────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

**Key Adaptations:**
- Sidebar: Slide-out drawer (full-height overlay), accessible via hamburger
- KPI Cards: 2-column grid on tablet, cards slightly taller
- Table → Card view: Each warranty as expandable card
- Touch targets: Minimum 44x44px for all interactive elements
- Spacing increased: Better thumb accessibility

---

## 4. Mobile Views (375x812)

### 4.1 Dealer Dashboard (Mobile)

**Layout Structure:**

```
┌────────────────────────────────┐
│ HEADER (Compact)               │
│ [☰] Pro-Remorque        [👤]  │
└────────────────────────────────┘
│                                │
│ KPI CARDS (1 column, scrollable horizontal)│
│ ← ┌────────┐ ┌────────┐ →    │
│   │Revenue │ │Garanties│      │
│   │12,450$ │ │  34    │      │
│   └────────┘ └────────┘      │
│                                │
│ QUICK ACTION (Single primary)  │
│ [+ Créer une garantie]         │
│ (Full width, sticky)           │
│                                │
│ RECENT WARRANTIES              │
│ ┌──────────────────────────┐  │
│ │ WAR-1234                 │  │
│ │ Jean Tremblay            │  │
│ │ Toyota Tacoma            │  │
│ │ ✅ Active | Oct 26       │  │
│ │ [Voir] [Email]           │  │
│ └──────────────────────────┘  │
│ ┌──────────────────────────┐  │
│ │ WAR-1233                 │  │
│ │ ...                      │  │
│ └──────────────────────────┘  │
│                                │
│ [Voir toutes les garanties]   │
│                                │
└────────────────────────────────┘
  BOTTOM NAV (Fixed)
┌────────────────────────────────┐
│ [🏠]  [🛡️]  [➕]  [📋]  [⚙️]  │
│  Accueil  Garanties  Créer  Récl. Réglages│
└────────────────────────────────┘
```

**Mobile-Specific Patterns:**

**Bottom Navigation:**
- Fixed position, 64px height
- 5 primary actions: Home, Warranties, Create (center, emphasized), Claims, Settings
- Icons: 24px, active state: red color + label
- Safe area insets for iPhone notch

**KPI Cards:**
- Horizontal scroll (swipe gesture)
- Snap to grid, subtle scroll indicators
- Smaller font sizes, essential info only

**Warranty Cards:**
- Full-width, 16px horizontal padding
- Tap to expand for details, swipe to see actions
- Quick actions: Inline buttons (View, Email, Download)

**Tour Adaptations:**
- Tour modal: Full-screen on mobile (not floating)
- Bottom-aligned buttons, larger touch targets
- Swipe gestures: Swipe left/right to navigate steps

---

### 4.2 Warranty Creation Form (Mobile)

**Multi-Step Form:**

```
┌────────────────────────────────┐
│ HEADER                         │
│ [←] Créer une garantie    [X]  │
└────────────────────────────────┘
│ PROGRESS INDICATOR             │
│ ●━━○━━○━━○ (Step 1 of 4)       │
│                                │
│ ÉTAPE 1: INFORMATIONS CLIENT   │
│                                │
│ Nom du client *                │
│ [Input, autocomplete]          │
│                                │
│ Téléphone *                    │
│ [Input, tel keyboard]          │
│                                │
│ Email                          │
│ [Input, email keyboard]        │
│                                │
│                                │
│ (Spacer)                       │
│                                │
│                                │
└────────────────────────────────┘
  STICKY BOTTOM BUTTONS
┌────────────────────────────────┐
│ [Brouillon]    [Suivant →]     │
└────────────────────────────────┘
```

**Step Breakdown:**
1. **Étape 1:** Client info (3 fields)
2. **Étape 2:** Véhicule info (VIN + decoder, 4 fields)
3. **Étape 3:** Plan selection (visual cards)
4. **Étape 4:** Révision & confirmation (summary view)

**Mobile Form UX:**
- One section per screen, minimize scrolling
- Progress bar: Visual feedback on completion
- Appropriate keyboards: Tel for phone, email for email, numeric for VIN
- Sticky bottom buttons: Always accessible
- Back button: Navigate to previous step, saves draft
- Auto-save: Every 30 seconds, restore on return

---

## 5. Product Tour Visual Examples

### 5.1 Tour Step - Spotlight Style

**Desktop Version:**

```
┌─────────────────────────────────────────────────────────────┐
│  DARK BACKDROP (50% opacity, blurs background)              │
│                                                             │
│    ┌────────────────────┐                                  │
│    │ HIGHLIGHTED ELEMENT│ ← White ring, no blur            │
│    │ [Create Warranty]  │                                  │
│    └────────────────────┘                                  │
│                ↑                                            │
│                │ Arrow connector                            │
│         ┌──────────────────────────┐                       │
│         │  TOUR MODAL              │                       │
│         │  ┌────────────────────┐  │                       │
│         │  │ Étape 3 sur 5      │  │                       │
│         │  │ Créer une garantie │  │                       │
│         │  │                    │  │                       │
│         │  │ Cliquez ici pour   │  │                       │
│         │  │ commencer. Le      │  │                       │
│         │  │ formulaire simple  │  │                       │
│         │  │ prend 5-7 minutes. │  │                       │
│         │  │                    │  │                       │
│         │  │ [Précédent][Suivant]│ │                       │
│         │  │                    │  │                       │
│         │  └────────────────────┘  │                       │
│         └──────────────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Details:**
- Backdrop: Dark overlay, 0.5 opacity, backdrop-blur-sm
- Highlight: 4px white border around element, pulsing animation
- Arrow: CSS triangle, 16px, pointing to element
- Modal: White, rounded-xl, shadow-2xl, floating
- Animation: Fade in (300ms), smooth transitions

---

### 5.2 Completion Celebration Screen

```
┌─────────────────────────────────────────┐
│                                         │
│         ✅ (Large animated checkmark)   │
│                                         │
│     Félicitations!                      │
│     Vous avez terminé le tour guidé    │
│                                         │
│     Vous êtes maintenant prêt à créer  │
│     votre première garantie.           │
│                                         │
│     [Créer une garantie maintenant]    │
│     [Retour au tableau de bord]        │
│                                         │
└─────────────────────────────────────────┘
```

**Animation:**
- Checkmark: Scale in + check draw animation (500ms)
- Confetti particles (optional): Burst from checkmark
- Text: Fade in sequentially (staggered 100ms each)

---

## 6. Responsive Breakpoints

**Tailwind Breakpoints Used:**

```css
/* Mobile first approach */
/* xs: 0-639px - Mobile phones */
/* sm: 640px - Large phones, small tablets */
/* md: 768px - Tablets */
/* lg: 1024px - Small laptops */
/* xl: 1280px - Desktops */
/* 2xl: 1536px - Large desktops */
```

**Component Breakpoint Strategy:**

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Drawer (overlay) | Drawer | Fixed left |
| KPI Cards | 1 col (h-scroll) | 2 col | 3-4 col |
| Tables | Card view | Card/Table | Table |
| Forms | Multi-step | Single page | Single page |
| Modals | Full screen | Centered (80%) | Centered (60%) |
| Navigation | Bottom nav | Hamburger + top | Sidebar |

---

## 7. Accessibility Visual Indicators

### 7.1 Focus States

All interactive elements have visible focus indicators:
- **Buttons:** 3px red outline, 3px offset, rounded corners
- **Inputs:** Red border + subtle red glow (ring)
- **Links:** Underline + red text color
- **Cards (clickable):** Shadow increase + 2px lift

### 7.2 Error States

Form validation errors are highly visible:
- **Input border:** Red (2px)
- **Error icon:** Red exclamation triangle, left of message
- **Error message:** Red text, bold, below input, icon prefix
- **ARIA live region:** Announces error to screen readers

### 7.3 Loading States

Clear visual feedback during async operations:
- **Button loading:** Spinner replaces icon, button disabled, reduced opacity
- **Page loading:** Skeleton screens (pulsing gray boxes matching layout)
- **Inline loading:** Small spinner with "Chargement..." text

---

## 8. Animation Guidelines

### 8.1 Timing Functions

- **Fast:** 200ms - Hover effects, button presses
- **Medium:** 300ms - Modal open/close, dropdowns
- **Slow:** 500ms - Page transitions, tour steps

### 8.2 Easing

- **Ease-out:** For entrances (elements coming in)
- **Ease-in:** For exits (elements leaving)
- **Ease-in-out:** For transforms (size changes)

### 8.3 Animation Examples

```css
/* Card hover lift */
.card:hover {
  transform: translateY(-4px);
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

/* Modal fade in */
.modal-enter {
  opacity: 0;
  transform: scale(0.95);
}
.modal-enter-active {
  opacity: 1;
  transform: scale(1);
  transition: opacity 300ms ease-out, transform 300ms ease-out;
}

/* Tour spotlight pulse */
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
  50% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
}
.tour-highlight {
  animation: pulse-ring 2s infinite;
}
```

---

## 9. Design Tokens Summary

**Core Values:**

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-unit` | 8px | Base spacing module |
| `border-radius-sm` | 6px | Small elements (badges) |
| `border-radius-md` | 8px | Inputs, buttons |
| `border-radius-lg` | 12px | Cards, modals |
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Cards |
| `shadow-lg` | 0 10px 30px rgba(0,0,0,0.15) | Modals |
| `transition-fast` | 200ms | Micro-interactions |
| `transition-base` | 300ms | Standard animations |

---

## 10. Component Inventory

**All personalized components:**

✅ **Navigation:**
- DashboardLayout (with role-based sidebar)
- MobileNav (bottom navigation)
- Breadcrumbs

✅ **Dashboard Widgets:**
- KPICard (4 variants: primary, secondary, warning, success)
- RecentWarrantiesList (table + card views)
- ClaimsQueue (operator only)
- DealerPerformanceChart (operator only)

✅ **Forms:**
- WarrantyForm (dealer simplified vs. operator advanced)
- AdvancedOptionsSection (progressive disclosure)
- CustomerSearchInput (autocomplete)
- VINDecoderInput (with auto-fill)
- PlanSelectorCards (visual plan picker)

✅ **Tours:**
- TourModal (spotlight style)
- TourProgress (step indicator)
- TourCompletionCelebration

✅ **Common UI:**
- PrimaryButton (red gradient)
- SecondaryButton (teal outline)
- EnhancedCard (multiple variants)
- EnhancedInputField (with validation states)
- Toast notifications (ARIA live regions)

---

**End of Mockups Description Document**

*Note: These detailed descriptions serve as comprehensive blueprints for developers and designers. For actual Figma mockups, designers should use this document as a specification to create high-fidelity visual designs.*
