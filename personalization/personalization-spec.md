# Role-Based UI Personalization - Technical Specification

**Project:** Pro-Remorque Warranty Management Platform
**Version:** 2.0
**Date:** 2025-10-27
**Author:** UX/UI Development Team
**Status:** Implementation Ready

---

## 1. Executive Summary

This specification defines the technical implementation approach for role-based UI personalization in Pro-Remorque. The system uses progressive disclosure patterns to reduce perceived complexity and accelerate user adoption by 30%.

### 1.1 Objectives

- Reduce time-to-first-success by 30% through targeted onboarding
- Decrease user errors by 25% via simplified, role-appropriate interfaces
- Improve feature discovery through guided product tours
- Maintain WCAG AA accessibility compliance
- Support bilingual experience (French/English)

### 1.2 Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   React     │  │  Zustand/    │  │  Tour Engine     │  │
│  │  Components │  │  Context API │  │  (Shepherd.js)   │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Configuration Layer                        │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ rules-per-role   │         │  in-app-guides-complete │  │
│  │      .json       │         │         .json           │  │
│  └──────────────────┘         └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Supabase)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   profiles   │  │   settings   │  │ tour_progress   │  │
│  │  (role col)  │  │   (user)     │  │   (tracking)    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Role Detection & Context

### 2.1 Role Hierarchy

```typescript
type UserRole = 'dealer' | 'operator' | 'support' | 'admin';

interface RoleHierarchy {
  dealer: 0;      // Basic access
  operator: 1;    // Moderate access
  support: 2;     // Read-all, limited write
  admin: 3;       // Full access
}
```

### 2.2 Role Detection Hook

**File:** `src/hooks/useUserRole.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else {
        setRole(data?.role || 'dealer');
      }
      setLoading(false);
    }

    fetchRole();
  }, [user]);

  return { role, loading };
}
```

---

## 3. Personalization Context Provider

### 3.1 Context Implementation

**File:** `src/contexts/PersonalizationContext.tsx`

```typescript
import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUserRole } from '../hooks/useUserRole';
import rulesPerRole from '../config/rules-per-role.json';

interface PersonalizationContextValue {
  role: UserRole | null;
  rules: RoleConfiguration | null;
  hasPermission: (resource: string, action: string) => boolean;
  canSeeFeature: (featureName: string) => boolean;
  getDashboardWidgets: () => string[];
  getNavigationItems: () => string[];
  loading: boolean;
}

const PersonalizationContext = createContext<PersonalizationContextValue | undefined>(undefined);

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const { role, loading } = useUserRole();

  const rules = useMemo(() => {
    if (!role) return null;
    return rulesPerRole.roles[role];
  }, [role]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!rules) return false;
    return rules.permissions?.[resource]?.[action] === true;
  };

  const canSeeFeature = (featureName: string): boolean => {
    if (!rules) return false;
    return rules.uiFeatures?.[featureName] === true;
  };

  const getDashboardWidgets = (): string[] => {
    return rules?.dashboardWidgets || [];
  };

  const getNavigationItems = (): string[] => {
    return rules?.navigation?.mainMenu || [];
  };

  const value = {
    role,
    rules,
    hasPermission,
    canSeeFeature,
    getDashboardWidgets,
    getNavigationItems,
    loading,
  };

  return (
    <PersonalizationContext.Provider value={value}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext);
  if (context === undefined) {
    throw new Error('usePersonalization must be used within PersonalizationProvider');
  }
  return context;
}
```

---

## 4. UI Component Integration

### 4.1 Conditional Rendering Hook

**File:** `src/hooks/useFeatureVisibility.ts`

```typescript
import { usePersonalization } from '../contexts/PersonalizationContext';

export function useFeatureVisibility() {
  const { canSeeFeature, hasPermission } = usePersonalization();

  return {
    canSeeFeature,
    hasPermission,

    // Convenience methods
    showAdvancedOptions: () => canSeeFeature('showAdvancedPricing') || canSeeFeature('showInternalNotes'),
    canManageUsers: () => hasPermission('users', 'create') && hasPermission('users', 'delete'),
    canProcessClaims: () => hasPermission('claims', 'approve') && hasPermission('claims', 'reject'),
    isReadOnly: () => {
      // Check if user has any write permissions
      return !hasPermission('warranties', 'create') &&
             !hasPermission('warranties', 'update') &&
             !hasPermission('claims', 'create');
    },
  };
}
```

