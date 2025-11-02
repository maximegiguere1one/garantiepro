import { LucideIcon } from 'lucide-react';
import { AnimatedButton } from '../common/AnimatedButton';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-400" aria-hidden="true" />
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 max-w-md mb-8">{description}</p>

      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <AnimatedButton
            onClick={action.onClick}
            className="flex items-center gap-2 px-6 py-3 bg-brand-red text-white rounded-lg font-medium hover:bg-brand-red-dark transition-all shadow-sm hover:shadow-md min-w-[200px] justify-center"
            aria-label={action.label}
          >
            {action.icon && <action.icon className="w-5 h-5" aria-hidden="true" />}
            {action.label}
          </AnimatedButton>
        )}

        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={secondaryAction.label}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
