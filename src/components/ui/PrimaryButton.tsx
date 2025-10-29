import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PrimaryButton Component
 *
 * Professional primary action button with gradient background, loading states,
 * and full accessibility support. Use for main CTAs on each screen.
 *
 * @example
 * ```tsx
 * <PrimaryButton onClick={handleSubmit} loading={isSubmitting}>
 *   Enregistrer
 * </PrimaryButton>
 *
 * <PrimaryButton size="lg" leftIcon={<Plus />}>
 *   Créer une garantie
 * </PrimaryButton>
 * ```
 */

export type PrimaryButtonSize = 'sm' | 'md' | 'lg';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size variant */
  size?: PrimaryButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Icon to display on the left side */
  leftIcon?: ReactNode;
  /** Icon to display on the right side */
  rightIcon?: ReactNode;
  /** Expand button to full width of container */
  fullWidth?: boolean;
}

const sizeStyles: Record<PrimaryButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
};

const iconSizes: Record<PrimaryButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (
    {
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          rounded-lg transition-all duration-200
          bg-gradient-to-r from-primary-600 to-primary-700
          hover:from-primary-700 hover:to-primary-800
          active:from-primary-800 active:to-primary-900
          text-white shadow-md shadow-primary-600/30
          hover:shadow-lg hover:shadow-primary-600/40 hover:-translate-y-0.5
          active:shadow-sm active:translate-y-0
          focus:outline-none focus:ring-4 focus:ring-primary-500/20
          disabled:cursor-not-allowed disabled:opacity-60
          disabled:shadow-none disabled:transform-none
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2
            className={`${iconSizes[size]} animate-spin`}
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon && (
          <span className={`flex-shrink-0 ${iconSizes[size]}`} aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className="flex-1">{children}</span>
        {!loading && rightIcon && (
          <span className={`flex-shrink-0 ${iconSizes[size]}`} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

PrimaryButton.displayName = 'PrimaryButton';
