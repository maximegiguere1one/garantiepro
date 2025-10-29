import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorFingerprintGenerator } from '../lib/error-fingerprint';
import { breadcrumbTracker, BreadcrumbCategory, BreadcrumbLevel } from '../lib/error-breadcrumbs';
import { errorRecoveryManager, RecoveryStrategy } from '../lib/error-recovery';
import { errorDebugger } from '../lib/error-debugger';
import { NetworkError, ValidationError, ErrorCode, ErrorSeverity } from '../lib/error-types';

describe('Error Fingerprinting System', () => {
  beforeEach(() => {
    errorFingerprintGenerator.getAllFingerprints().forEach(fp => {
      errorFingerprintGenerator['fingerprintCache'].delete(fp.id);
    });
  });

  it('should generate consistent fingerprints for similar errors', () => {
    const error1 = new Error('Database connection failed at 10:30');
    const error2 = new Error('Database connection failed at 11:45');

    const fp1 = errorFingerprintGenerator.generateFingerprint(error1);
    const fp2 = errorFingerprintGenerator.generateFingerprint(error2);

    expect(fp1).toBe(fp2);
  });

  it('should generate different fingerprints for different errors', () => {
    const error1 = new Error('Network timeout');
    const error2 = new Error('Database error');

    const fp1 = errorFingerprintGenerator.generateFingerprint(error1);
    const fp2 = errorFingerprintGenerator.generateFingerprint(error2);

    expect(fp1).not.toBe(fp2);
  });

  it('should track occurrence count', () => {
    const error = new Error('Test error');

    const fp1 = errorFingerprintGenerator.generateFingerprint(error);
    const fp2 = errorFingerprintGenerator.generateFingerprint(error);
    const fp3 = errorFingerprintGenerator.generateFingerprint(error);

    const fingerprint = errorFingerprintGenerator.getFingerprint(fp1);
    expect(fingerprint?.metadata.occurrenceCount).toBe(3);
  });

  it('should track affected users', () => {
    const error = new Error('Test error');

    errorFingerprintGenerator.generateFingerprint(error, { userId: 'user1' });
    errorFingerprintGenerator.generateFingerprint(error, { userId: 'user2' });
    errorFingerprintGenerator.generateFingerprint(error, { userId: 'user1' });

    const fp = errorFingerprintGenerator.generateFingerprint(error);
    const fingerprint = errorFingerprintGenerator.getFingerprint(fp);

    expect(fingerprint?.metadata.affectedUsers.size).toBe(2);
  });

  it('should normalize error messages correctly', () => {
    const error1 = new Error('Failed to fetch user 12345');
    const error2 = new Error('Failed to fetch user 67890');

    const fp1 = errorFingerprintGenerator.generateFingerprint(error1);
    const fp2 = errorFingerprintGenerator.generateFingerprint(error2);

    expect(fp1).toBe(fp2);
  });

  it('should get most frequent fingerprints', () => {
    const error1 = new Error('Error A');
    const error2 = new Error('Error B');

    for (let i = 0; i < 5; i++) {
      errorFingerprintGenerator.generateFingerprint(error1);
    }
    for (let i = 0; i < 3; i++) {
      errorFingerprintGenerator.generateFingerprint(error2);
    }

    const topErrors = errorFingerprintGenerator.getMostFrequentFingerprints(2);
    expect(topErrors[0].metadata.occurrenceCount).toBe(5);
    expect(topErrors[1].metadata.occurrenceCount).toBe(3);
  });
});

