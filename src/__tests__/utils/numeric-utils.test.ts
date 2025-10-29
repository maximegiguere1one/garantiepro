import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  calculateTax,
  calculateTotal,
  roundToTwo,
} from '../../lib/numeric-utils';

describe('Numeric Utils', () => {
  describe('formatCurrency', () => {
    it('should format numbers as Canadian currency', () => {
      expect(formatCurrency(1000)).toBe('1 000,00 $');
      expect(formatCurrency(1234.56)).toBe('1 234,56 $');
      expect(formatCurrency(0)).toBe('0,00 $');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-500)).toBe('-500,00 $');
    });
  });

  describe('formatPercentage', () => {
    it('should format numbers as percentages', () => {
      expect(formatPercentage(0.05)).toBe('5 %');
      expect(formatPercentage(0.14975)).toBe('14,98 %');
      expect(formatPercentage(1)).toBe('100 %');
    });
  });

  describe('calculateTax', () => {
    it('should calculate TPS and TVQ for Quebec', () => {
      const tax = calculateTax(100, 'QC');
      expect(tax.tps).toBe(5);
      expect(tax.tvq).toBe(9.975);
      expect(tax.total).toBeCloseTo(14.975, 2);
    });

    it('should calculate HST for Ontario', () => {
      const tax = calculateTax(100, 'ON');
      expect(tax.hst).toBe(13);
      expect(tax.total).toBe(13);
    });

    it('should calculate GST for Alberta', () => {
      const tax = calculateTax(100, 'AB');
      expect(tax.gst).toBe(5);
      expect(tax.total).toBe(5);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total with taxes', () => {
      const total = calculateTotal(100, 'QC');
      expect(total).toBeCloseTo(114.975, 2);
    });

    it('should handle zero amount', () => {
      const total = calculateTotal(0, 'QC');
      expect(total).toBe(0);
    });
  });

  describe('roundToTwo', () => {
    it('should round to two decimal places', () => {
      expect(roundToTwo(1.234)).toBe(1.23);
      expect(roundToTwo(1.235)).toBe(1.24);
      expect(roundToTwo(1.999)).toBe(2.0);
    });

    it('should handle integers', () => {
      expect(roundToTwo(5)).toBe(5);
      expect(roundToTwo(0)).toBe(0);
    });
  });
});
