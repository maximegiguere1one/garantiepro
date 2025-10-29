import { ReactNode, HTMLAttributes } from 'react';

/**
 * EnhancedCard Component
 *
 * Professional card container with multiple variants, hover effects,
 * and consistent spacing. Use as the primary container for content sections.
 *
 * @example
 * ```tsx
 * <EnhancedCard>
 *   <EnhancedCardHeader
 *     title="Informations client"
 *     subtitle="Détails du client et coordonnées"
 *     action={<Button size="sm">Modifier</Button>}
 *   />
 *   <EnhancedCardContent>
 *     Content goes here
 *   </EnhancedCardContent>
 *   <EnhancedCardFooter>
 *     Footer actions
 *   </EnhancedCardFooter>
 * </EnhancedCard>
 *
 * <EnhancedCard variant="elevated" hoverable>
 *   Interactive card with hover effect
 * </EnhancedCard>
 * ```
 */

export interface EnhancedCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the card */
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  /** Enable hover lift effect */
  hoverable?: boolean;
  /** Internal padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Card content */
  children: ReactNode;
}

const variantStyles = {
  default: 'bg-white border border-neutral-200 shadow-sm',
  bordered: 'bg-white border-2 border-neutral-300',
  elevated: 'bg-white shadow-lg border border-neutral-100',
  glass: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function EnhancedCard({
  variant = 'default',
  hoverable = false,
  padding = 'md',
  className = '',
  children,
  ...props
}: EnhancedCardProps) {
  return (
    <div
      className={`
        rounded-xl transition-all duration-200
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverable ? 'hover:-translate-y-1 hover:shadow-xl cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

/** Card Header Component */
export interface EnhancedCardHeaderProps {
  /** Header title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional action element (button, menu, etc.) */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function EnhancedCardHeader({
  title,
  subtitle,
  action,
  className = '',
}: EnhancedCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-neutral-900 truncate">{title}</h3>
        {subtitle && (
          <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/** Card Content Component */
export interface EnhancedCardContentProps {
  children: ReactNode;
  className?: string;
}

export function EnhancedCardContent({ children, className = '' }: EnhancedCardContentProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

/** Card Footer Component */
export interface EnhancedCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function EnhancedCardFooter({ children, className = '' }: EnhancedCardFooterProps) {
  return (
    <div className={`mt-6 pt-4 border-t border-neutral-200 ${className}`}>
      {children}
    </div>
  );
}
