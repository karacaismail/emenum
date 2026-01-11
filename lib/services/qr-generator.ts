/**
 * QR Code Generator Service
 *
 * Masa bazli QR kod olusturma ve indirme servisi.
 * QR kodlar menu URL + table_id parametresi icerir.
 *
 * URL Formatlari:
 * - Multi-location: /menu/{org}/{location}?table_id=...
 * - Legacy (single-location): /menu/{org}?table_id=...
 *
 * Bu servis hem server-side hem de client-side kullanim icin tasarlanmistir:
 * - Server-side: Buffer olarak QR kod olusturma (PDF, dosya sistemi)
 * - Client-side: Data URL olarak QR kod olusturma ve indirme
 *
 * @example
 * ```ts
 * import { generateTableQRCode, generateMenuUrl, downloadQRCode } from '@/lib/services/qr-generator';
 *
 * // Multi-location menu URL olustur
 * const menuUrl = generateMenuUrl('https://ozamenu.com', 'cafe-istanbul', 'uuid-here', 'kadikoy');
 * // => 'https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=uuid-here'
 *
 * // QR kod olustur (Data URL olarak) - multi-location
 * const dataUrl = await generateTableQRCode({
 *   baseUrl: 'https://ozamenu.com',
 *   organizationSlug: 'cafe-istanbul',
 *   locationSlug: 'kadikoy',
 *   tableId: 'uuid-here',
 * });
 *
 * // QR kodu indir (browser'da)
 * downloadQRCode(dataUrl.dataUrl, 'Masa_1.png');
 * ```
 */

import QRCode from 'qrcode';
import type { UUID } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * QR kod olusturma secenekleri
 */
export interface QRCodeOptions {
  /** QR kod genisligi piksel cinsinden (varsayilan: 256) */
  width?: number;
  /** QR kod kenar boslugu (varsayilan: 2) */
  margin?: number;
  /** Hata duzeltme seviyesi: L (7%), M (15%), Q (25%), H (30%) (varsayilan: 'M') */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Koyu renk (varsayilan: '#000000') */
  darkColor?: string;
  /** Acik renk (varsayilan: '#ffffff') */
  lightColor?: string;
}

/**
 * Masa QR kod olusturma parametreleri
 */
export interface GenerateTableQRParams {
  /** Uygulama base URL'i (ornegin: https://ozamenu.com) */
  baseUrl: string;
  /** Isletme slug'i (ornegin: cafe-istanbul) */
  organizationSlug: string;
  /** Lokasyon slug'i (ornegin: kadikoy-sube) - multi-location icin zorunlu */
  locationSlug?: string;
  /** Masa UUID'i (qr_uuid) */
  tableId: UUID;
  /** QR kod secenekleri (opsiyonel) */
  options?: QRCodeOptions;
}

/**
 * Genisletilmis QR kod olusturma parametreleri (boyut eklentili)
 */
export interface GenerateTableQRParamsWithSize extends GenerateTableQRParams {
  /** QR kod boyutu piksel cinsinden (varsayilan: 256) */
  size?: number;
}

/**
 * Toplu QR kod olusturma icin masa bilgisi
 */
export interface TableQRInfo {
  /** Masa ID'si */
  tableId: UUID;
  /** Masa qr_uuid (QR kodda kullanilir) */
  qrUuid: UUID;
  /** Masa numarasi (dosya adinda kullanilir) */
  tableNumber: string;
  /** Masa ismi (opsiyonel, dosya adinda kullanilir) */
  tableName?: string | null;
}

/**
 * QR kod sonucu
 */
export interface QRCodeResult {
  /** Basarili olup olmadigini belirtir */
  success: boolean;
  /** Data URL (basarili ise) */
  dataUrl: string | null;
  /** Menu URL */
  menuUrl: string;
  /** Hata mesaji (basarisiz ise) */
  error: string | null;
}

/**
 * Toplu QR kod sonucu
 */
