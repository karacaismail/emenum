/**
 * Location API Route Handler
 *
 * Bu route handler, lokasyon CRUD operasyonlarini yonetir.
 * Admin/Dashboard tarafindan kullanilir (authentication gerektirir).
 *
 * Kullanim Senaryolari:
 * 1. Dashboard'da lokasyon listesi goruntuleme
 * 2. Yeni lokasyon olusturma
 *
 * URL Formati:
 * GET /api/locations?organization_id=uuid
 * POST /api/locations
 *
 * GET Query Parameters:
 * - organization_id: UUID (required) - Organizasyon ID'si
 * - active_only: boolean (optional) - Sadece aktif lokasyonlar
 * - limit: number (optional) - Sayfa basi kayit sayisi (default: 100)
 * - offset: number (optional) - Atlanacak kayit sayisi (default: 0)
 *
 * POST Request Body:
 * {
 *   "organization_id": "uuid",  // Zorunlu
 *   "name": "string",           // Zorunlu
 *   "slug": "string",           // Zorunlu (URL-safe)
 *   "address": "string",        // Opsiyonel
 *   "city": "string",           // Opsiyonel
 *   "phone": "string",          // Opsiyonel
 *   "email": "string"           // Opsiyonel
 * }
 *
 * Response Format:
 * {
 *   "success": boolean,
 *   "data": Location | Location[] | null,
 *   "message": string,
 *   "error": string | null
 * }
 *
 * Ozellikler:
 * - Authentication kontrolu
 * - Organization yetkisi kontrolu
 * - Slug format ve benzersizlik dogrulamasi
 * - Pagination destegi (GET)
 *
 * @see lib/db/locations.ts
 * @see lib/utils/slugify.ts
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type {
  Location,
  LocationInsert,
} from '@/types';
import {
  getLocationsByOrganization,
  createLocation,
  isSlugAvailable,
  type GetLocationsParams,
} from '@/lib/db/locations';
import { validateSlug, generateSlug } from '@/lib/utils/slugify';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Create location request body
 */
interface CreateLocationBody {
  organization_id: string;
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
}

/**
 * API response format
 */
