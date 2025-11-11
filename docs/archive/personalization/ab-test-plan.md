# A/B Testing Plan - Role-Based UI Personalization

**Project:** Pro-Remorque Warranty Management Platform
**Version:** 2.0
**Date:** 2025-10-27
**Test Duration:** 4 weeks
**Target:** 30% reduction in time-to-first-success

---

## 1. Executive Summary

### 1.1 Hypothesis

**Primary Hypothesis:**
Role-based UI personalization with progressive disclosure will reduce time-to-first-success by 30% and decrease user errors by 25% compared to the current one-size-fits-all interface.

**Secondary Hypotheses:**
1. Guided product tours will increase feature discovery by 50%
2. Simplified dealer interface will reduce form completion time by 20%
3. Advanced options for operators will improve efficiency without increasing complexity

### 1.2 Success Metrics

| Metric | Baseline | Target | Priority |
|--------|----------|--------|----------|
| Time to first warranty | 15 min | 10.5 min (-30%) | Primary |
| Form validation errors | 8 per user | 6 per user (-25%) | Primary |
| Feature discovery rate | 40% | 60% (+50%) | Secondary |
| Tour completion rate | N/A | >70% | Secondary |
| User satisfaction (NPS) | 35 | 50 (+15 points) | Secondary |
| Warranty creation rate | 12/day | 16/day (+33%) | Exploratory |

---

## 2. Test Design

### 2.1 Test Groups

**Control Group (A):**
- Current UI with no role-based personalization
- All features visible to all users
- No product tours
- Standard onboarding

**Treatment Group (B):**
- Role-based UI personalization enabled
- Progressive disclosure for advanced features
- Guided product tours
- Role-specific dashboard widgets

### 2.2 Randomization Strategy

**User-Level Randomization:**
- Split: 50% Control, 50% Treatment
- Stratified by role to ensure balanced distribution
- Persistent assignment (user sees same version throughout test)

```typescript
// Pseudocode for user assignment
function assignTestGroup(userId: string, userRole: string): 'control' | 'treatment' {
  const hash = hashString(userId + 'personalization-test-v1');
  const bucket = hash % 100;

  // 50/50 split
  return bucket < 50 ? 'control' : 'treatment';
}

// Ensure balanced role distribution
const assignment = assignTestGroup(userId, userRole);
trackEvent('test:assigned', { userId, userRole, testGroup: assignment });
```

### 2.3 Sample Size Calculation

**Required Sample Size:**
- Confidence level: 95%
- Statistical power: 80%
- Minimum detectable effect: 20% improvement
- Estimated: **200 users per group** (400 total)

**Enrollment Period:** 2 weeks
**Measurement Period:** 4 weeks total (includes enrollment)

---

## 3. Test Implementation

### 3.1 Feature Flag Configuration

**File:** Database `feature_flags` table

```sql
INSERT INTO feature_flags (flag_key, enabled, description, rollout_percentage) VALUES
('personalization_ab_test', true, 'A/B test for role-based personalization', 50),
('personalization_tours_enabled', true, 'Enable product tours for treatment group', 50),
('personalization_progressive_disclosure', true, 'Enable progressive disclosure', 50);
```

### 3.2 Code Implementation

```typescript
// Check if user is in treatment group
export function useABTest(testName: string): 'control' | 'treatment' {
  const { user } = useAuth();
  const { role } = usePersonalization();
  const [group, setGroup] = useState<'control' | 'treatment'>('control');

  useEffect(() => {
    if (!user) return;

    // Check if test is active
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('flag_key', testName)
      .maybeSingle();

    if (!flag?.enabled) {
      setGroup('control');
      return;
    }

    // Assign user to group
    const assignment = assignTestGroup(user.id, role);
    setGroup(assignment);

    // Track assignment
    trackEvent('ab_test:assigned', {
      testName,
      userId: user.id,
      userRole: role,
      testGroup: assignment,
    });
  }, [user, role, testName]);

  return group;
}

// Usage in component
function Dashboard() {
  const testGroup = useABTest('personalization_ab_test');

  if (testGroup === 'treatment') {
    return <PersonalizedDashboard />;
  }

  return <StandardDashboard />;
}
```

### 3.3 Analytics Tracking

**Events to Track:**

