import { describe, it, expect } from 'vitest';
import { 
  ErrorSeverity,
  ErrorCode,
  AppError,
  NetworkError,
  ValidationError
} from '../lib/error-types';
import { ErrorFingerprint } from '../lib/error-fingerprint';
import { BreadcrumbTracker } from '../lib/error-breadcrumbs';

describe('Error System', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        ErrorSeverity.HIGH,
        { field: 'email' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context).toEqual({ field: 'email' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Fingerprinting', () => {
    it('should generate consistent fingerprints', () => {
      const error1 = new Error('Test error');
      error1.stack = 'Error: Test\n  at someFunction (file.js:10:5)';
      
      const fp1 = ErrorFingerprint.generate(error1);
      
      const error2 = new Error('Test error');
      error2.stack = 'Error: Test\n  at someFunction (file.js:10:5)';
      
      const fp2 = ErrorFingerprint.generate(error2);

      expect(fp1).toBe(fp2);
    });
  });

  describe('Breadcrumb Tracker', () => {
    it('should add and retrieve breadcrumbs', () => {
      const tracker = new BreadcrumbTracker(10);
      
      tracker.add({
        type: 'navigation',
        message: 'User navigated to /dashboard',
        level: 'info',
        timestamp: Date.now()
      });

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0].message).toBe('User navigated to /dashboard');
    });

    it('should limit breadcrumb count', () => {
      const tracker = new BreadcrumbTracker(3);
      
      for (let i = 0; i < 5; i++) {
        tracker.add({
          type: 'user',
          message: `Action ${i}`,
          level: 'info',
          timestamp: Date.now()
        });
      }

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(3);
    });
  });
});
