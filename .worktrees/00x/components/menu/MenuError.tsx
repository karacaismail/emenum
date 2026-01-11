/**
 * MenuError Components
 *
 * Error state components for the public menu page.
 * Handles various error scenarios with appropriate UI feedback.
 *
 * Features:
 * - Invalid slug error state
 * - Organization not found error
 * - Inactive organization error
 * - Offline/disconnected state
 * - Network error state
 * - Generic error with retry option
 * - Mobile-first responsive design
 * - Turkish localization
 * - Accessible error messages
 *
 * @example
 * ```tsx
 * import { InvalidSlugError, OfflineMessage } from '@/components/menu';
 *
 * // In error boundary or error handling
 * if (isOffline) return <OfflineMessage onRetry={refetch} />;
 * if (!organization) return <InvalidSlugError slug={slug} />;
 * ```
 */

'use client';

import { useEffect, useState, useCallback, ReactNode } from 'react';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message?: string;
  /** Retry callback function */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Additional className */
  className?: string;
  /** Children elements for custom content */
  children?: ReactNode;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Warning: ({ className = 'w-10 h-10' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  WifiOff: ({ className = 'w-10 h-10' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414"
      />
    </svg>
  ),
  SearchX: ({ className = 'w-10 h-10' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 7l4 4m0-4l-4 4"
      />
    </svg>
  ),
  LockClosed: ({ className = 'w-10 h-10' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  ServerError: ({ className = 'w-10 h-10' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  ),
  RefreshCw: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  Home: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  QrCode: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
      />
    </svg>
  ),
};

// =============================================================================
// ERROR WRAPPER COMPONENT
// =============================================================================

interface ErrorWrapperProps {
  icon: ReactNode;
  iconBgColor?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Base wrapper for error states with consistent layout
 */
function ErrorWrapper({
  icon,
  iconBgColor = 'bg-red-100',
  children,
  className = '',
}: ErrorWrapperProps) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gray-50 safe-top safe-bottom ${className}`}
    >
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16 text-center">
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full ${iconBgColor} flex items-center justify-center`}
        >
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// INVALID SLUG ERROR
// =============================================================================

export interface InvalidSlugErrorProps extends ErrorStateProps {
  /** The invalid slug that was requested */
  slug?: string;
}

/**
 * Error state for when the menu slug is invalid or not found
 */
export function InvalidSlugError({
  slug,
  title = 'Menu Bulunamadi',
  message = 'Aradiginiz menu mevcut degil. Lutfen QR kodu tekrar tarayin veya isletme ile iletisime gecin.',
  onRetry,
  isRetrying,
  className,
}: InvalidSlugErrorProps) {
  return (
    <ErrorWrapper
      icon={<Icons.SearchX className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />}
      className={className}
    >
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6">{message}</p>

      {slug && (
        <p className="text-xs text-gray-400 mb-4">
          Aranan: <code className="bg-gray-100 px-2 py-1 rounded">{slug}</code>
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Icons.RefreshCw className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Yeniden deneniyor...' : 'Tekrar Dene'}</span>
          </button>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Icons.Home />
          <span>Ana Sayfa</span>
        </Link>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Icons.QrCode />
          <span>QR Tekrar Tara</span>
        </button>
      </div>
    </ErrorWrapper>
  );
}

// =============================================================================
// ORGANIZATION INACTIVE ERROR
// =============================================================================

export interface OrganizationInactiveErrorProps extends ErrorStateProps {
  /** Organization name if available */
  organizationName?: string;
}

/**
 * Error state for when the organization is inactive or suspended
 */
export function OrganizationInactiveError({
  organizationName,
  title = 'Menu Gecici Olarak Kullanilamiyor',
  message = 'Bu isletmenin menusu gecici olarak aktif degil. Lutfen daha sonra tekrar deneyin.',
  className,
}: OrganizationInactiveErrorProps) {
  return (
    <ErrorWrapper
      icon={<Icons.LockClosed className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />}
      iconBgColor="bg-amber-100"
      className={className}
    >
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-4">{message}</p>

      {organizationName && (
        <p className="text-sm text-gray-500 mb-6">
          Isletme: <span className="font-medium">{organizationName}</span>
        </p>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Icons.Home />
        <span>Ana Sayfa</span>
      </Link>
    </ErrorWrapper>
  );
}

// =============================================================================
// OFFLINE MESSAGE
// =============================================================================

export interface OfflineMessageProps extends ErrorStateProps {
  /** Show as inline banner instead of full page */
  inline?: boolean;
}

/**
 * Message shown when the user is offline/disconnected
 */
export function OfflineMessage({
  title = 'Baglanti Yok',
  message = 'Internet baglantiniz kesilmis gorunuyor. Lutfen baglantiyi kontrol edin ve tekrar deneyin.',
  onRetry,
  isRetrying,
  inline = false,
  className,
}: OfflineMessageProps) {
  // For inline mode (banner)
  if (inline) {
    return (
      <div
        className={`bg-amber-50 border-l-4 border-amber-400 p-4 ${className}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Icons.WifiOff className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-amber-800">{title}</h3>
            <p className="mt-1 text-sm text-amber-700">{message}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 disabled:opacity-50"
            >
              <Icons.RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Deneniyor...' : 'Tekrar Dene'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full page mode
  return (
    <ErrorWrapper
      icon={<Icons.WifiOff className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />}
      iconBgColor="bg-amber-100"
      className={className}
    >
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <Icons.RefreshCw className={isRetrying ? 'animate-spin' : ''} />
          <span>{isRetrying ? 'Baglanti kontrol ediliyor...' : 'Tekrar Dene'}</span>
        </button>
      )}
    </ErrorWrapper>
  );
}

// =============================================================================
// NETWORK ERROR
// =============================================================================

/**
 * Generic network error state
 */
export function NetworkError({
  title = 'Bir Hata Olustu',
  message = 'Menuyu yuklerken bir sorun olustu. Lutfen birkaç saniye bekleyip tekrar deneyin.',
  onRetry,
  isRetrying,
  className,
}: ErrorStateProps) {
  return (
    <ErrorWrapper
      icon={<Icons.ServerError className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />}
      className={className}
    >
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6">{message}</p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            <Icons.RefreshCw className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Yeniden deneniyor...' : 'Tekrar Dene'}</span>
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Icons.RefreshCw />
          <span>Sayfayi Yenile</span>
        </button>
      </div>
    </ErrorWrapper>
  );
}

// =============================================================================
// GENERIC ERROR
// =============================================================================

/**
 * Generic error state with customizable content
 */
export function MenuError({
  title = 'Bir Hata Olustu',
  message = 'Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.',
  onRetry,
  isRetrying,
  children,
  className,
}: ErrorStateProps) {
  return (
    <ErrorWrapper
      icon={<Icons.Warning className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />}
      className={className}
    >
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6">{message}</p>

      {children}

      {onRetry && !children && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <Icons.RefreshCw className={isRetrying ? 'animate-spin' : ''} />
          <span>{isRetrying ? 'Yeniden deneniyor...' : 'Tekrar Dene'}</span>
        </button>
      )}
    </ErrorWrapper>
  );
}

// =============================================================================
// OFFLINE DETECTOR HOOK
// =============================================================================

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial state
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// =============================================================================
// OFFLINE AWARE WRAPPER
// =============================================================================

interface OfflineAwareWrapperProps {
  children: ReactNode;
  /** Show inline banner instead of replacing content */
  showBanner?: boolean;
  /** Custom offline message component */
  offlineComponent?: ReactNode;
}

/**
 * Wrapper component that shows offline message when disconnected
 */
export function OfflineAwareWrapper({
  children,
  showBanner = true,
  offlineComponent,
}: OfflineAwareWrapperProps) {
  const isOnline = useOnlineStatus();
  const [showRetrying, setShowRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setShowRetrying(true);
    // Check connection by attempting a fetch
    fetch('/api/health', { method: 'HEAD' })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        setShowRetrying(false);
      });
  }, []);

  if (!isOnline) {
    if (offlineComponent) {
      return <>{offlineComponent}</>;
    }

    if (showBanner) {
      return (
        <>
          <OfflineMessage
            inline
            onRetry={handleRetry}
            isRetrying={showRetrying}
          />
          {children}
        </>
      );
    }

    return <OfflineMessage onRetry={handleRetry} isRetrying={showRetrying} />;
  }

  return <>{children}</>;
}

// =============================================================================
// ERROR BOUNDARY FALLBACK
// =============================================================================

interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

/**
 * Fallback component for React Error Boundaries
 */
export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: ErrorBoundaryFallbackProps) {
  return (
    <ErrorWrapper
      icon={<Icons.Warning className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />}
    >
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
        Bir Hata Olustu
      </h1>
      <p className="text-sm sm:text-base text-gray-600 mb-4">
        Uygulama beklenmeyen bir hatayla karsilasti.
      </p>

      {error && process.env.NODE_ENV === 'development' && (
        <pre className="text-xs text-left bg-gray-100 p-3 rounded-lg mb-4 overflow-auto max-w-full">
          {error.message}
        </pre>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
          >
            <Icons.RefreshCw />
            <span>Tekrar Dene</span>
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Icons.RefreshCw />
          <span>Sayfayi Yenile</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Icons.Home />
          <span>Ana Sayfa</span>
        </Link>
      </div>
    </ErrorWrapper>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default MenuError;
