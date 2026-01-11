/**
 * Location Database Query Tests
 *
 * Bu testler lokasyon veritabanı sorgularının doğru çalıştığını doğrular.
 * Supabase client mock'ları kullanılarak unit test yapılır.
 *
 * Test Senaryoları:
 * 1. getLocationBySlug - Slug ile lokasyon getirme
 * 2. getLocationById - ID ile lokasyon getirme
 * 3. getLocationsByOrganization - Organizasyona ait lokasyonları listeleme
 * 4. createLocation - Yeni lokasyon oluşturma
 * 5. updateLocation - Lokasyon güncelleme
 * 6. deleteLocation - Lokasyon silme (soft delete)
 * 7. isSlugAvailable - Slug benzersizlik kontrolü
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  createMockSupabaseClient,
  createMockOrganization,
  createMockQueryBuilder,
  resetAllSupabaseMocks,
} from '@/tests/__mocks__/supabase';
import type { Location, LocationInsert, Organization } from '@/types';

// =============================================================================
// MOCKING SETUP
// =============================================================================

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

// Mock server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import the mock module to control it
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Import functions to test
import {
  getLocationBySlug,
  getLocationById,
  getLocationWithOrganization,
  getLocationsByOrganization,
  getLocationsByOrganizationSlug,
  getLocationCount,
  getDefaultLocation,
  getDefaultLocationByOrgSlug,
  isSlugAvailable,
  createLocation,
  updateLocation,
  deleteLocation,
  reactivateLocation,
} from '@/lib/db/locations';

// =============================================================================
// TEST HELPERS
// =============================================================================

const MOCK_ORG_ID = 'org-123e4567-e89b-12d3-a456-426614174000';
const MOCK_ORG_SLUG = 'test-org';
const MOCK_LOCATION_ID = 'loc-123e4567-e89b-12d3-a456-426614174000';
const MOCK_LOCATION_SLUG = 'downtown';

function createMockLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: MOCK_LOCATION_ID,
    organization_id: MOCK_ORG_ID,
    name: 'Downtown Branch',
    slug: MOCK_LOCATION_SLUG,
    address: '123 Main Street',
    city: 'Istanbul',
    state: null,
    postal_code: null,
    phone: '+90 555 123 4567',
    email: 'downtown@test-org.com',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function setupFromMock(tableDataMap: Record<string, unknown>) {
  mockSupabaseClient.from.mockImplementation((table: string) => {
    const data = tableDataMap[table] ?? null;
    return createMockQueryBuilder({ data });
  });
}

// =============================================================================
// LOCATION QUERY TESTS
// =============================================================================

describe('Location Database Queries', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // getLocationBySlug
  // ===========================================================================

  describe('getLocationBySlug', () => {
    it('organizasyon ve lokasyon slug ile lokasyonu getirmeli', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID, slug: MOCK_ORG_SLUG });
      const mockLocation = createMockLocation();

      // Setup sequential mock calls
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        if (table === 'locations') {
          return createMockQueryBuilder({ data: mockLocation });
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getLocationBySlug(MOCK_ORG_SLUG, MOCK_LOCATION_SLUG);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(MOCK_LOCATION_ID);
      expect(result?.slug).toBe(MOCK_LOCATION_SLUG);
      expect(result?.organization).toBeDefined();
      expect(result?.organization.slug).toBe(MOCK_ORG_SLUG);
    });

    it('organizasyon bulunamazsa null donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createMockQueryBuilder({ data: null, error: new Error('Not found') })
      );

      const result = await getLocationBySlug('nonexistent-org', MOCK_LOCATION_SLUG);

      expect(result).toBeNull();
    });

    it('lokasyon bulunamazsa null donmeli', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID, slug: MOCK_ORG_SLUG });

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        if (table === 'locations') {
          return createMockQueryBuilder({ data: null, error: new Error('Not found') });
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getLocationBySlug(MOCK_ORG_SLUG, 'nonexistent-location');

      expect(result).toBeNull();
    });

    it('deaktif lokasyon donmemeli', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID, slug: MOCK_ORG_SLUG });
      const mockLocation = createMockLocation({ is_active: false });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        if (table === 'locations') {
          // Simulate that inactive location is filtered out
          return createMockQueryBuilder({ data: null, error: new Error('Not found') });
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getLocationBySlug(MOCK_ORG_SLUG, MOCK_LOCATION_SLUG);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getLocationById
  // ===========================================================================

  describe('getLocationById', () => {
    it('ID ile lokasyonu getirmeli', async () => {
      const mockLocation = createMockLocation();

      setupFromMock({ locations: mockLocation });

      const result = await getLocationById(MOCK_LOCATION_ID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(MOCK_LOCATION_ID);
      expect(result?.name).toBe('Downtown Branch');
    });

    it('lokasyon bulunamazsa null donmeli', async () => {
      setupFromMock({ locations: null });
      mockSupabaseClient.from.mockReturnValue(
        createMockQueryBuilder({ data: null, error: new Error('Not found') })
      );

      const result = await getLocationById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getLocationsByOrganization
  // ===========================================================================

  describe('getLocationsByOrganization', () => {
    it('organizasyona ait tum lokasyonlari getirmeli', async () => {
      const mockLocations = [
        createMockLocation({ id: 'loc-1', slug: 'downtown', name: 'Downtown' }),
        createMockLocation({ id: 'loc-2', slug: 'uptown', name: 'Uptown' }),
        createMockLocation({ id: 'loc-3', slug: 'midtown', name: 'Midtown' }),
      ];

      setupFromMock({ locations: mockLocations });

      const result = await getLocationsByOrganization(MOCK_ORG_ID);

      expect(result).toHaveLength(3);
      expect(result[0]?.slug).toBe('downtown');
      expect(result[1]?.slug).toBe('uptown');
    });

    it('bos liste donmeli lokasyon yoksa', async () => {
      setupFromMock({ locations: [] });

      const result = await getLocationsByOrganization(MOCK_ORG_ID);

      expect(result).toEqual([]);
    });

    it('activeOnly parametresi ile sadece aktif lokasyonlari getirmeli', async () => {
      const mockLocations = [
        createMockLocation({ id: 'loc-1', is_active: true }),
        createMockLocation({ id: 'loc-2', is_active: true }),
      ];

      setupFromMock({ locations: mockLocations });

      const result = await getLocationsByOrganization(MOCK_ORG_ID, { activeOnly: true });

      expect(result).toHaveLength(2);
      result.forEach((loc) => {
        expect(loc.is_active).toBe(true);
      });
    });

    it('sayfalama parametreleri calismali', async () => {
      const mockLocations = [createMockLocation({ id: 'loc-1' })];

      setupFromMock({ locations: mockLocations });

      const result = await getLocationsByOrganization(MOCK_ORG_ID, { limit: 1, offset: 0 });

      expect(result).toHaveLength(1);
    });
  });

  // ===========================================================================
  // getLocationsByOrganizationSlug
  // ===========================================================================

  describe('getLocationsByOrganizationSlug', () => {
    it('organizasyon slug ile lokasyonlari getirmeli', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID, slug: MOCK_ORG_SLUG });
      const mockLocations = [
        createMockLocation({ id: 'loc-1', slug: 'downtown' }),
        createMockLocation({ id: 'loc-2', slug: 'uptown' }),
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        if (table === 'locations') {
          return createMockQueryBuilder({ data: mockLocations });
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getLocationsByOrganizationSlug(MOCK_ORG_SLUG);

      expect(result).toHaveLength(2);
    });

    it('organizasyon bulunamazsa bos liste donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createMockQueryBuilder({ data: null, error: new Error('Not found') })
      );

      const result = await getLocationsByOrganizationSlug('nonexistent-org');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getLocationCount
  // ===========================================================================

  describe('getLocationCount', () => {
    it('lokasyon sayisini donmeli', async () => {
      const mockBuilder = createMockQueryBuilder({ data: null, count: 5 });
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      // Override count behavior
      const { data, ...rest } = await mockBuilder.single();
      mockSupabaseClient.from.mockReturnValue({
        ...mockBuilder,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      });

      // The function uses head: true, so we need to mock accordingly
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: 5, error: null })),
      }));

      const result = await getLocationCount(MOCK_ORG_ID);

      expect(result).toBe(5);
    });

    it('hata durumunda 0 donmeli', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: null, error: new Error('Error') })),
      }));

      const result = await getLocationCount(MOCK_ORG_ID);

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // getDefaultLocation
  // ===========================================================================

  describe('getDefaultLocation', () => {
    it('ilk aktif lokasyonu donmeli', async () => {
      const mockLocation = createMockLocation();

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
      }));

      const result = await getDefaultLocation(MOCK_ORG_ID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(MOCK_LOCATION_ID);
    });

    it('lokasyon yoksa null donmeli', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await getDefaultLocation(MOCK_ORG_ID);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // isSlugAvailable
  // ===========================================================================

  describe('isSlugAvailable', () => {
    it('slug kullanilabilir ise true donmeli', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: 0, error: null })),
      }));

      const result = await isSlugAvailable(MOCK_ORG_ID, 'new-slug');

      expect(result).toBe(true);
    });

    it('slug zaten kullaniliyorsa false donmeli', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: 1, error: null })),
      }));

      const result = await isSlugAvailable(MOCK_ORG_ID, 'existing-slug');

      expect(result).toBe(false);
    });

    it('excludeLocationId parametresi calismali', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: 0, error: null })),
      }));

      const result = await isSlugAvailable(MOCK_ORG_ID, 'my-slug', MOCK_LOCATION_ID);

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // createLocation
  // ===========================================================================

  describe('createLocation', () => {
    it('basarili lokasyon olusturmali', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID });
      const mockLocation = createMockLocation();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        if (table === 'locations') {
          // For slug check (count query)
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
            then: vi.fn((resolve) => resolve({ count: 0, error: null })),
          };
          return builder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const insertData: LocationInsert = {
        organization_id: MOCK_ORG_ID,
        name: 'Downtown Branch',
        slug: 'downtown',
        address: '123 Main Street',
      };

      const result = await createLocation(insertData);

      expect(result.success).toBe(true);
      expect(result.location).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('organizasyon bulunamazsa hata donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createMockQueryBuilder({ data: null, error: new Error('Not found') })
      );

      const insertData: LocationInsert = {
        organization_id: 'nonexistent-org',
        name: 'Test',
        slug: 'test',
      };

      const result = await createLocation(insertData);

      expect(result.success).toBe(false);
      expect(result.location).toBeNull();
      expect(result.error).toBe('Organizasyon bulunamadı');
    });

    it('slug zaten kullaniliyorsa hata donmeli', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        if (table === 'locations') {
          // Slug check returns 1 (already exists)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ count: 1, error: null })),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const insertData: LocationInsert = {
        organization_id: MOCK_ORG_ID,
        name: 'Test',
        slug: 'existing-slug',
      };

      const result = await createLocation(insertData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('slug zaten kullanımda');
    });
  });

  // ===========================================================================
  // updateLocation
  // ===========================================================================

  describe('updateLocation', () => {
    it('basarili lokasyon guncellemeli', async () => {
      const mockLocation = createMockLocation();
      const updatedLocation = { ...mockLocation, name: 'Updated Name' };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const builder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedLocation, error: null }),
          then: vi.fn((resolve) => resolve({ count: 0, error: null })),
        };
        return builder;
      });

      const result = await updateLocation(MOCK_LOCATION_ID, { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(result.location?.name).toBe('Updated Name');
    });

    it('lokasyon bulunamazsa hata donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createMockQueryBuilder({ data: null, error: new Error('Not found') })
      );

      const result = await updateLocation('nonexistent-id', { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lokasyon bulunamadı');
    });

    it('slug degistirilirken benzersizlik kontrolu yapmali', async () => {
      const mockLocation = createMockLocation();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const builder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
          then: vi.fn((resolve) => resolve({ count: 1, error: null })), // Slug exists
        };
        return builder;
      });

      const result = await updateLocation(MOCK_LOCATION_ID, { slug: 'existing-slug' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('slug zaten kullanımda');
    });
  });

  // ===========================================================================
  // deleteLocation
  // ===========================================================================

  describe('deleteLocation', () => {
    it('basarili soft delete yapmali', async () => {
      const mockLocation = createMockLocation();

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
        then: vi.fn((resolve) => resolve({ data: null, error: null })),
      }));

      const result = await deleteLocation(MOCK_LOCATION_ID);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('lokasyon bulunamazsa hata donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createMockQueryBuilder({ data: null, error: new Error('Not found') })
      );

      const result = await deleteLocation('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lokasyon bulunamadı');
    });

    it('zaten deaktif lokasyon icin basarili donmeli', async () => {
      const mockLocation = createMockLocation({ is_active: false });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
      }));

      const result = await deleteLocation(MOCK_LOCATION_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // reactivateLocation
  // ===========================================================================

  describe('reactivateLocation', () => {
    it('deaktif lokasyonu aktif etmeli', async () => {
      const mockLocation = createMockLocation({ is_active: false });
      const activatedLocation = { ...mockLocation, is_active: true };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: activatedLocation, error: null }),
        then: vi.fn((resolve) => resolve({ count: 0, error: null })),
      }));

      const result = await reactivateLocation(MOCK_LOCATION_ID);

      expect(result.success).toBe(true);
      expect(result.location?.is_active).toBe(true);
    });
  });
});

// =============================================================================
// EDGE CASES AND ERROR HANDLING
// =============================================================================

describe('Location Query Edge Cases', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('veritabani hatasi durumunda uygun hata donmeli', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' },
        }),
        then: vi.fn((resolve) =>
          resolve({ count: 0, error: null })
        ),
      }));

      // First mock org check succeeds
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID });
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations' && callCount === 0) {
          callCount++;
          return createMockQueryBuilder({ data: mockOrg });
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection error' },
          }),
          then: vi.fn((resolve) => resolve({ count: 0, error: null })),
        };
      });

      const result = await createLocation({
        organization_id: MOCK_ORG_ID,
        name: 'Test',
        slug: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('hata');
    });
  });

  describe('Input Validation', () => {
    it('bos slug ile lokasyon olusturmak calismali (veritabani validasyonu)', async () => {
      const mockOrg = createMockOrganization({ id: MOCK_ORG_ID });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createMockQueryBuilder({ data: mockOrg });
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Slug is required' },
          }),
          then: vi.fn((resolve) => resolve({ count: 0, error: null })),
        };
      });

      const result = await createLocation({
        organization_id: MOCK_ORG_ID,
        name: 'Test',
        slug: '',
      });

      // Validation happens at database level
      expect(result.success).toBe(false);
    });
  });
});
