import { Check, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { useFieldValidation, type ValidationRule } from '../../hooks/useFieldValidation';

interface ValidatedFieldProps {
  label: string;
  name: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date';
  placeholder?: string;
  hint?: string;
  required?: boolean;
  validationRules?: ValidationRule[];
  allValues?: Record<string, any>;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function ValidatedField({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  hint,
  required = false,
  validationRules = [],
  allValues,
  disabled = false,
  autoFocus = false,
  className = '',
}: ValidatedFieldProps) {
  const { result, isValidating, isValid } = useFieldValidation(
    name,
    value,
    validationRules,
    allValues
  );

  const getStatusColor = () => {
    if (!value) return 'border-slate-300';
    if (isValidating) return 'border-primary-400';
    if (!result) return 'border-slate-300';

    switch (result.level) {
      case 'success':
        return 'border-primary-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'info':
        return 'border-primary-500';
      default:
        return 'border-slate-300';
    }
  };

  const getStatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />;
    }

    if (!result || !value) return null;

    switch (result.level) {
      case 'success':
        return <Check className="w-5 h-5 text-primary-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-primary-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    if (!result || !value) return null;

    const colors = {
      success: 'text-primary-700 bg-green-50 border-green-200',
      error: 'text-red-700 bg-red-50 border-red-200',
      warning: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      info: 'text-primary-700 bg-primary-50 border-primary-200',
    };

    return (
      <div
        className={`mt-2 px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 animate-fadeIn ${
          colors[result.level]
        }`}
      >
        {getStatusIcon()}
        <span>{result.message}</span>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full px-4 py-3 rounded-xl border-2 ${getStatusColor()}
            focus:outline-none focus:ring-4 focus:ring-primary-500/10
            disabled:bg-slate-50 disabled:text-slate-500
            transition-all duration-200
            ${value && !isValidating && result?.level === 'success' ? 'pr-12' : ''}
          `}
        />

        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getStatusIcon()}
          </div>
        )}
      </div>

      {hint && !result && (
        <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4" />
          {hint}
        </p>
      )}

      {getStatusMessage()}
    </div>
  );
}
