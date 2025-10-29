import { ReactNode } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  MessageSquare,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * ClaimsTimeline Component
 *
 * Vertical timeline showing claim history with events, status changes,
 * and communications. Designed for claims management workflow.
 *
 * @example
 * ```tsx
 * <ClaimsTimeline
 *   events={[
 *     {
 *       id: '1',
 *       type: 'submitted',
 *       title: 'Réclamation soumise',
 *       description: 'Client: Jean Tremblay',
 *       timestamp: new Date(),
 *       user: 'System'
 *     },
 *     {
 *       type: 'status_change',
 *       title: 'Statut changé: En révision',
 *       timestamp: new Date(),
 *       user: 'Marie Dubois'
 *     }
 *   ]}
 * />
 * ```
 */

export type TimelineEventType =
  | 'submitted'
  | 'status_change'
  | 'comment'
  | 'document'
  | 'approved'
  | 'rejected'
  | 'closed';

export interface TimelineEvent {
  /** Unique event ID */
  id: string;
  /** Event type for icon and styling */
  type: TimelineEventType;
  /** Event title/heading */
  title: string;
  /** Optional description or details */
  description?: string;
  /** Event timestamp */
  timestamp: Date;
  /** User who performed the action */
  user?: string;
  /** Additional metadata or content */
  metadata?: Record<string, any>;
  /** Expandable content (optional) */
  expandedContent?: ReactNode;
}

export interface ClaimsTimelineProps {
  /** Array of timeline events */
  events: TimelineEvent[];
  /** Show empty state if no events */
  emptyMessage?: string;
  /** Custom className */
  className?: string;
}

const eventConfig: Record<
  TimelineEventType,
  { icon: any; color: string; bgColor: string; borderColor: string }
> = {
  submitted: {
    icon: FileText,
    color: 'text-info-600',
    bgColor: 'bg-info-100',
    borderColor: 'border-info-300',
  },
  status_change: {
    icon: Clock,
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    borderColor: 'border-warning-300',
  },
  comment: {
    icon: MessageSquare,
    color: 'text-neutral-600',
    bgColor: 'bg-neutral-100',
    borderColor: 'border-neutral-300',
  },
  document: {
    icon: FileText,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    borderColor: 'border-primary-300',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-success-600',
    bgColor: 'bg-success-100',
    borderColor: 'border-success-300',
  },
  rejected: {
    icon: XCircle,
    color: 'text-danger-600',
    bgColor: 'bg-danger-100',
    borderColor: 'border-danger-300',
  },
  closed: {
    icon: CheckCircle,
    color: 'text-neutral-600',
    bgColor: 'bg-neutral-100',
    borderColor: 'border-neutral-300',
  },
};

export function ClaimsTimeline({
  events,
  emptyMessage = 'Aucun événement pour le moment',
  className = '',
}: ClaimsTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
        <p className="text-neutral-600">{emptyMessage}</p>
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = format(event.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className={`space-y-8 ${className}`}>
      {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="space-y-4">
          {/* Date Separator */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-sm font-semibold text-neutral-600">
              {format(new Date(dateKey), 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {/* Events for this day */}
          <div className="relative pl-8 space-y-6">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-200" />

            {dayEvents.map((event, index) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;
              const isLast = index === dayEvents.length - 1;

              return (
                <div key={event.id} className="relative">
                  {/* Icon Circle */}
                  <div
                    className={`absolute -left-8 w-8 h-8 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} aria-hidden="true" />
                  </div>

                  {/* Event Card */}
                  <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-900">
                          {event.title}
                        </h4>
                        {event.description && (
                          <p className="text-sm text-neutral-600 mt-1">{event.description}</p>
                        )}
                      </div>
                      <time className="text-xs text-neutral-500 flex-shrink-0">
                        {format(event.timestamp, 'HH:mm')}
                      </time>
                    </div>

                    {/* User attribution */}
                    {event.user && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-neutral-500">
                        <User className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{event.user}</span>
                      </div>
                    )}

                    {/* Expanded content if provided */}
                    {event.expandedContent && (
                      <div className="mt-4 pt-4 border-t border-neutral-100">
                        {event.expandedContent}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