```typescript
// User enters test
trackEvent('ab_test:assigned', {
  testName: 'personalization_ab_test',
  userId: string,
  userRole: string,
  testGroup: 'control' | 'treatment',
  timestamp: ISO8601,
});

// User creates first warranty
trackEvent('warranty:created:first', {
  userId: string,
  testGroup: 'control' | 'treatment',
  timeToCreate: number, // milliseconds from login
  formErrors: number,
  timestamp: ISO8601,
});

// User completes tour
trackEvent('tour:completed', {
  tourId: string,
  userId: string,
  testGroup: 'treatment',
  duration: number, // seconds
  timestamp: ISO8601,
});

// User discovers feature
trackEvent('feature:discovered', {
  featureName: string,
  userId: string,
  testGroup: 'control' | 'treatment',
  discoveryMethod: 'organic' | 'tour' | 'search',
  timestamp: ISO8601,
});

// User submits NPS survey
trackEvent('nps:submitted', {
  userId: string,
  testGroup: 'control' | 'treatment',
  score: number, // 0-10
  timestamp: ISO8601,
});
```

---

## 4. Measurement Plan

### 4.1 Primary Metrics

#### Time to First Warranty Creation

**Definition:** Time elapsed from first login to successful warranty creation.

**Measurement:**
```sql
-- Query to calculate average time-to-first-warranty per group
WITH first_warranties AS (
  SELECT
    w.user_id,
    w.created_at AS first_warranty_at,
    p.created_at AS user_created_at,
    ab.test_group,
    EXTRACT(EPOCH FROM (w.created_at - p.created_at)) / 60 AS minutes_to_first
  FROM warranties w
  INNER JOIN profiles p ON w.user_id = p.id
  INNER JOIN ab_test_assignments ab ON p.id = ab.user_id
  WHERE w.id = (
    SELECT id FROM warranties
    WHERE user_id = w.user_id
    ORDER BY created_at ASC
    LIMIT 1
  )
  AND ab.test_name = 'personalization_ab_test'
  AND p.created_at >= '2025-10-27' -- Test start date
)
SELECT
  test_group,
  COUNT(*) AS users,
  AVG(minutes_to_first) AS avg_time_minutes,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY minutes_to_first) AS median_time_minutes,
  STDDEV(minutes_to_first) AS stddev_minutes
FROM first_warranties
GROUP BY test_group;
```

**Expected Result:**
- Control: ~15 minutes
- Treatment: ~10.5 minutes (30% reduction)
- Statistical significance: p < 0.05

#### Form Validation Errors

**Definition:** Average number of validation errors per user during warranty creation.

**Measurement:**
```sql
SELECT
  ab.test_group,
  COUNT(e.id) / COUNT(DISTINCT e.user_id) AS avg_errors_per_user
FROM error_logs e
INNER JOIN ab_test_assignments ab ON e.user_id = ab.user_id
WHERE e.error_type = 'validation_error'
  AND e.context->>'form' = 'warranty_creation'
  AND e.created_at >= '2025-10-27'
GROUP BY ab.test_group;
```

**Expected Result:**
- Control: ~8 errors per user
- Treatment: ~6 errors per user (25% reduction)

### 4.2 Secondary Metrics

#### Feature Discovery Rate

**Definition:** Percentage of users who interact with key features within first 7 days.

**Key Features:**
- Advanced pricing options
- VIN decoder
- Claim submission
- Customer search

**Measurement:**
```sql
WITH feature_interactions AS (
  SELECT DISTINCT
    user_id,
    test_group,
    CASE
      WHEN event_name = 'feature:accessed' AND properties->>'feature' = 'advancedPricing' THEN 1
      ELSE 0
    END AS used_advanced_pricing,
    -- Repeat for other features
  FROM analytics_events
  WHERE created_at >= '2025-10-27'
    AND created_at <= user_created_at + INTERVAL '7 days'
)
SELECT
  test_group,
  SUM(used_advanced_pricing) * 100.0 / COUNT(*) AS pct_discovered_advanced_pricing
FROM feature_interactions
GROUP BY test_group;
```

#### Tour Completion Rate (Treatment Group Only)

**Definition:** Percentage of users who complete at least one product tour.

**Measurement:**
```sql
SELECT
  COUNT(DISTINCT CASE WHEN completed = true THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) AS completion_rate
FROM tour_progress
WHERE created_at >= '2025-10-27';
```

**Target:** >70% completion rate

#### Net Promoter Score (NPS)

**Definition:** NPS calculated from user survey responses.

