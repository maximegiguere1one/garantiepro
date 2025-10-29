# 🔧 READY-TO-USE SECURITY FIXES

Copy-paste these code snippets to quickly implement critical security improvements.

---

## 1️⃣ SAFE LOGGER (Replace all console.log)

**Create:** `src/lib/safe-logger.ts`

```typescript
/**
 * Safe Logger - Prevents sensitive data exposure in production
 *
 * Usage:
 *   import { safeLog } from './lib/safe-logger';
 *   safeLog.debug('User data:', user);
 *   safeLog.sensitive('API Key:', apiKey); // Never logs in production
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

class SafeLogger {
  debug(...args: any[]) {
    if (IS_DEVELOPMENT) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: any[]) {
    if (IS_DEVELOPMENT) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]) {
    console.warn('[WARN]', ...args);
  }

  error(...args: any[]) {
    console.error('[ERROR]', ...args);
  }

  // For sensitive data - NEVER logs in production
  sensitive(...args: any[]) {
    if (IS_DEVELOPMENT) {
      console.log('[SENSITIVE]', ...args);
    }
  }

  // For performance timing
  time(label: string) {
    if (IS_DEVELOPMENT) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (IS_DEVELOPMENT) {
      console.timeEnd(label);
    }
  }
}

export const safeLog = new SafeLogger();
```

**Replace in all files:**
```typescript
// BEFORE
console.log('Token data:', tokenData);
console.log('User profile:', profile);

// AFTER
import { safeLog } from '../lib/safe-logger';

safeLog.sensitive('Token data:', tokenData);
safeLog.debug('User profile loaded');
```

---

## 2️⃣ RATE LIMITER

**Create:** `src/lib/rate-limiter.ts`

```typescript
/**
 * Rate Limiter - Prevents abuse and DoS attacks
 *
 * Usage:
 *   const limiter = new RateLimiter(10, 60000); // 10 requests per minute
 *   if (!limiter.check(userId)) {
 *     throw new Error('Rate limit exceeded');
 *   }
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private requests = new Map<string, RateLimitRecord>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    // Reset window if expired
    if (!record || now > record.resetAt) {
      const newRecord = { count: 1, resetAt: now + this.windowMs };
      this.requests.set(identifier, newRecord);
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: newRecord.resetAt
      };
    }

    // Check if limit exceeded
    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt
      };
    }

    // Increment count
    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetAt: record.resetAt
    };
  }

  reset(identifier: string) {
    this.requests.delete(identifier);
  }

  // Cleanup old records (call periodically)
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetAt) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiters
export const tokenValidationLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 per 15min
export const passwordResetLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 per hour
export const apiRequestLimiter = new RateLimiter(100, 60 * 1000); // 100 per minute

// Cleanup old records every 5 minutes
setInterval(() => {
  tokenValidationLimiter.cleanup();
  passwordResetLimiter.cleanup();
  apiRequestLimiter.cleanup();
}, 5 * 60 * 1000);
```

**Use in components:**
```typescript
import { tokenValidationLimiter } from '../lib/rate-limiter';

const validateToken = async () => {
  const clientIP = 'user-ip-or-fingerprint'; // Get from context
  const { allowed, remaining, resetAt } = tokenValidationLimiter.check(clientIP);

  if (!allowed) {
    const waitMinutes = Math.ceil((resetAt - Date.now()) / 60000);
    setError(`Too many attempts. Please wait ${waitMinutes} minutes.`);
    return;
  }

  // Continue with validation...
}
```

---

## 3️⃣ SESSION TIMEOUT (Inactivity)

**Add to:** `src/contexts/AuthContext.tsx`

```typescript
// Add after imports
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Add inside AuthProvider component
useEffect(() => {
  let lastActivityTime = Date.now();
  let checkInterval: NodeJS.Timeout;

  const handleActivity = () => {
    lastActivityTime = Date.now();
  };

  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Check inactivity every minute
  checkInterval = setInterval(() => {
    const inactiveTime = Date.now() - lastActivityTime;

    if (inactiveTime > INACTIVITY_TIMEOUT && user) {
      signOut();
      alert('Your session has expired due to inactivity. Please sign in again.');
    }
  }, 60000); // Check every minute

  return () => {
    events.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
    clearInterval(checkInterval);
  };
}, [user, signOut]);
```

---

## 4️⃣ EDGE FUNCTION AUTH GUARD

**Add to ALL edge functions:**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Verify user authentication and authorization
 * Returns user profile or throws error
 */
async function verifyAuth(req: Request, requiredRoles: string[] = []) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('INVALID_TOKEN');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  // Check role if required
  if (requiredRoles.length > 0 && !requiredRoles.includes(profile.role)) {
    throw new Error('FORBIDDEN');
  }

  return { user, profile, supabase };
}

// USE IN YOUR FUNCTION:
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify auth - REQUIRED for all protected endpoints
    const { user, profile, supabase } = await verifyAuth(req, ['admin', 'master']);

    // Your function logic here...
    const { data } = await req.json();

    // Process request...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    let status = 500;
    if (message === 'UNAUTHORIZED' || message === 'INVALID_TOKEN') status = 401;
    if (message === 'FORBIDDEN') status = 403;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 5️⃣ FILE UPLOAD VALIDATOR

**Create:** `src/lib/file-validator.ts`

