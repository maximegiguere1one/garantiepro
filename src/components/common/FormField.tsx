import { ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  helpText?: string;
  hint?: string;
}

export function FormField({ label, children, error, required, helpText, hint }: FormFieldProps) {
  const id = useId();
  const helpTextId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2 animate-fade-in">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="requis">
            *
          </span>
        )}
        {hint && (
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({hint})
          </span>
        )}
      </label>
      <div className="relative">
        {children}
      </div>
      {helpText && !error && (
        <p id={helpTextId} className="text-xs text-slate-500 animate-fade-in">
          {helpText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="text-xs text-red-600 flex items-center gap-1.5 animate-slide-in-up"
          role="alert"
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({ error, leftIcon, rightIcon, className = '', ...props }: InputProps) {
  const inputClasses = `w-full px-4 py-2.5 border rounded-lg transition-all duration-200
    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none
    ${error
      ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
      : 'border-slate-300 bg-white hover:border-slate-400'
    }
    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50
    ${leftIcon ? 'pl-11' : ''}
    ${rightIcon ? 'pr-11' : ''}
    ${className}`;

  if (leftIcon || rightIcon) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input className={inputClasses} {...props} />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }

  return <input className={inputClasses} {...props} />;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full px-4 py-2.5 border rounded-lg transition-all duration-200
        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none
        appearance-none bg-no-repeat bg-right bg-[length:1.5rem_1.5rem]
        ${error
          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
          : 'border-slate-300 bg-white hover:border-slate-400'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50
        ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
        paddingRight: '2.5rem',
      }}
      {...props}
    >
      {children}
    </select>
  );
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        className={`w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500 transition-all ${className}`}
        {...props}
      />
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
        {label}
      </span>
    </label>
  );
}