export interface BulkQRCodeResult {
  /** Masa ID'si */
  tableId: UUID;
  /** QR kod data URL'i */
  dataUrl: string;
  /** Onerilen dosya adi */
  filename: string;
  /** Menu URL */
  menuUrl: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Varsayilan QR kod secenekleri */
const DEFAULT_QR_OPTIONS: Required<QRCodeOptions> = {
  width: 256,
  margin: 2,
  errorCorrectionLevel: 'M',
  darkColor: '#000000',
  lightColor: '#ffffff',
};

/** Yuksek cozunurluklu QR kod icin boyut */
export const HIGH_RES_SIZE = 512;

/** Standart QR kod icin boyut */
export const STANDARD_SIZE = 256;

/** Kucuk QR kod icin boyut (onizleme) */
export const PREVIEW_SIZE = 128;

// =============================================================================
// URL GENERATION
// =============================================================================

/**
 * Menu URL'i olusturur.
 *
 * Format: {baseUrl}/menu/{organizationSlug}/{locationSlug}?table_id={tableId}
 * Legacy (locationSlug olmadan): {baseUrl}/menu/{organizationSlug}?table_id={tableId}
 *
 * @param baseUrl - Uygulama base URL'i
 * @param organizationSlug - Isletme slug'i
 * @param tableId - Masa UUID'i (qr_uuid)
 * @param locationSlug - Lokasyon slug'i (opsiyonel, multi-location icin)
 * @returns Menu URL'i
 *
 * @example
 * ```ts
 * // Multi-location format
 * const url = generateMenuUrl('https://ozamenu.com', 'cafe-istanbul', 'abc-123', 'kadikoy');
 * // => 'https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=abc-123'
 *
 * // Legacy format (single-location, backward compatible)
 * const url = generateMenuUrl('https://ozamenu.com', 'cafe-istanbul', 'abc-123');
 * // => 'https://ozamenu.com/menu/cafe-istanbul?table_id=abc-123'
 * ```
 */
export function generateMenuUrl(
  baseUrl: string,
  organizationSlug: string,
  tableId: string,
  locationSlug?: string
): string {
  // URL'den trailing slash'leri temizle
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  // Slug'i encode et (ozel karakterler icin)
  const encodedOrgSlug = encodeURIComponent(organizationSlug);
  // Table ID'yi encode et (UUID'ler icin guvenli)
  const encodedTableId = encodeURIComponent(tableId);

  // Location slug varsa multi-location URL olustur
  if (locationSlug) {
    const encodedLocationSlug = encodeURIComponent(locationSlug);
    return `${cleanBaseUrl}/menu/${encodedOrgSlug}/${encodedLocationSlug}?table_id=${encodedTableId}`;
  }

  // Legacy single-location format (geriye uyumluluk)
  return `${cleanBaseUrl}/menu/${encodedOrgSlug}?table_id=${encodedTableId}`;
}

/**
 * Sadece menu URL'i olusturur (masa ID'siz).
 *
 * Format: {baseUrl}/menu/{organizationSlug}/{locationSlug}
 * Legacy: {baseUrl}/menu/{organizationSlug}
 *
 * @param baseUrl - Uygulama base URL'i
 * @param organizationSlug - Isletme slug'i
 * @param locationSlug - Lokasyon slug'i (opsiyonel, multi-location icin)
 * @returns Menu URL'i
 *
 * @example
 * ```ts
 * // Multi-location format
 * generateMenuUrlWithoutTable('https://ozamenu.com', 'cafe-istanbul', 'kadikoy');
 * // => 'https://ozamenu.com/menu/cafe-istanbul/kadikoy'
 *
 * // Legacy format
 * generateMenuUrlWithoutTable('https://ozamenu.com', 'cafe-istanbul');
 * // => 'https://ozamenu.com/menu/cafe-istanbul'
 * ```
 */
export function generateMenuUrlWithoutTable(
  baseUrl: string,
  organizationSlug: string,
  locationSlug?: string
): string {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const encodedOrgSlug = encodeURIComponent(organizationSlug);

  // Location slug varsa multi-location URL olustur
  if (locationSlug) {
    const encodedLocationSlug = encodeURIComponent(locationSlug);
    return `${cleanBaseUrl}/menu/${encodedOrgSlug}/${encodedLocationSlug}`;
  }

  // Legacy single-location format
  return `${cleanBaseUrl}/menu/${encodedOrgSlug}`;
}

// =============================================================================
// QR CODE GENERATION - DATA URL
// =============================================================================

/**
 * QR kod olusturur (Data URL olarak).
 *
 * Data URL, img src'de veya indirme icin kullanilabilir.
 * Client-side ve server-side'da calisir.
 *
 * @param url - QR kodun icerecegi URL
 * @param options - QR kod secenekleri
 * @returns Promise<string> - Base64 Data URL
 *
 * @example
 * ```ts
 * const dataUrl = await generateQRCodeDataUrl('https://example.com/menu/cafe?table_id=123');
 * // => 'data:image/png;base64,iVBORw0KGgo...'
 * ```
 */
export async function generateQRCodeDataUrl(
  url: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };

