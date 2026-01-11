/**
 * Slug Generation and Validation Utilities
 *
 * URL-guvenli slug olusturma ve dogrulama fonksiyonlari.
 * Lokasyon ve organizasyon slug'lari icin kullanilir.
 *
 * Bu modul su islemleri saglar:
 * - URL-safe slug olusturma (Turkce karakter destegi)
 * - Slug format dogrulamasi
 * - Slug catismalarini yonetme (ornk: slug-2, slug-3)
 *
 * @example
 * ```ts
 * import {
 *   generateSlug,
 *   validateSlug,
 *   handleSlugCollision,
 *   normalizeSlug
 * } from '@/lib/utils/slugify';
 *
 * // Slug olustur
 * const slug = generateSlug('Cafe Istanbul Downtown');
 * // => 'cafe-istanbul-downtown'
 *
 * // Slug dogrula
 * const isValid = validateSlug('my-location');
 * // => { valid: true, error: null }
 *
 * // Catisma yonetimi
 * const uniqueSlug = handleSlugCollision('downtown', ['downtown', 'downtown-2']);
 * // => 'downtown-3'
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Slug dogrulama sonucu
 */
export interface SlugValidationResult {
  /** Slug gecerli mi */
  valid: boolean;
  /** Hata mesaji (gecersiz ise) */
  error: string | null;
}

/**
 * Slug olusturma secenekleri
 */
export interface SlugifyOptions {
  /** Maksimum slug uzunlugu (varsayilan: 100) */
  maxLength?: number;
  /** Kucuk harfe donustur (varsayilan: true) */
  lowercase?: boolean;
  /** Kelime ayirici (varsayilan: '-') */
  separator?: string;
  /** Ozel karakter haritasi (ek donusumler) */
  customReplacements?: Record<string, string>;
}

/**
 * Slug catisma yonetimi secenekleri
 */
