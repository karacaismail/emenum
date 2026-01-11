/**
 * Toast Component
 *
 * Bildirim/toast sistemi componenti.
 * Basari, hata, uyari ve bilgi mesajlari gostermek icin kullanilir.
 *
 * @example
 * ```tsx
 * // Provider kullanimi (app root'ta)
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * // Hook kullanimi
 * const { addToast, success, error, warning, info } = useToast();
 *
 * // Toast gosterme
 * success('Kayit basarili!');
 * error('Bir hata olustu');
 * warning('Dikkat edin');
 * info('Bilgilendirme');
 *
 * // Ozel toast
 * addToast({
 *   title: 'Baslik',
 *   message: 'Mesaj icerigi',
 *   type: 'success',
 *   duration: 5000,
 * });
 * ```
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Toast types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast position
 */
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Toast item interface
 */
export interface ToastItem {
  /** Unique ID */
  id: string;
  /** Toast type */
  type: ToastType;
  /** Toast title (optional) */
  title?: string;
  /** Toast message */
  message: string;
  /** Duration in ms (0 = persistent) */
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Dismissable */
  dismissable?: boolean;
}

/**
 * Toast options for adding new toast
 */
export interface ToastOptions {
  /** Toast title (optional) */
  title?: string;
  /** Toast message */
  message: string;
  /** Toast type */
  type?: ToastType;
  /** Duration in ms (default: 5000, 0 = persistent) */
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Dismissable (default: true) */
  dismissable?: boolean;
}

/**
 * Toast context value
 */
export interface ToastContextValue {
  /** List of active toasts */
  toasts: ToastItem[];
  /** Add a new toast */
  addToast: (options: ToastOptions) => string;
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearAll: () => void;
  /** Shorthand for success toast */
  success: (message: string, title?: string) => string;
  /** Shorthand for error toast */
  error: (message: string, title?: string) => string;
  /** Shorthand for warning toast */
  warning: (message: string, title?: string) => string;
  /** Shorthand for info toast */
  info: (message: string, title?: string) => string;
}

/**
 * Toast provider props
 */
