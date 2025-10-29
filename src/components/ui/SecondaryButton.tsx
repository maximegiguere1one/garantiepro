import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * SecondaryButton Component
 *
 * Secondary action button with outline style. Use for cancel actions,
 * back navigation, or secondary CTAs on a screen.
 *
 * @example
 * ```tsx
 * <SecondaryButton onClick={handleCancel}>
 *   Annuler
 * </SecondaryButton>
 *
 * <SecondaryButton leftIcon={<ArrowLeft />} onClick={goBack}>
 *   Retour
 * </SecondaryButton>
 * ```
 */

export type SecondaryButtonSize = 'sm' | 'md' | 'lg';

export interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size variant */
  size?: SecondaryButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Icon to display on the left side */
  leftIcon?: ReactNode;
  /** Icon to display on the right side */
  rightIcon?: ReactNode;
  /** Expand button to full width of container */
  fullWidth?: boolean;
}

const sizeStyles: Record<SecondaryButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
};

const iconSizes: Record<SecondaryButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const SecondaryButton = forwardRef<HTMLButtonElement, SecondaryButtonProps>(
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
          border-2 border-neutral-300
          bg-white text-neutral-700
          hover:border-primary-600 hover:text-primary-700 hover:bg-primary-50
          active:bg-primary-100
          focus:outline-none focus:ring-4 focus:ring-primary-500/20
          disabled:cursor-not-allowed disabled:opacity-50
          disabled:border-neutral-200 disabled:text-neutral-400 disabled:bg-neutral-50
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

SecondaryButton.displayName = 'SecondaryButton';
