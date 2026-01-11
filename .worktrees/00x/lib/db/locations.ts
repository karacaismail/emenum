/**
 * Location Database Queries
 *
 * Bu modül lokasyon verilerini sorgulamak ve yönetmek için fonksiyonlar sağlar.
 * Multi-location restoran sistemi için temel veritabanı işlemlerini içerir.
 *
 * Lokasyonlar organizasyonlara bağlıdır (one-to-many ilişki).
 * Her organizasyon birden fazla lokasyona sahip olabilir.
 * Slug'lar organizasyon içinde benzersiz olmalıdır.
 *
 * @example
 * ```ts
 * import {
 *   getLocationBySlug,
 *   getLocationsByOrganization,
 *   createLocation,
 *   updateLocation,
 *   deleteLocation
 * } from '@/lib/db/locations';
 *
 * // Slug ile lokasyon getir
 * const location = await getLocationBySlug('test-org', 'downtown');
 *
 * // Organizasyonun tüm lokasyonlarını getir
 * const locations = await getLocationsByOrganization(orgId);
 *
 * // Yeni lokasyon oluştur
 * const result = await createLocation({
 *   organization_id: orgId,
 *   name: 'Downtown',
 *   slug: 'downtown',
 *   address: '123 Main St'
 * });
 * ```
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  UUID,
  Location,
  LocationInsert,
  LocationUpdate,
  LocationWithOrganization,
  Organization,
} from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Lokasyon oluşturma sonucu
 */
export interface CreateLocationResult {
  /** İşlem başarılı mı */
  success: boolean;
  /** Oluşturulan lokasyon */
  location: Location | null;
  /** Hata mesajı */
  error: string | null;
}

/**
 * Lokasyon güncelleme sonucu
 */
export interface UpdateLocationResult {
  /** İşlem başarılı mı */
  success: boolean;
  /** Güncellenen lokasyon */
  location: Location | null;
  /** Hata mesajı */
  error: string | null;
}

/**
 * Lokasyon silme sonucu (soft delete)
 */
export interface DeleteLocationResult {
  /** İşlem başarılı mı */
  success: boolean;
  /** Hata mesajı */
  error: string | null;
}

/**
 * Lokasyon listesi parametreleri
 */
