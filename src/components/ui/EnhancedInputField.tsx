import { InputHTMLAttributes, ReactNode, useId, forwardRef } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * EnhancedInputField Component
 *
 * Professional input field with built-in label, validation states, help text,
 * and full WCAG 2.1 AA compliance. Supports icons, loading states, and
 * inline validation feedback.
 *
 * @example
 * ```tsx
 * <EnhancedInputField
 *   label="Courriel"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error={errors.email}
 *   helpText="Utilisé pour l'envoi de documents"
 *   required
 * />
 *
 * <EnhancedInputField
 *   label="NIV"
 *   value={vin}
 *   onChange={(e) => setVin(e.target.value)}
 *   success={vinValidated}
 *   successMessage="NIV valide"
 *   leftIcon={<Shield />}
 *   maxLength={17}
 * />
 * ```
 */

export interface EnhancedInputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Field label (required for accessibility) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Success message to display when validation passes */
  successMessage?: string;
  /** Show success state */
  success?: boolean;
  /** Help text shown below the input */
  helpText?: string;
  /** Additional hint shown next to label */
  hint?: string;
  /** Icon to display on the left side of input */
  leftIcon?: ReactNode;
  /** Icon to display on the right side of input */
  rightIcon?: ReactNode;
  /** Container className */
  containerClassName?: string;
}

export const EnhancedInputField = forwardRef<HTMLInputElement, EnhancedInputFieldProps>(
  (
    {
      label,
      error,
      successMessage,
      success,
      helpText,
      hint,
      leftIcon,
      rightIcon,
      required,
      disabled,
      className = '',
      containerClassName = '',
      ...props
    },
    ref
  ) => {
    const id = useId();
    const helpTextId = `${id}-help`;
    const errorId = `${id}-error`;
    const successId = `${id}-success`;

    const hasError = Boolean(error);
    const hasSuccess = success && !hasError;

    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {/* Label */}
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-neutral-700 transition-colors"
        >
          {label}
          {required && (
            <span className="text-danger-600 ml-1" aria-label="requis">
              *
            </span>
          )}
          {hint && (
            <span className="ml-2 text-xs font-normal text-neutral-500">
              ({hint})
            </span>
          )}
        </label>

        {/* Input Container */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={`${hasError ? errorId : ''} ${helpText ? helpTextId : ''} ${hasSuccess ? successId : ''}`.trim() || undefined}
            className={`
              w-full px-4 py-3 border-2 rounded-lg transition-all duration-200
              text-neutral-900 placeholder-neutral-400
              focus:outline-none focus:ring-4
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50
              ${leftIcon ? 'pl-11' : ''}
              ${rightIcon || hasError || hasSuccess ? 'pr-11' : ''}
              ${hasError
                ? 'border-danger-300 bg-danger-50 focus:border-danger-500 focus:ring-danger-500/20'
                : hasSuccess
                ? 'border-success-300 bg-success-50 focus:border-success-500 focus:ring-success-500/20'
                : 'border-neutral-300 bg-white hover:border-neutral-400 focus:border-primary-500 focus:ring-primary-500/20'
              }
              ${className}
            `}
            {...props}
          />

          {/* Right Icon or Status Indicator */}
          {(rightIcon || hasError || hasSuccess) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError && (
                <AlertCircle className="w-5 h-5 text-danger-500" aria-hidden="true" />
              )}
              {hasSuccess && !hasError && (
                <CheckCircle className="w-5 h-5 text-success-500" aria-hidden="true" />
              )}
              {!hasError && !hasSuccess && rightIcon && (
                <span className="text-neutral-400">{rightIcon}</span>
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        {helpText && !error && !successMessage && (
          <div id={helpTextId} className="flex items-start gap-1.5 text-xs text-neutral-600">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{helpText}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            id={errorId}
            className="flex items-start gap-1.5 text-sm text-danger-700 animate-slide-in-up"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {hasSuccess && successMessage && (
          <div
            id={successId}
            className="flex items-start gap-1.5 text-sm text-success-700 animate-slide-in-up"
            role="status"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    );
  }
);

EnhancedInputField.displayName = 'EnhancedInputField';
