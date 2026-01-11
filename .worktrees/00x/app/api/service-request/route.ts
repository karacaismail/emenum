/**
 * Service Request API Route Handler
 *
 * Bu route handler, musterinin garson cagirma veya hesap isteme isteklerini isler.
 * Public menu sayfasindan cagirilir (authentication gerektirmez).
 *
 * Kullanim Senaryolari:
 * 1. Musteri menuden "Garson Cagir" butonuna bastiginda
 * 2. Musteri menuden "Hesap Iste" butonuna bastiginda
 * 3. Harici entegrasyonlar icin API endpoint
 *
 * URL Formati:
 * POST /api/service-request
 *
 * Request Body:
 * {
 *   "table_id": "uuid",           // QR koddan alinan masa UUID'si
 *   "request_type": "waiter_call" | "bill_request" | "other",
 *   "notes": "optional string"    // Opsiyonel notlar
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "request_id": string | null,
 *   "cooldown_remaining": number  // Eger cooldown varsa kalan saniye
 * }
 *
 * Ozellikler:
 * - table_id UUID format kontrolu
 * - 30 saniye cooldown (spam onleme)
 * - Organization waiter_call ozellik kontrolu (paket bazli)
 * - RLS ile guvenli masa ve organizasyon erisimi
 *
 * @see supabase/migrations/004_tables_service_requests.sql
 * @see components/menu/CallWaiterButton.tsx
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Request body for service request
 */
interface ServiceRequestBody {
  table_id: string;
  request_type?: 'waiter_call' | 'bill_request' | 'other';
  notes?: string;
}

/**
 * Result from create_service_request RPC
 */
interface CreateServiceRequestResult {
  success: boolean;
  message: string;
  request_id: string | null;
}

/**
 * API response format
 */
interface ServiceRequestResponse {
  success: boolean;
  message: string;
  request_id?: string | null;
  cooldown_remaining?: number;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cooldown duration in seconds */
const COOLDOWN_SECONDS = 30;

/** Maximum notes length */
const MAX_NOTES_LENGTH = 500;

/** Valid request types */
const VALID_REQUEST_TYPES = ['waiter_call', 'bill_request', 'other'] as const;

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
 * Validates request type
 * @param type - Request type to validate
 * @returns true if valid request type
 */
function isValidRequestType(
  type: unknown
): type is (typeof VALID_REQUEST_TYPES)[number] {
  if (typeof type !== 'string') return false;
  return VALID_REQUEST_TYPES.includes(
    type as (typeof VALID_REQUEST_TYPES)[number]
  );
}

/**
 * Sanitizes notes field
 * @param notes - Notes to sanitize
 * @returns Sanitized notes or null
 */
function sanitizeNotes(notes: unknown): string | null {
  if (!notes || typeof notes !== 'string') return null;

  // Trim and limit length
  const sanitized = notes.trim().slice(0, MAX_NOTES_LENGTH);

  // Return null if empty after sanitization
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Get Turkish error message for common errors
 */
function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'Masa bulunamadi veya aktif degil.':
      'Masa bulunamadi veya aktif degil. Lutfen QR kodu tekrar okutun.',
    'Bu ozellik mevcut paketinizde aktif degil.':
      'Garson cagirma ozelligi bu isletmenin paketinde aktif degil.',
    'Lutfen 30 saniye bekleyin.':
      'Cok hizli istek gonderdiniz. Lutfen 30 saniye bekleyin.',
  };

  return errorMessages[error] || error;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/service-request
 *
 * Public menu sayfasindan garson cagirma/hesap isteme istegi olusturur.
 *
 * @param request - Incoming request
 * @returns JSON response with success status
 *
 * @example Successful request
 * ```json
 * // Request
 * POST /api/service-request
 * { "table_id": "123e4567-e89b-4456-a456-426614174000", "request_type": "waiter_call" }
 *
 * // Response (201 Created)
 * { "success": true, "message": "Garson cagrildi!", "request_id": "..." }
 * ```
 *
 * @example Cooldown active
 * ```json
 * // Response (429 Too Many Requests)
 * { "success": false, "message": "Lutfen 30 saniye bekleyin.", "cooldown_remaining": 15 }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ServiceRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message: 'Gecersiz istek formati.',
          error: 'Invalid JSON body',
        },
        { status: 400 }
      );
    }

    // Validate table_id
    const { table_id, request_type = 'waiter_call', notes } = body;

    if (!table_id) {
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message: 'Masa bilgisi eksik.',
          error: 'table_id is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(table_id)) {
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message: 'Gecersiz masa bilgisi. Lutfen QR kodu tekrar okutun.',
          error: 'Invalid table_id format',
        },
        { status: 400 }
      );
    }

    // Validate request_type
    if (!isValidRequestType(request_type)) {
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message: 'Gecersiz istek turu.',
          error: `Invalid request_type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Sanitize notes
    const sanitizedNotes = sanitizeNotes(notes);

