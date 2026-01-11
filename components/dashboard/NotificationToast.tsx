/**
 * NotificationToast Component
 *
 * Servis istekleri icin ozel toast/popup bildirimi.
 * Yeni garson cagirma ve hesap isteklerini gosterir.
 *
 * Ozellikler:
 * - Masa numarasi ve ismi gosterimi
 * - Timestamp (ne zaman geldi)
 * - Istek tipi ikonu ve etiketi
 * - Sesli uyari entegrasyonu
 * - Bekle suresi gosterimi (otomatik guncellenir)
 * - Tamamla/Kapat aksiyonlari
 * - Acil durum vurgusu (urgency levels)
 *
 * @example
 * ```tsx
 * // Provider kullanimi (dashboard layout'ta)
 * <ServiceNotificationProvider organizationId={orgId}>
 *   <DashboardContent />
 * </ServiceNotificationProvider>
 *
 * // Hook ile kullanim
 * const { notifications, dismiss, dismissAll } = useServiceNotifications();
 *
 * // Manuel toast gosterimi
 * <NotificationToast
 *   tableNumber="5"
 *   tableName="Pencere Kenari"
 *   requestType="waiter_call"
 *   timestamp={new Date()}
 *   onComplete={() => handleComplete()}
 *   onDismiss={() => handleDismiss()}
 * />
 * ```
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  notificationService,
  formatNotificationTime,
  formatRequestType,
  getRequestTypeIcon,
} from '@/lib/services/notification';
import type { ServiceRequestType } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Notification toast props
 */
export interface NotificationToastProps {
  /** Unique notification ID */
  id?: string;
  /** Table number */
  tableNumber: string;
  /** Table name (optional) */
  tableName?: string | null;
  /** Table section (optional) */
  section?: string | null;
  /** Request type */
  requestType: ServiceRequestType;
  /** Request timestamp */
  timestamp: Date;
  /** Additional notes */
  notes?: string | null;
  /** Waiting time in seconds */
  waitingSeconds?: number;
  /** Auto dismiss after ms (0 = never) */
  duration?: number;
  /** Called when complete action clicked */
  onComplete?: () => void;
  /** Called when dismiss clicked */
  onDismiss?: () => void;
  /** Show complete action button */
  showCompleteAction?: boolean;
}

/**
 * Service notification data
 */
export interface ServiceNotification {
  /** Unique ID */
  id: string;
  /** Table ID */
  tableId?: string;
  /** Table number */
  tableNumber: string;
  /** Table name */
  tableName?: string | null;
  /** Section */
  section?: string | null;
  /** Request type */
  requestType: ServiceRequestType;
  /** Notes */
  notes?: string | null;
  /** Created timestamp */
  timestamp: Date;
  /** Waiting seconds (auto-updated) */
  waitingSeconds: number;
}

/**
 * Notification context value
 */
export interface ServiceNotificationContextValue {
  /** Active notifications */
  notifications: ServiceNotification[];
  /** Add a new notification */
  addNotification: (notification: Omit<ServiceNotification, 'id' | 'waitingSeconds'>) => string;
  /** Dismiss a notification */
  dismiss: (id: string) => void;
  /** Dismiss all notifications */
  dismissAll: () => void;
  /** Sound enabled state */
  soundEnabled: boolean;
  /** Toggle sound */
  toggleSound: () => void;
  /** Unread count */
  unreadCount: number;
}

/**
 * Provider props
 */
export interface ServiceNotificationProviderProps {
  /** Children */
  children: ReactNode;
  /** Organization ID for realtime subscription */
  organizationId?: string;
  /** Position of toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Maximum visible notifications */
  maxVisible?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Position styles for container
 */
const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

/**
 * Request type badge colors
 */
const requestTypeColors: Record<ServiceRequestType, string> = {
  waiter_call: 'bg-primary-100 text-primary-800 border-primary-200',
  bill_request: 'bg-amber-100 text-amber-800 border-amber-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

/**
 * Urgency level colors
 */
const urgencyColors = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

/**
 * Urgency levels based on waiting time
 */
function getUrgencyLevel(seconds: number): 'low' | 'medium' | 'high' | 'critical' {
  if (seconds < 60) return 'low';      // < 1 min
  if (seconds < 180) return 'medium';  // 1-3 min
  if (seconds < 300) return 'high';    // 3-5 min
  return 'critical';                    // > 5 min
}

/**
 * Format waiting time for display
 */
function formatWaitingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sn`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes} dk ${secs} sn` : `${minutes} dk`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
  }
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Bell: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Check: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Clock: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Table: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Volume: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  VolumeOff: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  ),
};

