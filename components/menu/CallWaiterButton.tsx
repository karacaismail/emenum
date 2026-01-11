/**
 * CallWaiterButton Component
 *
 * Button component for customers to call a waiter from the public menu.
 * Inserts into service_requests table with table_id.
 * Includes 30-second cooldown (last_ping_at check) to prevent spam.
 *
 * Features:
 * - Uses table context from QR code scan (useTableContext hook)
 * - Calls create_service_request RPC which handles cooldown on server-side
 * - Client-side cooldown tracking for instant feedback
 * - Loading, success, error, and cooldown states
 * - Accessible with ARIA labels and keyboard navigation
 * - Mobile-first responsive design
 * - Turkish localized messages
 *
 * @example
 * ```tsx
 * import { CallWaiterButton } from '@/components/menu';
 *
 * function MenuPage() {
 *   return (
 *     <div>
 *       <MenuContent />
 *       <CallWaiterButton />
 *     </div>
 *   );
 * }
 * ```
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTableContext, isValidTableId } from '@/hooks/useTableContext';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cooldown duration in seconds */
const COOLDOWN_SECONDS = 30;

/** localStorage key for tracking last call time */
const LAST_CALL_STORAGE_KEY = 'last_waiter_call';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Request type for service request
 */
export type ServiceRequestType = 'waiter_call' | 'bill_request' | 'other';

/**
 * Result from create_service_request RPC
 */
interface CreateServiceRequestResult {
  success: boolean;
  message: string;
  request_id: string | null;
}

/**
 * Button state
 */
type ButtonState = 'idle' | 'loading' | 'success' | 'error' | 'cooldown';

/**
 * CallWaiterButton props
 */