**Survey Trigger:** After 14 days of usage or 5 warranties created (whichever comes first)

**Question:** "How likely are you to recommend Pro-Remorque to a colleague?" (0-10 scale)

**Calculation:**
```typescript
function calculateNPS(scores: number[]): number {
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  const total = scores.length;

  return ((promoters - detractors) / total) * 100;
}
```

---

## 5. Guardrail Metrics

**Purpose:** Ensure the treatment doesn't negatively impact core business metrics.

| Metric | Threshold | Action if Breached |
|--------|-----------|-------------------|
| Warranty creation volume | -10% vs. control | Pause test, investigate |
| User churn rate | +15% vs. control | Pause test immediately |
| System error rate | +20% vs. control | Pause test, debug |
| Page load time | +30% vs. control | Optimize, continue |
| Support ticket volume | +25% vs. control | Investigate, may continue |

**Monitoring Frequency:** Daily

---

## 6. Analysis Plan

### 6.1 Statistical Tests

**Primary Metrics:**
- Two-sample t-test for time-to-first-warranty
- Chi-square test for error rate reduction
- Confidence level: 95% (α = 0.05)
- Bonferroni correction for multiple comparisons

**Power Analysis:**
```python
from scipy import stats
import numpy as np

# Example: Time to first warranty
control_mean = 15  # minutes
treatment_mean = 10.5  # minutes
pooled_std = 5  # estimated

sample_size_per_group = 200

# Calculate statistical power
effect_size = (control_mean - treatment_mean) / pooled_std
power = stats.ttest_ind_power(effect_size, nobs1=sample_size_per_group, alpha=0.05)
print(f"Statistical Power: {power:.2%}")
```

### 6.2 Segmentation Analysis

**Analyze results by segments:**

1. **By Role:**
   - Dealer vs. Operator vs. Support vs. Admin
   - Hypothesis: Dealers benefit most from simplification

2. **By Experience Level:**
   - New users (<7 days) vs. Experienced users (>7 days)
   - Hypothesis: New users benefit most from tours

3. **By Device:**
   - Desktop vs. Mobile vs. Tablet
   - Hypothesis: Mobile users benefit from simplified UI

4. **By Language:**
   - French vs. English
   - Ensure no language bias in results

### 6.3 Qualitative Analysis