  return QRCode.toDataURL(url, {
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    color: {
      dark: mergedOptions.darkColor,
      light: mergedOptions.lightColor,
    },
  });
}

/**
 * Masa icin QR kod olusturur (Data URL olarak).
 *
 * @param params - QR kod parametreleri
 * @returns Promise<QRCodeResult> - QR kod sonucu
 *
 * @example
 * ```ts
 * const result = await generateTableQRCode({
 *   baseUrl: 'https://ozamenu.com',
 *   organizationSlug: 'cafe-istanbul',
 *   tableId: 'uuid-here',
 *   options: { width: 512, errorCorrectionLevel: 'H' }
 * });
 *
 * if (result.success) {
 *   console.log(result.dataUrl);
 * }
 * ```
 */
export async function generateTableQRCode(
  params: GenerateTableQRParams
): Promise<QRCodeResult> {
  const { baseUrl, organizationSlug, locationSlug, tableId, options = {} } = params;

  // Validate parameters
  if (!baseUrl) {
    return {
      success: false,
      dataUrl: null,
      menuUrl: '',
      error: 'Base URL gereklidir',
    };
  }

  if (!organizationSlug) {
    return {
      success: false,
      dataUrl: null,
      menuUrl: '',
      error: 'Isletme slug\'i gereklidir',
    };
  }

  if (!tableId) {
    return {
      success: false,
      dataUrl: null,
      menuUrl: '',
      error: 'Masa ID\'si gereklidir',
    };
  }

  try {
    const menuUrl = generateMenuUrl(baseUrl, organizationSlug, tableId, locationSlug);
    const dataUrl = await generateQRCodeDataUrl(menuUrl, options);

    return {
      success: true,
      dataUrl,
      menuUrl,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      dataUrl: null,
      menuUrl: generateMenuUrl(baseUrl, organizationSlug, tableId, locationSlug),
      error: error instanceof Error ? error.message : 'QR kod olusturulamadi',
    };
  }
}

/**
 * Basitlestirilmis masa QR kodu olusturma fonksiyonu.
 *
 * @param baseUrl - Uygulama base URL'i
 * @param organizationSlug - Isletme slug'i
 * @param tableId - Masa UUID'i
 * @param locationSlug - Lokasyon slug'i (opsiyonel, multi-location icin)
 * @param size - QR kod boyutu (varsayilan: 256)
 * @returns Promise<string> - Data URL
 *
 * @example
 * ```ts
 * // Multi-location
 * const dataUrl = await generateTableQRCodeSimple(
 *   'https://ozamenu.com',
 *   'cafe-istanbul',
 *   'uuid-here',
 *   'kadikoy',
 *   512
 * );
 *
 * // Legacy single-location
 * const dataUrl = await generateTableQRCodeSimple(
 *   'https://ozamenu.com',
 *   'cafe-istanbul',
 *   'uuid-here',
 *   undefined,
 *   512
 * );
 * ```
 */
export async function generateTableQRCodeSimple(
  baseUrl: string,
  organizationSlug: string,
  tableId: string,
  locationSlug?: string,
  size: number = STANDARD_SIZE
): Promise<string> {
  const menuUrl = generateMenuUrl(baseUrl, organizationSlug, tableId, locationSlug);
  return generateQRCodeDataUrl(menuUrl, { width: size });
}

// =============================================================================
// QR CODE GENERATION - BUFFER (Server-side)
// =============================================================================

