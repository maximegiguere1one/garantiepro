/**
 * Numeric utilities for safe number operations
 * Prevents errors when working with potentially undefined, null, or NaN values
 */

/**
 * Safely converts a value to a number with a default fallback
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  return num;
}

/**
 * Safely formats a number with toFixed, handling undefined/null values
 */
export function safeToFixed(value: any, decimals: number = 2, defaultValue: number = 0): string {
  const num = safeNumber(value, defaultValue);
  return num.toFixed(decimals);
}

/**
 * Safely adds two numbers, handling undefined/null values
 */
export function safeAdd(a: any, b: any, defaultA: number = 0, defaultB: number = 0): number {
  const numA = safeNumber(a, defaultA);
  const numB = safeNumber(b, defaultB);
  return numA + numB;
}

/**
 * Safely multiplies two numbers, handling undefined/null values
 */
export function safeMultiply(a: any, b: any, defaultA: number = 0, defaultB: number = 0): number {
  const numA = safeNumber(a, defaultA);
  const numB = safeNumber(b, defaultB);
  return numA * numB;
}

/**
 * Safely divides two numbers, handling undefined/null/zero values
 */
export function safeDivide(a: any, b: any, defaultResult: number = 0): number {
  const numA = safeNumber(a, 0);
  const numB = safeNumber(b, 1);

  if (numB === 0) {
    return defaultResult;
  }

  return numA / numB;
}

/**
 * Safely formats a number for locale display
 */
export function safeLocaleString(
  value: any,
  locale: string = 'fr-CA',
  options?: Intl.NumberFormatOptions,
  defaultValue: number = 0
): string {
  const num = safeNumber(value, defaultValue);
  return num.toLocaleString(locale, options);
}

/**
 * Validates that a value is a valid positive number
 */
export function isValidPositiveNumber(value: any): boolean {
  const num = safeNumber(value, -1);
  return num >= 0;
}

/**
 * Validates that a value is a valid non-negative number
 */
export function isValidNumber(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return !isNaN(num) && isFinite(num);
}

/**
 * Interface for warranty numeric fields validation
 */
export interface WarrantyNumericFields {
  base_price: any;
  options_price: any;
  taxes: any;
  total_price: any;
  margin?: any;
  deductible: any;
  duration_months?: any;
  start_date?: string;
  end_date?: string;
}

/**
 * Interface for normalized warranty numeric fields
 */
export interface NormalizedWarrantyNumbers {
  base_price: number;
  options_price: number;
  taxes: number;
  total_price: number;
  margin: number;
  deductible: number;
}

/**
 * Validates warranty numeric fields and returns detailed errors
 */
export function validateWarrantyNumericFields(data: WarrantyNumericFields): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidNumber(data.base_price)) {
    errors.push('base_price is not a valid number');
  } else if (safeNumber(data.base_price, 0) <= 0) {
    warnings.push('base_price is zero or negative');
  }

  if (!isValidNumber(data.options_price)) {
    errors.push('options_price is not a valid number');
  } else if (safeNumber(data.options_price, 0) < 0) {
    warnings.push('options_price is negative');
  }

  if (!isValidNumber(data.taxes)) {
    errors.push('taxes is not a valid number');
  } else if (safeNumber(data.taxes, 0) < 0) {
    warnings.push('taxes is negative');
  }

  if (!isValidNumber(data.total_price)) {
    errors.push('total_price is not a valid number');
  } else if (safeNumber(data.total_price, 0) <= 0) {
    warnings.push('total_price is zero or negative');
  }

  if (data.margin !== undefined && !isValidNumber(data.margin)) {
    errors.push('margin is not a valid number');
  }

  if (!isValidNumber(data.deductible)) {
    errors.push('deductible is not a valid number');
  } else if (safeNumber(data.deductible, 0) < 0) {
    warnings.push('deductible is negative');
  }

  // CRITIQUE: Valider la cohérence entre duration_months et les dates
  if (data.duration_months !== undefined && data.start_date && data.end_date) {
    const durationMonths = safeNumber(data.duration_months, 0);

    if (!isValidNumber(data.duration_months)) {
      errors.push('duration_months is not a valid number');
    } else if (durationMonths !== 72) {
      warnings.push(`duration_months devrait être 72 pour PPR (actuellement: ${durationMonths})`);
    }

    // Valider que les dates sont valides
    try {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (isNaN(startDate.getTime())) {
        errors.push('start_date is not a valid date');
      }
      if (isNaN(endDate.getTime())) {
        errors.push('end_date is not a valid date');
      }

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        if (endDate <= startDate) {
          errors.push('end_date must be after start_date');
        }

        // Calculer la différence en mois (approximatif)
        const monthsDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

        // Tolérance de ±1 mois pour tenir compte des différences de calcul
        if (Math.abs(monthsDiff - durationMonths) > 1) {
          warnings.push(
            `duration_months (${durationMonths}) ne correspond pas aux dates (différence calculée: ${monthsDiff} mois)`
          );
        }
      }
    } catch (error) {
      errors.push('Invalid date format in start_date or end_date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Normalizes warranty numeric fields to ensure safe values
 * Returns a new object with all numeric fields guaranteed to be valid numbers
 */
export function normalizeWarrantyNumbers(data: Partial<WarrantyNumericFields>): NormalizedWarrantyNumbers {
  console.log('[numeric-utils] Normalizing warranty numbers:', {
    base_price: data.base_price,
    options_price: data.options_price,
    taxes: data.taxes,
    total_price: data.total_price,
    margin: data.margin,
    deductible: data.deductible,
  });

  const normalized: NormalizedWarrantyNumbers = {
    base_price: safeNumber(data.base_price, 0),
    options_price: safeNumber(data.options_price, 0),
    taxes: safeNumber(data.taxes, 0),
    total_price: safeNumber(data.total_price, 0),
    margin: safeNumber(data.margin, 0),
    deductible: safeNumber(data.deductible, 0),
  };

  console.log('[numeric-utils] Normalized values:', normalized);

  return normalized;
}

/**
 * Calculates subtotal safely
 */
export function calculateSubtotal(base_price: any, options_price: any): number {
  return safeAdd(base_price, options_price, 0, 0);
}

/**
 * Formats currency with symbol
 */
export function formatCurrency(value: any, symbol: string = '$', defaultValue: number = 0): string {
  const num = safeNumber(value, defaultValue);
  return `${num.toFixed(2)} ${symbol}`;
}

/**
 * Formats currency for Canadian locale
 */
export function formatCADCurrency(value: any, defaultValue: number = 0): string {
  const num = safeNumber(value, defaultValue);
  return `${num.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/**
 * Rounds a number to specified decimal places
 */
export function safeRound(value: any, decimals: number = 2, defaultValue: number = 0): number {
  const num = safeNumber(value, defaultValue);
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Ensures a number is within a range
 */
export function clamp(value: any, min: number, max: number, defaultValue?: number): number {
  const def = defaultValue !== undefined ? defaultValue : min;
  const num = safeNumber(value, def);
  return Math.max(min, Math.min(max, num));
}
