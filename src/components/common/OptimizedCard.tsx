import { memo, ReactNode } from 'react';

interface OptimizedCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const OptimizedCard = memo(function OptimizedCard({
  title,
  subtitle,
  icon,
  children,
  footer,
  onClick,
  className = ''
}: OptimizedCardProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-slate-600 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div>
          {children}
        </div>
      </div>
      {footer && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          {footer}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.children === nextProps.children &&
    prevProps.footer === nextProps.footer &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.className === nextProps.className
  );
});
