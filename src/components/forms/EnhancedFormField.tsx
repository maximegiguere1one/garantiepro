import { ReactNode, useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface EnhancedFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  tooltip?: string;
  icon?: ReactNode;
  options?: Array<{ value: string; label: string }>;
  autoComplete?: string;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  validateOnBlur?: boolean;
  success?: boolean;
  loading?: boolean;
}

export function EnhancedFormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  hint,
  tooltip,
  icon,
  options,
  autoComplete,
  pattern,
  min,
  max,
  step,
  rows = 4,
  maxLength,
  showCharCount = false,
  validateOnBlur = false,
  success = false,
  loading = false,
}: EnhancedFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [wasTouched, setWasTouched] = useState(false);

  const showError = error && (validateOnBlur ? wasTouched : true);
  const showSuccess = success && !error && value && wasTouched;

  const handleBlur = () => {
    setIsFocused(false);
    setWasTouched(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const baseInputClasses = `
    w-full px-4 py-3 rounded-lg border transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${icon ? 'pl-11' : ''}
    ${type === 'password' ? 'pr-11' : ''}
    ${showError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
      : showSuccess
      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 bg-emerald-50'
      : isFocused
      ? 'border-slate-400 focus:border-slate-900 focus:ring-slate-200 bg-white'
      : 'border-slate-300 hover:border-slate-400 bg-white'
    }
  `;

  const renderInput = () => {
    const inputProps = {
      id: name,
      name,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value),
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      required,
      disabled: disabled || loading,
      autoComplete,
      pattern,
      maxLength,
      className: baseInputClasses,
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...inputProps}
          rows={rows}
        />
      );
    }

    if (type === 'select' && options) {
      return (
        <select {...inputProps}>
          <option value="">{placeholder || 'Sélectionner...'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'number') {
      return (
        <input
          {...inputProps}
          type="number"
          min={min}
          max={max}
          step={step}
        />
      );
    }

    return (
      <input
        {...inputProps}
        type={type === 'password' && showPassword ? 'text' : type}
      />
    );
  };

  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={name}
          className="block text-sm font-semibold text-slate-900"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle className="inline-block w-4 h-4 ml-1 text-slate-400" />
            </Tooltip>
          )}
        </label>
        {showCharCount && maxLength && (
          <span className={`text-xs ${charCount > maxLength * 0.9 ? 'text-red-600' : 'text-slate-500'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        {renderInput()}

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}

        {showSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
            <Check className="w-5 h-5" />
          </div>
        )}

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {hint && !showError && (
        <p className="text-xs text-slate-500 flex items-start gap-1">
          <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{hint}</span>
        </p>
      )}

      {showError && (
        <p className="text-xs text-red-600 flex items-start gap-1 animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