### 4.2 Example: Protected Feature Component

```typescript
import { useFeatureVisibility } from '../hooks/useFeatureVisibility';
import { SecondaryButton } from './ui';

function WarrantyFormAdvancedSection() {
  const { showAdvancedOptions } = useFeatureVisibility();
  const [expanded, setExpanded] = useState(false);

  if (!showAdvancedOptions()) {
    return null; // Hide completely for roles without access
  }

  return (
    <div className="mt-6">
      <SecondaryButton
        onClick={() => setExpanded(!expanded)}
        variant="ghost"
      >
        {expanded ? 'Hide' : 'Show'} Advanced Options
      </SecondaryButton>

      {expanded && (
        <div className="mt-4 p-4 bg-neutral-50 rounded-lg space-y-4">
          {/* Advanced pricing, commission splits, internal notes */}
        </div>
      )}
    </div>
  );
}
```

---

## 5. Product Tours Implementation

### 5.1 Tour Engine Integration

**File:** `src/lib/tour-engine.ts`

```typescript
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import inAppGuides from '../../personalization/in-app-guides-complete.json';

export class TourEngine {
  private tour: Shepherd.Tour | null = null;
  private currentTourId: string | null = null;

  constructor(
    private userRole: UserRole,
    private locale: 'en' | 'fr' = 'fr'
  ) {}

  startTour(tourId: string): void {
    const tourConfig = inAppGuides.tours[tourId];

    if (!tourConfig) {
      console.error(`Tour ${tourId} not found`);
      return;
    }

    // Check role permission
    if (!tourConfig.roles.includes(this.userRole)) {
      console.warn(`Tour ${tourId} not available for role ${this.userRole}`);
      return;
    }

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: tourConfig.dismissible,
        },
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
      },
    });

    // Add steps
    tourConfig.steps.forEach((step, index) => {
      this.tour!.addStep({
        id: step.stepId,
        text: step.body[this.locale],
        title: step.title[this.locale],
        attachTo: {
          element: step.selector,
          on: step.placement || 'bottom',
        },
        buttons: this.getStepButtons(index, tourConfig.steps.length),
      });
    });

    // Track analytics
    this.tour.on('complete', () => this.trackTourComplete(tourId));
    this.tour.on('cancel', () => this.trackTourSkip(tourId));

    this.currentTourId = tourId;
    this.tour.start();
  }

  private getStepButtons(index: number, total: number) {
    const buttons = [];

    if (index > 0) {
      buttons.push({
        text: this.locale === 'fr' ? 'Précédent' : 'Previous',
        action: () => this.tour?.back(),
        classes: 'shepherd-button-secondary',
      });
    }

    if (index < total - 1) {
      buttons.push({
        text: this.locale === 'fr' ? 'Suivant' : 'Next',
        action: () => this.tour?.next(),
        classes: 'shepherd-button-primary',
      });
    } else {
      buttons.push({
        text: this.locale === 'fr' ? 'Terminer' : 'Finish',
        action: () => this.tour?.complete(),
        classes: 'shepherd-button-primary',
      });
    }

    return buttons;
  }

  private async trackTourComplete(tourId: string): Promise<void> {
    // Save to database
    await supabase.from('tour_progress').insert({
      tour_id: tourId,
      user_id: currentUserId,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    // Track analytics event
    this.trackEvent('tour:completed', { tourId });
  }

  private async trackTourSkip(tourId: string): Promise<void> {
    this.trackEvent('tour:skipped', { tourId });
  }

  private trackEvent(eventName: string, properties: Record<string, any>): void {
    // Integrate with your analytics provider
    console.log('Analytics:', eventName, properties);
  }
}
```

### 5.2 Tour Hook

**File:** `src/hooks/useTour.ts`

