import { ReactNode } from 'react';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  color?: 'slate' | 'emerald' | 'blue' | 'amber' | 'red';
  badge?: string;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

const colorClasses = {
  slate: {
    bg: 'bg-slate-50 hover:bg-slate-100',
    iconBg: 'bg-slate-900',
    border: 'border-slate-200 hover:border-slate-300',
  },
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    iconBg: 'bg-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-300',
  },
  blue: {
    bg: 'bg-primary-50 hover:bg-primary-100',
    iconBg: 'bg-primary-600',
    border: 'border-primary-200 hover:border-primary-300',
  },
  amber: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    iconBg: 'bg-amber-600',
    border: 'border-amber-200 hover:border-amber-300',
  },
  red: {
    bg: 'bg-red-50 hover:bg-red-100',
    iconBg: 'bg-red-600',
    border: 'border-red-200 hover:border-red-300',
  },
};

export function QuickActionGrid({
  actions,
  columns = 3,
}: QuickActionGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Actions rapides
      </h3>

      <div className={`grid ${gridCols[columns]} gap-4`}>
        {actions.map((action) => {
          const colors = colorClasses[action.color || 'slate'];

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`
                relative p-4 rounded-lg border transition-all duration-200
                ${colors.bg} ${colors.border}
                hover:shadow-md hover:-translate-y-0.5
                text-left group
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                  ${colors.iconBg} text-white
                `}>
                  {action.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 truncate">
                      {action.label}
                    </h4>
                    {action.badge && (
                      <span className="px-1.5 py-0.5 text-xs font-semibold bg-white rounded">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  {action.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {action.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
