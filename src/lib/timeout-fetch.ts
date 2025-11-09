/**
 * timeout-fetch.ts
 *
 * Provides a fetch wrapper with AbortController-based timeout management.
 * This ensures that network requests are properly cancelled (not just raced)
 * when they exceed their timeout duration.
 *
 * Key features:
 * - Uses AbortController for proper request cancellation
 * - Merges user-provided abort signals with timeout signal
 * - Different timeouts for auth vs data endpoints
 * - Clean cleanup with clearTimeout
 */

export type TimeoutConfig = {
  sessionTimeout: number;
  profileTimeout: number;
  defaultTimeout?: number;
};

/**
 * Merges multiple AbortSignals into a single signal.
 * If any of the input signals abort, the merged signal will abort.
 */
function mergeSignals(signalA?: AbortSignal, signalB?: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const forward = (s?: AbortSignal) => {
    if (!s) return;
    if (s.aborted) {
      controller.abort();
    } else {
      s.addEventListener('abort', () => controller.abort(), { once: true });
    }
  };

  forward(signalA);
  forward(signalB);

  return controller.signal;
}

/**
 * Creates a timeout-aware fetch function.
 *
 * @param config - Configuration with timeout values for different endpoint types
 * @returns A fetch-compatible function with automatic timeout handling
 *
 * @example
 * ```typescript
 * const timeoutFetch = createTimeoutFetch({
 *   sessionTimeout: 15000,
 *   profileTimeout: 20000,
 * });
 *
 * // This will timeout after 15000ms if it's an auth endpoint
 * const response = await timeoutFetch('https://xxx.supabase.co/auth/v1/token', {
 *   method: 'POST',
 *   body: '...'
 * });
 * ```
 */
export function createTimeoutFetch(config: TimeoutConfig) {
  const {
    sessionTimeout,
    profileTimeout,
    defaultTimeout = Math.max(sessionTimeout, profileTimeout)
  } = config;

  // Capture native fetch to avoid circular references
  const nativeFetch = (typeof window !== 'undefined' && window.fetch)
    ? window.fetch.bind(window)
    : fetch;

  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    // Determine URL string from input
    const url = typeof input === 'string' ? input : (input as Request).url;
    const lower = (url || '').toLowerCase();

    // Select appropriate timeout based on endpoint type
    let timeoutMs = defaultTimeout;
    if (lower.includes('/auth/v1') || lower.includes('/oauth/')) {
      timeoutMs = sessionTimeout;
    } else if (lower.includes('/rest/v1') || lower.includes('/rpc/')) {
      timeoutMs = profileTimeout;
    }

    // Create timeout controller
    const timeoutController = new AbortController();

    // Merge user's signal (if any) with our timeout signal
    const compositeSignal = mergeSignals(init?.signal, timeoutController.signal);

    // Set timeout to abort the request
    const timeoutId = setTimeout(() => {
      console.warn(`[timeout-fetch] Aborted ${url} after ${timeoutMs}ms`);
      timeoutController.abort();
    }, timeoutMs);

    const startTime = Date.now();
    console.log(`[timeout-fetch] Starting request to ${url} (timeout: ${timeoutMs}ms)`);

    try {
      // Execute fetch with merged abort signal
      const response = await nativeFetch(input, { ...(init || {}), signal: compositeSignal });
      const elapsed = Date.now() - startTime;
      console.log(`[timeout-fetch] ✓ Response received in ${elapsed}ms (status: ${response.status})`);
      return response;
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`[timeout-fetch] ✗ Request failed after ${elapsed}ms:`, error.message);
      throw error;
    } finally {
      // Always clear timeout to prevent memory leaks
      clearTimeout(timeoutId);
    }
  };
}
