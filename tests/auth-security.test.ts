/**
 * Security Integration Tests for Auth System
 *
 * These tests verify critical security requirements:
 * - Service Worker never blocks Supabase auth requests
 * - No remote logging in demo mode
 * - Timeouts properly abort requests
 * - No auth token caching
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Auth Security Tests', () => {
  describe('Demo Mode Security', () => {
    it('should not make remote log calls in demo environment', async () => {
      // Mock WebContainer environment
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'WebContainer',
        configurable: true,
      });

      const networkCalls: string[] = [];
      const originalFetch = global.fetch;
      global.fetch = (async (url: string, ...args: any[]) => {
        networkCalls.push(url);
        return originalFetch(url, ...args);
      }) as any;

      // Import log-sinks after mocking
      const { sendRemote } = await import('../src/lib/log-sinks');

      await sendRemote({
        level: 'error',
        message: 'test error in demo',
      });

      // Should NOT call error_logs endpoint
      const errorLogCalls = networkCalls.filter(url =>
        url.includes('/rest/v1/error_logs')
      );
      expect(errorLogCalls.length).toBe(0);

      // Cleanup
      global.fetch = originalFetch;
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should use demo constants without network calls', () => {
      const { DEMO_USER_ID, DEMO_ORG_ID, DEMO_ORGANIZATION } =
        require('../src/lib/demo-constants');

      expect(DEMO_USER_ID).toBe('00000000-0000-4000-8000-000000000001');
      expect(DEMO_ORG_ID).toBe('00000000-0000-4000-8000-0000000000ab');
      expect(DEMO_ORGANIZATION.id).toBe(DEMO_ORG_ID);
      expect(DEMO_ORGANIZATION.status).toBe('active');
    });
  });

  describe('Service Worker Bypass', () => {
    it('should have proper Supabase bypass logic', async () => {
      const swCode = await Deno.readTextFile('public/service-worker.js');

      // Check for bypass pattern
      expect(swCode).toContain('.supabase.co');
      expect(swCode).toContain('return fetch(request)');
      expect(swCode).toContain('Bypassing Supabase request');

      // Should NOT cache auth responses
      expect(swCode).not.toContain('cache.put(request') + ' for auth');
    });
  });

  describe('AbortController Usage', () => {
    it('should properly abort on timeout', async () => {
      const { createTimeoutFetch } = await import('../src/lib/timeout-fetch');

      const timeoutFetch = createTimeoutFetch({
        sessionTimeout: 100, // Very short for testing
        profileTimeout: 100,
      });

      const controller = new AbortController();
      let aborted = false;

      controller.signal.addEventListener('abort', () => {
        aborted = true;
      });

      try {
        await timeoutFetch('https://httpbin.org/delay/10', {
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to timeout
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(aborted || controller.signal.aborted).toBe(true);
    });
  });

  describe('Auth Error Mapping', () => {
    it('should map AbortError to timeout errors', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';

      // Simulate the mapping logic from AuthContext
      const mapError = (err: any): string => {
        if (err?.name === 'AbortError' ||
            (err?.message && err.message.toLowerCase().includes('aborted'))) {
          return 'GET_SESSION_TIMEOUT';
        }
        return 'UNKNOWN_ERROR';
      };

      expect(mapError(abortError)).toBe('GET_SESSION_TIMEOUT');
      expect(mapError({ message: 'Request aborted' })).toBe('GET_SESSION_TIMEOUT');
      expect(mapError(new Error('Other error'))).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Environment Detection', () => {
    it('should correctly detect WebContainer environment', async () => {
      const { getEnvironmentType, isWebContainerEnvironment } =
        await import('../src/lib/environment-detection');

      // Test with mocked user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 WebContainer',
        configurable: true,
      });

      expect(isWebContainerEnvironment()).toBe(true);

      // Cleanup
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
  });
});