export interface CallWaiterButtonProps {
  /** Request type (default: 'waiter_call') */
  requestType?: ServiceRequestType;
  /** Optional note to include with the request */
  notes?: string;
  /** Whether to show the button when not at a table */
  showWhenNoTable?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Custom success message */
  successMessage?: string;
  /** Custom cooldown message function */
  cooldownMessage?: (seconds: number) => string;
  /** Callback when request is successful */
  onSuccess?: (requestId: string) => void;
  /** Callback when request fails */
  onError?: (error: string) => void;
  /** Additional className for styling */
  className?: string;
  /** Button variant */
  variant?: 'primary' | 'floating' | 'compact';
  /** Whether to show bill request option */
  showBillRequest?: boolean;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  Receipt: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
      />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Loader: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the remaining cooldown time in seconds
 * Returns 0 if no cooldown active
 */
function getRemainingCooldown(tableId: string): number {
  if (!isLocalStorageAvailable()) return 0;

  try {
    const key = `${LAST_CALL_STORAGE_KEY}_${tableId}`;
    const lastCallTime = localStorage.getItem(key);

    if (!lastCallTime) return 0;

    const lastCall = parseInt(lastCallTime, 10);
    const now = Date.now();
    const elapsed = Math.floor((now - lastCall) / 1000);
    const remaining = COOLDOWN_SECONDS - elapsed;

    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/**
 * Save the current call time to localStorage
 */
function saveCallTime(tableId: string): void {
  if (!isLocalStorageAvailable()) return;

  try {
    const key = `${LAST_CALL_STORAGE_KEY}_${tableId}`;
    localStorage.setItem(key, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// CUSTOM HOOK: useCooldown
// =============================================================================

/**
 * Hook to manage cooldown timer
 */
function useCooldown(tableId: string | null) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize and update cooldown
  useEffect(() => {
    if (!tableId) {
      setRemainingSeconds(0);
      return;
    }

    // Get initial remaining time
    const initial = getRemainingCooldown(tableId);
    setRemainingSeconds(initial);

    // If in cooldown, start interval
    if (initial > 0) {
      intervalRef.current = setInterval(() => {
        const remaining = getRemainingCooldown(tableId);
        setRemainingSeconds(remaining);

        if (remaining <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tableId]);

  // Start cooldown after successful call
  const startCooldown = useCallback(() => {
    if (!tableId) return;

    saveCallTime(tableId);
    setRemainingSeconds(COOLDOWN_SECONDS);

    // Start countdown interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const remaining = getRemainingCooldown(tableId);
      setRemainingSeconds(remaining);

      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);
  }, [tableId]);

  return {
    remainingSeconds,
    isInCooldown: remainingSeconds > 0,
    startCooldown,
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CallWaiterButton component
 *
 * Button for customers to call a waiter from the public menu.
 * Uses the table context from QR code scan and calls the create_service_request RPC.
 *
 * @example Basic usage
 * ```tsx
 * <CallWaiterButton />
 * ```
 *
 * @example With bill request option
 * ```tsx
 * <CallWaiterButton showBillRequest />
 * ```
 *
 * @example Floating variant
 * ```tsx
 * <CallWaiterButton variant="floating" />
 * ```
 *
 * @example With callbacks
 * ```tsx
 * <CallWaiterButton
 *   onSuccess={(id) => console.log('Request created:', id)}
 *   onError={(error) => console.error('Error:', error)}
 * />
 * ```
 */
export function CallWaiterButton({
  requestType = 'waiter_call',
  notes,
  showWhenNoTable = false,
  buttonText,
  successMessage = 'Garson cagrildi!',
  cooldownMessage = (seconds) => `${seconds} saniye bekleyin`,
  onSuccess,
  onError,
  className = '',
  variant = 'primary',
  showBillRequest = false,
}: CallWaiterButtonProps) {
  const { tableId, isLoading: tableLoading, hasTableContext } = useTableContext();
  const { remainingSeconds, isInCooldown, startCooldown } = useCooldown(tableId);

  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRequestType, setActiveRequestType] = useState<ServiceRequestType>(requestType);

  // Reset state after success/error display
  useEffect(() => {
    if (buttonState === 'success' || buttonState === 'error') {
      const timeout = setTimeout(() => {
        setButtonState(isInCooldown ? 'cooldown' : 'idle');
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [buttonState, isInCooldown]);

  // Update button state when cooldown changes
  useEffect(() => {
    if (isInCooldown && buttonState === 'idle') {
      setButtonState('cooldown');
    } else if (!isInCooldown && buttonState === 'cooldown') {
      setButtonState('idle');
    }
  }, [isInCooldown, buttonState]);

  /**
   * Handle calling the waiter
   */
  const handleCall = useCallback(async (type: ServiceRequestType = activeRequestType) => {
    if (!tableId || !isValidTableId(tableId)) {
      setButtonState('error');
      setErrorMessage('Masa bilgisi bulunamadi. Lutfen QR kodu tekrar okutun.');
      onError?.('Masa bilgisi bulunamadi');
      return;
    }

    if (isInCooldown) {
      setButtonState('cooldown');
      return;
    }

    setButtonState('loading');
    setActiveRequestType(type);

    try {
      const supabase = createClient();

      // Call the create_service_request RPC function
      // This function handles cooldown check on server-side too
      const { data, error } = await supabase.rpc('create_service_request', {
        p_qr_uuid: tableId,
        p_request_type: type,
        p_notes: notes || null,
        p_cooldown_seconds: COOLDOWN_SECONDS,
      });

      if (error) {
        throw new Error(error.message);
      }

      // The RPC returns a table with success, message, request_id
      const result = data?.[0] as CreateServiceRequestResult | undefined;

      if (!result) {
        throw new Error('Sunucudan yanit alinamadi');
      }

      if (result.success) {
        setButtonState('success');
        startCooldown();
        onSuccess?.(result.request_id || '');
      } else {
        // Server-side cooldown or feature check failed
        setButtonState('error');
        setErrorMessage(result.message);
        onError?.(result.message);

        // If it's a cooldown message from server, start local cooldown too
        if (result.message.includes('saniye bekleyin')) {
          startCooldown();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata olustu';
      setButtonState('error');
      setErrorMessage(message);
      onError?.(message);
    }
  }, [tableId, isInCooldown, activeRequestType, notes, onSuccess, onError, startCooldown]);

  // Don't render if no table context and showWhenNoTable is false
  if (!showWhenNoTable && !tableLoading && !hasTableContext) {
    return null;
  }

  // Loading state while checking table context
  if (tableLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  // Get button content based on state
  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <Icons.Loader />
            <span>Gonderiliyor...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Icons.Check />
            <span>{successMessage}</span>
          </>
        );
      case 'error':
        return (
          <>
            <Icons.X />
            <span>{errorMessage || 'Hata olustu'}</span>
          </>
        );
      case 'cooldown':
        return (
          <>
            <Icons.Clock />
            <span>{cooldownMessage(remainingSeconds)}</span>
          </>
        );
      default:
        return (
          <>
            <Icons.Bell />
            <span>{buttonText || (activeRequestType === 'bill_request' ? 'Hesap Iste' : 'Garson Cagir')}</span>
          </>
        );
    }
  };

  // Get button classes based on state and variant
  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses = {
      primary: 'px-6 py-3 rounded-lg text-base',
      floating: 'fixed bottom-6 right-6 px-6 py-4 rounded-full shadow-lg z-50 text-base',
      compact: 'px-4 py-2 rounded-md text-sm',
    };

    const stateClasses = {
      idle: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800',
      loading: 'bg-primary-400 text-white cursor-wait',
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      cooldown: 'bg-gray-400 text-white cursor-not-allowed',
    };

    return `${baseClasses} ${variantClasses[variant]} ${stateClasses[buttonState]}`;
  };

  return (
    <div className={`${variant === 'floating' ? '' : 'flex flex-col items-stretch gap-2'} ${className}`}>
      {/* Main Call Button */}
      <button
        type="button"
        onClick={() => handleCall('waiter_call')}
        disabled={buttonState === 'loading' || buttonState === 'cooldown'}
        className={getButtonClasses()}
        aria-label={
          buttonState === 'cooldown'
            ? `Garson cagirmak icin ${remainingSeconds} saniye bekleyin`
            : 'Garson cagir'
        }
        aria-busy={buttonState === 'loading'}
        aria-disabled={buttonState === 'loading' || buttonState === 'cooldown'}
      >
        {getButtonContent()}
      </button>

      {/* Bill Request Button (optional) */}
      {showBillRequest && variant !== 'floating' && buttonState === 'idle' && (
        <button
          type="button"
          onClick={() => handleCall('bill_request')}
          disabled={isInCooldown}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-base font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
          aria-label="Hesap iste"
        >
          <Icons.Receipt />
          <span>Hesap Iste</span>
        </button>
      )}

      {/* No Table Warning */}
      {!hasTableContext && showWhenNoTable && (
        <p className="text-sm text-amber-600 text-center mt-2">
          <Icons.User />
          <span className="ml-1">Garson cagirmak icin QR kodu okutun</span>
        </p>
      )}
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * FloatingCallButton - Fixed position call waiter button
 *
 * @example
 * ```tsx
 * <FloatingCallButton />
 * ```
 */
export function FloatingCallButton(props: Omit<CallWaiterButtonProps, 'variant'>) {
  return <CallWaiterButton {...props} variant="floating" />;
}

/**
 * CompactCallButton - Smaller call waiter button for inline use
 *
 * @example
 * ```tsx
 * <CompactCallButton />
 * ```
 */
export function CompactCallButton(props: Omit<CallWaiterButtonProps, 'variant'>) {
  return <CallWaiterButton {...props} variant="compact" />;
}

/**
 * BillRequestButton - Button specifically for requesting the bill
 *
 * @example
 * ```tsx
 * <BillRequestButton />
 * ```
 */
export function BillRequestButton(props: Omit<CallWaiterButtonProps, 'requestType' | 'buttonText'>) {
  return (
    <CallWaiterButton
      {...props}
      requestType="bill_request"
      buttonText="Hesap Iste"
      successMessage="Hesap istegi iletildi!"
    />
  );
}

/**
 * CallWaiterSection - Full section with both waiter call and bill request buttons
 *
 * @example
 * ```tsx
 * <CallWaiterSection />
 * ```
 */
export function CallWaiterSection({
  className = '',
  ...props
}: Omit<CallWaiterButtonProps, 'variant' | 'showBillRequest'>) {
  return (
    <section
      className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 ${className}`}
      aria-labelledby="call-waiter-section-title"
    >
      <h3
        id="call-waiter-section-title"
        className="text-lg font-semibold text-gray-900 mb-4 text-center"
      >
        Servis
      </h3>
      <CallWaiterButton {...props} variant="primary" showBillRequest />
    </section>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default CallWaiterButton;
