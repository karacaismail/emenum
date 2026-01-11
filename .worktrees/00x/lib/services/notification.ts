/**
 * Notification Service
 *
 * Servis istekleri icin bildirim sistemi.
 * Sesli uyari, toast bildirimleri ve browser notification destegi saglar.
 *
 * Ozellikler:
 * - Sesli uyari (Audio API)
 * - Browser Push Notification (Notification API)
 * - Bildirim gecmisi takibi
 * - Ses ayarlari (volume, mute)
 * - Notification permission yonetimi
 *
 * @example
 * ```tsx
 * import { notificationService } from '@/lib/services';
 *
 * // Yeni istek bildirimi
 * await notificationService.notifyNewRequest({
 *   tableNumber: '5',
 *   tableName: 'Pencere Kenari',
 *   requestType: 'waiter_call',
 *   timestamp: new Date(),
 * });
 *
 * // Ses ayarlari
 * notificationService.setVolume(0.7);
 * notificationService.mute();
 * notificationService.unmute();
 * ```
 */

import type { ServiceRequestType } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Notification type
 */
export type NotificationType = 'service_request' | 'info' | 'warning' | 'error';

/**
 * Request notification data
 */
export interface RequestNotificationData {
  /** Request ID */
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
}

/**
 * Generic notification data
 */
export interface NotificationData {
  /** Notification type */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Notification timestamp */
  timestamp: Date;
  /** Associated data */
  data?: RequestNotificationData;
  /** Duration in ms (0 = persistent) */
  duration?: number;
}

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
  /** Unique ID */
  id: string;
  /** Notification data */
  notification: NotificationData;
  /** Whether notification was read/dismissed */
  read: boolean;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Audio enabled */
  audioEnabled: boolean;
  /** Audio volume (0-1) */
  volume: number;
  /** Browser notifications enabled */
  browserNotificationsEnabled: boolean;
  /** Audio URL */
  audioUrl: string;
}

/**
 * Notification service event handlers
 */
export interface NotificationEventHandlers {
  /** Called when new notification is created */
  onNotification?: (notification: NotificationData) => void;
  /** Called when notification is dismissed */
  onDismiss?: (notificationId: string) => void;
  /** Called when settings change */
  onSettingsChange?: (settings: NotificationSettings) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default notification sound URL */
const DEFAULT_AUDIO_URL = '/sounds/notification.mp3';

/** Default volume level */
const DEFAULT_VOLUME = 0.6;

/** LocalStorage keys */
const STORAGE_KEYS = {
  settings: 'ozamenu_notification_settings',
  history: 'ozamenu_notification_history',
};

/** Request type labels in Turkish */
const REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  waiter_call: 'Garson Cagirma',
  bill_request: 'Hesap Istegi',
  other: 'Diger Istek',
};

/** Request type icons */
const REQUEST_TYPE_ICONS: Record<ServiceRequestType, string> = {
  waiter_call: '🔔',
  bill_request: '💳',
  other: '📝',
};

/** Maximum history entries to keep */
const MAX_HISTORY_ENTRIES = 50;

// =============================================================================
// NOTIFICATION SERVICE CLASS
// =============================================================================

/**
 * Notification Service
 *
 * Singleton class for managing notifications across the application.
 */
class NotificationService {
  private settings: NotificationSettings;
  private audio: HTMLAudioElement | null = null;
  private history: NotificationHistoryEntry[] = [];
  private handlers: NotificationEventHandlers = {};
  private isInitialized = false;