describe('Breadcrumb Tracking System', () => {
  beforeEach(() => {
    breadcrumbTracker.clear();
  });

  it('should record user actions', () => {
    breadcrumbTracker.recordUserAction('Click', 'Submit Button');

    const breadcrumbs = breadcrumbTracker.getLastBreadcrumbs(10);
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].category).toBe(BreadcrumbCategory.UserAction);
    expect(breadcrumbs[0].message).toContain('Submit Button');
  });

  it('should record navigation events', () => {
    breadcrumbTracker.recordNavigation('/home', '/profile');

    const breadcrumbs = breadcrumbTracker.getLastBreadcrumbs(10);
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].category).toBe(BreadcrumbCategory.Navigation);
  });

  it('should record API calls', () => {
    breadcrumbTracker.recordApiCall('GET', '/api/users', 200, 150);

    const breadcrumbs = breadcrumbTracker.getLastBreadcrumbs(10);
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].category).toBe(BreadcrumbCategory.ApiCall);
    expect(breadcrumbs[0].data?.status).toBe(200);
  });

  it('should limit breadcrumb count', () => {
    for (let i = 0; i < 150; i++) {
      breadcrumbTracker.recordUserAction(`Action ${i}`);
    }

    const breadcrumbs = breadcrumbTracker.getAllFingerprints();
    expect(breadcrumbs.length).toBeLessThanOrEqual(100);
  });

  it('should filter breadcrumbs by category', () => {
    breadcrumbTracker.recordUserAction('Click');
    breadcrumbTracker.recordNavigation('/home', '/about');
    breadcrumbTracker.recordApiCall('GET', '/api/data', 200);

    const userActions = breadcrumbTracker.getBreadcrumbs({
      category: BreadcrumbCategory.UserAction,
    });

    expect(userActions).toHaveLength(1);
    expect(userActions[0].category).toBe(BreadcrumbCategory.UserAction);
  });

  it('should filter breadcrumbs by level', () => {
    breadcrumbTracker.addBreadcrumb({
      category: BreadcrumbCategory.ConsoleLog,
      level: BreadcrumbLevel.Error,
      message: 'Error occurred',
    });

    breadcrumbTracker.addBreadcrumb({
      category: BreadcrumbCategory.ConsoleLog,
      level: BreadcrumbLevel.Info,
      message: 'Info message',
    });

    const errors = breadcrumbTracker.getBreadcrumbs({
      level: BreadcrumbLevel.Error,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].level).toBe(BreadcrumbLevel.Error);
  });

  it('should get breadcrumbs before error', () => {
    for (let i = 0; i < 50; i++) {
      breadcrumbTracker.recordUserAction(`Action ${i}`);
    }

    const errorTime = new Date().toISOString();
    const beforeError = breadcrumbTracker.getBreadcrumbsBeforeError(errorTime, 20);

    expect(beforeError.length).toBeLessThanOrEqual(20);
  });
});

describe('Error Recovery System', () => {
  beforeEach(() => {
    errorRecoveryManager['recoveryHistory'] = [];
    errorRecoveryManager.resetAllCircuitBreakers();
  });

  it('should retry failed operations', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    };

    const error = new NetworkError('Network error');
    const result = await errorRecoveryManager.attemptRecovery(operation, error, {
      strategy: RecoveryStrategy.Retry,
      maxAttempts: 3,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should use fallback on failure', async () => {
    const operation = async () => {
      throw new Error('Operation failed');
    };

    const fallback = async () => 'fallback result';

    const error = new NetworkError('Network error');
    const result = await errorRecoveryManager.attemptRecovery(operation, error, {
      strategy: RecoveryStrategy.Fallback,
      fallbackFn: fallback,
    });

    expect(result).toBe('fallback result');
  });

  it('should track recovery history', async () => {
    const operation = async () => 'success';
    const error = new NetworkError('Network error');

    await errorRecoveryManager.attemptRecovery(operation, error, {
      strategy: RecoveryStrategy.Retry,
    });

    const history = errorRecoveryManager.getRecoveryHistory();
    expect(history).toHaveLength(1);
    expect(history[0].success).toBe(true);
  });

  it('should calculate recovery success rate', async () => {
    const successOp = async () => 'success';
    const failOp = async () => {
      throw new Error('Failed');
    };

    const error = new NetworkError('Network error');

    await errorRecoveryManager.attemptRecovery(successOp, error, {
      strategy: RecoveryStrategy.Retry,
    });

    try {
      await errorRecoveryManager.attemptRecovery(failOp, error, {
        strategy: RecoveryStrategy.Retry,
        maxAttempts: 1,
      });
    } catch {}

    const stats = errorRecoveryManager.getRecoveryStats();
    expect(stats.total).toBe(2);
    expect(stats.successful).toBe(1);
    expect(stats.successRate).toBe(50);
  });
});

