/**
 * Auth Callback Route Handler
 *
 * Bu route handler, OAuth callbacks ve email confirmation redirects'i yonetir.
 *
 * Kullanim Senaryolari:
 * 1. Email dogrulama sonrasi redirect
 * 2. OAuth provider (Google, GitHub vb.) sonrasi redirect
 * 3. Magic link girisi sonrasi redirect
 * 4. Password reset sonrasi redirect
 *
 * URL Formati:
 * /auth/callback?code=XXX&redirectTo=/dashboard
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /auth/callback
 *
 * Supabase Auth callback'ini isler ve kullaniciyi yonlendirir.
 *
 * @param request - Incoming request with auth code and optional redirectTo
 * @returns Redirect response to dashboard or specified redirectTo
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // Auth code'u URL'den al
  const code = requestUrl.searchParams.get('code');

  // Yonlendirme hedefini al (varsayilan: /dashboard)
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  // Error bilgilerini al (Supabase bazi durumlarda error gonderir)
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Hata varsa login sayfasina yonlendir
  if (error) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set(
      'error',
      errorDescription || 'Kimlik dogrulama hatasi olustu.'
    );
    return NextResponse.redirect(loginUrl);
  }

  // Code yoksa login sayfasina yonlendir
  if (!code) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'Gecersiz dogrulama baglantisi.');
    return NextResponse.redirect(loginUrl);
  }

  // Cookie store'u al (Next.js 15'te async)
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
            // Route Handler'da cookie yazimi basarisiz olabilir.
            // Bu durumda session middleware tarafindan set edilir.
          }
        },
      },
    }
  );

  // Auth code'u session ile degistir
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    // Kod degisimi basarisiz - login sayfasina yonlendir
    const loginUrl = new URL('/login', requestUrl.origin);

    // Hata mesajini Turkcele
    let errorMessage = 'Oturum olusturulamadi. Lutfen tekrar deneyin.';

    if (exchangeError.message.includes('expired')) {
      errorMessage = 'Dogrulama baglantisi suresi dolmus. Lutfen tekrar kayit olun.';
    } else if (exchangeError.message.includes('invalid')) {
      errorMessage = 'Gecersiz dogrulama baglantisi. Lutfen tekrar deneyin.';
    } else if (exchangeError.message.includes('already')) {
      errorMessage = 'Bu baglanti zaten kullaniIdi. Lutfen giris yapin.';
    }

    loginUrl.searchParams.set('error', errorMessage);
    return NextResponse.redirect(loginUrl);
  }

  // Basarili - hedef sayfaya yonlendir
  // redirectTo'nun guvenli bir URL oldugunu dogrula (sadece relative path'ler)
  let finalRedirect = redirectTo;

  // Guvenlik: Sadece relative path'lere izin ver
  // Absolute URL'ler veya protocol-relative URL'ler (//) reddedilir
  if (
    !finalRedirect.startsWith('/') ||
    finalRedirect.startsWith('//') ||
    finalRedirect.includes('://')
  ) {
    finalRedirect = '/dashboard';
  }

  // Admin veya auth sayfarina redirect engellemek
  // (kullanici zaten giris yapti, bu sayfalara gitmeye gerek yok)
  if (finalRedirect === '/login' || finalRedirect === '/register') {
    finalRedirect = '/dashboard';
  }

  const redirectUrl = new URL(finalRedirect, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
