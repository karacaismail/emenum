/**
 * Auth Server Actions
 *
 * Next.js Server Actions for authentication operations.
 * Bu dosya client component'lardan dogrudan cagrilabilir.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { logout } from '@/lib/actions/auth';
 *
 * export default function LogoutButton() {
 *   return (
 *     <form action={logout}>
 *       <button type="submit">Cikis Yap</button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Kullanici oturumunu sonlandirir ve landing page'e yonlendirir.
 *
 * Kullanim Alanlari:
 * - Dashboard sidebar logout butonu
 * - User dropdown menu logout secenegi
 * - Mobile navigation logout linki
 *
 * @throws Redirect to '/' after successful logout
 */
export async function logout(): Promise<never> {
  const supabase = await createServerSupabaseClient();

  // Oturumu sonlandir
  await supabase.auth.signOut();

  // Landing page'e yonlendir
  redirect('/');
}

/**
 * Result type for auth actions that don't redirect
 */
export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Kullanici oturumunu sonlandirir (redirect olmadan).
 *
 * Bu versiyon client tarafindan programmatic olarak
 * logout sonrasi ozel islem yapmak isteyenler icin.
 *
 * @returns AuthActionResult with success status
 *
 * @example
 * ```tsx
 * 'use client';
 * import { logoutWithoutRedirect } from '@/lib/actions/auth';
 *
 * async function handleLogout() {
 *   const result = await logoutWithoutRedirect();
 *   if (result.success) {
 *     // Custom redirect or cleanup
 *     window.location.href = '/';
 *   }
 * }
 * ```
 */
export async function logoutWithoutRedirect(): Promise<AuthActionResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: 'Oturum kapatilirken bir hata olustu.',
      };
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      error: 'Beklenmeyen bir hata olustu.',
    };
  }
}
