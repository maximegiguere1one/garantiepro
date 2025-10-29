/**
 * Input Validation Utilities
 * Provides validation helpers for form inputs with consistent error messages
 */

import { safeNumber } from './numeric-utils';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface NumberValidationOptions {
  min?: number;
  max?: number;
  required?: boolean;
  allowNegative?: boolean;
  allowDecimals?: boolean;
  integer?: boolean;
}

export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
}

/**
 * Validate a number input value
 */
export function validateNumber(
  value: any,
  options: NumberValidationOptions = {}
): ValidationResult {
  const {
    min,
    max,
    required = false,
    allowNegative = false,
    allowDecimals = true,
    integer = false,
  } = options;

  // Check if empty and required
  if ((value === '' || value === null || value === undefined) && required) {
    return { isValid: false, error: 'Ce champ est requis' };
  }

  // Allow empty if not required
  if (value === '' || value === null || value === undefined) {
    return { isValid: true };
  }

  const num = safeNumber(value, NaN);

  // Check if valid number
  if (isNaN(num)) {
    return { isValid: false, error: 'Valeur numérique invalide' };
  }

  // Check negative constraint
  if (!allowNegative && num < 0) {
    return { isValid: false, error: 'La valeur ne peut pas être négative' };
  }

  // Check integer constraint
  if ((integer || !allowDecimals) && !Number.isInteger(num)) {
    return { isValid: false, error: 'La valeur doit être un nombre entier' };
  }

  // Check min constraint
  if (min !== undefined && num < min) {
    return { isValid: false, error: `La valeur doit être au moins ${min}` };
  }

  // Check max constraint
  if (max !== undefined && num > max) {
    return { isValid: false, error: `La valeur ne peut pas dépasser ${max}` };
  }

  return { isValid: true };
}

/**
 * Validate a string input value
 */
export function validateString(
  value: string,
  options: StringValidationOptions = {}
): ValidationResult {
  const {
    minLength,
    maxLength,
    required = false,
    pattern,
    patternMessage = 'Format invalide',
  } = options;

  // Check if empty and required
  if (!value && required) {
    return { isValid: false, error: 'Ce champ est requis' };
  }

  // Allow empty if not required
  if (!value) {
    return { isValid: true };
  }

  // Check min length
  if (minLength !== undefined && value.length < minLength) {
    return {
      isValid: false,
      error: `La longueur minimale est ${minLength} caractères`,
    };
  }

  // Check max length
  if (maxLength !== undefined && value.length > maxLength) {
    return {
      isValid: false,
      error: `La longueur maximale est ${maxLength} caractères`,
    };
  }

  // Check pattern
  if (pattern && !pattern.test(value)) {
    return { isValid: false, error: patternMessage };
  }

  return { isValid: true };
}

/**
 * Validate an email address
 */
export function validateEmail(email: string, required: boolean = false): ValidationResult {
  if (!email && !required) {
    return { isValid: true };
  }

  if (!email && required) {
    return { isValid: false, error: 'L\'adresse email est requise' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { isValid: false, error: 'Adresse email invalide' };
  }

  return { isValid: true };
}

/**
 * Validate a phone number (Canadian format)
 */
export function validatePhone(phone: string, required: boolean = false): ValidationResult {
  if (!phone && !required) {
    return { isValid: true };
  }

  if (!phone && required) {
    return { isValid: false, error: 'Le numéro de téléphone est requis' };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it has 10 or 11 digits (with or without country code)
  if (digitsOnly.length !== 10 && digitsOnly.length !== 11) {
    return {
      isValid: false,
      error: 'Le numéro de téléphone doit contenir 10 chiffres',
    };
  }

  return { isValid: true };
}

/**
 * Validate a VIN (Vehicle Identification Number)
 */
export function validateVIN(vin: string, required: boolean = false): ValidationResult {
  if (!vin && !required) {
    return { isValid: true };
  }

  if (!vin && required) {
    return { isValid: false, error: 'Le NIV est requis' };
  }

  // VIN must be exactly 17 characters
  if (vin.length !== 17) {
    return { isValid: false, error: 'Le NIV doit contenir exactement 17 caractères' };
  }

  // VIN should only contain alphanumeric characters (no I, O, Q)
  const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
  if (!vinPattern.test(vin)) {
    return { isValid: false, error: 'Le NIV contient des caractères invalides' };
  }

  return { isValid: true };
}

/**
 * Validate a year value
 */
export function validateYear(
  year: any,
  options: { min?: number; max?: number; required?: boolean } = {}
): ValidationResult {
  const currentYear = new Date().getFullYear();
  const { min = 1900, max = currentYear + 1, required = false } = options;

  return validateNumber(year, {
    min,
    max,
    required,
    allowDecimals: false,
    integer: true,
  });
}

/**
 * Validate a price value
 */
export function validatePrice(
  price: any,
  options: { min?: number; max?: number; required?: boolean } = {}
): ValidationResult {
  const { min = 0, max, required = false } = options;

  return validateNumber(price, {
    min,
    max,
    required,
    allowNegative: false,
    allowDecimals: true,
  });
}

/**
 * Validate a quantity value
 */
export function validateQuantity(
  quantity: any,
  options: { min?: number; max?: number; required?: boolean } = {}
): ValidationResult {
  const { min = 0, max, required = false } = options;

  return validateNumber(quantity, {
    min,
    max,
    required,
    allowNegative: false,
    allowDecimals: false,
    integer: true,
  });
}

/**
 * Sanitize numeric input to prevent NaN
 */
export function sanitizeNumericInput(
  value: any,
  options: NumberValidationOptions = {}
): number {
  const { min = 0, max, integer = false, allowNegative = false } = options;

  let num = safeNumber(value, min);

  // Apply constraints
  if (!allowNegative && num < 0) {
    num = 0;
  }

  if (integer) {
    num = Math.floor(num);
  }

  if (min !== undefined && num < min) {
    num = min;
  }

  if (max !== undefined && num > max) {
    num = max;
  }

  return num;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors)
    .filter(([_, error]) => error)
    .map(([field, error]) => `${field}: ${error}`);
}

/**
 * Batch validate multiple fields
 */
export function validateFields(
  fields: Record<string, { value: any; options: NumberValidationOptions | StringValidationOptions; type: 'number' | 'string' }>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [fieldName, { value, options, type }] of Object.entries(fields)) {
    let result: ValidationResult;

    if (type === 'number') {
      result = validateNumber(value, options as NumberValidationOptions);
    } else {
      result = validateString(value, options as StringValidationOptions);
    }

    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
