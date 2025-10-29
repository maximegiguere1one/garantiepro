import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles = {
  default: 'bg-white border border-slate-200',
  bordered: 'bg-white border-2 border-slate-300',
  elevated: 'bg-white shadow-lg border border-slate-100',
  glass: 'glass-effect border border-white/20',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  variant = 'default',
  hoverable = false,
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl transition-all duration-200
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverable ? 'hover-lift cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-slate-900 truncate">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-6 pt-4 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'emerald' | 'orange' | 'slate' | 'red';
  subtitle?: string;
}

const colorStyles = {
  blue: 'bg-primary-500 shadow-blue-500/20',
  emerald: 'bg-emerald-500 shadow-emerald-500/20',
  orange: 'bg-orange-500 shadow-orange-500/20',
  slate: 'bg-slate-700 shadow-slate-900/20',
  red: 'bg-red-500 shadow-red-500/20',
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  subtitle,
}: StatCardProps) {
  return (
    <Card variant="default" hoverable className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className={`${colorStyles[color]} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-slate-600 text-sm font-medium mb-1">{label}</h3>
      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </Card>
  );
}
