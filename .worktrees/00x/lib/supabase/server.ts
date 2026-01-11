/**
 * Server Supabase Client
 *
 * Bu dosya server-side (Server Components, Route Handlers, Server Actions)
 * Supabase bağlantısı için kullanılır.
 *
 * NOT: Bu fonksiyon async'dir çünkü Next.js 15'te cookies() artık
 * async bir fonksiyondur.
 *
 * @example
 * ```tsx
 * // Server Component veya Route Handler içinde
 * import { createServerSupabaseClient } from '@/lib/supabase/server';
 *
 * export default async function Page() {
 *   const supabase = await createServerSupabaseClient();
 *   const { data } = await supabase.from('products').select();
 *   // ...
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component'ta setAll çağrılabilir ama yazma başarısız olabilir.
            // Bu durum Middleware veya Route Handler'da düzeltilir.
          }
        },
      },
    }
  );
}
