/**
 * Logout Button Component
 *
 * Kullanici oturumunu sonlandirmak icin kullanilan buton componenti.
 * Server Action kullanarak form-based logout yapar.
 *
 * @example
 * ```tsx
 * // Basit kullanim
 * <LogoutButton />
 *
 * // Ikon ile kullanim
 * <LogoutButton showIcon />
 *
 * // Compact kullanim (sadece ikon)
 * <LogoutButton iconOnly />
 *
 * // Custom class ile kullanim
 * <LogoutButton className="text-red-600" />
 * ```
 */

'use client';

import { useTransition } from 'react';
import { logout } from '@/lib/actions/auth';

interface LogoutButtonProps {
  /** Ikon gosterilsin mi */
  showIcon?: boolean;
  /** Sadece ikon gosterilsin mi (text olmadan) */
  iconOnly?: boolean;
  /** Ek CSS class'lari */
  className?: string;
  /** Buton varyanti */
  variant?: 'default' | 'danger' | 'ghost';
}

/**
 * Cikis yapma butonu
 *
 * Server Action kullanarak oturumu sonlandirir
 * ve landing page'e yonlendirir.
 */
export default function LogoutButton({
  showIcon = false,
  iconOnly = false,
  className = '',
  variant = 'default',
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  // Varyant class'lari
  const variantClasses = {
    default:
      'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
    danger:
      'text-red-600 hover:text-red-700 hover:bg-red-50',
    ghost:
      'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
  };

  // Base class'lar
  const baseClasses = `
    inline-flex items-center justify-center
    px-3 py-2 text-sm font-medium
    rounded-lg transition-colors
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  // Logout icon SVG
  const LogoutIcon = () => (
    <svg
      className={`w-5 h-5 ${!iconOnly ? 'mr-2' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );

  // Loading spinner
  const Spinner = () => (
    <svg
      className={`animate-spin w-5 h-5 ${!iconOnly ? 'mr-2' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
  );

  /**
   * Form submit handler
   * Server action'i transition ile calistirir
   */
  function handleSubmit() {
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <form action={handleSubmit}>
      <button
        type="submit"
        disabled={isPending}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        title={iconOnly ? 'Cikis Yap' : undefined}
        aria-label={iconOnly ? 'Cikis Yap' : undefined}
      >
        {isPending ? (
          <>
            <Spinner />
            {!iconOnly && 'Cikis yapiliyor...'}
          </>
        ) : (
          <>
            {(showIcon || iconOnly) && <LogoutIcon />}
            {!iconOnly && 'Cikis Yap'}
          </>
        )}
      </button>
    </form>
  );
}
