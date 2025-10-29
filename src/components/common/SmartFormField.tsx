import { useState, useEffect, useRef } from 'react';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface SmartFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select';
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  success?: boolean;
  autoComplete?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number | string;
  max?: number | string;
  rows?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
  showValidation?: boolean;
  recentValues?: any[];
  className?: string;
}

export function SmartFormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  required = false,
  placeholder,
  hint,
  error,
  success = false,
  autoComplete,
  options,
  min,
  max,
  rows = 3,
  disabled = false,
  icon,
  showValidation = true,
  recentValues = [],
  className = '',
}: SmartFormFieldProps) {
  const [showHint, setShowHint] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const hasError = touched && error;
  const hasSuccess = touched && success && !error && value;

  const handleBlur = () => {
    setTouched(true);
    setShowRecent(false);
    if (onBlur) onBlur();
  };

  const handleFocus = () => {
    if (recentValues.length > 0) {
      setShowRecent(true);
    }
  };

  const selectRecentValue = (recentValue: any) => {
    onChange(recentValue);
    setShowRecent(false);
    inputRef.current?.focus();
  };

  const renderInput = () => {
    const baseClasses = `w-full px-4 py-2.5 border-2 rounded-xl transition-all ${
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
        : hasSuccess
        ? 'border-green-300 focus:border-primary-500 focus:ring-2 focus:ring-green-200'
        : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200'
    } ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'} ${className}`;

    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${baseClasses} resize-none`}
          autoComplete={autoComplete}
        />
      );
    }

    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          required={required}
          disabled={disabled}
          className={baseClasses}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className={baseClasses}
        autoComplete={autoComplete}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {icon && <span className="text-slate-500">{icon}</span>}
          {label}
          {required && <span className="text-red-500">*</span>}
          {hint && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="p-0.5 hover:bg-slate-100 rounded transition-colors"
            >
              <Info className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </label>
        {showValidation && (
          <div className="flex items-center gap-1">
            {hasSuccess && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
            {hasError && <AlertCircle className="w-4 h-4 text-red-600" />}
          </div>
        )}
      </div>

      {showHint && hint && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-sm text-primary-800">
          {hint}
        </div>
      )}

      <div className="relative">
        {renderInput()}

        {showRecent && recentValues.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-200">
              Valeurs récentes
            </div>
            {recentValues.map((recentValue, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectRecentValue(recentValue)}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {recentValue}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