interface LocationApiResponse {
  success: boolean;
  data?: Location | Location[] | null;
  message: string;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total?: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum name length */
const MAX_NAME_LENGTH = 200;

/** Maximum slug length */
const MAX_SLUG_LENGTH = 100;

/** Maximum address length */
const MAX_ADDRESS_LENGTH = 500;

/** Default pagination limit */
const DEFAULT_LIMIT = 100;

/** Maximum pagination limit */
const MAX_LIMIT = 500;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates UUID v4 format
 * @param uuid - String to validate
 * @returns true if valid UUID v4
 */
function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;

  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidV4Regex.test(uuid);
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid email
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes string field
 * @param value - Value to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized string or null
 */
function sanitizeString(value: unknown, maxLength: number): string | null {
  if (!value || typeof value !== 'string') return null;

  const sanitized = value.trim().slice(0, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Validates create location request body
 */
function validateCreateBody(body: unknown): {
  valid: boolean;
  error: string | null;
  data: CreateLocationBody | null;
} {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Gecersiz istek formati.',
      data: null,
    };
  }

  const data = body as CreateLocationBody;

  // organization_id kontrolu
  if (!data.organization_id) {
    return {
      valid: false,
      error: 'Organizasyon ID\'si zorunludur.',
      data: null,
    };
  }

  if (!isValidUUID(data.organization_id)) {
    return {
      valid: false,
      error: 'Gecersiz organizasyon ID\'si formati.',
      data: null,
    };
  }

  // name kontrolu
  if (!data.name || typeof data.name !== 'string') {
    return {
      valid: false,
      error: 'Lokasyon ismi zorunludur.',
      data: null,
    };
  }

  const name = data.name.trim();
  if (name.length < 2) {
    return {
      valid: false,
      error: 'Lokasyon ismi en az 2 karakter olmali.',
      data: null,
    };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Lokasyon ismi en fazla ${MAX_NAME_LENGTH} karakter olmali.`,
      data: null,
    };
  }

  // slug kontrolu (opsiyonel - eger verilmezse isimden olusturulur)
  let slug = data.slug;
  if (slug) {
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return {
        valid: false,
        error: slugValidation.error || 'Gecersiz slug formati.',
        data: null,
      };
    }
  } else {
    // Isimden slug olustur
    slug = generateSlug(name);
    if (!slug || slug.length < 2) {
      return {
        valid: false,
        error: 'Lokasyon ismi gecerli bir slug olusturulamiyor.',
        data: null,
      };
    }
  }

  // email kontrolu (eger varsa)
  if (data.email && !isValidEmail(data.email)) {
    return {
      valid: false,
      error: 'Gecersiz email formati.',
      data: null,
    };
  }

  return {
    valid: true,
    error: null,
    data: {
      ...data,
      name,
      slug,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates Supabase client for route handlers
 */
async function createRouteSupabaseClient() {
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
            // Cookie yazimi basarisiz olabilir
          }
        },
      },
    }
  );
}

/**
 * Check if user has access to organization
 */
async function checkOrganizationAccess(
  supabase: Awaited<ReturnType<typeof createRouteSupabaseClient>>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return false;
  }

  // Only owner, admin, or manager can manage locations
  const allowedRoles = ['owner', 'admin', 'manager'];
  return allowedRoles.includes(data.role);
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/locations
 *
 * Organizasyona ait lokasyonlarin listesini getirir.
 *
 * @param request - Incoming request
 * @returns JSON response with location list
 *
 * @example Query parameters
 * GET /api/locations?organization_id=uuid&active_only=true&limit=10&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    // Query parametrelerini al
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const activeOnly = searchParams.get('active_only') === 'true';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // organization_id kontrolu
    if (!organizationId) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Organizasyon ID\'si zorunludur.',
          error: 'organization_id query parameter is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Gecersiz organizasyon ID\'si formati.',
          error: 'Invalid organization_id format',
        },
        { status: 400 }
      );
    }

    // Supabase client olustur ve auth kontrolu yap
    const supabase = await createRouteSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Oturum acmaniz gerekiyor.',
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Organization erisim kontrolu
    const hasAccess = await checkOrganizationAccess(supabase, user.id, organizationId);
    if (!hasAccess) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Bu organizasyona erisim yetkiniz yok.',
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Pagination parametrelerini isle
    let limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    let offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (isNaN(offset) || offset < 0) offset = 0;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    // Lokasyonlari getir
    const params: GetLocationsParams = {
      activeOnly,
      limit,
      offset,
    };

    const locations = await getLocationsByOrganization(organizationId, params);

    return NextResponse.json<LocationApiResponse>(
      {
        success: true,
        data: locations,
        message: `${locations.length} lokasyon bulundu.`,
        pagination: {
          limit,
          offset,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json<LocationApiResponse>(
      {
        success: false,
        message: 'Lokasyonlar getirilirken bir hata olustu.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations
 *
 * Yeni lokasyon olusturur.
 *
 * @param request - Incoming request
 * @returns JSON response with created location
 *
 * @example Request body
 * {
 *   "organization_id": "uuid",
 *   "name": "Downtown Branch",
 *   "slug": "downtown-branch",
 *   "address": "123 Main St",
 *   "city": "Istanbul",
 *   "phone": "+90 555 123 4567"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Request body parse
    let body: CreateLocationBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Gecersiz istek formati.',
          error: 'Invalid JSON body',
        },
        { status: 400 }
      );
    }

    // Body validasyonu
    const validation = validateCreateBody(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: validation.error || 'Gecersiz istek.',
          error: validation.error || 'Validation failed',
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Supabase client olustur ve auth kontrolu yap
    const supabase = await createRouteSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Oturum acmaniz gerekiyor.',
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Organization erisim kontrolu
    const hasAccess = await checkOrganizationAccess(
      supabase,
      user.id,
      validatedData.organization_id
    );
    if (!hasAccess) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Bu organizasyona erisim yetkiniz yok.',
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Slug benzersizlik kontrolu
    const slugAvailable = await isSlugAvailable(
      validatedData.organization_id,
      validatedData.slug!
    );
    if (!slugAvailable) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Bu slug zaten kullanimda. Lutfen farkli bir slug secin.',
          error: 'Slug already exists',
        },
        { status: 409 }
      );
    }

    // Lokasyon verilerini hazirla
    const locationData: LocationInsert = {
      organization_id: validatedData.organization_id,
      name: validatedData.name,
      slug: validatedData.slug!,
      address: sanitizeString(validatedData.address, MAX_ADDRESS_LENGTH),
      city: sanitizeString(validatedData.city, 100),
      state: sanitizeString(validatedData.state, 100),
      postal_code: sanitizeString(validatedData.postal_code, 20),
      phone: sanitizeString(validatedData.phone, 50),
      email: validatedData.email ? validatedData.email.trim().toLowerCase() : null,
      is_active: true,
    };

    // Lokasyonu olustur
    const result = await createLocation(locationData);

    if (!result.success || !result.location) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: result.error || 'Lokasyon olusturulamadi.',
          error: result.error || 'Create failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<LocationApiResponse>(
      {
        success: true,
        data: result.location,
        message: 'Lokasyon basariyla olusturuldu.',
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json<LocationApiResponse>(
      {
        success: false,
        message: 'Lokasyon olusturulurken bir hata olustu.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/locations
 *
 * CORS preflight handler.
 *
 * @returns Empty response with CORS headers
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
