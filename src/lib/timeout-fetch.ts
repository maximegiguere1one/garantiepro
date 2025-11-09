export type TimeoutConfig = {
  sessionTimeout: number;
  profileTimeout: number;
  defaultTimeout?: number;
};

function mergeSignals(signalA?: AbortSignal, signalB?: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const forward = (s?: AbortSignal) => {
    if (!s) return;
    if (s.aborted) controller.abort();
    else s.addEventListener('abort', () => controller.abort());
  };

  forward(signalA);
  forward(signalB);

  return controller.signal;
}

export function createTimeoutFetch(config: TimeoutConfig) {
  const { sessionTimeout, profileTimeout, defaultTimeout = Math.max(sessionTimeout, profileTimeout) } = config;
  const nativeFetch = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : fetch;

  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const lower = url.toLowerCase();
    let timeoutMs = defaultTimeout;

    if (lower.includes('/auth/v1') || lower.includes('/oauth/')) {
      timeoutMs = sessionTimeout;
    } else if (lower.includes('/rest/v1') || lower.includes('/rpc/')) {
      timeoutMs = profileTimeout;
    }

    const timeoutController = new AbortController();
    const compositeSignal = mergeSignals(init?.signal, timeoutController.signal);

    const timeoutId = setTimeout(() => {
      timeoutController.abort();
      console.warn(`[timeout-fetch] Aborting request ${url} after ${timeoutMs}ms`);
    }, timeoutMs);

    try {
      const response = await nativeFetch(input, { ...(init || {}), signal: compositeSignal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