/**
 * QR kod olusturur (Buffer olarak).
 *
 * Server-side'da dosya olusturma veya PDF icin kullanilabilir.
 * UYARI: Bu fonksiyon sadece server-side'da calisir.
 *
 * @param url - QR kodun icerecegi URL
 * @param options - QR kod secenekleri
 * @returns Promise<Buffer> - PNG buffer
 *
 * @example
 * ```ts
 * // Server-side kullanim
 * const buffer = await generateQRCodeBuffer('https://example.com');
 * await fs.writeFile('qr-code.png', buffer);
 * ```
 */
export async function generateQRCodeBuffer(
  url: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };

  return QRCode.toBuffer(url, {
    type: 'png',
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    color: {
      dark: mergedOptions.darkColor,
      light: mergedOptions.lightColor,
    },
  });
}

/**
 * Masa icin QR kod olusturur (Buffer olarak).
 *
 * @param params - QR kod parametreleri
 * @returns Promise<Buffer> - PNG buffer
 */
export async function generateTableQRCodeBuffer(
  params: GenerateTableQRParams
): Promise<Buffer> {
  const { baseUrl, organizationSlug, locationSlug, tableId, options = {} } = params;
  const menuUrl = generateMenuUrl(baseUrl, organizationSlug, tableId, locationSlug);
  return generateQRCodeBuffer(menuUrl, options);
}

// =============================================================================
// BULK GENERATION
// =============================================================================

/**
 * Birden fazla masa icin toplu QR kod olusturur.
 *
 * @param baseUrl - Uygulama base URL'i
 * @param organizationSlug - Isletme slug'i
 * @param tables - Masa bilgileri dizisi
 * @param locationSlug - Lokasyon slug'i (opsiyonel, multi-location icin)
 * @param size - QR kod boyutu (varsayilan: 512 yuksek cozunurluk)
 * @returns Promise<BulkQRCodeResult[]> - QR kod sonuclari
 *
 * @example
 * ```ts
 * const tables = [
 *   { tableId: 'id-1', qrUuid: 'uuid-1', tableNumber: '1' },
 *   { tableId: 'id-2', qrUuid: 'uuid-2', tableNumber: '2', tableName: 'VIP' },
 * ];
 *
 * // Multi-location
 * const results = await generateBulkTableQRCodes(
 *   'https://ozamenu.com',
 *   'cafe-istanbul',
 *   tables,
 *   'kadikoy'
 * );
 *
 * // Legacy single-location
 * const results = await generateBulkTableQRCodes(
 *   'https://ozamenu.com',
 *   'cafe-istanbul',
 *   tables
 * );
 *
 * // Her QR kodu indir
 * for (const result of results) {
 *   downloadQRCode(result.dataUrl, result.filename);
 * }
 * ```
 */
export async function generateBulkTableQRCodes(
  baseUrl: string,
  organizationSlug: string,
  tables: TableQRInfo[],
  locationSlug?: string,
  size: number = HIGH_RES_SIZE
): Promise<BulkQRCodeResult[]> {
  const results: BulkQRCodeResult[] = [];

  // Generate QR codes in parallel for better performance
  const promises = tables.map(async (table) => {
    const menuUrl = generateMenuUrl(baseUrl, organizationSlug, table.qrUuid, locationSlug);
    const dataUrl = await generateQRCodeDataUrl(menuUrl, { width: size });

    // Dosya adi olustur
    const filename = generateQRFilename(table.tableNumber, table.tableName);

    return {
      tableId: table.tableId,
      dataUrl,
      filename,
      menuUrl,
    };
  });

  const resolved = await Promise.all(promises);
  results.push(...resolved);

  return results;
}

// =============================================================================
// DOWNLOAD UTILITIES (Client-side only)
// =============================================================================

/**
 * QR kod dosya adi olusturur.
 *
 * @param tableNumber - Masa numarasi
 * @param tableName - Masa ismi (opsiyonel)
 * @param prefix - Dosya adi on eki (varsayilan: 'QR_Masa')
 * @returns Dosya adi (.png uzantili)
 *
 * @example
 * ```ts
 * generateQRFilename('1'); // => 'QR_Masa_1.png'
 * generateQRFilename('1', 'VIP'); // => 'QR_Masa_1_VIP.png'
 * generateQRFilename('A1', null, 'Menu'); // => 'Menu_A1.png'
 * ```
 */
