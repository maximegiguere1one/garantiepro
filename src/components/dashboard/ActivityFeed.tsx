import { AlertCircle, Clock, CheckCircle, Bell, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  actionPage?: string;
  timestamp: Date;
}

interface ActivityFeedProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onNavigate?: (page: string) => void;
}

export function ActivityFeed({ notifications, onDismiss, onNavigate }: ActivityFeedProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-primary-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-primary-50 border-primary-200';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`flex items-start gap-4 p-4 rounded-xl border ${getNotificationColor(notif.type)} transition-all hover:shadow-md`}
        >
          <div className="flex-shrink-0">{getNotificationIcon(notif.type)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900">{notif.title}</h4>
            <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
          </div>
          <div className="flex items-center gap-2">
            {notif.action && notif.actionPage && (
              <button
                onClick={() => onNavigate?.(notif.actionPage!)}
                className="flex-shrink-0 px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {notif.action}
              </button>
            )}
            <button
              onClick={() => onDismiss(notif.id)}
              className="p-1 hover:bg-white/50 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
