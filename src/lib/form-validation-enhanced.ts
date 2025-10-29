import { ValidationRule, ValidationResult } from './form-validation';

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
}

export function validateFieldRealtime(
  value: any,
  rules: ValidationRule[],
  allValues?: Record<string, any>
): FieldValidationResult {
  const result: FieldValidationResult = { valid: true };

  for (const rule of rules) {
    const isValid = rule.validate(value, allValues);
    if (isValid instanceof Promise) {
      continue;
    }

    if (!isValid) {
      result.valid = false;
      result.error = rule.message;

      result.suggestion = getSuggestion(rule, value);
      break;
    }
  }

  return result;
}

function getSuggestion(rule: ValidationRule, value: any): string | undefined {
  if (rule.message.includes('email') || rule.message.includes('courriel')) {
    if (typeof value === 'string' && value.includes('@')) {
      const [, domain] = value.split('@');
      const commonDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'];
      const suggestions = commonDomains
        .filter(d => d.startsWith(domain?.toLowerCase() || ''))
        .map(d => value.split('@')[0] + '@' + d);

      if (suggestions.length > 0) {
        return `Vouliez-vous dire ${suggestions[0]} ?`;
      }
    }
  }

  if (rule.message.includes('téléphone') || rule.message.includes('phone')) {
    if (typeof value === 'string') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length === 10) {
        return `Format suggéré: (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
    }
  }

  if (rule.message.includes('postal') || rule.message.includes('ZIP')) {
    if (typeof value === 'string' && value.length === 6) {
      return `Format suggéré: ${value.slice(0, 3)} ${value.slice(3)}`.toUpperCase();
    }
  }

  return undefined;
}

export function calculateFormCompleteness(
  values: Record<string, any>,
  requiredFields: string[]
): {
  percentage: number;
  completed: number;
  total: number;
  missingFields: string[];
} {
  const completed = requiredFields.filter(field => {
    const value = values[field];
    return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
  }).length;

  const missingFields = requiredFields.filter(field => {
    const value = values[field];
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  });

  return {
    percentage: Math.round((completed / requiredFields.length) * 100),
    completed,
    total: requiredFields.length,
    missingFields,
  };
}

export function getErrorSummary(errors: Record<string, string>): {
  count: number;
  fields: string[];
  firstError: string | null;
} {
  const fields = Object.keys(errors);
  return {
    count: fields.length,
    fields,
    firstError: fields.length > 0 ? errors[fields[0]] : null,
  };
}

export interface ValidationFeedback {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  field?: string;
  action?: {
    label: string;
    callback: () => void;
  };
}

export function generateValidationFeedback(
  field: string,
  value: any,
  error?: string,
  suggestion?: string
): ValidationFeedback[] {
  const feedback: ValidationFeedback[] = [];

  if (error) {
    feedback.push({
      type: 'error',
      message: error,
      field,
    });

    if (suggestion) {
      feedback.push({
        type: 'info',
        message: suggestion,
        field,
      });
    }
  }

  if (!error && value && field.includes('email')) {
    const emailParts = value.split('@');
    if (emailParts[1] && !emailParts[1].includes('.')) {
      feedback.push({
        type: 'warning',
        message: 'Le domaine de courriel semble incomplet',
        field,
      });
    }
  }

  if (!error && value && field.includes('phone')) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 7) {
      feedback.push({
        type: 'warning',
        message: 'Le numéro semble manquer l\'indicatif régional',
        field,
      });
    }
  }

  return feedback;
}

export class RealtimeValidator {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastValidationResults: Map<string, FieldValidationResult> = new Map();

  validateField(
    field: string,
    value: any,
    rules: ValidationRule[],
    debounceMs: number = 300
  ): Promise<FieldValidationResult> {
    return new Promise((resolve) => {
      const existingTimer = this.debounceTimers.get(field);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        const result = validateFieldRealtime(value, rules);
        this.lastValidationResults.set(field, result);
        resolve(result);
      }, debounceMs);

      this.debounceTimers.set(field, timer);
    });
  }

  getLastResult(field: string): FieldValidationResult | undefined {
    return this.lastValidationResults.get(field);
  }

  clear(field?: string): void {
    if (field) {
      const timer = this.debounceTimers.get(field);
      if (timer) clearTimeout(timer);
      this.debounceTimers.delete(field);
      this.lastValidationResults.delete(field);
    } else {
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
      this.lastValidationResults.clear();
    }
  }
}