export function generateQRFilename(
  tableNumber: string,
  tableName?: string | null,
  prefix: string = 'QR_Masa'
): string {
  // Dosya adi icin guvenli karakterler
  const safeTableNumber = tableNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeTableName = tableName
    ? `_${tableName.replace(/[^a-zA-Z0-9-_]/g, '_')}`
    : '';

  return `${prefix}_${safeTableNumber}${safeTableName}.png`;
}

/**
 * QR kodu PNG olarak indirir.
 *
 * UYARI: Bu fonksiyon sadece browser ortaminda calisir.
 *
 * @param dataUrl - QR kod data URL'i
 * @param filename - Indirilecek dosya adi
 *
 * @example
 * ```ts
 * // Browser'da QR kodu indir
 * const dataUrl = await generateTableQRCodeSimple(...);
 * downloadQRCode(dataUrl, 'Masa_1.png');
 * ```
 */
export function downloadQRCode(dataUrl: string, filename: string): void {
  // Browser kontrolu
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('downloadQRCode() sadece browser ortaminda calisir');
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Masa QR kodunu indirir.
 *
 * @param params - QR kod parametreleri
 * @param tableNumber - Masa numarasi (dosya adi icin)
 * @param tableName - Masa ismi (opsiyonel, dosya adi icin)
 * @param size - QR kod boyutu
 * @returns Promise<boolean> - Basarili olup olmadigini belirtir
 *
 * @example
 * ```ts
 * const success = await downloadTableQRCode({
 *   baseUrl: 'https://ozamenu.com',
 *   organizationSlug: 'cafe-istanbul',
 *   tableId: 'uuid-here',
 * }, '1', 'Pencere');
 *
 * if (success) {
 *   console.log('QR kod indirildi!');
 * }
 * ```
 */
export async function downloadTableQRCode(
  params: GenerateTableQRParams,
  tableNumber: string,
  tableName?: string | null,
  size: number = HIGH_RES_SIZE
): Promise<boolean> {
  try {
    const result = await generateTableQRCode({
      ...params,
      options: { ...params.options, width: size },
    });

    if (!result.success || !result.dataUrl) {
      return false;
    }

    const filename = generateQRFilename(tableNumber, tableName);
    downloadQRCode(result.dataUrl, filename);

    return true;
  } catch {
    return false;
  }
}

/**
 * Birden fazla QR kodu sirayla indirir.
 *
 * Her indirme arasinda kisa bir gecikme birakilir
 * (browser'in coklu indirmeleri engellemesini onlemek icin).
 *
 * @param results - Toplu QR kod sonuclari
 * @param delayMs - Indirmeler arasi bekleme suresi (varsayilan: 100ms)
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * const results = await generateBulkTableQRCodes(...);
 * await downloadBulkQRCodes(results);
 * ```
 */
export async function downloadBulkQRCodes(
  results: BulkQRCodeResult[],
  delayMs: number = 100
): Promise<void> {
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result) continue;

    // Kisa bir gecikme ekle (ilk indirme haric)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    downloadQRCode(result.dataUrl, result.filename);
  }
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * QR kod URL'inin gecerli olup olmadigini kontrol eder.
 *
 * @param url - Kontrol edilecek URL
 * @returns boolean - URL gecerli mi
 */
export function isValidQRCodeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Table ID'nin gecerli UUID formunda olup olmadigini kontrol eder.
 *
 * @param tableId - Kontrol edilecek table ID
 * @returns boolean - UUID gecerli mi
 */
export function isValidTableId(tableId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tableId);
}

/**
 * Menu URL'inden table_id'yi cikarir.
 *
 * @param menuUrl - Menu URL'i
 * @returns string | null - Table ID veya null
 *
 * @example
 * ```ts
 * const tableId = extractTableIdFromUrl('https://ozamenu.com/menu/cafe?table_id=abc-123');
 * // => 'abc-123'
 * ```
 */
export function extractTableIdFromUrl(menuUrl: string): string | null {
  try {
    const url = new URL(menuUrl);
    return url.searchParams.get('table_id');
  } catch {
    return null;
  }
}

