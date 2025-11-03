import React, { ButtonHTMLAttributes, useEffect } from 'react';
import { microInteractions, injectAnimations } from '../../lib/micro-interactions';

interface InteractiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  ripple?: boolean;
  haptic?: boolean;
  sound?: boolean;
  hoverEffect?: 'lift' | 'grow' | 'glow' | 'tilt';
  children: React.ReactNode;
}

export function InteractiveButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  ripple = true,
  haptic = true,
  sound = true,
  hoverEffect = 'lift',
  children,
  onClick,
  disabled,
  className = '',
  ...props
}: InteractiveButtonProps) {
  useEffect(() => {
    injectAnimations();
  }, []);

  const baseStyles = 'relative overflow-hidden rounded-lg font-semibold focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-md hover:shadow-lg',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const hoverEffectStyles = {
    lift: microInteractions.hover.lift,
    grow: microInteractions.hover.grow,
    glow: microInteractions.hover.glow,
    tilt: microInteractions.hover.tilt,
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    if (ripple) {
      microInteractions.interactive.ripple(e);
    }

    if (haptic) {
      microInteractions.haptic.light();
    }

    if (sound) {
      microInteractions.sound.click();
    }

    const button = e.currentTarget;
    button.classList.add('scale-95');
    setTimeout(() => button.classList.remove('scale-95'), 100);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${hoverEffectStyles[hoverEffect]}
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className={`${microInteractions.loading.spinner} w-4 h-4`} />
          <span>Chargement...</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
}
