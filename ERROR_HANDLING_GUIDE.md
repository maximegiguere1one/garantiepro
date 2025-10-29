# Error Handling Guide

This guide provides comprehensive documentation on the error handling strategy implemented in the warranty management application.

## Table of Contents

1. [Overview](#overview)
2. [Error Types](#error-types)
3. [Error Logging](#error-logging)
4. [Error Boundaries](#error-boundaries)
5. [API Client with Retry Logic](#api-client-with-retry-logic)
6. [Network Status Detection](#network-status-detection)
7. [Offline Support](#offline-support)
8. [Form Validation](#form-validation)
9. [User-Friendly Error Messages](#user-friendly-error-messages)
10. [Common Error Scenarios](#common-error-scenarios)
11. [Best Practices](#best-practices)

---

## Overview

The application implements a comprehensive error handling strategy that includes:

- **Typed error system** with custom error classes
- **Automatic error logging** to Supabase database
- **Error boundaries** for graceful UI degradation
- **Retry logic** with exponential backoff
- **Offline support** with request queuing
- **User-friendly error messages** in French and English
- **Form validation** with real-time feedback
- **Network status detection** and indicators

## Error Types

### Base Error Classes

Located in `src/lib/error-types.ts`:

```typescript
import { NetworkError, TimeoutError, ValidationError, AuthError } from './lib/error-types';
```

**Available Error Types:**

- `NetworkError` - Network connectivity issues
- `TimeoutError` - Request timeout
- `ValidationError` - Form/data validation failures
- `AuthError` - Authentication failures
- `PermissionError` - Authorization failures
- `DatabaseError` - Database operation failures
- `IntegrationError` - External service integration failures
- `PaymentError` - Payment processing errors
- `RateLimitError` - API rate limiting
- `FileUploadError` - File upload failures

### Creating Custom Errors

```typescript
import { BaseAppError, ErrorCode, ErrorSeverity, createErrorContext } from './lib/error-types';

throw new NetworkError(
  'Failed to fetch data',
  originalError,
  createErrorContext({ userId: user.id })
);
```

## Error Logging

### Automatic Error Logging

The error logger automatically captures errors to the Supabase database:

```typescript
import { logError } from './lib/error-logger';

try {
  await someOperation();
} catch (error) {
  logError(error, { userId: user.id, additionalContext: 'custom data' });
  throw error;
}
```

### Error Log Structure

Errors are stored in the `error_logs` table:

- `error_code` - Standardized error code
- `error_message` - Technical error message
- `user_message` - User-friendly message
- `severity` - low, medium, high, critical
- `user_id` - User who encountered the error
- `organization_id` - Organization context
- `stack_trace` - Full stack trace
- `context` - Additional JSON context

### Retrieving Error Logs

```typescript
import { getErrorLogs, getErrorStatistics } from './lib/error-logger';

// Get recent errors
const errors = await getErrorLogs(50);

// Get error statistics
const stats = await getErrorStatistics();
console.log(stats.bySeverity, stats.byCode);
```

## Error Boundaries

Error boundaries catch React component errors and prevent full app crashes.

### App-Level Error Boundary

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary level="app">
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Page-Level Error Boundary

```typescript
<ErrorBoundary level="page">
  <YourPage />
</ErrorBoundary>
```

### Component-Level Error Boundary

```typescript
<ErrorBoundary level="component">
  <RiskyComponent />
</ErrorBoundary>
```

### Custom Error Fallback

```typescript
<ErrorBoundary
  fallback={(error, errorInfo, reset) => (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

### HOC Pattern

```typescript
import { withErrorBoundary } from './components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent, { level: 'component' });
```

## API Client with Retry Logic

The API client provides automatic retry with exponential backoff.

### Using Safe Query

```typescript
import { safeQuery } from './lib/api-client';
import { supabase } from './lib/supabase';

try {
  const warranties = await safeQuery(
    () => supabase.from('warranties').select('*'),
    {
      timeout: 10000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
      },
    }
  );
} catch (error) {
  // Handle error - already logged and typed
}
```

### Using Safe Mutate

```typescript
import { safeMutate } from './lib/api-client';

try {
  await safeMutate(
    () => supabase.from('warranties').insert(warrantyData),
    { timeout: 15000 }
  );
} catch (error) {
  // Handle error
}
```

### Invoking Edge Functions

```typescript
import { safeInvokeFunction } from './lib/api-client';

try {
  const result = await safeInvokeFunction('send-email', {
    to: 'user@example.com',
    subject: 'Test',
    body: 'Content',
  });
} catch (error) {
  // Handle error
}
```

### Request Deduplication

```typescript
import { deduplicateRequest } from './lib/api-client';

// Multiple calls with same key will only execute once
const data = await deduplicateRequest('warranties-list', async () => {
  return safeQuery(() => supabase.from('warranties').select('*'));
});
```

### Batch Requests

```typescript
import { batchRequests } from './lib/api-client';

const operations = [
  () => safeQuery(() => supabase.from('warranties').select('*')),
  () => safeQuery(() => supabase.from('customers').select('*')),
  () => safeQuery(() => supabase.from('claims').select('*')),
];

const results = await batchRequests(operations, { concurrency: 3 });
```

## Network Status Detection

### Using Network Status Hook

```typescript
import { useNetworkStatus, useOnlineStatus } from './lib/network-status';

function MyComponent() {
  const networkStatus = useNetworkStatus();
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      {networkStatus.effectiveType === 'slow-2g' && <p>Slow connection detected</p>}
    </div>
  );
}
```

### Network Status Indicator

```typescript
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';

function App() {
  return (
    <>
      <NetworkStatusIndicator />
      <YourApp />
    </>
  );
}
```

## Offline Support

### Adding to Offline Queue

```typescript
import { addToOfflineQueue } from './lib/network-status';

const handleSubmit = async () => {
  if (!navigator.onLine) {
    addToOfflineQueue(
      async () => {
        return safeMutate(() => supabase.from('warranties').insert(data));
      },
      { type: 'warranty_creation', formData: data }
    );
    toast.info('Operation queued', 'Will sync when online');
    return;
  }

  // Normal online operation
};
```

### Using Offline Queue Hook

```typescript
import { useOfflineQueue } from './lib/network-status';

function MyComponent() {
  const { queueLength, queue, addToQueue, clearQueue } = useOfflineQueue();

  return (
    <div>
      <p>Pending operations: {queueLength}</p>
      {queue.map((item) => (
        <div key={item.id}>{item.metadata?.type}</div>
      ))}
    </div>
  );
}
```

### Service Worker

The service worker provides offline caching:

- Static assets are cached during installation
- Network-first strategy for API calls
- Cache-first strategy for static resources
- Offline fallback for unavailable resources

## Form Validation

### Creating a Validation Schema

```typescript
import { FormValidator, ValidationRules, createFormSchema } from './lib/form-validation';

const schema = createFormSchema({
  email: {
    required: true,
    rules: [ValidationRules.email('fr')],
  },
  phone: {
    required: true,
    rules: [ValidationRules.phone('fr')],
  },
  vin: {
    required: true,
    rules: [ValidationRules.vin('fr')],
  },
  purchasePrice: {
    required: true,
    rules: [
      ValidationRules.min(0, 'fr'),
      ValidationRules.max(1000000, 'fr'),
    ],
  },
});
```

### Using the Validator

```typescript
const validator = new FormValidator(schema, 'fr');

const handleSubmit = async (formData) => {
  const result = await validator.validate(formData);

  if (!result.valid) {
    setErrors(result.errors);
    return;
  }

  // Proceed with submission
};
```

### Real-time Field Validation

```typescript
const handleFieldChange = (fieldName: string, value: any) => {
  const error = validator.validateField(fieldName, value, formData);
  if (error) {
    setErrors({ ...errors, [fieldName]: error });
  } else {
    const { [fieldName]: _, ...rest } = errors;
    setErrors(rest);
  }
};
```

### Available Validation Rules

- `ValidationRules.required(language)`
- `ValidationRules.email(language)`
- `ValidationRules.phone(language)`
- `ValidationRules.postalCode(language)`
- `ValidationRules.vin(language)`
- `ValidationRules.minLength(min, language)`
- `ValidationRules.maxLength(max, language)`
- `ValidationRules.min(min, language)`
- `ValidationRules.max(max, language)`
- `ValidationRules.pattern(regex, language)`
- `ValidationRules.date(language)`
- `ValidationRules.futureDate(language)`
- `ValidationRules.pastDate(language)`
- `ValidationRules.custom(validateFn, message)`

### Async Validation

```typescript
const schema = createFormSchema({
  email: {
    required: true,
    rules: [ValidationRules.email('fr')],
    asyncValidation: async (email) => {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      return !data; // Returns true if email is unique
    },
  },
});
```

## User-Friendly Error Messages

### Getting Error Messages

```typescript
import { getErrorMessage, getValidationMessage } from './lib/error-messages';

// Get error message by code
const errorMessage = getErrorMessage(ErrorCode.NETWORK_ERROR, 'fr');
console.log(errorMessage.title); // "Erreur de connexion"
console.log(errorMessage.message); // "Impossible de se connecter..."
console.log(errorMessage.action); // "Vérifier votre connexion..."

// Get validation message
const validationMessage = getValidationMessage('email', 'fr');
console.log(validationMessage); // "Adresse email invalide"
```

### Integration-Specific Messages

```typescript
import { getIntegrationErrorMessage } from './lib/error-messages';

const message = getIntegrationErrorMessage('quickbooks', 'fr');
console.log(message.title); // "Erreur QuickBooks"
console.log(message.helpUrl); // "/settings?tab=integrations"
```

## Common Error Scenarios

### Network Failures

```typescript
try {
  const data = await safeQuery(() => supabase.from('warranties').select('*'));
} catch (error) {
  if (error instanceof NetworkError) {
    toast.error('Connexion perdue', error.userMessage);
    // Automatically retried 3 times before throwing
  }
}
```

### API Errors

```typescript
try {
  await safeMutate(() => supabase.from('warranties').insert(data));
} catch (error) {
  if (error instanceof DatabaseError) {
    if (error.message.includes('unique constraint')) {
      toast.error('Doublon', 'Ce numéro de contrat existe déjà');
    } else {
      toast.error('Erreur', error.userMessage);
    }
  }
}
```

### Validation Failures

```typescript
const result = await validator.validate(formData);

if (!result.valid) {
  toast.error('Erreur de validation', 'Veuillez corriger les erreurs');
  setFieldErrors(result.errors);
  return;
}
```

### Authentication Errors

```typescript
try {
  await supabase.auth.signInWithPassword({ email, password });
} catch (error) {
  if (error.message.includes('Invalid login credentials')) {
    toast.error('Authentification échouée', 'Email ou mot de passe incorrect');
  } else {
    toast.error('Erreur', 'Impossible de se connecter');
  }
}
```

### Integration Errors

```typescript
try {
  await syncInvoiceToQuickBooks(invoiceId);
} catch (error) {
  if (error instanceof IntegrationError) {
    toast.error(
      `Erreur ${error.integrationName}`,
      error.userMessage,
      { helpUrl: error.helpUrl }
    );
  }
}
```

## Best Practices

### 1. Always Use Type-Safe Error Handling

```typescript
// Good
try {
  await operation();
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  }
}

// Avoid
try {
  await operation();
} catch (error: any) {
  console.log(error.message); // No type safety
}
```

### 2. Log All Errors

```typescript
try {
  await operation();
} catch (error) {
  logError(error, { userId: user.id, context: 'warranty_creation' });
  throw error; // Re-throw if needed
}
```

### 3. Provide User-Friendly Messages

```typescript
// Good
toast.error('Connexion perdue', 'Vérifiez votre connexion internet');

// Avoid
toast.error('Error', 'Network request failed: ECONNREFUSED');
```

### 4. Use Appropriate Error Boundaries

```typescript
// App-level for critical errors
<ErrorBoundary level="app">
  <App />
</ErrorBoundary>

// Component-level for isolated features
<ErrorBoundary level="component">
  <OptionalFeature />
</ErrorBoundary>
```

### 5. Handle Offline Scenarios

```typescript
if (!navigator.onLine) {
  addToOfflineQueue(() => operation());
  toast.info('Opération mise en file', 'Sera synchronisée en ligne');
  return;
}

await operation();
```

### 6. Validate Early

```typescript
// Validate on blur for better UX
<input
  onBlur={(e) => {
    const error = validator.validateField('email', e.target.value);
    if (error) setFieldError('email', error);
  }}
/>
```

### 7. Use Retry Logic for Transient Failures

```typescript
// Automatic retry for network errors
await safeQuery(() => supabase.from('data').select('*'), {
  retryConfig: { maxRetries: 3, exponentialBackoff: true },
});
```

### 8. Monitor Error Patterns

```typescript
// Regularly check error statistics
const stats = await getErrorStatistics();
if (stats.byCode['NETWORK_ERROR'] > 100) {
  // Alert ops team
}
```

### 9. Provide Recovery Actions

```typescript
<ErrorBoundary
  fallback={(error, errorInfo, reset) => (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Réessayer</button>
      <button onClick={goHome}>Retour à l'accueil</button>
    </div>
  )}
>
  <Component />
</ErrorBoundary>
```

### 10. Document Integration-Specific Errors

When working with external services, document common error scenarios:

```typescript
// QuickBooks common errors
// - 401: Token expired, need to re-authenticate
// - 429: Rate limited, wait before retry
// - 400: Invalid request, check data format
```

---

## Testing Error Handling

See `src/examples/error-handling-examples.tsx` for interactive examples of:

- Network error handling with retry
- Form validation with real-time feedback
- Offline support with operation queuing
- Error boundary behavior
- User-friendly error messages

---

## Troubleshooting

### Errors Not Logging

Check that:
1. User is authenticated (error logs require user context)
2. `error_logs` table has correct RLS policies
3. Error logger is imported and used correctly

### Retry Not Working

Verify:
1. Error is retryable (check `error.retryable` flag)
2. Error code is in `retryableErrors` list
3. Max retries hasn't been exceeded

### Offline Queue Not Syncing

Check:
1. Network status is online
2. Service worker is registered
3. Operations in queue are valid
4. No console errors from queue processing

---

For more examples, see:
- `src/examples/error-handling-examples.tsx` - Interactive examples
- `src/lib/error-types.ts` - Error type definitions
- `src/lib/api-client.ts` - API client implementation
- `src/components/ErrorBoundary.tsx` - Error boundary component
