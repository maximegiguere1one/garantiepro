import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * EnhancedToast System
 *
 * Professional toast notification system with auto-dismiss, stacking (max 3),
 * 4 types (success, error, warning, info), and ARIA live regions for accessibility.
 *
 * @example
 * ```tsx
 * // In your app root:
 * <EnhancedToastProvider>
 *   <App />
 * </EnhancedToastProvider>
 *
 * // In any component:
 * const toast = useEnhancedToast();
 *
 * toast.success('Garantie créée avec succès!');
 * toast.error('Erreur lors de l\'enregistrement');
 * toast.warning('Attention: Données non sauvegardées', {
 *   duration: 10000,
 *   action: { label: 'Enregistrer', onClick: handleSave }
 * });
 * ```
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: Toast[];
  success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => void;
  error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => void;
  warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => void;
  info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useEnhancedToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useEnhancedToast must be used within EnhancedToastProvider');
  }
  return context;
}

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

const toastConfig: Record<
  ToastType,
  { icon: any; bgColor: string; textColor: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-success-50 border-success-200',
    textColor: 'text-success-900',
    iconColor: 'text-success-600',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-danger-50 border-danger-200',
    textColor: 'text-danger-900',
    iconColor: 'text-danger-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning-50 border-warning-200',
    textColor: 'text-warning-900',
    iconColor: 'text-warning-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-info-50 border-info-200',
    textColor: 'text-info-900',
    iconColor: 'text-info-600',
  },
};

export function EnhancedToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (
    type: ToastType,
    message: string,
    options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>
  ) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = {
      id,
      type,
      message,
      duration: options?.duration ?? DEFAULT_DURATION,
      description: options?.description,
      action: options?.action,
    };

    setToasts((prev) => {
      // Keep only the most recent MAX_TOASTS - 1, then add new one
      const updated = prev.slice(-(MAX_TOASTS - 1));
      return [...updated, newToast];
    });

    // Auto dismiss
    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const value: ToastContextValue = {
    toasts,
    success: (message, options) => addToast('success', message, options),
    error: (message, options) => addToast('error', message, options),
    warning: (message, options) => addToast('warning', message, options),
    info: (message, options) => addToast('info', message, options),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-[1080] space-y-3 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsExiting(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`
        pointer-events-auto
        border-2 rounded-lg shadow-lg p-4
        transition-all duration-200
        ${config.bgColor}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-slide-in-up
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${config.textColor}`}>{toast.message}</p>
          {toast.description && (
            <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                handleDismiss();
              }}
              className={`text-sm font-semibold mt-2 hover:underline ${config.textColor}`}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ${config.textColor} hover:opacity-70 transition-opacity`}
          aria-label="Fermer la notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
