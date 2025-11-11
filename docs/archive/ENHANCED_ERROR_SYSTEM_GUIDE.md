# Enhanced Error Management System - Complete Guide

## Overview

This guide documents the comprehensive, production-ready error management system that provides precise error identification and reliable debugging capabilities. The system eliminates the need to hunt for bugs through intelligent error tracking, automatic context capture, and powerful debugging tools.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Error Fingerprinting](#error-fingerprinting)
3. [Breadcrumb Tracking](#breadcrumb-tracking)
4. [Error Recovery & Circuit Breakers](#error-recovery--circuit-breakers)
5. [Error Debugger & Reproduction](#error-debugger--reproduction)
6. [Enhanced Error Logging](#enhanced-error-logging)
7. [Error Dashboard](#error-dashboard)
8. [Database Schema](#database-schema)
9. [Integration Guide](#integration-guide)
10. [Best Practices](#best-practices)

---

## System Architecture

The enhanced error management system consists of several integrated components:

```
┌─────────────────────────────────────────────────────────┐
│                   Application Code                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│            Enhanced Error Logger                         │
│  • Captures errors with full context                     │
│  • Generates fingerprints                                │
│  • Records breadcrumbs                                   │
│  • Creates debug snapshots                               │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┼─────────┬─────────────┐
        ▼         ▼         ▼             ▼
┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│Fingerprint│ │Breadcrumb│ │ Recovery │ │ Debugger │
│ Generator│ │ Tracker │ │ Manager  │ │          │
└──────────┘ └─────────┘ └──────────┘ └──────────┘
        │         │         │             │
        └─────────┴─────────┴─────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Supabase DB     │
        │  • error_logs    │
        │  • fingerprints  │
        │  • breadcrumbs   │
        │  • recovery      │
        │  • alerts        │
        └──────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ Error Dashboard  │
        │  Analytics &     │
        │  Monitoring      │
        └──────────────────┘
```

---

## Error Fingerprinting

### Overview

Error fingerprinting groups similar errors together for intelligent pattern detection and impact analysis.

### Features

- **Automatic Grouping**: Similar errors are automatically grouped using normalized messages and stack traces
- **Occurrence Tracking**: Tracks how many times each error pattern occurs
- **User Impact**: Monitors how many unique users are affected by each error
- **Severity Scoring**: Calculates dynamic severity based on frequency and impact

### Usage

```typescript
import { errorFingerprintGenerator } from './lib/error-fingerprint';

// Automatically generate fingerprint
const error = new Error('Database connection failed');
const fingerprintId = errorFingerprintGenerator.generateFingerprint(error, {
  userId: 'user123',
  organizationId: 'org456'
});

// Get fingerprint details
const fingerprint = errorFingerprintGenerator.getFingerprint(fingerprintId);
console.log(fingerprint.metadata.occurrenceCount);
console.log(fingerprint.metadata.affectedUsers);

// Get top errors
const topErrors = errorFingerprintGenerator.getMostFrequentFingerprints(10);

// Get statistics
const stats = errorFingerprintGenerator.getStatistics();
console.log(stats.totalOccurrences);
console.log(stats.uniqueUsers);
```

### How It Works

1. **Message Normalization**: Removes variable data (IDs, timestamps, numbers) from error messages
2. **Stack Hashing**: Creates a hash from the first 5 lines of the stack trace
3. **Component Extraction**: Identifies which component/file the error occurred in
4. **Fingerprint ID**: Combines normalized message, stack hash, and component into unique ID

---

## Breadcrumb Tracking

### Overview

Breadcrumb tracking captures a trail of user actions and system events leading up to errors.

### Breadcrumb Categories

- **Navigation**: Route changes and page navigations
- **User Action**: Button clicks, form submissions, user interactions
- **API Call**: HTTP requests and responses
- **State Change**: Application state modifications
- **Console**: Console logs, warnings, and errors
- **Error**: Error occurrences
- **Performance**: Performance metrics

### Usage

```typescript
import { breadcrumbTracker, BreadcrumbCategory, BreadcrumbLevel } from './lib/error-breadcrumbs';

// Record user action
breadcrumbTracker.recordUserAction('Click', 'Submit Button', {
  formData: { field1: 'value1' }
});

// Record navigation
breadcrumbTracker.recordNavigation('/dashboard', '/settings');

// Record API call
breadcrumbTracker.recordApiCall('POST', '/api/warranty', 201, 345, {
  requestId: 'abc123'
});

// Record state change
breadcrumbTracker.recordStateChange('user', oldUserState, newUserState);

// Record performance metric
breadcrumbTracker.recordPerformanceMetric('PageLoad', 1234);

// Get breadcrumbs
const last20 = breadcrumbTracker.getLastBreadcrumbs(20);
const beforeError = breadcrumbTracker.getBreadcrumbsBeforeError(errorTimestamp, 30);

// Filter breadcrumbs
const userActions = breadcrumbTracker.getBreadcrumbs({
  category: BreadcrumbCategory.UserAction,
  since: new Date(Date.now() - 3600000) // Last hour
});

// Export for debugging
const exported = breadcrumbTracker.exportBreadcrumbs();
```

---

## Error Recovery & Circuit Breakers

### Overview

Automatic error recovery with multiple strategies and circuit breaker pattern for failing services.

### Recovery Strategies

1. **Retry**: Retry failed operations with exponential backoff
2. **Fallback**: Use alternative implementation when primary fails
3. **Circuit Breaker**: Prevent cascading failures by stopping requests to failing services
4. **Automatic Rollback**: Rollback changes when operations fail
5. **User Guided Recovery**: Provide step-by-step recovery instructions

### Usage

```typescript
import {
  errorRecoveryManager,
  withRecovery,
  RecoveryStrategy,
  getCircuitBreaker
} from './lib/error-recovery';

// Automatic retry
const result = await withRecovery(
  async () => await fetchData(),
  {
    strategy: RecoveryStrategy.Retry,
    maxAttempts: 3
  }
);

// Fallback strategy
const data = await withRecovery(
  async () => await fetchFromPrimary(),
  {
    strategy: RecoveryStrategy.Fallback,
    fallbackFn: async () => await fetchFromCache()
  }
);

// Circuit breaker
const cb = getCircuitBreaker('payment-service', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000
});

const payment = await cb.execute(async () => {
  return await processPayment(data);
});

// Check circuit breaker state
const cbState = cb.getState(); // 'closed', 'open', or 'half_open'
const stats = cb.getStats();

// Reset circuit breaker manually
cb.reset();

// Get all circuit breaker states
const allStates = errorRecoveryManager.getAllCircuitBreakerStates();

// Get recovery statistics
const recoveryStats = errorRecoveryManager.getRecoveryStats();
console.log(`Success rate: ${recoveryStats.successRate}%`);
```

### Circuit Breaker States

- **Closed**: Normal operation, requests pass through
- **Open**: Service is failing, requests are blocked
- **Half-Open**: Testing if service has recovered

---

## Error Debugger & Reproduction

### Overview

Captures complete error context including application state, network requests, and environment for easy reproduction.

### Features

- **Error Snapshots**: Complete application state at error time
- **Network Capture**: All HTTP requests with headers and payloads
- **Console Capture**: All console logs, warnings, and errors
- **Performance Metrics**: Page load times, memory usage, web vitals
- **Environment Info**: Browser, device, screen resolution, timezone
- **Reproduction Steps**: Auto-generated steps to reproduce errors

### Usage

```typescript
import { errorDebugger } from './lib/error-debugger';

// Set up state capture (once during app initialization)
errorDebugger.setStateCapture(() => {
  return {
    user: getCurrentUser(),
    route: getCurrentRoute(),
    formData: getFormData(),
    // Add any relevant app state
  };
});

// Capture error snapshot (automatic via enhanced logger)
const error = new Error('Something went wrong');
const snapshot = errorDebugger.captureErrorSnapshot(error, {
  userId: user.id,
  organizationId: org.id
});

// View snapshot
const retrievedSnapshot = errorDebugger.getSnapshot(snapshot.id);
console.log(retrievedSnapshot.breadcrumbs);
console.log(retrievedSnapshot.networkRequests);
console.log(retrievedSnapshot.applicationState);
console.log(retrievedSnapshot.performanceMetrics);

// Generate reproduction steps
const steps = errorDebugger.generateReproductionSteps(snapshot.id);
steps.forEach(step => console.log(step));

// Get debug summary
const summary = errorDebugger.getDebugSummary(snapshot.id);
console.log(`User actions: ${summary.userActions}`);
console.log(`Failed API calls: ${summary.failedApiCalls}`);
console.log(`Performance issues: ${summary.performanceIssues}`);

// Export snapshot for sharing
const exported = errorDebugger.exportSnapshot(snapshot.id);
// Share with team or attach to bug report

// Import snapshot for analysis
errorDebugger.importSnapshot(exportedData);
```

---

## Enhanced Error Logging

### Overview

Unified error logging that integrates all error management components.

### Features

- Automatic fingerprinting
- Breadcrumb capture
- Debug snapshot creation
- Admin notifications
- Recovery attempt tracking

### Usage

```typescript
import { logEnhancedError, logErrorWithRecovery } from './lib/enhanced-error-logger';

// Basic enhanced logging
try {
  await riskyOperation();
} catch (error) {
  await logEnhancedError(error, {
    userId: user.id,
    organizationId: org.id,
    url: window.location.href
  }, {
    captureSnapshot: true,
    captureBreadcrumbs: true,
    notifyAdmins: true
  });
}

// Log with recovery information
try {
  const result = await withRecovery(
    async () => await operation(),
    { strategy: RecoveryStrategy.Retry }
  );
} catch (error) {
  await logErrorWithRecovery(error, true, false, context);
}

// Get analytics
const analytics = await enhancedErrorLogger.getErrorAnalytics(orgId, 24);
console.log(analytics.trends);
console.log(analytics.topErrors);
console.log(analytics.recoveryStats);
```

---

## Error Dashboard

### Overview

Real-time dashboard for monitoring errors, analytics, and system health.

### Features

- Real-time error statistics
- Error trends over time
- Severity distribution
- Top errors by impact
- Circuit breaker status
- Recovery statistics

### Usage

```tsx
import { ErrorDashboard } from './components/ErrorDashboard';

function MonitoringPage() {
  return (
    <div>
      <h1>System Monitoring</h1>
      <ErrorDashboard />
    </div>
  );
}
```

### Dashboard Sections

1. **Statistics Cards**: Total errors, critical errors, resolved, affected users
2. **Trends Chart**: Hourly error counts with visualization
3. **Severity Distribution**: Breakdown by error severity
4. **Top Errors**: Most impactful errors with details
5. **Circuit Breakers**: Status of all circuit breakers
6. **Recovery Stats**: Success rate and attempts by strategy

---

## Database Schema

### Tables

#### error_fingerprints
Groups similar errors for pattern detection

```sql
- id (text, PK): Unique fingerprint ID
- organization_id (uuid): Organization reference
- error_code (text): Error type code
- normalized_message (text): Normalized error message
- stack_hash (text): Hash of stack trace
- component_path (text): Component/file where error occurred
- occurrence_count (int): Number of occurrences
- affected_user_count (int): Number of unique users affected
- severity_score (numeric): Calculated severity (0-10)
- status (text): active, investigating, resolved, ignored
- assigned_to (uuid): User assigned to fix
- resolved_at (timestamptz): Resolution timestamp
```

#### error_breadcrumbs
User action trail leading to errors

```sql
- id (uuid, PK): Breadcrumb ID
- error_log_id (uuid): Reference to error log
- organization_id (uuid): Organization reference
- user_id (uuid): User reference
- category (text): Breadcrumb type
- level (text): debug, info, warning, error
- message (text): Breadcrumb message
- data (jsonb): Additional context
- timestamp (timestamptz): When it occurred
- sequence_number (int): Order in sequence
```

#### error_recovery_attempts
Tracks recovery attempts

```sql
- id (uuid, PK): Recovery attempt ID
- error_log_id (uuid): Reference to error
- organization_id (uuid): Organization reference
- strategy (text): Recovery strategy used
- success (boolean): Whether recovery succeeded
- duration_ms (int): How long recovery took
- circuit_breaker_name (text): CB name if applicable
- circuit_breaker_state (text): CB state
```

#### error_alerts
Notification rules and delivery

```sql
- id (uuid, PK): Alert ID
- organization_id (uuid): Organization reference
- name (text): Alert name
- enabled (boolean): Whether alert is active
- error_code (text): Error code to match
- severity_threshold (text): Minimum severity
- notification_channels (text[]): email, webhook, slack
- recipient_emails (text[]): Email recipients
- webhook_url (text): Webhook endpoint
```

#### error_resolutions
Documents error fixes

```sql
- id (uuid, PK): Resolution ID
- error_fingerprint_id (text): Reference to fingerprint
- organization_id (uuid): Organization reference
- title (text): Resolution title
- description (text): What was fixed
- resolution_type (text): fix, workaround, documentation
- commit_sha (text): Git commit
- effectiveness_score (numeric): How effective the fix was
```

### Functions

- `calculate_error_severity_score()`: Calculates dynamic severity
- `upsert_error_fingerprint()`: Creates or updates fingerprint
- `get_error_trends()`: Analyzes error trends over time

---

## Integration Guide

### Step 1: Initialize Error System

```typescript
// In your main app file (main.tsx or App.tsx)
import { errorDebugger } from './lib/error-debugger';
import { breadcrumbTracker } from './lib/error-breadcrumbs';

// Initialize debugger with state capture
errorDebugger.setStateCapture(() => ({
  route: window.location.pathname,
  user: store.getState().user,
  // Add your app state here
}));

// Breadcrumbs are automatically initialized
```

### Step 2: Wrap Critical Operations

```typescript
import { withRecovery, RecoveryStrategy } from './lib/error-recovery';
import { logEnhancedError } from './lib/enhanced-error-logger';

async function criticalOperation() {
  try {
    return await withRecovery(
      async () => {
        // Your operation
        return await api.fetchData();
      },
      {
        strategy: RecoveryStrategy.Retry,
        maxAttempts: 3,
        fallbackFn: async () => {
          // Fallback if retry fails
          return getCachedData();
        }
      }
    );
  } catch (error) {
    await logEnhancedError(error, {}, {
      captureSnapshot: true,
      notifyAdmins: error.severity === 'critical'
    });
    throw error;
  }
}
```

### Step 3: Add Breadcrumbs to User Actions

```typescript
import { breadcrumbTracker } from './lib/error-breadcrumbs';

function SubmitButton() {
  const handleClick = async () => {
    breadcrumbTracker.recordUserAction('Click', 'Submit Button');

    try {
      const response = await api.submit(data);
      breadcrumbTracker.recordApiCall('POST', '/api/submit', response.status);
    } catch (error) {
      // Error will be logged with breadcrumbs
      throw error;
    }
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

### Step 4: Set Up Circuit Breakers

```typescript
import { getCircuitBreaker } from './lib/error-recovery';

// Create circuit breaker for external service
const paymentCB = getCircuitBreaker('stripe-api', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000
});

async function processPayment(amount: number) {
  return await paymentCB.execute(async () => {
    return await stripe.charges.create({ amount });
  });
}
```

### Step 5: Add Dashboard to Admin Panel

```tsx
import { ErrorDashboard } from './components/ErrorDashboard';

function AdminPanel() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <ErrorDashboard />
    </div>
  );
}
```

---

## Best Practices

### 1. Always Capture Context

```typescript
// Good - provides context
logEnhancedError(error, {
  userId: user.id,
  organizationId: org.id,
  action: 'warranty_creation',
  additionalData: { warrantyId, customerId }
});

// Bad - no context
logEnhancedError(error);
```

### 2. Use Appropriate Recovery Strategies

```typescript
// For temporary failures - use Retry
withRecovery(operation, { strategy: RecoveryStrategy.Retry });

// For critical services - use Circuit Breaker
withRecovery(operation, { strategy: RecoveryStrategy.CircuitBreaker });

// For optional features - use Fallback
withRecovery(operation, {
  strategy: RecoveryStrategy.Fallback,
  fallbackFn: () => defaultValue
});
```

### 3. Record Meaningful Breadcrumbs

```typescript
// Good - descriptive
breadcrumbTracker.recordUserAction('Submit warranty form', 'Create Warranty Button', {
  warrantyType: 'basic',
  duration: '12months'
});

// Bad - vague
breadcrumbTracker.recordUserAction('Click', 'Button');
```

### 4. Configure Alerts Appropriately

```typescript
// Create alert for critical errors only
await supabase.from('error_alerts').insert({
  name: 'Critical Database Errors',
  error_code: 'DATABASE_ERROR',
  severity_threshold: 'critical',
  notification_channels: ['email', 'webhook'],
  recipient_emails: ['dev-team@company.com'],
});
```

### 5. Review Error Dashboard Regularly

- Check daily for new error patterns
- Monitor circuit breaker states
- Review recovery success rates
- Investigate high-severity errors immediately

### 6. Use Error Fingerprints for Prioritization

```typescript
const topErrors = errorFingerprintGenerator.getMostFrequentFingerprints(10);

// Fix errors affecting most users first
topErrors
  .sort((a, b) => b.metadata.affectedUsers.size - a.metadata.affectedUsers.size)
  .forEach(error => {
    console.log(`Priority: ${error.normalizedMessage}`);
    console.log(`Affected users: ${error.metadata.affectedUsers.size}`);
  });
```

### 7. Document Resolutions

```typescript
// After fixing an error, document it
await supabase.from('error_resolutions').insert({
  error_fingerprint_id: fingerprintId,
  title: 'Fixed database timeout',
  description: 'Added connection pooling and optimized queries',
  resolution_type: 'fix',
  commit_sha: 'abc123',
  resolved_by: userId
});
```

---

## Testing

Run the comprehensive test suite:

```bash
npm run test
```

Test coverage includes:
- Error fingerprinting accuracy
- Breadcrumb tracking completeness
- Recovery strategy effectiveness
- Circuit breaker state transitions
- Error debugger snapshot capture
- Database schema integrity

---

## Troubleshooting

### Breadcrumbs Not Appearing

- Ensure breadcrumb tracker is initialized
- Check that breadcrumbs are being recorded before errors occur
- Verify breadcrumb limit hasn't been exceeded

### Circuit Breaker Not Opening

- Check failure threshold configuration
- Verify errors are being thrown correctly
- Review circuit breaker state with `cb.getStats()`

### Snapshots Missing Data

- Ensure state capture function is set
- Verify network capture is initialized
- Check localStorage isn't full

### Alerts Not Firing

- Verify alert is enabled
- Check severity threshold matches error severity
- Confirm notification channels are configured
- Review alert trigger count

---

## Performance Considerations

The error management system is designed for minimal performance impact:

- **Breadcrumbs**: O(1) insertion, capped at 100 items
- **Fingerprinting**: Lightweight hashing, < 1ms
- **Network Capture**: Async, non-blocking
- **Database Writes**: Batched and queued
- **Memory Usage**: Auto-cleanup of old data

### Recommended Limits

- Max breadcrumbs: 100
- Max snapshots in memory: 50
- Max network requests tracked: 100
- Max console entries: 200
- Database log retention: 90 days

---

## Security

### PII Protection

The system automatically redacts sensitive information:
- Email addresses → `<EMAIL>`
- UUIDs → `<UUID>`
- Timestamps → `<TIMESTAMP>`
- Long strings → Truncated to 100 chars

### Access Control

All database tables use Row Level Security (RLS):
- Users can only see errors from their organization
- Admin roles required for alert management
- Resolution tracking requires authentication

### Data Encryption

- Error snapshots stored encrypted
- Sensitive context data sanitized
- Network payloads stripped of auth tokens

---

## Conclusion

This enhanced error management system provides enterprise-grade error tracking, debugging, and recovery capabilities. By following this guide, you can:

1. Identify and group similar errors automatically
2. Understand exactly how errors occurred with breadcrumbs
3. Automatically recover from transient failures
4. Debug errors with complete context capture
5. Monitor system health in real-time
6. Prevent cascading failures with circuit breakers

For additional support or questions, refer to the inline code documentation or test files for usage examples.