/**
 * Menu URL'inden organization slug'ini cikarir.
 *
 * @param menuUrl - Menu URL'i
 * @returns string | null - Organization slug veya null
 *
 * @example
 * ```ts
 * // Multi-location format
 * const slug = extractOrgSlugFromUrl('https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=123');
 * // => 'cafe-istanbul'
 *
 * // Legacy format
 * const slug = extractOrgSlugFromUrl('https://ozamenu.com/menu/cafe-istanbul?table_id=123');
 * // => 'cafe-istanbul'
 * ```
 */
export function extractOrgSlugFromUrl(menuUrl: string): string | null {
  try {
    const url = new URL(menuUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // /menu/{org-slug} veya /menu/{org-slug}/{location-slug} formatinda
    if (pathParts[0] === 'menu' && pathParts[1]) {
      return decodeURIComponent(pathParts[1]);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Menu URL'inden location slug'ini cikarir.
 *
 * Sadece multi-location URL'lerinde gecerlidir (/menu/{org}/{location} formati).
 * Legacy URL'ler (/menu/{org}) icin null doner.
 *
 * @param menuUrl - Menu URL'i
 * @returns string | null - Location slug veya null
 *
 * @example
 * ```ts
 * // Multi-location format
 * const slug = extractLocationSlugFromUrl('https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=123');
 * // => 'kadikoy'
 *
 * // Legacy format (single-location)
 * const slug = extractLocationSlugFromUrl('https://ozamenu.com/menu/cafe-istanbul?table_id=123');
 * // => null
 * ```
 */
export function extractLocationSlugFromUrl(menuUrl: string): string | null {
  try {
    const url = new URL(menuUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // /menu/{org-slug}/{location-slug} formatinda
    if (pathParts[0] === 'menu' && pathParts[1] && pathParts[2]) {
      return decodeURIComponent(pathParts[2]);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Menu URL'inin multi-location formatta olup olmadigini kontrol eder.
 *
 * @param menuUrl - Menu URL'i
 * @returns boolean - Multi-location URL mi?
 *
 * @example
 * ```ts
 * isMultiLocationUrl('https://ozamenu.com/menu/cafe/kadikoy'); // => true
 * isMultiLocationUrl('https://ozamenu.com/menu/cafe'); // => false
 * ```
 */
export function isMultiLocationUrl(menuUrl: string): boolean {
  return extractLocationSlugFromUrl(menuUrl) !== null;
}

// =============================================================================
// CUSTOMIZATION PRESETS
// =============================================================================

/**
 * Onceden tanimlanmis QR kod stilleri
 */
export const QR_PRESETS = {
  /** Standart siyah-beyaz QR kod */
  standard: {
    width: STANDARD_SIZE,
    margin: 2,
    errorCorrectionLevel: 'M' as const,
    darkColor: '#000000',
    lightColor: '#ffffff',
  },
  /** Yuksek cozunurluklu baski icin */
  highRes: {
    width: HIGH_RES_SIZE,
    margin: 3,
    errorCorrectionLevel: 'H' as const,
    darkColor: '#000000',
    lightColor: '#ffffff',
  },
  /** Kucuk onizleme boyutu */
  preview: {
    width: PREVIEW_SIZE,
    margin: 1,
    errorCorrectionLevel: 'L' as const,
    darkColor: '#000000',
    lightColor: '#ffffff',
  },
  /** Koyu tema */
  dark: {
    width: STANDARD_SIZE,
    margin: 2,
    errorCorrectionLevel: 'M' as const,
    darkColor: '#ffffff',
    lightColor: '#1a1a1a',
  },
  /** Marka renkli (mor) */
  branded: {
    width: STANDARD_SIZE,
    margin: 2,
    errorCorrectionLevel: 'M' as const,
    darkColor: '#7c3aed',
    lightColor: '#ffffff',
  },
} as const;

/**
 * Preset ile QR kod olusturur.
 *
 * @param url - QR kodun icerecegi URL
 * @param preset - Preset adi
 * @returns Promise<string> - Data URL
 *
 * @example
 * ```ts
 * const dataUrl = await generateQRCodeWithPreset(menuUrl, 'highRes');
 * ```
 */
export async function generateQRCodeWithPreset(
  url: string,
  preset: keyof typeof QR_PRESETS
): Promise<string> {
  return generateQRCodeDataUrl(url, QR_PRESETS[preset]);
}
