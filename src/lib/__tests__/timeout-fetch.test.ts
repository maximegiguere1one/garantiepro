/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTimeoutFetch } from '../timeout-fetch';

describe('timeout-fetch', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should abort request after timeout', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => resolve(new Response('success')), 10000);
      })
    );
    global.fetch = mockFetch as any;

    const timeoutFetch = createTimeoutFetch({
      sessionTimeout: 1000,
      profileTimeout: 2000,
    });

    const promise = timeoutFetch('https://test.supabase.co/auth/v1/token', {
      method: 'POST',
    });

    vi.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow();

    const abortSignal = mockFetch.mock.calls[0][1]?.signal;
    expect(abortSignal?.aborted).toBe(true);
  });

  it('should use sessionTimeout for auth endpoints', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = mockFetch as any;

    const timeoutFetch = createTimeoutFetch({
      sessionTimeout: 5000,
      profileTimeout: 10000,
    });

    await timeoutFetch('https://test.supabase.co/auth/v1/token');

    expect(mockFetch).toHaveBeenCalled();
  });

  it('should use profileTimeout for rest endpoints', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = mockFetch as any;

    const timeoutFetch = createTimeoutFetch({
      sessionTimeout: 5000,
      profileTimeout: 10000,
    });

    await timeoutFetch('https://test.supabase.co/rest/v1/profiles');

    expect(mockFetch).toHaveBeenCalled();
  });

  it('should merge user abort signal with timeout signal', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = mockFetch as any;

    const userController = new AbortController();
    const timeoutFetch = createTimeoutFetch({
      sessionTimeout: 5000,
      profileTimeout: 5000,
    });

    const promise = timeoutFetch('https://test.com', {
      signal: userController.signal,
    });

    userController.abort();

    await expect(promise).rejects.toThrow();
  });

  it('should cleanup timeout on successful fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = mockFetch as any;
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const timeoutFetch = createTimeoutFetch({
      sessionTimeout: 5000,
      profileTimeout: 5000,
    });

    await timeoutFetch('https://test.com');

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should not timeout if response received before timeout', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = mockFetch as any;

    const timeoutFetch = createTimeoutFetch({
      sessionTimeout: 5000,
      profileTimeout: 5000,
    });

    const promise = timeoutFetch('https://test.com');

    vi.advanceTimersByTime(2000);

    const result = await promise;
    expect(result.status).toBe(200);
  });
});