// =============================================================================
// NOTIFICATION TOAST COMPONENT
// =============================================================================

/**
 * Single notification toast component
 */
export function NotificationToast({
  id,
  tableNumber,
  tableName,
  section,
  requestType,
  timestamp,
  notes,
  waitingSeconds: initialWaitingSeconds,
  duration = 0,
  onComplete,
  onDismiss,
  showCompleteAction = true,
}: NotificationToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(
    initialWaitingSeconds ?? Math.floor((Date.now() - timestamp.getTime()) / 1000)
  );

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.();
    }, 200);
  }, [onDismiss]);

  const handleComplete = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete?.();
    }, 200);
  }, [onComplete]);

  // Auto-update waiting time
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleDismiss]);

  const urgencyLevel = getUrgencyLevel(waitingSeconds);
  const typeColor = requestTypeColors[requestType];
  const urgencyColor = urgencyColors[urgencyLevel];

  return (
    <div
      className={`
        relative w-full max-w-sm bg-white rounded-lg shadow-lg border border-gray-200
        border-l-4 ${urgencyColor}
        transition-all duration-200 overflow-hidden
        ${isExiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'}
        ${urgencyLevel === 'critical' ? 'animate-pulse' : ''}
      `}
      role="alert"
      aria-live="assertive"
      data-notification-id={id}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        {/* Request Type Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${typeColor}`}>
          {getRequestTypeIcon(requestType)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Table Number & Name */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              Masa {tableNumber}
            </span>
            {tableName && (
              <span className="text-sm text-gray-500 truncate">
                ({tableName})
              </span>
            )}
          </div>

          {/* Request Type */}
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeColor}`}>
              {formatRequestType(requestType)}
            </span>
            {section && (
              <span className="text-xs text-gray-500">
                {section}
              </span>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Bildirimi kapat"
        >
          <Icons.X />
        </button>
      </div>

      {/* Notes */}
      {notes && (
        <div className="px-4 pb-2">
          <p className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1 italic">
            &quot;{notes}&quot;
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100">
        {/* Time Info */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Timestamp */}
          <span title={timestamp.toLocaleString('tr-TR')}>
            {formatNotificationTime(timestamp)}
          </span>

          {/* Waiting Time */}
          <span className={`flex items-center gap-1 font-medium ${
            urgencyLevel === 'critical' ? 'text-red-600' :
            urgencyLevel === 'high' ? 'text-orange-600' :
            urgencyLevel === 'medium' ? 'text-yellow-600' :
            'text-gray-600'
          }`}>
            <Icons.Clock className="w-3 h-3" />
            {formatWaitingTime(waitingSeconds)}
          </span>
        </div>

        {/* Actions */}
        {showCompleteAction && (
          <button
            type="button"
            onClick={handleComplete}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <Icons.Check />
            Tamamla
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CONTEXT
// =============================================================================

const ServiceNotificationContext = createContext<ServiceNotificationContextValue | null>(null);

// =============================================================================
// NOTIFICATION CONTAINER
// =============================================================================

interface NotificationContainerProps {
  notifications: ServiceNotification[];
  position: string;
  onDismiss: (id: string) => void;
  onComplete?: (id: string) => void;
  maxVisible: number;
}

function NotificationContainer({
  notifications,
  position,
  onDismiss,
  onComplete,
  maxVisible,
}: NotificationContainerProps) {
  if (typeof window === 'undefined') return null;

  const visibleNotifications = notifications.slice(0, maxVisible);
  const hiddenCount = Math.max(0, notifications.length - maxVisible);

  return createPortal(
    <div
      className={`fixed z-[100] ${positionStyles[position]} flex flex-col gap-3 pointer-events-none`}
      style={{ maxHeight: 'calc(100vh - 2rem)' }}
      role="region"
      aria-label="Bildirimler"
    >
      {visibleNotifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationToast
            id={notification.id}
            tableNumber={notification.tableNumber}
            tableName={notification.tableName}
            section={notification.section}
            requestType={notification.requestType}
            timestamp={notification.timestamp}
            notes={notification.notes}
            waitingSeconds={notification.waitingSeconds}
            onDismiss={() => onDismiss(notification.id)}
            onComplete={onComplete ? () => onComplete(notification.id) : undefined}
            showCompleteAction={!!onComplete}
          />
        </div>
      ))}

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <div className="pointer-events-auto">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 px-4 py-2 text-center">
            <span className="text-sm text-gray-600">
              +{hiddenCount} daha fazla bildirim
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Service Notification Provider
 *
 * Provides notification context for the dashboard.
 * Automatically shows toast popups for new service requests.
 */
export function ServiceNotificationProvider({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  organizationId,
  position = 'top-right',
  maxVisible = 5,
}: ServiceNotificationProviderProps) {
  // Note: organizationId reserved for future Realtime subscription integration
  // Current implementation uses manual notification triggers via addNotification()
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification service and audio
  useEffect(() => {
    notificationService.initialize();
    setSoundEnabled(notificationService.isAudioEnabled());

    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.6;
    }

    return () => {
      notificationService.clearHandlers();
    };
  }, []);

  // Update waiting times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => prev.map(n => ({
        ...n,
        waitingSeconds: n.waitingSeconds + 1,
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Add new notification
   */
  const addNotification = useCallback((
    notification: Omit<ServiceNotification, 'id' | 'waitingSeconds'>
  ): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const waitingSeconds = Math.floor((Date.now() - notification.timestamp.getTime()) / 1000);

    const newNotification: ServiceNotification = {
      ...notification,
      id,
      waitingSeconds,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Play audio notification
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed - user hasn't interacted with page
      });
    }

    // Also notify through notification service
    notificationService.notifyNewRequest({
      tableNumber: notification.tableNumber,
      tableName: notification.tableName,
      section: notification.section,
      requestType: notification.requestType,
      timestamp: notification.timestamp,
      notes: notification.notes,
    });

    return id;
  }, [soundEnabled]);

  /**
   * Dismiss notification
   */
  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Dismiss all notifications
   */
  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Toggle sound
   */
  const toggleSound = useCallback(() => {
    const newState = notificationService.toggleAudio();
    setSoundEnabled(newState);
  }, []);

  const value: ServiceNotificationContextValue = {
    notifications,
    addNotification,
    dismiss,
    dismissAll,
    soundEnabled,
    toggleSound,
    unreadCount: notifications.length,
  };

  return (
    <ServiceNotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notifications={notifications}
        position={position}
        onDismiss={dismiss}
        maxVisible={maxVisible}
      />
    </ServiceNotificationContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Use service notifications context
 */
export function useServiceNotifications(): ServiceNotificationContextValue {
  const context = useContext(ServiceNotificationContext);

  if (!context) {
    throw new Error('useServiceNotifications must be used within ServiceNotificationProvider');
  }

  return context;
}

/**
 * Safe version that returns null when outside provider
 */
export function useServiceNotificationsSafe(): ServiceNotificationContextValue | null {
  return useContext(ServiceNotificationContext);
}

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

/**
 * Sound toggle button component
 */
export function SoundToggleButton({ className = '' }: { className?: string }) {
  const context = useServiceNotificationsSafe();

  if (!context) return null;

  const { soundEnabled, toggleSound } = context;

  return (
    <button
      type="button"
      onClick={toggleSound}
      className={`p-2 rounded-lg transition-colors ${
        soundEnabled
          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } ${className}`}
      title={soundEnabled ? 'Sesi kapat' : 'Sesi ac'}
      aria-label={soundEnabled ? 'Bildirimlerin sesini kapat' : 'Bildirimlerin sesini ac'}
    >
      {soundEnabled ? <Icons.Volume /> : <Icons.VolumeOff />}
    </button>
  );
}

/**
 * Notification count badge component
 */
export function NotificationCountBadge({ className = '' }: { className?: string }) {
  const context = useServiceNotificationsSafe();

  if (!context || context.unreadCount === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
        text-xs font-bold text-white bg-red-500 rounded-full ${className}`}
    >
      {context.unreadCount > 99 ? '99+' : context.unreadCount}
    </span>
  );
}

/**
 * Notification bell with count badge
 */
export function NotificationBell({ className = '' }: { className?: string }) {
  const context = useServiceNotificationsSafe();

  return (
    <div className={`relative ${className}`}>
      <Icons.Bell className="w-6 h-6 text-gray-600" />
      {context && context.unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {context.unreadCount > 9 ? '9+' : context.unreadCount}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default NotificationToast;
