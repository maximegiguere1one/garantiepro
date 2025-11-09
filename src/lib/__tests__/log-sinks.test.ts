/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendRemote, pushLocal, getLocalLogs, clearLocalLogs } from '../log-sinks';
import * as envDetection from '../environment-detection';

describe('log-sinks', () => {
  beforeEach(() => {
    clearLocalLogs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).__DISABLE_REMOTE_LOGS__;
  });

  it('should skip remote logging in WebContainer environment', async () => {
    vi.spyOn(envDetection, 'getEnvironmentType').mockReturnValue('webcontainer');
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await sendRemote({
      level: 'info',
      message: 'test message',
    });

    expect(result.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should skip remote logging in Bolt environment', async () => {
    vi.spyOn(envDetection, 'getEnvironmentType').mockReturnValue('bolt');
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await sendRemote({
      level: 'info',
      message: 'test message',
    });

    expect(result.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should skip remote logging when __DISABLE_REMOTE_LOGS__ is set', async () => {
    vi.spyOn(envDetection, 'getEnvironmentType').mockReturnValue('production');
    (window as any).__DISABLE_REMOTE_LOGS__ = true;
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await sendRemote({
      level: 'info',
      message: 'test message',
    });

    expect(result.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should send remote logs in production environment', async () => {
    vi.spyOn(envDetection, 'getEnvironmentType').mockReturnValue('production');
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 201 })
    );

    const result = await sendRemote({
      level: 'error',
      message: 'production error',
    });

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/error_logs'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should always store logs locally', async () => {
    vi.spyOn(envDetection, 'getEnvironmentType').mockReturnValue('webcontainer');

    await sendRemote({
      level: 'warn',
      message: 'test warning',
    });

    const logs = getLocalLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('test warning');
  });

  it('should maintain ring buffer max size', () => {
    for (let i = 0; i < 250; i++) {
      pushLocal({
        level: 'info',
        message: `message ${i}`,
      });
    }

    const logs = getLocalLogs();
    expect(logs.length).toBeLessThanOrEqual(200);
  });

  it('should handle fetch errors gracefully', async () => {
    vi.spyOn(envDetection, 'getEnvironmentType').mockReturnValue('production');
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await sendRemote({
      level: 'error',
      message: 'test error',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