export interface ToastProviderProps {
  /** Children */
  children: ReactNode;
  /** Toast position */
  position?: ToastPosition;
  /** Maximum number of toasts */
  maxToasts?: number;
  /** Default duration */
  defaultDuration?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Position styles
 */
const positionStyles: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

/**
 * Type styles
 */
const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

/**
 * Icon background colors
 */
const iconBgColors: Record<ToastType, string> = {
  success: 'bg-green-100 text-green-600',
  error: 'bg-red-100 text-red-600',
  warning: 'bg-yellow-100 text-yellow-600',
  info: 'bg-blue-100 text-blue-600',
};

// =============================================================================
// ICONS
// =============================================================================

/**
 * Success icon
 */
function SuccessIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Error icon
 */
function ErrorIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Warning icon
 */
function WarningIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

/**
 * Info icon
 */
function InfoIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Close icon
 */
function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Get icon component for toast type
 */
function getIcon(type: ToastType) {
  const icons: Record<ToastType, ReactNode> = {
    success: <SuccessIcon />,
    error: <ErrorIcon />,
    warning: <WarningIcon />,
    info: <InfoIcon />,
  };
  return icons[type];
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// =============================================================================
// TOAST ITEM COMPONENT
// =============================================================================

/**
 * Single toast item component
 */
function ToastItemComponent({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  // Auto dismiss timer
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 200);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`
        relative flex items-start gap-3 w-full max-w-sm p-4 rounded-lg border shadow-lg
        transition-all duration-200
        ${typeStyles[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 p-1 rounded-full ${iconBgColors[toast.type]}`}>
        {getIcon(toast.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm">{toast.title}</p>
        )}
        <p className={`text-sm ${toast.title ? 'mt-0.5 opacity-90' : ''}`}>
          {toast.message}
        </p>

        {/* Action button */}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              handleDismiss();
            }}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      {toast.dismissable !== false && (
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 focus:outline-none transition-colors"
          aria-label="Kapat"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

/**
 * Toast container component
 */
function ToastContainer({
  toasts,
  position,
  onDismiss,
}: {
  toasts: ToastItem[];
  position: ToastPosition;
  onDismiss: (id: string) => void;
}) {
  const isTop = position.startsWith('top');

  if (typeof window === 'undefined' || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed z-[100] ${positionStyles[position]} flex flex-col gap-2 pointer-events-none`}
      style={{ maxHeight: 'calc(100vh - 2rem)' }}
    >
      {(isTop ? toasts : [...toasts].reverse()).map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItemComponent toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Toast Provider Component
 *
 * Uygulamanin root'unda kullanilmali.
 */
export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * Generate unique ID
   */
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Add new toast
   */
  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId();
      const newToast: ToastItem = {
        id,
        type: options.type || 'info',
        title: options.title,
        message: options.message,
        duration: options.duration ?? defaultDuration,
        action: options.action,
        dismissable: options.dismissable ?? true,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Limit number of toasts
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      return id;
    },
    [generateId, defaultDuration, maxToasts]
  );

  /**
   * Remove toast by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Shorthand methods
   */
  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} position={position} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useToast hook
 *
 * Toast islemlerini kullanmak icin hook.
 * ToastProvider icinde kullanilmali.
 *
 * @example
 * ```tsx
 * const { success, error, addToast } = useToast();
 *
 * // Basit kullanim
 * success('Kayit basarili!');
 * error('Bir hata olustu');
 *
 * // Detayli kullanim
 * addToast({
 *   type: 'success',
 *   title: 'Basarili',
 *   message: 'Urun eklendi',
 *   duration: 3000,
 * });
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

/**
 * Safe version of useToast that returns null when outside provider
 */
export function useToastSafe(): ToastContextValue | null {
  return useContext(ToastContext);
}

// =============================================================================
// STANDALONE TOAST (without provider)
// =============================================================================

/**
 * Standalone toast state for use without provider
 */
let standaloneToasts: ToastItem[] = [];
let standaloneListeners: Array<(toasts: ToastItem[]) => void> = [];

function notifyListeners() {
  standaloneListeners.forEach((listener) => listener([...standaloneToasts]));
}

/**
 * Standalone toast functions for use without ToastProvider
 * Note: Prefer using ToastProvider and useToast hook when possible
 */
export const toast = {
  /**
   * Show success toast
   */
  success: (message: string, title?: string) => {
    const id = `toast-${Date.now()}`;
    standaloneToasts.push({
      id,
      type: 'success',
      message,
      title,
      duration: 5000,
      dismissable: true,
    });
    notifyListeners();
    setTimeout(() => {
      standaloneToasts = standaloneToasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 5000);
    return id;
  },

  /**
   * Show error toast
   */
  error: (message: string, title?: string) => {
    const id = `toast-${Date.now()}`;
    standaloneToasts.push({
      id,
      type: 'error',
      message,
      title,
      duration: 5000,
      dismissable: true,
    });
    notifyListeners();
    setTimeout(() => {
      standaloneToasts = standaloneToasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 5000);
    return id;
  },

  /**
   * Show warning toast
   */
  warning: (message: string, title?: string) => {
    const id = `toast-${Date.now()}`;
    standaloneToasts.push({
      id,
      type: 'warning',
      message,
      title,
      duration: 5000,
      dismissable: true,
    });
    notifyListeners();
    setTimeout(() => {
      standaloneToasts = standaloneToasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 5000);
    return id;
  },

  /**
   * Show info toast
   */
  info: (message: string, title?: string) => {
    const id = `toast-${Date.now()}`;
    standaloneToasts.push({
      id,
      type: 'info',
      message,
      title,
      duration: 5000,
      dismissable: true,
    });
    notifyListeners();
    setTimeout(() => {
      standaloneToasts = standaloneToasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 5000);
    return id;
  },

  /**
   * Dismiss toast by ID
   */
  dismiss: (id: string) => {
    standaloneToasts = standaloneToasts.filter((t) => t.id !== id);
    notifyListeners();
  },

  /**
   * Clear all toasts
   */
  clear: () => {
    standaloneToasts = [];
    notifyListeners();
  },

  /**
   * Subscribe to toast changes
   */
  subscribe: (listener: (toasts: ToastItem[]) => void) => {
    standaloneListeners.push(listener);
    return () => {
      standaloneListeners = standaloneListeners.filter((l) => l !== listener);
    };
  },
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default ToastProvider;
