import { ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  timestamp: Date | string;
  color?: 'slate' | 'emerald' | 'blue' | 'amber' | 'red';
  onClick?: () => void;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  loading?: boolean;
}

const colorClasses = {
  slate: 'bg-slate-100 text-slate-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-primary-100 text-primary-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
};

export function ActivityFeed({
  activities,
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  loading = false,
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-6 bg-slate-200 rounded w-32 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Activité récente
      </h3>

      <div className="space-y-3">
        {displayedActivities.map((activity, index) => {
          const ActivityComponent = activity.onClick ? 'button' : 'div';
          const timestamp = typeof activity.timestamp === 'string'
            ? new Date(activity.timestamp)
            : activity.timestamp;

          return (
            <ActivityComponent
              key={activity.id}
              type={activity.onClick ? 'button' : undefined}
              onClick={activity.onClick}
              className={`
                w-full flex gap-3 p-3 rounded-lg transition-colors
                ${activity.onClick ? 'hover:bg-slate-50 cursor-pointer text-left' : ''}
                ${index !== displayedActivities.length - 1 ? 'border-b border-slate-100' : ''}
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${colorClasses[activity.color || 'slate']}
              `}>
                {activity.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-0.5">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-600 mb-1">
                  {activity.description}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDistanceToNow(timestamp, {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
            </ActivityComponent>
          );
        })}
      </div>

      {showViewAll && activities.length > maxItems && (
        <button
          onClick={onViewAll}
          className="w-full mt-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Voir toutes les activités ({activities.length})
        </button>
      )}

      {activities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">Aucune activité récente</p>
        </div>
      )}
    </div>
  );
}
