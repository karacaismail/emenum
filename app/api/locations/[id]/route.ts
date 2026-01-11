/**
 * Individual Location API Route Handler
 *
 * Bu route handler, tekil lokasyon operasyonlarini yonetir (GET, PATCH, DELETE).
 * Admin/Dashboard tarafindan kullanilir (authentication gerektirir).
 *
 * Kullanim Senaryolari:
 * 1. Lokasyon detayini goruntuleme
 * 2. Lokasyon bilgilerini guncelleme
 * 3. Lokasyonu silme (soft delete)
 *
 * URL Formati:
 * GET /api/locations/[id]
 * PATCH /api/locations/[id]
 * DELETE /api/locations/[id]
 *
 * PATCH Request Body:
 * {
 *   "name": "string",      // Opsiyonel
 *   "slug": "string",      // Opsiyonel
 *   "address": "string",   // Opsiyonel
 *   "city": "string",      // Opsiyonel
 *   "phone": "string",     // Opsiyonel
 *   "email": "string",     // Opsiyonel
 *   "is_active": boolean   // Opsiyonel
 * }
 *
 * Response Format:
 * {
 *   "success": boolean,
 *   "data": Location | null,
 *   "message": string,
 *   "error": string | null
 * }
 *
 * Ozellikler:
 * - Authentication kontrolu
 * - Organization yetkisi kontrolu
 * - Slug format ve benzersizlik dogrulamasi (guncelleme icin)
 * - Soft delete (is_active = false)
 *
 * @see lib/db/locations.ts
 * @see lib/utils/slugify.ts
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type {
  Location,
  LocationUpdate,
} from '@/types';
import {
  getLocationById,
  getLocationWithOrganization,
  updateLocation,
  deleteLocation,
  isSlugAvailable,
} from '@/lib/db/locations';
import { validateSlug, normalizeSlug } from '@/lib/utils/slugify';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Route params
 */
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Update location request body
 */
interface UpdateLocationBody {
  name?: string;
  slug?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

/**
 * API response format
 */
interface LocationApiResponse {
  success: boolean;
  data?: Location | null;
  message: string;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum name length */
const MAX_NAME_LENGTH = 200;

/** Maximum address length */
const MAX_ADDRESS_LENGTH = 500;

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
  if (value === null) return null;
  if (!value || typeof value !== 'string') return undefined as unknown as null;

  const sanitized = value.trim().slice(0, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Validates update location request body
 */
function validateUpdateBody(body: unknown): {
  valid: boolean;
  error: string | null;
  data: UpdateLocationBody | null;
} {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Gecersiz istek formati.',
      data: null,
    };
  }

  const data = body as UpdateLocationBody;
  const updates: UpdateLocationBody = {};

  // name kontrolu (eger varsa)
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      return {
        valid: false,
        error: 'Lokasyon ismi string olmali.',
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

    updates.name = name;
  }

  // slug kontrolu (eger varsa)
  if (data.slug !== undefined) {
    const normalizedSlug = normalizeSlug(data.slug);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      return {
        valid: false,
        error: slugValidation.error || 'Gecersiz slug formati.',
        data: null,
      };
    }

    updates.slug = normalizedSlug;
  }

  // email kontrolu (eger varsa ve bos degilse)
  if (data.email !== undefined) {
    if (data.email !== null && data.email !== '') {
      if (!isValidEmail(data.email)) {
        return {
          valid: false,
          error: 'Gecersiz email formati.',
          data: null,
        };
      }
      updates.email = data.email.trim().toLowerCase();
    } else {
      updates.email = null;
    }
  }

  // is_active kontrolu
  if (data.is_active !== undefined) {
    if (typeof data.is_active !== 'boolean') {
      return {
        valid: false,
        error: 'is_active boolean olmali.',
        data: null,
      };
    }
    updates.is_active = data.is_active;
  }

  // Diger alanlari dogrudan ekle
  if (data.address !== undefined) {
    updates.address = sanitizeString(data.address, MAX_ADDRESS_LENGTH);
  }
  if (data.city !== undefined) {
    updates.city = sanitizeString(data.city, 100);
  }
  if (data.state !== undefined) {
    updates.state = sanitizeString(data.state, 100);
  }
  if (data.postal_code !== undefined) {
    updates.postal_code = sanitizeString(data.postal_code, 20);
  }
  if (data.phone !== undefined) {
    updates.phone = sanitizeString(data.phone, 50);
  }

  // En az bir alan guncellenecek mi kontrol et
  if (Object.keys(updates).length === 0) {
    return {
      valid: false,
      error: 'Guncellenecek alan bulunamadi.',
      data: null,
    };
  }

