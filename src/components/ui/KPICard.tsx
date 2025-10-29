import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { EnhancedCard } from './EnhancedCard';

/**
 * KPICard Component
 *
 * Dashboard KPI card showing a metric with icon, value, trend, and optional subtitle.
 * Designed for dashboard grids to display key performance indicators.
 *
 * @example
 * ```tsx
 * <KPICard
 *   icon={<DollarSign />}
 *   label="Revenu"
 *   value="45 280 $"
 *   trend={{ value: 12.5, isPositive: true }}
 *   subtitle="Ce mois-ci"
 *   color="primary"
 * />
 *
 * <KPICard
 *   icon={<Shield />}
 *   label="Garanties actives"
 *   value="1,247"
 *   subtitle="+23 cette semaine"
 *   color="success"
 * />
 * ```
 */

export interface KPICardProps {
  /** Icon to display in colored circle */
  icon: ReactNode;
  /** Label/title of the KPI */
  label: string;
  /** Main value to display (can be string or number) */
  value: string | number;
  /** Optional trend data */
  trend?: {
    /** Percentage change */
    value: number;
    /** Whether the trend is positive (green) or negative (red) */
    isPositive: boolean;
  };
  /** Color theme for the icon background */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
  /** Optional subtitle or description */
  subtitle?: string;
  /** Click handler for interactive cards */
  onClick?: () => void;
}

const colorStyles = {
  primary: {
    bg: 'bg-gradient-to-br from-primary-500 to-primary-600',
    shadow: 'shadow-primary-500/20',
  },
  secondary: {
    bg: 'bg-gradient-to-br from-secondary-500 to-secondary-600',
    shadow: 'shadow-secondary-500/20',
  },
  success: {
    bg: 'bg-gradient-to-br from-success-500 to-success-600',
    shadow: 'shadow-success-500/20',
  },
  warning: {
    bg: 'bg-gradient-to-br from-warning-400 to-warning-500',
    shadow: 'shadow-warning-500/20',
  },
  danger: {
    bg: 'bg-gradient-to-br from-danger-500 to-danger-600',
    shadow: 'shadow-danger-500/20',
  },
  neutral: {
    bg: 'bg-gradient-to-br from-neutral-700 to-neutral-800',
    shadow: 'shadow-neutral-900/20',
  },
};

export function KPICard({
  icon,
  label,
  value,
  trend,
  color = 'primary',
  subtitle,
  onClick,
}: KPICardProps) {
  const { bg, shadow } = colorStyles[color];

  return (
    <EnhancedCard
      hoverable={Boolean(onClick)}
      onClick={onClick}
      className="animate-fade-in"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`${bg} ${shadow} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105`}
        >
          <div className="text-white w-7 h-7">{icon}</div>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              trend.isPositive
                ? 'bg-success-100 text-success-700'
                : 'bg-danger-100 text-danger-700'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-2">
        {label}
      </h3>
      <p className="text-3xl font-bold text-neutral-900 mb-1">{value}</p>
      {subtitle && (
        <p className="text-sm text-neutral-500 mt-2">{subtitle}</p>
      )}
    </EnhancedCard>
  );
}
