/**
 * Logout API Route Handler
 *
 * Bu route handler, kullanici oturumunu sonlandirir ve session'i temizler.
 *
 * Kullanim Senaryolari:
 * 1. Dashboard'dan cikis butonu
 * 2. Oturum zaman asimi sonrasi zorla cikis
 * 3. Hesap silme oncesi oturum temizleme
 *
 * URL Formati:
 * POST /api/auth/logout
 * GET /api/auth/logout (redirect destegi icin)
 *
 * @see https://supabase.com/docs/guides/auth/signout
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Oturumu sonlandirir ve JSON response doner.
 * Client-side JavaScript ile kullanim icin uygundur.
 *
 * @param request - Incoming request
 * @returns JSON response with success status
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Supabase client olustur (route handler icin ozel)
  const supabase = createServerClient(
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
            // Cookie yazimi basarisiz olabilir, middleware tarafindan set edilir.
          }
        },
      },
    }
  );

  // Oturumu sonlandir
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Oturum kapatilirken bir hata olustu.',
        details: error.message,
      },
      { status: 500 }
    );
  }

  // Basarili cikis
  return NextResponse.json({
    success: true,
    message: 'Oturum basariyla kapatildi.',
    redirectTo: '/',
  });
}

/**
 * GET /api/auth/logout
 *
 * Oturumu sonlandirir ve landing page'e yonlendirir.
 * Form action veya direct link ile kullanim icin uygundur.
 *
 * @param request - Incoming request
 * @returns Redirect response to landing page
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();

  // Supabase client olustur (route handler icin ozel)
  const supabase = createServerClient(
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
            // Cookie yazimi basarisiz olabilir, middleware tarafindan set edilir.
          }
        },
      },
    }
  );

  // Oturumu sonlandir
  await supabase.auth.signOut();

  // Landing page'e yonlendir
  const redirectUrl = new URL('/', requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
