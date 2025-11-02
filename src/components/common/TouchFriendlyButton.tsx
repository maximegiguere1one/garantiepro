import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface TouchFriendlyButtonProps {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}

export function TouchFriendlyButton({
  children,
  onClick,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  ariaLabel,
  className = '',
}: TouchFriendlyButtonProps) {
  const variantClasses = {
    primary: 'bg-brand-red text-white hover:bg-brand-red-dark active:bg-red-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        min-h-[48px] min-w-[48px]
        px-6 py-3
        rounded-lg font-medium
        flex items-center justify-center gap-2
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        touch-manipulation
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
      {children}
    </button>
  );
}