  constructor() {
    this.settings = {
      audioEnabled: true,
      volume: DEFAULT_VOLUME,
      browserNotificationsEnabled: false,
      audioUrl: DEFAULT_AUDIO_URL,
    };
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the notification service
   * Must be called on client-side (e.g., in useEffect)
   */
  initialize(): void {
    if (typeof window === 'undefined') return;
    if (this.isInitialized) return;

    // Load settings from localStorage
    this.loadSettings();

    // Load history from localStorage
    this.loadHistory();

    // Initialize audio element
    this.initializeAudio();

    // Check browser notification permission
    this.checkNotificationPermission();

    this.isInitialized = true;
  }

  /**
   * Initialize audio element
   */
  private initializeAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      this.audio = new Audio(this.settings.audioUrl);
      this.audio.volume = this.settings.volume;
      this.audio.preload = 'auto';
    } catch {
      // Audio initialization failed - disable audio
      this.settings.audioEnabled = false;
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.settings);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationSettings>;
        this.settings = {
          ...this.settings,
          ...parsed,
        };
      }
    } catch {
      // Failed to load settings - use defaults
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(this.settings));
      this.handlers.onSettingsChange?.(this.settings);
    } catch {
      // Failed to save settings
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.history);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationHistoryEntry[];
        this.history = parsed.map(entry => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
          notification: {
            ...entry.notification,
            timestamp: new Date(entry.notification.timestamp),
          },
        }));
      }
    } catch {
      // Failed to load history - use empty
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    if (typeof window === 'undefined') return;

    try {
      // Keep only recent entries
      const recentHistory = this.history.slice(-MAX_HISTORY_ENTRIES);
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(recentHistory));
    } catch {
      // Failed to save history
    }
  }

  /**
   * Check browser notification permission
   */
  private checkNotificationPermission(): void {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      this.settings.browserNotificationsEnabled = false;
      return;
    }

    this.settings.browserNotificationsEnabled = Notification.permission === 'granted';
  }

  // ===========================================================================
  // PUBLIC METHODS - NOTIFICATIONS
  // ===========================================================================

  /**
   * Notify about a new service request
   */
  async notifyNewRequest(data: RequestNotificationData): Promise<void> {
    const notification: NotificationData = {
      type: 'service_request',
      title: `${REQUEST_TYPE_ICONS[data.requestType]} Masa ${data.tableNumber}`,
      message: this.formatRequestMessage(data),
      timestamp: data.timestamp,
      data,
      duration: 0, // Persistent until dismissed
    };

    await this.notify(notification);
  }

  /**
   * Show a generic notification
   */
  async notify(notification: NotificationData): Promise<string> {
    // Generate unique ID
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add to history
    const historyEntry: NotificationHistoryEntry = {
      id,
      notification,
      read: false,
      createdAt: new Date(),
    };
    this.history.push(historyEntry);
    this.saveHistory();

    // Play audio
    if (this.settings.audioEnabled) {
      await this.playSound();
    }

    // Show browser notification
    if (this.settings.browserNotificationsEnabled) {
      this.showBrowserNotification(notification);
    }

    // Call handler
    this.handlers.onNotification?.(notification);

    return id;
  }

  /**
   * Play notification sound
   */
  async playSound(): Promise<void> {
    if (!this.audio || !this.settings.audioEnabled) return;

    try {
      // Reset audio to start
      this.audio.currentTime = 0;
      await this.audio.play();
    } catch {
      // Audio play failed (user hasn't interacted with page)
      // This is expected behavior - browsers block autoplay
    }
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: NotificationData): void {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/notification-badge.png',
        tag: notification.type,
        requireInteraction: notification.duration === 0,
      });
    } catch {
      // Browser notification failed
    }
  }

  /**
   * Format request message
   */
  private formatRequestMessage(data: RequestNotificationData): string {
    const parts: string[] = [];

    parts.push(REQUEST_TYPE_LABELS[data.requestType]);

    if (data.tableName) {
      parts.push(`(${data.tableName})`);
    }

    if (data.section) {
      parts.push(`- ${data.section}`);
    }

    if (data.notes) {
      parts.push(`\n"${data.notes}"`);
    }

    return parts.join(' ');
  }

  // ===========================================================================
  // PUBLIC METHODS - SETTINGS
  // ===========================================================================

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };

    // Update audio volume if changed
    if (this.audio && newSettings.volume !== undefined) {
      this.audio.volume = newSettings.volume;
    }

    // Update audio URL if changed
    if (newSettings.audioUrl !== undefined) {
      this.initializeAudio();
    }

    this.saveSettings();
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.updateSettings({ volume: clampedVolume });
  }

  /**
   * Mute audio
   */
  mute(): void {
    this.updateSettings({ audioEnabled: false });
  }

  /**
   * Unmute audio
   */
  unmute(): void {
    this.updateSettings({ audioEnabled: true });
  }

  /**
   * Toggle audio
   */
  toggleAudio(): boolean {
    const newState = !this.settings.audioEnabled;
    this.updateSettings({ audioEnabled: newState });
    return newState;
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    return this.settings.audioEnabled;
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      this.settings.browserNotificationsEnabled = permission === 'granted';
      this.saveSettings();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // PUBLIC METHODS - HISTORY
  // ===========================================================================

  /**
   * Get notification history
   */
  getHistory(): NotificationHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return this.history.filter(entry => !entry.read).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const entry = this.history.find(e => e.id === notificationId);
    if (entry) {
      entry.read = true;
      this.saveHistory();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.history.forEach(entry => {
      entry.read = true;
    });
    this.saveHistory();
  }

  /**
   * Dismiss a notification
   */
  dismiss(notificationId: string): void {
    const index = this.history.findIndex(e => e.id === notificationId);
    if (index !== -1) {
      this.history.splice(index, 1);
      this.saveHistory();
      this.handlers.onDismiss?.(notificationId);
    }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  // ===========================================================================
  // PUBLIC METHODS - EVENT HANDLERS
  // ===========================================================================

  /**
   * Set event handlers
   */
  setHandlers(handlers: NotificationEventHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Clear event handlers
   */
  clearHandlers(): void {
    this.handlers = {};
  }

  // ===========================================================================
  // PUBLIC METHODS - TEST NOTIFICATION
  // ===========================================================================

  /**
   * Send a test notification (for settings testing)
   */
  async testNotification(): Promise<void> {
    await this.notifyNewRequest({
      tableNumber: '1',
      tableName: 'Test Masa',
      section: 'Test Bolum',
      requestType: 'waiter_call',
      timestamp: new Date(),
      notes: 'Bu bir test bildirimidir.',
    });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton notification service instance
 */
export const notificationService = new NotificationService();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format timestamp for display
 */
export function formatNotificationTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return 'Simdi';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} dk once`;
  } else if (diffHours < 24) {
    return `${diffHours} sa once`;
  } else {
    return timestamp.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * Format request type for display
 */
export function formatRequestType(type: ServiceRequestType): string {
  return REQUEST_TYPE_LABELS[type];
}

/**
 * Get request type icon
 */
export function getRequestTypeIcon(type: ServiceRequestType): string {
  return REQUEST_TYPE_ICONS[type];
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default notificationService;