describe('Circuit Breaker', () => {
  it('should open circuit after threshold failures', async () => {
    const cb = errorRecoveryManager.getCircuitBreaker('test-service', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 5000,
    });

    const failingOp = async () => {
      throw new Error('Service unavailable');
    };

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(failingOp);
      } catch {}
    }

    expect(cb.getState()).toBe('open');
  });

  it('should transition to half-open after reset timeout', async () => {
    const cb = errorRecoveryManager.getCircuitBreaker('test-service-2', {
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 100,
    });

    const failingOp = async () => {
      throw new Error('Failure');
    };

    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(failingOp);
      } catch {}
    }

    expect(cb.getState()).toBe('open');

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      await cb.execute(async () => 'success');
    } catch {}

    expect(cb.getState()).toBe('half_open');
  });

  it('should close circuit after successful recoveries', async () => {
    const cb = errorRecoveryManager.getCircuitBreaker('test-service-3', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 100,
    });

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Fail');
        });
      } catch {}
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    for (let i = 0; i < 2; i++) {
      await cb.execute(async () => 'success');
    }

    expect(cb.getState()).toBe('closed');
  });
});

describe('Error Debugger', () => {
  beforeEach(() => {
    errorDebugger.clearSnapshots();
  });

  it('should capture error snapshots', () => {
    const error = new Error('Test error');
    const snapshot = errorDebugger.captureErrorSnapshot(error);

    expect(snapshot.error.message).toBe('Test error');
    expect(snapshot.breadcrumbs).toBeDefined();
    expect(snapshot.environmentInfo).toBeDefined();
  });

  it('should include breadcrumbs in snapshot', () => {
    breadcrumbTracker.recordUserAction('Click button');
    breadcrumbTracker.recordApiCall('GET', '/api/data', 200);

    const error = new Error('Test error');
    const snapshot = errorDebugger.captureErrorSnapshot(error);

    expect(snapshot.breadcrumbs.length).toBeGreaterThan(0);
  });

  it('should capture performance metrics', () => {
    const error = new Error('Test error');
    const snapshot = errorDebugger.captureErrorSnapshot(error);

    expect(snapshot.performanceMetrics).toBeDefined();
  });

  it('should generate reproduction steps', () => {
    breadcrumbTracker.recordUserAction('Navigate to page');
    breadcrumbTracker.recordUserAction('Click submit');
    breadcrumbTracker.recordApiCall('POST', '/api/submit', 500);

    const error = new Error('Submission failed');
    const snapshot = errorDebugger.captureErrorSnapshot(error);

    const steps = errorDebugger.generateReproductionSteps(snapshot.id);

    expect(steps).toBeDefined();
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.some(step => step.includes('User Actions'))).toBe(true);
  });

  it('should export and import snapshots', () => {
    const error = new Error('Test error');
    const snapshot = errorDebugger.captureErrorSnapshot(error);

    const exported = errorDebugger.exportSnapshot(snapshot.id);
    expect(exported).toBeDefined();

    errorDebugger.clearSnapshots();
    expect(errorDebugger.getAllSnapshots()).toHaveLength(0);

    const imported = errorDebugger.importSnapshot(exported);
    expect(imported).toBe(true);
    expect(errorDebugger.getAllSnapshots()).toHaveLength(1);
  });

  it('should get debug summary', () => {
    breadcrumbTracker.recordUserAction('Action 1');
    breadcrumbTracker.recordApiCall('GET', '/api/fail', 500);

    const error = new Error('Test error');
    const snapshot = errorDebugger.captureErrorSnapshot(error);

    const summary = errorDebugger.getDebugSummary(snapshot.id);

    expect(summary.errorMessage).toBe('Test error');
    expect(summary.userActions).toBeGreaterThanOrEqual(0);
    expect(summary.failedApiCalls).toBeGreaterThanOrEqual(0);
  });
});