**User Surveys:**
- Send to 20% of participants after 2 weeks
- Questions:
  1. "How easy was it to create your first warranty?" (1-5 scale)
  2. "Did you find the interface overwhelming or simple?" (1-5 scale)
  3. "Were the product tours helpful?" (Yes/No/Didn't use)
  4. "What could be improved?" (Open-ended)

**User Interviews:**
- Conduct 10 interviews (5 control, 5 treatment)
- 30-minute sessions
- Focus on pain points and delighters

---

## 7. Decision Framework

### 7.1 Launch Decision Tree

```
┌─────────────────────────────────────────┐
│   Primary Metrics Both Positive?        │
│   (Time↓30%, Errors↓25%)                │
└──────────┬──────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
    YES         NO
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────────────────┐
│ LAUNCH  │  │ At least one metric improved? │
│  100%   │  └──────────┬──────────────────┘
└─────────┘             │
                  ┌─────┴─────┐
                  │           │
                 YES         NO
                  │           │
                  ▼           ▼
           ┌──────────┐  ┌──────────┐
           │ LAUNCH   │  │ DO NOT   │
           │ with     │  │ LAUNCH   │
           │ caveats  │  │ Iterate  │
           └──────────┘  └──────────┘
```

### 7.2 Launch Criteria

**Full Launch (Treatment to 100%):**
- ✅ Time-to-first-warranty reduced by ≥25%
- ✅ Error rate reduced by ≥20%
- ✅ No guardrail metrics breached
- ✅ NPS improved by ≥10 points
- ✅ Statistical significance (p < 0.05)

**Partial Launch (Treatment to 75%):**
- ✅ One primary metric improved significantly
- ✅ Other metrics neutral or slightly positive
- ✅ No major guardrail breaches
- ⚠️ Some segments show negative results

**Iterate & Re-test:**
- ❌ Both primary metrics neutral or negative
- ❌ Guardrail metrics breached
- ❌ Qualitative feedback overwhelmingly negative

**Immediate Rollback:**
- 🚨 System errors increase >50%
- 🚨 User churn increases >30%
- 🚨 Critical bug discovered

---

## 8. Implementation Timeline

### Week 0: Preparation (Pre-launch)
- [ ] Finalize feature flags configuration
- [ ] Deploy analytics tracking code
- [ ] Test randomization logic
- [ ] Create monitoring dashboards
- [ ] Brief support team

### Week 1-2: Enrollment Period
- [ ] Launch A/B test to new users
- [ ] Monitor daily guardrail metrics
- [ ] Collect baseline data
- [ ] Address any technical issues

### Week 3-4: Measurement Period
- [ ] Continue data collection
- [ ] Send user surveys
- [ ] Conduct user interviews
- [ ] Monitor for anomalies

### Week 5: Analysis
- [ ] Run statistical tests
- [ ] Create segmentation reports
- [ ] Compile qualitative feedback
- [ ] Present results to stakeholders

### Week 6: Decision & Rollout
- [ ] Make launch decision
- [ ] Plan full rollout or iteration
- [ ] Document learnings
- [ ] Update roadmap

---

## 9. Risk Mitigation

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Feature flag failure | Low | High | Automated monitoring, fallback to control |
| Tracking data loss | Medium | High | Redundant logging, database backups |
| Performance degradation | Medium | Medium | Load testing, gradual rollout |
| Browser compatibility | Low | Medium | Cross-browser testing, polyfills |

### 9.2 User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User confusion from inconsistency | Medium | Low | Clear communication, consistent assignment |
| Negative feedback on tours | Medium | Medium | Easy dismiss, "Don't show again" option |
| Missing critical features | Low | High | Thorough testing, staged rollout |

### 9.3 Rollback Plan

**Trigger Conditions:**
- Critical bug discovered
- Guardrail metric breached significantly
- Negative impact on business operations

**Rollback Steps:**
1. Set feature flag `personalization_ab_test` to `disabled`
2. All users see control experience
3. Investigate root cause
4. Fix issues
5. Re-test internally before re-launch

**Rollback Time:** <15 minutes

---

## 10. Reporting & Communication

### 10.1 Weekly Status Report

**Recipients:** Product Manager, Engineering Lead, Executive Sponsor

**Content:**
- Test progress (users enrolled, data collected)
- Early trends (directional, not conclusive)
- Guardrail metrics status
- Issues and resolutions
- Next steps

### 10.2 Final Report Template

```markdown
# A/B Test Results: Role-Based UI Personalization

## Executive Summary
- **Outcome:** [Launch / Iterate / Rollback]
- **Primary Impact:** [X%] reduction in time-to-first-success
- **Statistical Confidence:** [%]
- **Recommendation:** [Action]

## Detailed Results

### Primary Metrics
| Metric | Control | Treatment | Change | p-value |
|--------|---------|-----------|--------|---------|
| Time to first warranty | 15.2 min | 10.8 min | -29% | <0.001 |
| Validation errors | 8.1 | 6.3 | -22% | 0.003 |

### Secondary Metrics
| Metric | Control | Treatment | Change |
|--------|---------|-----------|--------|
| Feature discovery | 38% | 57% | +50% |
| NPS | 34 | 48 | +14 |

### Segmentation Insights
- Dealers showed the largest improvement (-35% time)
- Mobile users benefited significantly (-40% time)
- Experienced users saw minimal change

### Qualitative Highlights
- "The guided tour helped me get started quickly" (12 mentions)
- "Interface feels less cluttered" (8 mentions)
- "Would like more customization" (5 mentions)

### Guardrail Metrics
✅ All within acceptable thresholds

## Recommendation
**Launch to 100% of users** with following considerations:
1. Monitor mobile performance closely
2. Add customization options for experienced users
3. Iterate on tour content based on feedback

## Next Steps
1. Prepare full rollout plan
2. Update documentation
3. Train support team
4. Plan Phase 2 enhancements
```

---

## 11. Learning & Iteration

### 11.1 Retrospective Questions

**What went well?**
- Which aspects of personalization resonated most?
- What surprised us positively?

**What could be improved?**
- Were there segments where treatment underperformed?
- What technical challenges did we face?

**What did we learn?**
- How do different roles interact with the platform?
- What are the key drivers of success?

### 11.2 Future Tests

Based on results, plan follow-up experiments:
- **Test 2:** Optimize tour content and timing
- **Test 3:** Add AI-powered smart defaults
- **Test 4:** Personalize navigation menu order
- **Test 5:** Context-aware help system

---

**End of A/B Test Plan**
