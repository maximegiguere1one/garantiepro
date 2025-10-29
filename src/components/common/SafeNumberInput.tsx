import { useState, useEffect } from 'react';
import { safeNumber } from '../../lib/numeric-utils';

interface SafeNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showError?: boolean;
  errorMessage?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  allowNegative?: boolean;
  allowDecimals?: boolean;
  decimals?: number;
}

export function SafeNumberInput({
  value,
  onChange,
  label,
  placeholder,
  min,
  max,
  step = '0.01',
  required = false,
  disabled = false,
  className = '',
  showError = false,
  errorMessage,
  hint,
  prefix,
  suffix,
  allowNegative = false,
  allowDecimals = true,
  decimals = 2,
}: SafeNumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [hasError, setHasError] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const validateValue = (numValue: number): string | null => {
    if (required && numValue === 0) {
      return 'Ce champ est requis';
    }

    if (!allowNegative && numValue < 0) {
      return 'La valeur ne peut pas être négative';
    }

    if (min !== undefined && numValue < min) {
      return `La valeur doit être au moins ${min}`;
    }

    if (max !== undefined && numValue > max) {
      return `La valeur ne peut pas dépasser ${max}`;
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);

    if (inputValue === '' || inputValue === '-') {
      setHasError(false);
      setValidationError(null);
      return;
    }

    const numValue = safeNumber(inputValue, 0);

    if (!allowDecimals) {
      const rounded = Math.floor(numValue);
      const error = validateValue(rounded);
      setValidationError(error);
      setHasError(error !== null);

      if (error === null) {
        onChange(rounded);
      }
    } else {
      const rounded = decimals !== undefined
        ? Math.round(numValue * Math.pow(10, decimals)) / Math.pow(10, decimals)
        : numValue;

      const error = validateValue(rounded);
      setValidationError(error);
      setHasError(error !== null);

      if (error === null) {
        onChange(rounded);
      }
    }
  };

  const handleBlur = () => {
    if (localValue === '' || localValue === '-') {
      const defaultValue = min !== undefined ? min : 0;
      setLocalValue(String(defaultValue));
      onChange(defaultValue);
      setHasError(false);
      setValidationError(null);
    } else {
      const numValue = safeNumber(localValue, 0);
      const finalValue = !allowDecimals ? Math.floor(numValue) : numValue;

      let constrainedValue = finalValue;
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }

      setLocalValue(String(constrainedValue));
      onChange(constrainedValue);

      const error = validateValue(constrainedValue);
      setValidationError(error);
      setHasError(error !== null);
    }
  };

  const displayError = showError || hasError;
  const errorText = errorMessage || validationError;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            prefix ? 'pl-8' : ''
          } ${
            suffix ? 'pr-8' : ''
          } ${
            displayError && errorText
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && !displayError && (
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
      {displayError && errorText && (
        <p className="text-xs text-red-600 mt-1">{errorText}</p>
      )}
    </div>
  );
}