export interface GetLocationsParams {
  /** Sadece aktif lokasyonları getir */
  activeOnly?: boolean;
  /** Sayfa başına kayıt sayısı */
  limit?: number;
  /** Atlanacak kayıt sayısı */
  offset?: number;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Slug'lar ile lokasyon getir.
 *
 * Organizasyon ve lokasyon slug'larını kullanarak lokasyonu getirir.
 * Organizasyon bilgisi de dahil edilir (joined query).
 *
 * @param organizationSlug - Organizasyon slug'ı
 * @param locationSlug - Lokasyon slug'ı
 * @returns Promise<LocationWithOrganization | null> - Lokasyon veya null
 *
 * @example
 * ```ts
 * const location = await getLocationBySlug('test-org', 'downtown');
 * if (location) {
 *   console.log(location.name); // "Downtown"
 *   console.log(location.organization.name); // "Test Org"
 * }
 * ```
 */
export async function getLocationBySlug(
  organizationSlug: string,
  locationSlug: string
): Promise<LocationWithOrganization | null> {
  const supabase = await createServerSupabaseClient();

  // Önce organizasyonu slug ile bul
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .eq('status', 'active')
    .single();

  if (orgError || !org) {
    return null;
  }

  // Sonra lokasyonu getir
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', org.id)
    .eq('slug', locationSlug)
    .eq('is_active', true)
    .single();

  if (locError || !location) {
    return null;
  }

  // Organizasyon bilgisini ayrı getir
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', org.id)
    .single();

  if (organizationError || !organization) {
    return null;
  }

  return {
    ...location,
    organization: organization as Organization,
  } as LocationWithOrganization;
}

/**
 * ID ile lokasyon getir.
 *
 * @param locationId - Lokasyon UUID'si
 * @returns Promise<Location | null> - Lokasyon veya null
 *
 * @example
 * ```ts
 * const location = await getLocationById('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function getLocationById(
  locationId: UUID
): Promise<Location | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Location;
}

/**
 * ID ile lokasyon ve organizasyon bilgisini getir.
 *
 * @param locationId - Lokasyon UUID'si
 * @returns Promise<LocationWithOrganization | null> - Lokasyon veya null
 */
export async function getLocationWithOrganization(
  locationId: UUID
): Promise<LocationWithOrganization | null> {
  const supabase = await createServerSupabaseClient();

  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single();

  if (locError || !location) {
    return null;
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', location.organization_id)
    .single();

  if (orgError || !organization) {
    return null;
  }

  return {
    ...location,
    organization: organization as Organization,
  } as LocationWithOrganization;
}

/**
 * Organizasyona ait tüm lokasyonları getir.
 *
 * @param organizationId - Organizasyon UUID'si
 * @param params - Sorgu parametreleri
 * @returns Promise<Location[]> - Lokasyon listesi
 *
 * @example
 * ```ts
 * // Tüm lokasyonları getir
 * const locations = await getLocationsByOrganization(orgId);
 *
 * // Sadece aktif lokasyonları getir
 * const activeLocations = await getLocationsByOrganization(orgId, { activeOnly: true });
 *
 * // Sayfalama ile getir
 * const pagedLocations = await getLocationsByOrganization(orgId, { limit: 10, offset: 0 });
 * ```
 */
export async function getLocationsByOrganization(
  organizationId: UUID,
  params: GetLocationsParams = {}
): Promise<Location[]> {
  const { activeOnly = false, limit = 100, offset = 0 } = params;

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as Location[];
}

/**
 * Organizasyon slug'ı ile tüm lokasyonları getir.
 *
 * @param organizationSlug - Organizasyon slug'ı
 * @param params - Sorgu parametreleri
 * @returns Promise<Location[]> - Lokasyon listesi
 *
 * @example
 * ```ts
 * const locations = await getLocationsByOrganizationSlug('test-org', { activeOnly: true });
 * ```
 */
export async function getLocationsByOrganizationSlug(
  organizationSlug: string,
  params: GetLocationsParams = {}
): Promise<Location[]> {
  const supabase = await createServerSupabaseClient();

  // Önce organizasyonu bul
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .single();

  if (orgError || !org) {
    return [];
  }

  return getLocationsByOrganization(org.id, params);
}

/**
 * Organizasyonun lokasyon sayısını getir.
 *
 * @param organizationId - Organizasyon UUID'si
 * @param activeOnly - Sadece aktif lokasyonları say
 * @returns Promise<number> - Lokasyon sayısı
 */
export async function getLocationCount(
  organizationId: UUID,
  activeOnly = false
): Promise<number> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

/**
 * Organizasyonun varsayılan (ilk) lokasyonunu getir.
 *
 * Tek lokasyonlu organizasyonlar için redirect'te kullanılır.
 *
 * @param organizationId - Organizasyon UUID'si
 * @returns Promise<Location | null> - Varsayılan lokasyon veya null
 */
export async function getDefaultLocation(
  organizationId: UUID
): Promise<Location | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Location;
}

/**
 * Organizasyon slug'ı ile varsayılan lokasyonu getir.
 *
 * @param organizationSlug - Organizasyon slug'ı
 * @returns Promise<Location | null> - Varsayılan lokasyon veya null
 */
export async function getDefaultLocationByOrgSlug(
  organizationSlug: string
): Promise<Location | null> {
  const supabase = await createServerSupabaseClient();

  // Önce organizasyonu bul
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .eq('status', 'active')
    .single();

  if (orgError || !org) {
    return null;
  }

  return getDefaultLocation(org.id);
}

/**
 * Slug'ın organizasyon içinde benzersiz olup olmadığını kontrol et.
 *
 * @param organizationId - Organizasyon UUID'si
 * @param slug - Kontrol edilecek slug
 * @param excludeLocationId - Hariç tutulacak lokasyon ID'si (güncelleme için)
 * @returns Promise<boolean> - Slug kullanılabilir mi
 */
export async function isSlugAvailable(
  organizationId: UUID,
  slug: string,
  excludeLocationId?: UUID
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('slug', slug);

  if (excludeLocationId) {
    query = query.neq('id', excludeLocationId);
  }

  const { count, error } = await query;

  if (error) {
    return false;
  }

  return (count ?? 0) === 0;
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Yeni lokasyon oluştur.
 *
 * @param data - Lokasyon verileri
 * @returns Promise<CreateLocationResult> - Oluşturma sonucu
 *
 * @example
 * ```ts
 * const result = await createLocation({
 *   organization_id: orgId,
 *   name: 'Downtown',
 *   slug: 'downtown',
 *   address: '123 Main St',
 *   city: 'Istanbul',
 *   phone: '+90 555 123 4567'
 * });
 *
 * if (result.success) {
 *   console.log('Lokasyon oluşturuldu:', result.location?.id);
 * } else {
 *   console.error('Hata:', result.error);
 * }
 * ```
 */
export async function createLocation(
  data: LocationInsert
): Promise<CreateLocationResult> {
  const supabase = await createServerSupabaseClient();

  // Organizasyonun var olduğunu kontrol et
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', data.organization_id)
    .single();

  if (orgError || !org) {
    return {
      success: false,
      location: null,
      error: 'Organizasyon bulunamadı',
    };
  }

  // Slug benzersizliğini kontrol et
  const slugAvailable = await isSlugAvailable(data.organization_id, data.slug);
  if (!slugAvailable) {
    return {
      success: false,
      location: null,
      error: 'Bu slug zaten kullanımda. Lütfen farklı bir slug seçin.',
    };
  }

  // Lokasyonu oluştur
  const { data: location, error: insertError } = await supabase
    .from('locations')
    .insert(data)
    .select('*')
    .single();

  if (insertError) {
    return {
      success: false,
      location: null,
      error: `Lokasyon oluşturulurken hata oluştu: ${insertError.message}`,
    };
  }

  return {
    success: true,
    location: location as Location,
    error: null,
  };
}

/**
 * Lokasyonu güncelle.
 *
 * @param locationId - Lokasyon UUID'si
 * @param data - Güncellenecek veriler
 * @returns Promise<UpdateLocationResult> - Güncelleme sonucu
 *
 * @example
 * ```ts
 * const result = await updateLocation(locationId, {
 *   name: 'Downtown Branch',
 *   address: '456 New St'
 * });
 *
 * if (result.success) {
 *   console.log('Lokasyon güncellendi');
 * }
 * ```
 */
export async function updateLocation(
  locationId: UUID,
  data: LocationUpdate
): Promise<UpdateLocationResult> {
  const supabase = await createServerSupabaseClient();

  // Lokasyonun var olduğunu kontrol et
  const existingLocation = await getLocationById(locationId);
  if (!existingLocation) {
    return {
      success: false,
      location: null,
      error: 'Lokasyon bulunamadı',
    };
  }

  // Eğer slug değiştiriliyorsa benzersizliği kontrol et
  if (data.slug && data.slug !== existingLocation.slug) {
    const slugAvailable = await isSlugAvailable(
      existingLocation.organization_id,
      data.slug,
      locationId
    );
    if (!slugAvailable) {
      return {
        success: false,
        location: null,
        error: 'Bu slug zaten kullanımda. Lütfen farklı bir slug seçin.',
      };
    }
  }

  // Güncelleme zamanını ekle
  const updateData: LocationUpdate = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: location, error: updateError } = await supabase
    .from('locations')
    .update(updateData)
    .eq('id', locationId)
    .select('*')
    .single();

  if (updateError) {
    return {
      success: false,
      location: null,
      error: `Lokasyon güncellenirken hata oluştu: ${updateError.message}`,
    };
  }

  return {
    success: true,
    location: location as Location,
    error: null,
  };
}

/**
 * Lokasyonu sil (soft delete).
 *
 * CRITICAL: Bu fonksiyon hard delete yapmaz!
 * Lokasyonun is_active alanını false olarak ayarlar.
 * Bu, tarihsel verilerin korunması ve bağlantılı kayıtların
 * bozulmaması için önemlidir.
 *
 * @param locationId - Lokasyon UUID'si
 * @returns Promise<DeleteLocationResult> - Silme sonucu
 *
 * @example
 * ```ts
 * const result = await deleteLocation(locationId);
 *
 * if (result.success) {
 *   console.log('Lokasyon deaktif edildi');
 * }
 * ```
 */
export async function deleteLocation(
  locationId: UUID
): Promise<DeleteLocationResult> {
  const supabase = await createServerSupabaseClient();

  // Lokasyonun var olduğunu kontrol et
  const existingLocation = await getLocationById(locationId);
  if (!existingLocation) {
    return {
      success: false,
      error: 'Lokasyon bulunamadı',
    };
  }

  // Zaten silinmiş mi kontrol et
  if (!existingLocation.is_active) {
    return {
      success: true,
      error: null,
    };
  }

  // Soft delete: is_active = false
  const { error: updateError } = await supabase
    .from('locations')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  if (updateError) {
    return {
      success: false,
      error: `Lokasyon silinirken hata oluştu: ${updateError.message}`,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Lokasyonu yeniden aktif et.
 *
 * Soft delete ile deaktif edilmiş bir lokasyonu tekrar aktif eder.
 *
 * @param locationId - Lokasyon UUID'si
 * @returns Promise<UpdateLocationResult> - Aktivasyon sonucu
 */
export async function reactivateLocation(
  locationId: UUID
): Promise<UpdateLocationResult> {
  return updateLocation(locationId, { is_active: true });
}
