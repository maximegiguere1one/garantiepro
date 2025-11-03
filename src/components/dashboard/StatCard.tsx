import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'primary' | 'white';
  children?: React.ReactNode;
}

export function StatCard({ title, value, icon: Icon, subtitle, trend, variant = 'white', children }: StatCardProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <div className={`${
      isPrimary 
        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white' 
        : 'bg-white text-slate-900'
    } rounded-2xl shadow-${isPrimary ? 'xl' : 'sm'} border border-${isPrimary ? 'transparent' : 'slate-200/60'} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-sm font-medium ${isPrimary ? 'text-primary-100' : 'text-slate-600'}`}>
            {title}
          </p>
          <h2 className="text-4xl font-black mt-1">
            {typeof value === 'number' ? value.toLocaleString('fr-CA') : value}
          </h2>
        </div>
        <Icon className={`w-12 h-12 ${isPrimary ? 'text-primary-200' : 'text-primary-500'}`} />
      </div>
      
      {trend && (
        <div className="flex items-center gap-2 mb-3">
          {trend.value >= 0 ? (
            <ArrowUpRight className={`w-5 h-5 ${isPrimary ? 'text-emerald-300' : 'text-emerald-600'}`} />
          ) : (
            <ArrowDownRight className={`w-5 h-5 ${isPrimary ? 'text-red-300' : 'text-red-600'}`} />
          )}
          <span className="font-bold text-lg">
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className={`text-sm ${isPrimary ? 'text-primary-100' : 'text-slate-600'}`}>
            {trend.label}
          </span>
        </div>
      )}
      
      {subtitle && !children && (
        <div className={`${isPrimary ? 'bg-white/10' : 'bg-slate-50'} rounded-lg p-3 backdrop-blur-sm`}>
          <p className={`text-xs mb-1 ${isPrimary ? 'text-primary-100' : 'text-slate-600'}`}>
            {subtitle}
          </p>
        </div>
      )}
      
      {children}
    </div>
  );
}