  return {
    valid: true,
    error: null,
    data: updates,
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
 * GET /api/locations/[id]
 *
 * Tekil lokasyon bilgisini getirir.
 *
 * @param request - Incoming request
 * @param params - Route parameters containing location id
 * @returns JSON response with location data
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: locationId } = await params;

    // Location ID kontrolu
    if (!locationId || !isValidUUID(locationId)) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Gecersiz lokasyon ID\'si.',
          error: 'Invalid location ID format',
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

    // Lokasyonu ve organizasyon bilgisini getir
    const locationWithOrg = await getLocationWithOrganization(locationId);

    if (!locationWithOrg) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Lokasyon bulunamadi.',
          error: 'Location not found',
        },
        { status: 404 }
      );
    }

    // Organization erisim kontrolu
    const hasAccess = await checkOrganizationAccess(
      supabase,
      user.id,
      locationWithOrg.organization_id
    );
    if (!hasAccess) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Bu lokasyona erisim yetkiniz yok.',
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // organization alanini cikar, sadece Location don
    const { organization: _, ...location } = locationWithOrg;

    return NextResponse.json<LocationApiResponse>(
      {
        success: true,
        data: location,
        message: 'Lokasyon basariyla getirildi.',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json<LocationApiResponse>(
      {
        success: false,
        message: 'Lokasyon getirilirken bir hata olustu.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/locations/[id]
 *
 * Lokasyon bilgilerini gunceller.
 *
 * @param request - Incoming request
 * @param params - Route parameters containing location id
 * @returns JSON response with updated location
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: locationId } = await params;

    // Location ID kontrolu
    if (!locationId || !isValidUUID(locationId)) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Gecersiz lokasyon ID\'si.',
          error: 'Invalid location ID format',
        },
        { status: 400 }
      );
    }

    // Request body parse
    let body: UpdateLocationBody;
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
    const validation = validateUpdateBody(body);
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

    // Mevcut lokasyonu getir
    const existingLocation = await getLocationById(locationId);

    if (!existingLocation) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Lokasyon bulunamadi.',
          error: 'Location not found',
        },
        { status: 404 }
      );
    }

    // Organization erisim kontrolu
    const hasAccess = await checkOrganizationAccess(
      supabase,
      user.id,
      existingLocation.organization_id
    );
    if (!hasAccess) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Bu lokasyona erisim yetkiniz yok.',
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Slug benzersizlik kontrolu (eger slug degistirildiyse)
    if (validatedData.slug && validatedData.slug !== existingLocation.slug) {
      const slugAvailable = await isSlugAvailable(
        existingLocation.organization_id,
        validatedData.slug,
        locationId
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
    }

    // Lokasyonu guncelle
    const updateData: LocationUpdate = {};

    // Sadece undefined olmayan alanlari ekle
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.city !== undefined) updateData.city = validatedData.city;
    if (validatedData.state !== undefined) updateData.state = validatedData.state;
    if (validatedData.postal_code !== undefined) updateData.postal_code = validatedData.postal_code;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;

    const result = await updateLocation(locationId, updateData);

    if (!result.success || !result.location) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: result.error || 'Lokasyon guncellenemedi.',
          error: result.error || 'Update failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<LocationApiResponse>(
      {
        success: true,
        data: result.location,
        message: 'Lokasyon basariyla guncellendi.',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json<LocationApiResponse>(
      {
        success: false,
        message: 'Lokasyon guncellenirken bir hata olustu.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]
 *
 * Lokasyonu siler (soft delete).
 * CRITICAL: Hard delete yapmaz, sadece is_active = false yapar.
 *
 * @param request - Incoming request
 * @param params - Route parameters containing location id
 * @returns JSON response with success status
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: locationId } = await params;

    // Location ID kontrolu
    if (!locationId || !isValidUUID(locationId)) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Gecersiz lokasyon ID\'si.',
          error: 'Invalid location ID format',
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

    // Mevcut lokasyonu getir
    const existingLocation = await getLocationById(locationId);

    if (!existingLocation) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Lokasyon bulunamadi.',
          error: 'Location not found',
        },
        { status: 404 }
      );
    }

    // Organization erisim kontrolu
    const hasAccess = await checkOrganizationAccess(
      supabase,
      user.id,
      existingLocation.organization_id
    );
    if (!hasAccess) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: 'Bu lokasyona erisim yetkiniz yok.',
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Lokasyonu sil (soft delete)
    const result = await deleteLocation(locationId);

    if (!result.success) {
      return NextResponse.json<LocationApiResponse>(
        {
          success: false,
          message: result.error || 'Lokasyon silinemedi.',
          error: result.error || 'Delete failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<LocationApiResponse>(
      {
        success: true,
        data: null,
        message: 'Lokasyon basariyla silindi.',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json<LocationApiResponse>(
      {
        success: false,
        message: 'Lokasyon silinirken bir hata olustu.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/locations/[id]
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
