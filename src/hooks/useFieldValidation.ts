import { useState, useCallback, useEffect } from 'react';

export type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

export interface ValidationResult {
  level: ValidationLevel;
  message: string;
  isValid: boolean;
}

export interface ValidationRule {
  validate: (value: any, allValues?: Record<string, any>) => Promise<ValidationResult | null> | ValidationResult | null;
  debounce?: number;
}

export function useFieldValidation(
  fieldName: string,
  value: any,
  rules: ValidationRule[],
  allValues?: Record<string, any>
) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async () => {
    if (!value || value === '') {
      setResult(null);
      return;
    }

    setIsValidating(true);

    try {
      for (const rule of rules) {
        const validationResult = await rule.validate(value, allValues);

        if (validationResult) {
          setResult(validationResult);
          setIsValidating(false);

          if (validationResult.level === 'error') {
            return;
          }
        }
      }

      if (!result || result.level !== 'error') {
        setResult({
          level: 'success',
          message: 'Valide',
          isValid: true,
        });
      }
    } catch (error) {
      setResult({
        level: 'error',
        message: 'Erreur de validation',
        isValid: false,
      });
    } finally {
      setIsValidating(false);
    }
  }, [value, allValues, rules]);

  useEffect(() => {
    if (!value) {
      setResult(null);
      return;
    }

    const debounceTime = rules.find(r => r.debounce)?.debounce || 300;
    const timer = setTimeout(() => {
      validate();
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [value, validate]);

  return {
    result,
    isValidating,
    validate,
    isValid: result?.isValid !== false,
  };
}

export const emailValidator: ValidationRule = {
  validate: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      return {
        level: 'error',
        message: 'Ce courriel semble incomplet. Exemple: nom@example.com',
        isValid: false,
      };
    }

    return {
      level: 'success',
      message: 'Format valide',
      isValid: true,
    };
  },
  debounce: 300,
};

export const phoneValidator: ValidationRule = {
  validate: (value: string) => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length < 10) {
      return {
        level: 'error',
        message: `Le numéro doit contenir 10 chiffres. Il en manque ${10 - cleaned.length}.`,
        isValid: false,
      };
    }

    if (cleaned.length > 10) {
      return {
        level: 'warning',
        message: 'Le numéro semble contenir trop de chiffres',
        isValid: true,
      };
    }

    return {
      level: 'success',
      message: 'Numéro valide',
      isValid: true,
    };
  },
  debounce: 300,
};

export const vinValidator: ValidationRule = {
  validate: (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');

    if (cleaned.length < 17) {
      return {
        level: 'error',
        message: `Le NIV doit contenir 17 caractères. Il en manque ${17 - cleaned.length}.`,
        isValid: false,
      };
    }

    if (cleaned.length > 17) {
      return {
        level: 'error',
        message: 'Le NIV ne peut pas contenir plus de 17 caractères.',
        isValid: false,
      };
    }

    if (/[IOQ]/.test(cleaned)) {
      return {
        level: 'error',
        message: 'Le NIV ne peut pas contenir les lettres I, O ou Q.',
        isValid: false,
      };
    }

    return {
      level: 'success',
      message: 'NIV valide',
      isValid: true,
    };
  },
  debounce: 500,
};

export const priceValidator: ValidationRule = {
  validate: (value: number) => {
    if (value <= 0) {
      return {
        level: 'error',
        message: 'Le prix doit être supérieur à 0$',
        isValid: false,
      };
    }

    if (value < 500) {
      return {
        level: 'warning',
        message: 'Ce prix semble inhabituellement bas pour une remorque',
        isValid: true,
      };
    }

    if (value > 100000) {
      return {
        level: 'warning',
        message: 'Ce prix semble inhabituellement élevé. Veuillez vérifier.',
        isValid: true,
      };
    }

    return {
      level: 'success',
      message: 'Prix valide',
      isValid: true,
    };
  },
  debounce: 500,
};

export const requiredValidator = (fieldLabel: string): ValidationRule => ({
  validate: (value: any) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return {
        level: 'error',
        message: `${fieldLabel} est requis pour continuer`,
        isValid: false,
      };
    }

    return null;
  },
});

export const dateRangeValidator = (
  minDate?: Date,
  maxDate?: Date,
  context?: string
): ValidationRule => ({
  validate: (value: string) => {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return {
        level: 'error',
        message: 'Date invalide',
        isValid: false,
      };
    }

    if (minDate && date < minDate) {
      return {
        level: 'error',
        message: `La date doit être après le ${minDate.toLocaleDateString('fr-CA')}${context ? ` (${context})` : ''}`,
        isValid: false,
      };
    }

    if (maxDate && date > maxDate) {
      return {
        level: 'error',
        message: `La date doit être avant le ${maxDate.toLocaleDateString('fr-CA')}${context ? ` (${context})` : ''}`,
        isValid: false,
      };
    }

    return {
      level: 'success',
      message: 'Date valide',
      isValid: true,
    };
  },
});

export const yearValidator = (minYear?: number, maxYear?: number): ValidationRule => ({
  validate: (value: number | string) => {
    const year = typeof value === 'string' ? parseInt(value) : value;

    if (isNaN(year) || year === 0) {
      return {
        level: 'error',
        message: 'Année invalide',
        isValid: false,
      };
    }

    const currentYear = new Date().getFullYear();
    const min = minYear || 1990;
    const max = maxYear || currentYear + 1;

    if (year < min) {
      return {
        level: 'error',
        message: `L'année doit être ${min} ou plus récente`,
        isValid: false,
      };
    }

    if (year > max) {
      return {
        level: 'error',
        message: `L'année ne peut pas dépasser ${max}`,
        isValid: false,
      };
    }

    if (year > currentYear) {
      return {
        level: 'info',
        message: 'Année future détectée',
        isValid: true,
      };
    }

    return {
      level: 'success',
      message: 'Année valide',
      isValid: true,
    };
  },
  debounce: 300,
});