    // Create Supabase client
    const cookieStore = await cookies();
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
              // Cookie yazimi basarisiz olabilir
            }
          },
        },
      }
    );

    // Call the create_service_request RPC function
    // This function handles:
    // - Table validation (active table, active organization)
    // - Feature check (module_waiter_call)
    // - Cooldown check (30 seconds)
    // - Service request creation
    // - Table status update (needs_service)
    const { data, error } = await supabase.rpc('create_service_request', {
      p_qr_uuid: table_id,
      p_request_type: request_type,
      p_notes: sanitizedNotes,
      p_cooldown_seconds: COOLDOWN_SECONDS,
    });

    if (error) {
      // Handle Supabase errors
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message: 'Servis istegi olusturulamadi.',
          error: error.message,
        },
        { status: 500 }
      );
    }

    // The RPC returns a table with success, message, request_id
    const result = data?.[0] as CreateServiceRequestResult | undefined;

    if (!result) {
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message: 'Sunucudan yanit alinamadi.',
          error: 'Empty response from RPC',
        },
        { status: 500 }
      );
    }

    // Handle RPC response
    if (result.success) {
      // Success - return 201 Created
      return NextResponse.json<ServiceRequestResponse>(
        {
          success: true,
          message: request_type === 'bill_request' ? 'Hesap isteginiz iletildi!' : 'Garson cagrildi!',
          request_id: result.request_id,
        },
        { status: 201 }
      );
    } else {
      // RPC returned failure (cooldown, feature check, or table not found)
      const message = getErrorMessage(result.message);

      // Determine appropriate status code
      let statusCode = 400;
      let cooldownRemaining: number | undefined;

      if (result.message.includes('saniye bekleyin')) {
        // Cooldown active - 429 Too Many Requests
        statusCode = 429;

        // Extract remaining seconds from message if possible
        const match = result.message.match(/(\d+)\s*saniye/);
        cooldownRemaining = match && match[1] ? parseInt(match[1], 10) : COOLDOWN_SECONDS;
      } else if (result.message.includes('paketinizde aktif degil')) {
        // Feature not available - 403 Forbidden
        statusCode = 403;
      } else if (result.message.includes('bulunamadi')) {
        // Table not found - 404 Not Found
        statusCode = 404;
      }

      return NextResponse.json<ServiceRequestResponse>(
        {
          success: false,
          message,
          cooldown_remaining: cooldownRemaining,
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json<ServiceRequestResponse>(
      {
        success: false,
        message: 'Beklenmeyen bir hata olustu.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/service-request
 *
 * Returns API documentation and health check.
 * Useful for testing if the endpoint is available.
 *
 * @returns JSON with API documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'Service Request API',
    description: 'API for creating waiter call and bill request from public menu',
    version: '1.0.0',
    endpoints: {
      POST: {
        path: '/api/service-request',
        description: 'Create a new service request',
        body: {
          table_id: {
            type: 'string (UUID)',
            required: true,
            description: 'Table QR UUID from URL parameter',
          },
          request_type: {
            type: "'waiter_call' | 'bill_request' | 'other'",
            required: false,
            default: 'waiter_call',
            description: 'Type of service request',
          },
          notes: {
            type: 'string',
            required: false,
            maxLength: 500,
            description: 'Optional notes for the request',
          },
        },
        responses: {
          201: 'Request created successfully',
          400: 'Invalid request (missing or invalid parameters)',
          403: 'Feature not available in organization plan',
          404: 'Table not found or inactive',
          429: 'Cooldown active (too many requests)',
          500: 'Server error',
        },
      },
    },
    cooldown: `${COOLDOWN_SECONDS} seconds between requests from same table`,
  });
}

/**
 * OPTIONS /api/service-request
 *
 * CORS preflight handler.
 * Allows cross-origin requests from any origin (for public menu).
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
