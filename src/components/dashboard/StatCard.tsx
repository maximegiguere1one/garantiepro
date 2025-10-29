import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  color?: 'slate' | 'emerald' | 'blue' | 'amber' | 'red';
  onClick?: () => void;
  loading?: boolean;
}

const colorClasses = {
  slate: {
    bg: 'bg-slate-100',
    iconBg: 'bg-slate-900',
    text: 'text-slate-900',
    trend: 'text-slate-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-600',
    text: 'text-emerald-900',
    trend: 'text-emerald-600',
  },
  blue: {
    bg: 'bg-primary-50',
    iconBg: 'bg-primary-600',
    text: 'text-primary-900',
    trend: 'text-primary-600',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-600',
    text: 'text-amber-900',
    trend: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-600',
    text: 'text-red-900',
    trend: 'text-red-600',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'slate',
  onClick,
  loading = false,
}: StatCardProps) {
  const colors = colorClasses[color];
  const isClickable = !!onClick;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 bg-slate-200 rounded w-24" />
          <div className="w-12 h-12 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-8 bg-slate-200 rounded w-32 mb-2" />
        <div className="h-3 bg-slate-200 rounded w-20" />
      </div>
    );
  }

  const CardComponent = isClickable ? 'button' : 'div';

  return (
    <CardComponent
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`
        w-full bg-white rounded-xl border border-slate-200 p-6
        transition-all duration-200
        ${isClickable ? 'hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
            <div className="text-white">{icon}</div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          {isClickable && (
            <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}

        {trend && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-sm text-slate-500">{trend.label}</span>
          </div>
        )}
      </div>
    </CardComponent>
  );
}
