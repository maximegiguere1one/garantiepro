import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateVIN,
  validatePostalCode,
  validateRequired,
  validateNumber,
  validateDate,
} from '../../lib/form-validation';

describe('Form Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('test123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate Canadian phone numbers', () => {
      expect(validatePhone('514-555-1234')).toBe(true);
      expect(validatePhone('(514) 555-1234')).toBe(true);
      expect(validatePhone('5145551234')).toBe(true);
      expect(validatePhone('1-514-555-1234')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc-def-ghij')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validateVIN', () => {
    it('should validate correct VIN format', () => {
      expect(validateVIN('1HGBH41JXMN109186')).toBe(true);
      expect(validateVIN('WBADT43452G217058')).toBe(true);
    });

    it('should reject invalid VIN formats', () => {
      expect(validateVIN('12345')).toBe(false);
      expect(validateVIN('1234567890ABCDEF123')).toBe(false);
      expect(validateVIN('')).toBe(false);
    });
  });

  describe('validatePostalCode', () => {
    it('should validate Canadian postal codes', () => {
      expect(validatePostalCode('H1A 1A1')).toBe(true);
      expect(validatePostalCode('K2P 2M9')).toBe(true);
      expect(validatePostalCode('M5H2N2')).toBe(true);
    });

    it('should reject invalid postal codes', () => {
      expect(validatePostalCode('12345')).toBe(false);
      expect(validatePostalCode('ABC123')).toBe(false);
      expect(validatePostalCode('')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('123')).toBe(true);
      expect(validateRequired('  text  ')).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null as any)).toBe(false);
      expect(validateRequired(undefined as any)).toBe(false);
    });
  });

  describe('validateNumber', () => {
    it('should validate numbers', () => {
      expect(validateNumber(123, 0, 1000)).toBe(true);
      expect(validateNumber(0, 0, 100)).toBe(true);
      expect(validateNumber(99.99, 0, 100)).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(validateNumber(-1, 0, 100)).toBe(false);
      expect(validateNumber(101, 0, 100)).toBe(false);
      expect(validateNumber(NaN, 0, 100)).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate dates', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(validateDate(tomorrow.toISOString(), new Date())).toBe(true);
    });

    it('should reject invalid dates', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(validateDate(yesterday.toISOString(), new Date())).toBe(false);
      expect(validateDate('invalid-date', new Date())).toBe(false);
    });
  });
});