```typescript
import { useEffect, useMemo } from 'react';
import { TourEngine } from '../lib/tour-engine';
import { usePersonalization } from '../contexts/PersonalizationContext';
import { useTranslation } from './useTranslation';

export function useTour() {
  const { role } = usePersonalization();
  const { locale } = useTranslation();

  const tourEngine = useMemo(() => {
    if (!role) return null;
    return new TourEngine(role, locale as 'en' | 'fr');
  }, [role, locale]);

  const startTour = (tourId: string) => {
    tourEngine?.startTour(tourId);
  };

  // Auto-start tours based on conditions
  useEffect(() => {
    const checkAndStartTours = async () => {
      if (!tourEngine || !role) return;

      // Check if user has seen welcome tour
      const hasSeenWelcome = localStorage.getItem(`tour_completed_welcome_${role}`);

      if (!hasSeenWelcome) {
        const welcomeTourId = `welcome_${role}`;
        tourEngine.startTour(welcomeTourId);
        localStorage.setItem(`tour_completed_welcome_${role}`, 'true');
      }
    };

    checkAndStartTours();
  }, [tourEngine, role]);

  return { startTour };
}
```

---

## 6. Database Schema Extensions

### 6.1 Tour Progress Tracking

```sql
-- Migration: Add tour progress tracking
CREATE TABLE IF NOT EXISTS tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completed boolean DEFAULT false,
  skipped_at timestamptz,
  steps_completed integer DEFAULT 0,
  total_steps integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE tour_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tour progress"
  ON tour_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tour progress"
  ON tour_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tour progress"
  ON tour_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_tour_progress_user_id ON tour_progress(user_id);
CREATE INDEX idx_tour_progress_tour_id ON tour_progress(tour_id);
CREATE INDEX idx_tour_progress_completed ON tour_progress(completed);
```

### 6.2 Feature Flags Table

```sql
-- Migration: Add feature flags for gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  enabled_for_roles text[] DEFAULT '{}',
  enabled_for_users uuid[] DEFAULT '{}',
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view feature flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage feature flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

## 7. Analytics Integration

### 7.1 Event Tracking

**File:** `src/lib/analytics.ts`

```typescript
export interface AnalyticsEvent {
  event: string;
  userId?: string;
  role?: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export class Analytics {
  static track(event: string, properties?: Record<string, any>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      userId: currentUser?.id,
      role: currentUserRole,
      properties,
      timestamp: new Date().toISOString(),
    };

    // Send to analytics backend
    console.log('Analytics Event:', analyticsEvent);

    // Also log to Supabase for analysis
    supabase.from('analytics_events').insert(analyticsEvent);
  }
}

// Usage
Analytics.track('feature:accessed', {
  featureName: 'advancedPricing',
  fromScreen: 'warrantyForm',
  role: 'operator',
});
```

### 7.2 Key Metrics to Track

```typescript
const PERSONALIZATION_METRICS = {
  // Time to first success
  'warranty:created:time': 'Time from login to first warranty created',
  'claim:submitted:time': 'Time from login to first claim submitted',

  // Feature discovery
  'feature:discovered': 'User found and clicked a feature',
  'tour:started': 'User started a product tour',
  'tour:completed': 'User completed a product tour',
  'tour:skipped': 'User skipped a product tour',

  // Progressive disclosure
  'advanced:shown': 'User clicked "Show advanced options"',
  'advanced:used': 'User modified an advanced field',

  // Errors
  'validation:error': 'Form validation error occurred',
  'permission:denied': 'User tried to access unauthorized feature',
};
```

---

## 8. Feature Flags Implementation

### 8.1 Feature Flag Hook

**File:** `src/hooks/useFeatureFlag.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePersonalization } from '../contexts/PersonalizationContext';

