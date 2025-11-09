/**
 * E2E Smoke Tests for Auth Flow
 *
 * These tests verify the complete authentication flow works end-to-end:
 * - Login with valid credentials
 * - Session persistence
 * - Profile loading
 * - Organization context
 * - Logout
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Unregister any existing service worker
    await page.goto('/');
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.getRegistrations().then(registrations => {
          return Promise.all(
            registrations.map(registration => registration.unregister())
          );
        });
      }
    });
  });

  test('should login successfully and load profile', async ({ page }) => {
    await page.goto('/');

    // Wait for login form
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Fill in credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Click login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (or profile page)
    await page.waitForURL(/\/(dashboard|profile)/);

    // Verify user is logged in
    const userEmail = await page.textContent('[data-testid="user-email"]');
    expect(userEmail).toContain('test@example.com');
  });

  test('should handle login timeout gracefully', async ({ page, context }) => {
    // Set very slow network to trigger timeout
    await context.route('**/**/auth/v1/token', route => {
      setTimeout(() => route.abort(), 20000); // Longer than timeout
    });

    await page.goto('/');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Should show timeout error
    await expect(page.locator('text=/timeout|délai/i')).toBeVisible({ timeout: 20000 });
  });

  test('should not block auth requests with Service Worker', async ({ page }) => {
    // Register service worker
    await page.goto('/');
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.register('/service-worker.js');
      }
    });

    // Wait for SW to be active
    await page.waitForTimeout(1000);

    // Attempt login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Monitor network requests
    const authRequest = page.waitForRequest(req =>
      req.url().includes('/auth/v1/token')
    );

    await page.click('button[type="submit"]');

    // Verify auth request was made
    const request = await authRequest;
    expect(request.url()).toContain('/auth/v1/token');

    // Verify response (should not be blocked)
    const response = await request.response();
    expect(response?.status()).toBeLessThan(400);
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|profile)/);

    // Reload page
    await page.reload();

    // Should still be logged in (no redirect to login)
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|profile)/);

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await page.waitForURL(/\/login/);

    // Should see login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should handle concurrent login attempts gracefully', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Click login button multiple times rapidly
    await Promise.all([
      page.click('button[type="submit"]'),
      page.click('button[type="submit"]'),
      page.click('button[type="submit"]'),
    ]);

    // Should only make one auth request
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Sign in skipped')) {
        consoleLogs.push(msg.text());
      }
    });

    // Should see "Sign in skipped" messages
    await page.waitForTimeout(1000);
    expect(consoleLogs.length).toBeGreaterThan(0);
  });
});

test.describe('Demo Mode', () => {
  test('should not make remote log calls in demo mode', async ({ page }) => {
    // Mock WebContainer user agent
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 WebContainer',
      });
    });

    const requests: string[] = [];
    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto('/');

    // Trigger an error to test logging
    await page.evaluate(() => {
      console.error('Test error for demo mode');
    });

    await page.waitForTimeout(2000);

    // Should NOT call error_logs endpoint
    const errorLogRequests = requests.filter(url =>
      url.includes('/rest/v1/error_logs')
    );
    expect(errorLogRequests.length).toBe(0);
  });
});

test.describe('Service Worker Bypass', () => {
  test('should log Supabase bypass messages', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Register service worker
    await page.goto('/');
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.register('/service-worker.js');
      }
    });

    await page.waitForTimeout(1000);

    // Make a request that should be bypassed
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Should see bypass log
    const bypassLogs = consoleLogs.filter(log =>
      log.includes('Bypassing Supabase request')
    );
    expect(bypassLogs.length).toBeGreaterThan(0);
  });
});
