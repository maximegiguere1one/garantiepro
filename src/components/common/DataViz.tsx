import { ReactNode } from 'react';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  showValues?: boolean;
  className?: string;
}

export function BarChart({
  data,
  height = 200,
  showValues = true,
  className = '',
}: BarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-end gap-3" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          const color = item.color || 'bg-primary-500';

          return (
            <div key={index} className="flex-1 flex flex-col justify-end items-center gap-2">
              <div className="relative w-full group">
                {showValues && (
                  <div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold
                      text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {item.value}
                  </div>
                )}
                <div
                  className={`w-full ${color} rounded-t-lg transition-all duration-500 hover:opacity-90
                    hover:shadow-lg cursor-pointer animate-slide-in-up`}
                  style={{
                    height: `${barHeight}%`,
                    animationDelay: `${index * 50}ms`,
                  }}
                  role="img"
                  aria-label={`${item.label}: ${item.value}`}
                />
              </div>
              <span className="text-xs text-slate-600 text-center font-medium truncate w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'flat';
}

export function MetricCard({
  label,
  value,
  change,
  icon,
  color = 'blue',
  trend,
}: MetricCardProps) {
  const colorClasses = {
    blue: 'from-primary-500 to-primary-600',
    emerald: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    slate: 'from-slate-600 to-slate-700',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 hover-lift animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
              colorClasses[color as keyof typeof colorClasses] || colorClasses.blue
            } flex items-center justify-center text-white shadow-lg`}
          >
            {icon}
          </div>
        )}
        {change && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
              ${change.isPositive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
              }`}
          >
            <span>{change.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(change.value)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-slate-600 font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {change?.label && (
          <p className="text-xs text-slate-500 mt-2">{change.label}</p>
        )}
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  trend === 'up'
                    ? 'bg-emerald-500'
                    : trend === 'down'
                    ? 'bg-red-500'
                    : 'bg-slate-400'
                } transition-all duration-500`}
                style={{ width: '70%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DonutChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  size = 200,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
    };
  });

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="transform rotate-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="20"
        />
        {segments.map((segment, index) => {
          const radius = size / 2 - 10;
          const startAngle = (segment.startAngle * Math.PI) / 180;
          const endAngle = (segment.endAngle * Math.PI) / 180;
          const largeArc = segment.percentage > 50 ? 1 : 0;

          const x1 = size / 2 + radius * Math.cos(startAngle);
          const y1 = size / 2 + radius * Math.sin(startAngle);
          const x2 = size / 2 + radius * Math.cos(endAngle);
          const y2 = size / 2 + radius * Math.sin(endAngle);

          return (
            <path
              key={index}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={segment.color}
              strokeWidth="20"
              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <div className="text-3xl font-bold text-slate-900">{centerValue}</div>
          )}
          {centerLabel && (
            <div className="text-sm text-slate-500 mt-1">{centerLabel}</div>
          )}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-slate-600">
              {item.label}
              <span className="font-semibold ml-2">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimelineItem {
  label: string;
  date: string;
  description?: string;
  icon?: ReactNode;
  status?: 'completed' | 'current' | 'upcoming';
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className = '' }: TimelineProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {items.map((item, index) => {
        const isCompleted = item.status === 'completed';
        const isCurrent = item.status === 'current';

        return (
          <div
            key={index}
            className="relative flex gap-4 animate-slide-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {index < items.length - 1 && (
              <div
                className={`absolute left-6 top-14 bottom-0 w-0.5 -translate-x-1/2
                  ${isCompleted ? 'bg-primary-500' : 'bg-slate-200'}`}
              />
            )}
            <div
              className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center
                justify-center border-2 transition-all duration-200
                ${isCompleted
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : isCurrent
                  ? 'bg-white border-primary-500 text-primary-500'
                  : 'bg-white border-slate-300 text-slate-400'
                }`}
            >
              {item.icon || (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
            </div>
            <div className="flex-1 pb-8">
              <div className="flex items-center gap-3 mb-1">
                <h3
                  className={`font-semibold ${
                    isCurrent ? 'text-primary-600' : 'text-slate-900'
                  }`}
                >
                  {item.label}
                </h3>
                <span className="text-xs text-slate-500">{item.date}</span>
              </div>
              {item.description && (
                <p className="text-sm text-slate-600">{item.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
