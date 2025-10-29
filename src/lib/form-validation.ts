import { ValidationError } from './error-types';
import { getValidationMessage, Language } from './error-messages';

export type ValidationRule<T = any> = {
  validate: (value: T, formData?: any) => boolean | Promise<boolean>;
  message: string;
  params?: Record<string, any>;
};

export type FieldValidation = {
  rules: ValidationRule[];
  required?: boolean;
  asyncValidation?: (value: any) => Promise<boolean>;
};

export type FormSchema = Record<string, FieldValidation>;

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export class FormValidator {
  private schema: FormSchema;
  private language: Language;

  constructor(schema: FormSchema, language: Language = 'fr') {
    this.schema = schema;
    this.language = language;
  }

  async validate(data: Record<string, any>): Promise<ValidationResult> {
    const errors: Record<string, string> = {};

    for (const [fieldName, validation] of Object.entries(this.schema)) {
      const value = data[fieldName];

      if (validation.required && this.isEmpty(value)) {
        errors[fieldName] = getValidationMessage('required', this.language);
        continue;
      }

      if (!this.isEmpty(value)) {
        for (const rule of validation.rules) {
          const isValid = await rule.validate(value, data);
          if (!isValid) {
            errors[fieldName] = rule.message;
            break;
          }
        }
      }

      if (!errors[fieldName] && validation.asyncValidation && !this.isEmpty(value)) {
        const isValid = await validation.asyncValidation(value);
        if (!isValid) {
          errors[fieldName] = getValidationMessage('uniqueConstraint', this.language);
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  validateField(fieldName: string, value: any, formData?: Record<string, any>): string | null {
    const validation = this.schema[fieldName];
    if (!validation) return null;

    if (validation.required && this.isEmpty(value)) {
      return getValidationMessage('required', this.language);
    }

    if (!this.isEmpty(value)) {
      for (const rule of validation.rules) {
        const isValid = rule.validate(value, formData);
        if (isValid instanceof Promise) {
          return null;
        }
        if (!isValid) {
          return rule.message;
        }
      }
    }

    return null;
  }

  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  }
}

export const ValidationRules = {
  required: (language: Language = 'fr'): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message: getValidationMessage('required', language),
  }),

  email: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: getValidationMessage('email', language),
  }),

  minLength: (min: number, language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: getValidationMessage('minLength', language, { min }),
    params: { min },
  }),

  maxLength: (max: number, language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: getValidationMessage('maxLength', language, { max }),
    params: { max },
  }),

  min: (min: number, language: Language = 'fr'): ValidationRule => ({
    validate: (value: number) => Number(value) >= min,
    message: getValidationMessage('min', language, { min }),
    params: { min },
  }),

  max: (max: number, language: Language = 'fr'): ValidationRule => ({
    validate: (value: number) => Number(value) <= max,
    message: getValidationMessage('max', language, { max }),
    params: { max },
  }),

  pattern: (regex: RegExp, language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => regex.test(value),
    message: getValidationMessage('pattern', language),
  }),

  phone: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      return phoneRegex.test(value);
    },
    message: getValidationMessage('phone', language),
  }),

  postalCode: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const canadianPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      return canadianPostalRegex.test(value);
    },
    message: getValidationMessage('postalCode', language),
  }),

  vin: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
      return vinRegex.test(value);
    },
    message: getValidationMessage('vin', language),
  }),

  date: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message: getValidationMessage('date', language),
  }),

  futureDate: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const date = new Date(value);
      return date > new Date();
    },
    message: language === 'fr' ? 'La date doit être dans le futur' : 'Date must be in the future',
  }),

  pastDate: (language: Language = 'fr'): ValidationRule => ({
    validate: (value: string) => {
      const date = new Date(value);
      return date < new Date();
    },
    message: language === 'fr' ? 'La date doit être dans le passé' : 'Date must be in the past',
  }),

  custom: (
    validateFn: (value: any, formData?: any) => boolean | Promise<boolean>,
    message: string
  ): ValidationRule => ({
    validate: validateFn,
    message,
  }),
};

export function createFormSchema(
  fields: Record<string, { required?: boolean; rules?: ValidationRule[]; asyncValidation?: (value: any) => Promise<boolean> }>
): FormSchema {
  const schema: FormSchema = {};

  for (const [fieldName, config] of Object.entries(fields)) {
    schema[fieldName] = {
      required: config.required ?? false,
      rules: config.rules ?? [],
      asyncValidation: config.asyncValidation,
    };
  }

  return schema;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
}

export function validatePostalCode(postalCode: string): boolean {
  const canadianPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
  return canadianPostalRegex.test(postalCode);
}

export function validateVIN(vin: string): boolean {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return vinRegex.test(vin);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function sanitizePostalCode(postalCode: string): string {
  return postalCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
