/**
 * Location Menu Error Boundary
 *
 * Next.js error.tsx file that handles runtime errors
 * on the location-specific menu page with a user-friendly error UI.
 *
 * This catches errors that occur during rendering and
 * provides a way for users to recover.
 */

'use client';

import { useEffect } from 'react';
import { ErrorBoundaryFallback, NetworkError, useOnlineStatus } from '@/components/menu';

interface LocationMenuErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocationMenuError({ error, reset }: LocationMenuErrorProps) {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Log error to an error reporting service (optional)
    // In production, you might want to send this to Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'development') {
      console.error('Location menu page error:', error);
    }
  }, [error]);

  // If offline, show offline message
  if (!isOnline) {
    return (
      <NetworkError
        title="Baglanti Yok"
        message="Internet baglantiniz kesilmis gorunuyor. Menu yuklenemedi."
        onRetry={reset}
      />
    );
  }

  // Check if it's a network-related error
  const isNetworkError =
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError');

  if (isNetworkError) {
    return (
      <NetworkError
        title="Baglanti Hatasi"
        message="Menu sunucusuna baglanilamadi. Lutfen internet baglantinizi kontrol edin."
        onRetry={reset}
      />
    );
  }

  // Generic error fallback
  return (
    <ErrorBoundaryFallback
      error={error}
      resetErrorBoundary={reset}
    />
  );
}