export function useFeatureFlag(flagKey: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const { role } = usePersonalization();
  const userId = useAuth().user?.id;

  useEffect(() => {
    async function checkFlag() {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_key', flagKey)
        .maybeSingle();

      if (error || !data) {
        setEnabled(false);
        return;
      }

      // Check if enabled globally
      if (data.enabled) {
        setEnabled(true);
        return;
      }

      // Check if enabled for user's role
      if (role && data.enabled_for_roles.includes(role)) {
        setEnabled(true);
        return;
      }

      // Check if enabled for specific user
      if (userId && data.enabled_for_users.includes(userId)) {
        setEnabled(true);
        return;
      }

      // Check rollout percentage
      if (data.rollout_percentage > 0) {
        const hash = hashUserId(userId || '');
        const userBucket = hash % 100;
        setEnabled(userBucket < data.rollout_percentage);
        return;
      }

      setEnabled(false);
    }

    checkFlag();
  }, [flagKey, role, userId]);

  return enabled;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
```

---

## 9. Styling & Theming

### 9.1 Custom Tour Styles

**File:** `src/styles/shepherd-custom.css`

```css
/* Custom styling for Shepherd.js tours */
.shepherd-theme-custom {
  font-family: var(--font-sans);
}

.shepherd-element {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  z-index: 9999;
}

.shepherd-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.shepherd-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.shepherd-text {
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
}

.shepherd-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.shepherd-button-primary {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.shepherd-button-primary:hover {
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
  transform: translateY(-1px);
}

.shepherd-button-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.shepherd-button-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.shepherd-modal-overlay-container {
  background: rgba(0, 0, 0, 0.5);
}

.shepherd-target-highlight {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
  }
}
```

---

## 10. Rollout Strategy

### 10.1 Phase 1: Internal Testing (Week 1-2)

- Deploy to staging environment
- Enable for admin role only
- Test all tours and role configurations
- Gather feedback from 5-10 internal users

### 10.2 Phase 2: Pilot Rollout (Week 3-4)

- Enable for 20% of dealer users (feature flag)
- Enable for all operator users
- Monitor analytics for time-to-first-success
- A/B test: personalized vs. standard experience

### 10.3 Phase 3: Full Rollout (Week 5-6)

- Gradually increase to 50%, then 100% of dealer users
- Enable support and admin roles
- Monitor error rates and user feedback
- Iterate based on data

### 10.4 Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Time to first warranty | 15 min | 10.5 min (-30%) | Analytics |
| Form validation errors | 8 per user | 6 per user (-25%) | Error tracking |
| Feature discovery rate | 40% | 60% (+50%) | Click tracking |
| Tour completion rate | N/A | >70% | Tour analytics |
| User satisfaction (NPS) | 35 | 50 (+15 points) | Survey |

---

## 11. Maintenance & Updates

### 11.1 Updating Role Rules

1. Edit `/personalization/rules-per-role.json`
2. Test changes in development environment
3. Deploy via CI/CD pipeline
4. Monitor for permission-related errors
5. Update documentation

### 11.2 Adding New Tours

1. Define tour in `/personalization/in-app-guides-complete.json`
2. Add `data-tour` attributes to target elements in components
3. Test tour flow manually
4. Deploy and track completion rates
5. Iterate based on skip rates

### 11.3 Monitoring

```typescript
// Dashboard query for monitoring
SELECT
  tour_id,
  COUNT(*) as starts,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completions,
  AVG(steps_completed::float / total_steps * 100) as avg_progress_pct,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM tour_progress
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY tour_id
ORDER BY starts DESC;
```

---

## 12. Security Considerations

### 12.1 Frontend-Only Implementation

- Role-based UI is for UX improvement only
- All security enforcement happens in Supabase RLS policies
- Never rely on frontend role checks for data access
- Always validate permissions on backend

### 12.2 Safe Feature Flags

```typescript
// GOOD: Hide UI, but enforce on backend
if (hasPermission('users', 'delete')) {
  return <DeleteButton onClick={handleDelete} />;
}

// BAD: Client-side only permission check
function handleDelete() {
  if (role === 'admin') {  // Easily bypassed
    deleteUser(userId);
  }
}

// CORRECT: Always enforce server-side
function handleDelete() {
  // Supabase RLS will reject if user lacks permission
  await supabase.from('users').delete().eq('id', userId);
}
```

---

## 13. Integration Checklist

- [ ] Add `PersonalizationProvider` to `App.tsx`
- [ ] Implement `useUserRole` hook
- [ ] Create `usePersonalization` hook
- [ ] Apply `data-tour` attributes to key UI elements
- [ ] Initialize TourEngine on first login
- [ ] Create database migrations for `tour_progress` and `feature_flags`
- [ ] Set up analytics event tracking
- [ ] Configure feature flags for gradual rollout
- [ ] Add custom Shepherd.js styles
- [ ] Test all role configurations
- [ ] Validate WCAG AA compliance
- [ ] Test bilingual support (EN/FR)
- [ ] Create monitoring dashboard
- [ ] Document rollout plan
- [ ] Train support team on new features

---

## 14. Support & Documentation

### 14.1 For Developers

- API Documentation: `/docs/api/personalization`
- Code Examples: `/docs/examples/role-based-ui`
- Migration Guide: `/docs/migration/v2-personalization`

### 14.2 For End Users

- Video Tutorials: Embedded in product tours
- Knowledge Base: Help Center (F1 key)
- Live Support: Chat widget for stuck users

---

**End of Technical Specification**