export interface CollisionOptions {
  /** Maksimum deneme sayisi (varsayilan: 100) */
  maxAttempts?: number;
  /** Numara ayirici (varsayilan: '-') */
  separator?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Varsayilan maksimum slug uzunlugu */
export const DEFAULT_MAX_LENGTH = 100;

/** Minimum slug uzunlugu */
export const MIN_SLUG_LENGTH = 2;

/** Maksimum slug uzunlugu */
export const MAX_SLUG_LENGTH = 100;

/** Slug format regex - sadece kucuk harf, rakam ve tire */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Gecersiz karakterleri temizlemek icin regex */
const INVALID_CHARS_PATTERN = /[^a-z0-9\s-]/g;

/** Birden fazla tirenin temizlenmesi icin regex */
const MULTIPLE_SEPARATOR_PATTERN = /-+/g;

/** Bosluk karakterlerini temizlemek icin regex */
const WHITESPACE_PATTERN = /\s+/g;

/**
 * Turkce karakter donusum haritasi
 * ASCII olmayan Turkce karakterleri ASCII karsiliklarina donusturur
 */
export const TURKISH_CHAR_MAP: Record<string, string> = {
  // Buyuk harfler
  '\u00C7': 'c', // Ç
  '\u011E': 'g', // Ğ
  '\u0130': 'i', // İ
  '\u00D6': 'o', // Ö
  '\u015E': 's', // Ş
  '\u00DC': 'u', // Ü
  // Kucuk harfler
  '\u00E7': 'c', // ç
  '\u011F': 'g', // ğ
  '\u0131': 'i', // ı
  '\u00F6': 'o', // ö
  '\u015F': 's', // ş
  '\u00FC': 'u', // ü
};

/**
 * Diger dil karakterleri icin donusum haritasi
 * Yaygin Avrupa dillerindeki ozel karakterler
 */
export const EXTENDED_CHAR_MAP: Record<string, string> = {
  // Almanca
  '\u00E4': 'ae', // ä
  '\u00C4': 'ae', // Ä
  '\u00F6': 'oe', // ö (German variant)
  '\u00D6': 'oe', // Ö (German variant)
  '\u00FC': 'ue', // ü (German variant)
  '\u00DC': 'ue', // Ü (German variant)
  '\u00DF': 'ss', // ß
  // Fransizca
  '\u00E0': 'a', // à
  '\u00E2': 'a', // â
  '\u00E8': 'e', // è
  '\u00E9': 'e', // é
  '\u00EA': 'e', // ê
  '\u00EB': 'e', // ë
  '\u00EE': 'i', // î
  '\u00EF': 'i', // ï
  '\u00F4': 'o', // ô
  '\u00F9': 'u', // ù
  '\u00FB': 'u', // û
  // Diger
  '\u00F1': 'n', // ñ (Spanish)
  '\u00E6': 'ae', // æ
  '\u00F8': 'o', // ø (Danish/Norwegian)
};

/**
 * Varsayilan slug olusturma secenekleri
 */
const DEFAULT_SLUGIFY_OPTIONS: Required<SlugifyOptions> = {
  maxLength: DEFAULT_MAX_LENGTH,
  lowercase: true,
  separator: '-',
  customReplacements: {},
};

/**
 * Varsayilan catisma yonetimi secenekleri
 */
const DEFAULT_COLLISION_OPTIONS: Required<CollisionOptions> = {
  maxAttempts: 100,
  separator: '-',
};

// =============================================================================
// CHARACTER NORMALIZATION
// =============================================================================

/**
 * Turkce karakterleri ASCII karsiliklarina donusturur.
 *
 * @param text - Donusturulecek metin
 * @returns ASCII karakterlere donusturulmus metin
 *
 * @example
 * ```ts
 * normalizeTurkishChars('Şişli Çarşı');
 * // => 'Sisli Carsi'
 * ```
 */
export function normalizeTurkishChars(text: string): string {
  let result = text;

  for (const [turkishChar, asciiChar] of Object.entries(TURKISH_CHAR_MAP)) {
    result = result.replace(new RegExp(turkishChar, 'g'), asciiChar);
  }

  return result;
}

/**
 * Genisletilmis karakter haritasini kullanarak normalize eder.
 * Turkce + diger Avrupa dil karakterlerini donusturur.
 *
 * @param text - Donusturulecek metin
 * @returns ASCII karakterlere donusturulmus metin
 */
export function normalizeExtendedChars(text: string): string {
  let result = normalizeTurkishChars(text);

  for (const [char, replacement] of Object.entries(EXTENDED_CHAR_MAP)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }

  return result;
}

// =============================================================================
// SLUG GENERATION
// =============================================================================

/**
 * Metinden URL-safe slug olusturur.
 *
 * Islem adimlari:
 * 1. Turkce/ozel karakterleri normalize et
 * 2. Kucuk harfe donustur (opsiyonel)
 * 3. Gecersiz karakterleri temizle
 * 4. Bosluklari ayirici ile degistir
 * 5. Tekrar eden ayiricilari temizle
 * 6. Bas ve sondaki ayiricilari kaldir
 * 7. Maksimum uzunluga kes
 *
 * @param text - Slug'a donusturulecek metin
 * @param options - Slug olusturma secenekleri
 * @returns URL-safe slug
 *
 * @example
 * ```ts
 * generateSlug('Cafe İstanbul Downtown');
 * // => 'cafe-istanbul-downtown'
 *
 * generateSlug('Şişli Merkez');
 * // => 'sisli-merkez'
 *
 * generateSlug('  Multiple   Spaces  ');
 * // => 'multiple-spaces'
 *
 * generateSlug('Special @#$ Characters!');
 * // => 'special-characters'
 * ```
 */
export function generateSlug(text: string, options: SlugifyOptions = {}): string {
  const opts = { ...DEFAULT_SLUGIFY_OPTIONS, ...options };

  if (!text || typeof text !== 'string') {
    return '';
  }

  let slug = text.trim();

  // 1. Ozel karakter donusumlerini uygula (eger varsa)
  for (const [char, replacement] of Object.entries(opts.customReplacements)) {
    slug = slug.replace(new RegExp(char, 'g'), replacement);
  }

  // 2. Turkce ve diger ozel karakterleri normalize et
  slug = normalizeExtendedChars(slug);

  // 3. Kucuk harfe donustur
  if (opts.lowercase) {
    slug = slug.toLowerCase();
  }

  // 4. Gecersiz karakterleri temizle
  slug = slug.replace(INVALID_CHARS_PATTERN, '');

  // 5. Bosluklari ayirici ile degistir
  slug = slug.replace(WHITESPACE_PATTERN, opts.separator);

  // 6. Tekrar eden ayiricilari tek ayiriciya donustur
  slug = slug.replace(MULTIPLE_SEPARATOR_PATTERN, opts.separator);

  // 7. Bas ve sondaki ayiricilari kaldir
  slug = slug.replace(new RegExp(`^${opts.separator}+|${opts.separator}+$`, 'g'), '');

  // 8. Maksimum uzunluga kes (kelime ortasinda kesmemeye calis)
  if (slug.length > opts.maxLength) {
    slug = trimToWordBoundary(slug, opts.maxLength, opts.separator);
  }

  return slug;
}

/**
 * Slug'i kelime sinirinda keser.
 * Kelime ortasinda kesmek yerine son tam kelimeye kadar keser.
 *
 * @param slug - Kesilecek slug
 * @param maxLength - Maksimum uzunluk
 * @param separator - Kelime ayirici
 * @returns Kesilen slug
 */
function trimToWordBoundary(slug: string, maxLength: number, separator: string): string {
  if (slug.length <= maxLength) {
    return slug;
  }

  const truncated = slug.substring(0, maxLength);
  const lastSeparator = truncated.lastIndexOf(separator);

  // Eger ayirici bulunursa, ondan once kes
  if (lastSeparator > 0) {
    return truncated.substring(0, lastSeparator);
  }

  // Ayirici bulunamazsa, direkt kes
  return truncated;
}

/**
 * Slug'i normalize eder.
 * Kucuk harfe donusturur ve gecersiz karakterleri temizler.
 *
 * @param slug - Normalize edilecek slug
 * @returns Normalize edilmis slug
 *
 * @example
 * ```ts
 * normalizeSlug('My-Slug');
 * // => 'my-slug'
 *
 * normalizeSlug('slug--with---extra-dashes');
 * // => 'slug-with-extra-dashes'
 * ```
 */
export function normalizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(INVALID_CHARS_PATTERN, '')
    .replace(MULTIPLE_SEPARATOR_PATTERN, '-')
    .replace(/^-+|-+$/g, '');
}