```typescript
/**
 * Secure file upload validation
 */

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 15;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: images, PDFs, videos`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Maximum: 10MB`
    };
  }

  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeExt = file.type.split('/')[1];

  // jpg/jpeg special case
  const validExt = ext === mimeExt ||
                   (ext === 'jpg' && mimeExt === 'jpeg') ||
                   (ext === 'jpeg' && mimeExt === 'jpeg');

  if (!validExt) {
    return {
      valid: false,
      error: 'File extension does not match file type'
    };
  }

  // Check filename for suspicious patterns
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename'
    };
  }

  return { valid: true };
}

export function validateFiles(files: File[]): FileValidationResult {
  if (files.length > MAX_FILES) {
    return {
      valid: false,
      error: `Too many files. Maximum: ${MAX_FILES}`
    };
  }

  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}
```

**Use in components:**
```typescript
import { validateFiles } from '../lib/file-validator';

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;

  const newFiles = Array.from(e.target.files);
  const validation = validateFiles([...files, ...newFiles]);

  if (!validation.valid) {
    setError(validation.error!);
    return;
  }

  setFiles([...files, ...newFiles]);
  setError('');
};
```

---

## 6️⃣ INPUT SANITIZER

**Create:** `src/lib/input-sanitizer.ts`

```typescript
/**
 * Input sanitization utilities
 */

export function sanitizeString(input: string, maxLength: number = 500): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, maxLength);
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().substring(0, 254);
}

export function sanitizePhone(phone: string): string {
  // Keep only digits, spaces, +, -, (, )
  return phone.replace(/[^\d\s+\-()]/g, '').substring(0, 20);
}

export function sanitizeURL(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url.substring(0, 2000);
  } catch {
    return '';
  }
}

export function sanitizeNumber(input: string | number): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

// For use in PDFs and documents
export function sanitizeForPDF(text: string): string {
  return sanitizeString(text, 1000)
    .replace(/[\r\n\t]/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}
```

---

## 7️⃣ ERROR BOUNDARY

**Create:** `src/components/common/ErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error boundary caught:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">
                Something went wrong
              </h2>
            </div>

            <p className="text-slate-600 mb-4">
              We're sorry, but something unexpected happened.
              Please try refreshing the page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto mb-4">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap critical components:**
```typescript
// In App.tsx or layout components
import { ErrorBoundary } from './components/common/ErrorBoundary';

<ErrorBoundary>
  <WarrantiesList />
</ErrorBoundary>

<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

---

## 8️⃣ QUERY TIMEOUT WRAPPER

**Add to:** `src/lib/supabase-safe-query.ts`

```typescript
/**
 * Execute query with timeout protection
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 30000,
  operationName: string = 'Query'
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

// Usage example:
const warranties = await queryWithTimeout(
  () => supabase.from('warranties').select('*').limit(100),
  10000, // 10 second timeout
  'Warranty query'
);
```

---

## 9️⃣ EMAIL VALIDATION

**Add to:** `src/lib/form-validation.ts`

```typescript
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (!EMAIL_REGEX.test(email)) return false;
  if (email.length > 254) return false; // RFC 5321 max

  const [local, domain] = email.split('@');
  if (local.length > 64) return false; // RFC 5321 local-part max
  if (!domain || domain.length === 0) return false;

  return true;
}

export function isValidPhone(phone: string): boolean {
  // Supports: +1 234-567-8900, (234) 567-8900, 234.567.8900, etc.
  const phoneRegex = /^[\d\s+\-().]{10,20}$/;
  return phoneRegex.test(phone);
}
```

---

## 🔟 PRODUCTION BUILD SCRIPT

**Add to:** `package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "build:production": "NODE_ENV=production vite build && npm run security-check",
    "security-check": "npm audit --audit-level=moderate && npm run typecheck",
    "audit:fix": "npm audit fix"
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Day 1 - Critical Fixes
- [ ] Replace all `console.log` with `safeLog`
- [ ] Add auth verification to all edge functions
- [ ] Deploy health-check endpoint
- [ ] Test health check: `curl https://your-project.supabase.co/functions/v1/health-check`

### Day 2 - Rate Limiting
- [ ] Implement RateLimiter class
- [ ] Add rate limiting to token validation
- [ ] Add rate limiting to password reset
- [ ] Test rate limits work

### Day 3 - Input Validation
- [ ] Add file upload validation
- [ ] Add input sanitization
- [ ] Add email/phone validation
- [ ] Test with malicious inputs

### Day 4 - Session Management
- [ ] Add inactivity timeout
- [ ] Test session expires after 15min
- [ ] Add session renewal UI

### Day 5 - Error Handling
- [ ] Add ErrorBoundary components
- [ ] Add query timeouts
- [ ] Test error recovery

---

## 🧪 TESTING COMMANDS

```bash
# Check for security issues
npm audit

# Type checking
npm run typecheck

# Run all tests
npm test

# Build for production
npm run build:production

# Test health check endpoint
curl https://your-project.supabase.co/functions/v1/health-check | jq

# Test rate limiting (should fail after 5 attempts)
for i in {1..10}; do
  curl -X POST https://your-app.com/api/validate-token
done
```

---

## 📞 SUPPORT

If you encounter issues implementing these fixes:
1. Check the full SECURITY_AUDIT_REPORT.md for context
2. Review the OWASP Top 10: https://owasp.org/www-project-top-ten/
3. Test in development first before deploying to production

---

**Remember:** Security is a continuous process, not a one-time fix! 🔒
