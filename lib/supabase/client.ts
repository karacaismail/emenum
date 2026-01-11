/**
 * Browser Supabase Client
 *
 * Bu dosya client-side (browser) Supabase bağlantısı için kullanılır.
 * Client Components içinde import edilmeli.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 *
 * export function MyComponent() {
 *   const supabase = createClient();
 *   // supabase ile işlem yap
 * }
 * ```
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