// =============================================================================
// SLUG VALIDATION
// =============================================================================

/**
 * Slug'in gecerli formatta olup olmadigini kontrol eder.
 *
 * Gecerli slug kurallari:
 * - Minimum 2 karakter
 * - Maksimum 100 karakter
 * - Sadece kucuk harf (a-z), rakam (0-9) ve tire (-) icermeli
 * - Tire ile baslamamali veya bitmemeli
 * - Arka arkaya tire icermemeli
 *
 * @param slug - Dogrulanacak slug
 * @returns Dogrulama sonucu
 *
 * @example
 * ```ts
 * validateSlug('my-location');
 * // => { valid: true, error: null }
 *
 * validateSlug('');
 * // => { valid: false, error: 'Slug bos olamaz' }
 *
 * validateSlug('My-Location');
 * // => { valid: false, error: 'Slug sadece kucuk harf, rakam ve tire icermeli' }
 *
 * validateSlug('-invalid');
 * // => { valid: false, error: 'Slug tire ile baslamamali veya bitmemeli' }
 * ```
 */
export function validateSlug(slug: string): SlugValidationResult {
  // Bos kontrol
  if (!slug || typeof slug !== 'string') {
    return {
      valid: false,
      error: 'Slug bos olamaz',
    };
  }

  const trimmedSlug = slug.trim();

  // Bos kontrol (trim sonrasi)
  if (trimmedSlug.length === 0) {
    return {
      valid: false,
      error: 'Slug bos olamaz',
    };
  }

  // Minimum uzunluk kontrolu
  if (trimmedSlug.length < MIN_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Slug en az ${MIN_SLUG_LENGTH} karakter olmali`,
    };
  }

  // Maksimum uzunluk kontrolu
  if (trimmedSlug.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Slug en fazla ${MAX_SLUG_LENGTH} karakter olmali`,
    };
  }

  // Tire ile baslama/bitme kontrolu
  if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
    return {
      valid: false,
      error: 'Slug tire ile baslamamali veya bitmemeli',
    };
  }

  // Arka arkaya tire kontrolu
  if (trimmedSlug.includes('--')) {
    return {
      valid: false,
      error: 'Slug arka arkaya tire icermemeli',
    };
  }

  // Format kontrolu (sadece kucuk harf, rakam ve tire)
  if (!SLUG_PATTERN.test(trimmedSlug)) {
    return {
      valid: false,
      error: 'Slug sadece kucuk harf, rakam ve tire icermeli',
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/**
 * Slug'in gecerli olup olmadigini boolean olarak doner.
 *
 * @param slug - Kontrol edilecek slug
 * @returns Slug gecerli mi
 *
 * @example
 * ```ts
 * isValidSlug('my-location');
 * // => true
 *
 * isValidSlug('Invalid Slug');
 * // => false
 * ```
 */
export function isValidSlug(slug: string): boolean {
  return validateSlug(slug).valid;
}

// =============================================================================
// COLLISION HANDLING
// =============================================================================

/**
 * Slug catismasini yonetir ve benzersiz slug olusturur.
 *
 * Mevcut slug'lar arasinda catisma varsa,
 * slug sonuna numara ekleyerek benzersiz slug olusturur.
 *
 * Ornekler:
 * - 'downtown' catisirsa -> 'downtown-2'
 * - 'downtown-2' de varsa -> 'downtown-3'
 * - vs.
 *
 * @param baseSlug - Temel slug
 * @param existingSlugs - Mevcut slug listesi
 * @param options - Catisma yonetimi secenekleri
 * @returns Benzersiz slug
 * @throws Error - Maksimum deneme sayisi asilirsa
 *
 * @example
 * ```ts
 * handleSlugCollision('downtown', ['downtown', 'downtown-2']);
 * // => 'downtown-3'
 *
 * handleSlugCollision('location', []);
 * // => 'location'
 *
 * handleSlugCollision('test', ['test', 'test-2', 'test-3', 'test-5']);
 * // => 'test-4' (bos numarayi bulur)
 * ```
 */
export function handleSlugCollision(
  baseSlug: string,
  existingSlugs: string[],
  options: CollisionOptions = {}
): string {
  const opts = { ...DEFAULT_COLLISION_OPTIONS, ...options };

  // Eger temel slug kullanilmiyorsa, direkt don
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Mevcut slug'lardan numaralari cikar
  const existingNumbers = new Set<number>();
  const pattern = new RegExp(`^${escapeRegExp(baseSlug)}${opts.separator}(\\d+)$`);

  for (const slug of existingSlugs) {
    const match = slug.match(pattern);
    if (match && match[1]) {
      existingNumbers.add(parseInt(match[1], 10));
    }
  }

  // Bos numara bul
  for (let i = 2; i <= opts.maxAttempts + 1; i++) {
    if (!existingNumbers.has(i)) {
      return `${baseSlug}${opts.separator}${i}`;
    }
  }

  throw new Error(
    `Maksimum slug deneme sayisi (${opts.maxAttempts}) asildi. ` +
      `Base slug: ${baseSlug}`
  );
}

/**
 * Regex icin ozel karakterleri escape eder.
 *
 * @param string - Escape edilecek string
 * @returns Escape edilmis string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Slug'in numarali versiyonlarini olusturur.
 *
 * @param baseSlug - Temel slug
 * @param count - Olusturulacak versiyon sayisi
 * @returns Slug versiyonlari dizisi
 *
 * @example
 * ```ts
 * generateSlugVariants('downtown', 3);
 * // => ['downtown', 'downtown-2', 'downtown-3']
 * ```
 */
export function generateSlugVariants(baseSlug: string, count: number): string[] {
  const variants: string[] = [baseSlug];

  for (let i = 2; i <= count; i++) {
    variants.push(`${baseSlug}-${i}`);
  }

  return variants;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Slug'dan numara sonekini cikarir.
 *
 * @param slug - Islecek slug
 * @returns Temel slug ve numara (eger varsa)
 *
 * @example
 * ```ts
 * parseSlugNumber('downtown-3');
 * // => { baseSlug: 'downtown', number: 3 }
 *
 * parseSlugNumber('downtown');
 * // => { baseSlug: 'downtown', number: null }
 * ```
 */
export function parseSlugNumber(slug: string): {
  baseSlug: string;
  number: number | null;
} {
  const match = slug.match(/^(.+)-(\d+)$/);

  if (match && match[1] && match[2]) {
    return {
      baseSlug: match[1],
      number: parseInt(match[2], 10),
    };
  }

  return {
    baseSlug: slug,
    number: null,
  };
}

/**
 * Iki slug'in ayni temel slug'dan turetilip turetilmedigini kontrol eder.
 *
 * @param slug1 - Ilk slug
 * @param slug2 - Ikinci slug
 * @returns Ayni temel slug'dan mi
 *
 * @example
 * ```ts
 * areSlugsRelated('downtown', 'downtown-2');
 * // => true
 *
 * areSlugsRelated('downtown', 'uptown');
 * // => false
 * ```
 */
export function areSlugsRelated(slug1: string, slug2: string): boolean {
  const parsed1 = parseSlugNumber(slug1);
  const parsed2 = parseSlugNumber(slug2);

  return parsed1.baseSlug === parsed2.baseSlug;
}

/**
 * Lokasyon ismi icin slug olusturur.
 * generateSlug fonksiyonunun alias'i olarak calisir.
 *
 * @param name - Lokasyon ismi
 * @param options - Slug olusturma secenekleri
 * @returns URL-safe slug
 *
 * @example
 * ```ts
 * generateLocationSlug('Downtown Branch');
 * // => 'downtown-branch'
 *
 * generateLocationSlug('Şişli Merkez Şubesi');
 * // => 'sisli-merkez-subesi'
 * ```
 */
export function generateLocationSlug(
  name: string,
  options: SlugifyOptions = {}
): string {
  return generateSlug(name, options);
}

/**
 * Organizasyon ismi icin slug olusturur.
 * generateSlug fonksiyonunun alias'i olarak calisir.
 *
 * @param name - Organizasyon ismi
 * @param options - Slug olusturma secenekleri
 * @returns URL-safe slug
 *
 * @example
 * ```ts
 * generateOrganizationSlug('Cafe Istanbul');
 * // => 'cafe-istanbul'
 * ```
 */
export function generateOrganizationSlug(
  name: string,
  options: SlugifyOptions = {}
): string {
  return generateSlug(name, options);
}
