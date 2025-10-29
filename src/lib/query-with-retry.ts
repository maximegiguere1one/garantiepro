/**
 * Query with Automatic Retry Logic - 10x Reliability
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Circuit breaker pattern
 * - Network status awareness
 * - Request cancellation
 * - Error classification (retryable vs fatal)
 */

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'PGRST301', // JWT expired
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'NetworkError',
    '57014' // statement_timeout (already handled but good to retry)
  ]
};

class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('[CircuitBreaker] Moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('[CircuitBreaker] Circuit closed');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.warn('[CircuitBreaker] Circuit opened due to failures');
    }
  }

  getState(): string {
    return this.state;
  }
}

const circuitBreaker = new CircuitBreaker();

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  const errorCode = error.code || error.error_code || '';

  return config.retryableErrors.some(
    retryable =>
      errorMessage.includes(retryable) ||
      errorCode.includes(retryable)
  );
}

/**
 * Calculate delay for next retry with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute query with automatic retry logic
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Use circuit breaker to prevent cascading failures
      const result = await circuitBreaker.execute(queryFn);

      if (attempt > 0) {
        console.log(`[Retry SUCCESS] Query succeeded on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, config)) {
        console.log('[Retry SKIP] Error is not retryable:', error.message);
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);
      console.log(`[Retry ${attempt + 1}/${config.maxRetries}] Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error('[Retry FAILED] All retry attempts exhausted');
  throw lastError;
}

/**
 * Create an abortable query with timeout
 */
export function createAbortableQuery<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 30000
): {
  execute: () => Promise<T>;
  abort: () => void;
} {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout;

  return {
    execute: async () => {
      // Set timeout
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const result = await queryFn(controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Query timeout after ${timeoutMs}ms`);
        }
        throw error;
      }
    },
    abort: () => {
      clearTimeout(timeoutId);
      controller.abort();
    }
  };
}

/**
 * Batch multiple queries and execute them concurrently with retry
 */
export async function batchQueryWithRetry<T>(
  queries: Array<() => Promise<T>>,
  config?: Partial<RetryConfig>
): Promise<T[]> {
  const results = await Promise.allSettled(
    queries.map(queryFn => queryWithRetry(queryFn, config))
  );

  const successful: T[] = [];
  const failed: any[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({
        index,
        error: result.reason
      });
    }
  });

  if (failed.length > 0) {
    console.warn(`[Batch Query] ${failed.length} queries failed:`, failed);
  }

  return successful;
}

/**
 * Monitor network status and queue queries when offline
 */
class OfflineQueue {
  private queue: Array<() => Promise<any>> = [];
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      console.log('[Network] Back online, processing queue...');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[Network] Offline detected');
      this.isOnline = false;
    });
  }

  async execute<T>(queryFn: () => Promise<T>): Promise<T> {
    if (this.isOnline) {
      return queryWithRetry(queryFn);
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await queryWithRetry(queryFn);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }

  private async processQueue(): Promise<void> {
    const queries = [...this.queue];
    this.queue = [];

    for (const query of queries) {
      try {
        await query();
      } catch (error) {
        console.error('[OfflineQueue] Failed to process queued query:', error);
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(): string {
  return circuitBreaker.getState();
}
