/**
 * Next.js Middleware for Authentication & Session Management
 *
 * Bu middleware aşağıdaki işlevleri gerçekleştirir:
 * 1. Session refresh - Her istekte Supabase oturumunu yeniler
 * 2. Protected routes - Kimliği doğrulanmamış kullanıcıları login'e yönlendirir
 * 3. Admin koruması - Super admin olmayanları admin panelden uzak tutar
 * 4. Public routes - Menü ve auth sayfalarına serbest erişim sağlar
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Public routes - kimlik doğrulama gerektirmeyen yollar
 * Bu yollara herkes erişebilir
 */
const PUBLIC_ROUTES = [
  '/', // Landing page
  '/login',
  '/register',
  '/auth/callback',
  '/menu', // Public menu pages (/menu/[slug])
];

/**
 * Protected routes - kimlik doğrulama gerektiren yollar
 * Giriş yapmamış kullanıcılar login'e yönlendirilir
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
  '/products',
  '/categories',
  '/tables',
  '/waiter',
  '/audit',
];

/**
 * Admin routes - super admin yetkisi gerektiren yollar
 * Sadece is_super_admin=true olan kullanıcılar erişebilir
 */
const ADMIN_ROUTES = ['/admin'];

/**
 * Supabase session'ını günceller ve gerekli cookie'leri ayarlar
 * Bu fonksiyon her request'te çağrılmalıdır
 */
async function updateSession(request: NextRequest) {
  // Response'u başlat - cookie'ler buraya yazılacak
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Middleware için Supabase client oluştur
  // NOT: Bu, server.ts'den farklıdır çünkü middleware'de
  // cookie'leri NextResponse üzerinden yönetmemiz gerekir
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Request cookies'e de ekle (Server Components için)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Response'u yeniden oluştur ve cookie'leri ekle
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    }
  );

  // CRITICAL: getUser() kullanarak session'ı doğrula
  // getSession() sunucu tarafında güvenli değildir çünkü
  // JWT token doğrulaması yapmaz
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { response, user, error, supabase };
}

/**
 * Verilen pathname'in belirtilen route'lardan biriyle eşleşip eşleşmediğini kontrol eder
 */
function matchesRoutes(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    // Exact match veya prefix match (alt sayfalar için)
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

/**
 * Ana middleware fonksiyonu
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static dosyaları ve API route'larını atla
  // (config.matcher'da da belirtilmiş ama ekstra güvenlik için)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // .css, .js, .png vb.
  ) {
    return NextResponse.next();
  }

  // Session'ı güncelle
  const { response, user, supabase } = await updateSession(request);

  // Public routes - herkes erişebilir
  if (matchesRoutes(pathname, PUBLIC_ROUTES)) {
    // Eğer kullanıcı giriş yapmışsa ve login/register'a gidiyorsa
    // dashboard'a yönlendir
    if (user && (pathname === '/login' || pathname === '/register')) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return response;
  }

  // Admin routes - super admin kontrolü
  if (matchesRoutes(pathname, ADMIN_ROUTES)) {
    if (!user) {
      // Kullanıcı giriş yapmamış - login'e yönlendir
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Super admin kontrolü - users tablosundan is_super_admin kontrolü
    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_super_admin) {
      // Super admin değil - dashboard'a yönlendir
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    return response;
  }

  // Protected routes - giriş kontrolü
  if (matchesRoutes(pathname, PROTECTED_ROUTES)) {
    if (!user) {
      // Kullanıcı giriş yapmamış - login'e yönlendir
      // redirectTo parametresi ile giriş sonrası dönüş yolunu kaydet
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // Diğer tüm route'lar için session güncellemesiyle devam et
  return response;
}

/**
 * Middleware config
 * Hangi route'larda middleware'in çalışacağını belirler
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
