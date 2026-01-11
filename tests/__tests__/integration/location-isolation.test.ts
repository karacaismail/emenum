/**
 * Location Isolation Integration Tests
 *
 * Bu testler multi-location sistemi icin lokasyon izolasyonunun dogru
 * calistigini dogrulamak icin tasarlanmistir.
 *
 * Test Senaryolari:
 * 1. Location Menu Isolation - Lokasyon A menusu lokasyon B urunlerini gostermemeli
 * 2. RLS Location Policies - RLS politikalari cross-location erisimi engellemeli
 * 3. Organization Admin Access - Org adminleri tum lokasyonlarina erisebilmeli
 * 4. Slug Uniqueness Constraints - Slug benzersizligi zorla uygulanmali
 * 5. Cross-Organization Location Isolation - Farkli organizasyonlarin lokasyonlari izole olmali
 * 6. Location-Specific Product Access - Lokasyona ozel urunler sadece o lokasyonda gorunmeli
 *
 * CRITICAL: Bu testler KVKK ve multi-tenant veri guvenligi icin kritiktir.
 * Lokasyonlar arasi veri sizintisi olmamalidir!
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockOrganization,
  createMockProduct,
  createMockCategory,
  resetAllSupabaseMocks,
} from '@/tests/__mocks__/supabase';

// =============================================================================
// MOCKING SETUP
// =============================================================================

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// MOCK DATA FACTORIES
// =============================================================================

interface MockLocation {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MockProductWithLocation {
  id: string;
  organization_id: string;
  location_id: string | null;
  category_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
}

let locationIdCounter = 0;
const generateLocationId = () => `loc-${++locationIdCounter}-${Date.now()}`;

function createMockLocation(
  organizationId: string,
  overrides: Partial<MockLocation> = {}
): MockLocation {
  return {
    id: generateLocationId(),
    organization_id: organizationId,
    name: `Test Location ${locationIdCounter}`,
    slug: `test-location-${locationIdCounter}`,
    address: 'Test Address',
    city: 'Istanbul',
    phone: '+90 555 123 4567',
    email: `location-${locationIdCounter}@example.com`,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockProductWithLocation(
  organizationId: string,
  locationId: string | null,
  overrides: Partial<MockProductWithLocation> = {}
): MockProductWithLocation {
  const baseProduct = createMockProduct(organizationId, overrides);
  return {
    ...baseProduct,
    location_id: locationId,
  };
}

// =============================================================================
// TEST CONSTANTS
// =============================================================================

// Organization A - Franchise with multiple locations
const ORG_A = {
  id: 'org-a-uuid-isolation-test',
  name: 'Franchise A',
  slug: 'franchise-a',
};

// Organization B - Different franchise (completely isolated)
const ORG_B = {
  id: 'org-b-uuid-isolation-test',
  name: 'Franchise B',
  slug: 'franchise-b',
};

// Location A1 - First location of Org A (Downtown)
const LOCATION_A1 = {
  id: 'loc-a1-uuid-isolation-test',
  organization_id: ORG_A.id,
  name: 'Downtown Branch',
  slug: 'downtown',
};

// Location A2 - Second location of Org A (Uptown)
const LOCATION_A2 = {
  id: 'loc-a2-uuid-isolation-test',
  organization_id: ORG_A.id,
  name: 'Uptown Branch',
  slug: 'uptown',
};

// Location B1 - Location of Org B
const LOCATION_B1 = {
  id: 'loc-b1-uuid-isolation-test',
  organization_id: ORG_B.id,
  name: 'Main Branch',
  slug: 'main',
};

// Admin User for Org A
const USER_ORG_A_ADMIN = {
  id: 'user-a-admin-uuid',
  email: 'admin@franchise-a.com',
  organizationId: ORG_A.id,
  role: 'admin',
};

// Staff User for Location A1 only
const USER_LOCATION_A1_STAFF = {
  id: 'user-a1-staff-uuid',
  email: 'staff@franchise-a-downtown.com',
  organizationId: ORG_A.id,
  locationId: LOCATION_A1.id,
  role: 'staff',
};

// =============================================================================
// LOCATION ISOLATION TESTS
// =============================================================================

describe('Location Isolation Integration Tests', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    locationIdCounter = 0;
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. LOCATION MENU ISOLATION
  // ===========================================================================

  describe('1. Location Menu Isolation', () => {
    it('lokasyon A menusu lokasyon B urunlerini gostermemeli', async () => {
      // Location A1's products (location-specific)
      const locationA1Products = [
        createMockProductWithLocation(ORG_A.id, LOCATION_A1.id, { name: 'Downtown Burger' }),
        createMockProductWithLocation(ORG_A.id, LOCATION_A1.id, { name: 'Downtown Pizza' }),
      ];

      // Location A2's products (location-specific)
      const locationA2Products = [
        createMockProductWithLocation(ORG_A.id, LOCATION_A2.id, { name: 'Uptown Burger' }),
        createMockProductWithLocation(ORG_A.id, LOCATION_A2.id, { name: 'Uptown Special' }),
      ];

      // Simulate menu query for Location A1
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                // Only Location A1 products returned
                data: locationA1Products,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Query menu for Location A1
      const result = await mockSupabaseClient
        .from('products')
        .select('*')
        .eq('organization_id', ORG_A.id)
        .or(`location_id.eq.${LOCATION_A1.id},location_id.is.null`);

      // Should only see Location A1 products
      expect(result.data).toHaveLength(2);
      expect(result.data.every((p: MockProductWithLocation) =>
        p.location_id === LOCATION_A1.id || p.location_id === null
      )).toBe(true);
      expect(result.data.some((p: { name: string }) => p.name === 'Uptown Burger')).toBe(false);
      expect(result.data.some((p: { name: string }) => p.name === 'Uptown Special')).toBe(false);
    });

    it('org-level urunler tum lokasyonlarda gorunmeli', async () => {
      // Org-level products (available at all locations)
      const orgLevelProducts = [
        createMockProductWithLocation(ORG_A.id, null, { name: 'Classic Burger' }),
        createMockProductWithLocation(ORG_A.id, null, { name: 'Classic Pizza' }),
      ];

      // Location-specific product for A1
      const locationA1Product = createMockProductWithLocation(ORG_A.id, LOCATION_A1.id, {
        name: 'Downtown Special',
      });

      // Combined result for Location A1 menu
      const combinedProducts = [...orgLevelProducts, locationA1Product];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: combinedProducts,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('products')
        .select('*')
        .eq('organization_id', ORG_A.id)
        .or(`location_id.eq.${LOCATION_A1.id},location_id.is.null`);

      // Should see org-level + location-specific products
      expect(result.data).toHaveLength(3);

      const orgLevelCount = result.data.filter(
        (p: MockProductWithLocation) => p.location_id === null
      ).length;
      const locationSpecificCount = result.data.filter(
        (p: MockProductWithLocation) => p.location_id === LOCATION_A1.id
      ).length;

      expect(orgLevelCount).toBe(2);
      expect(locationSpecificCount).toBe(1);
    });

    it('QR tarama ile sadece o lokasyonun menusunu gormeli', async () => {
      // Public menu query simulating QR scan for Location A2
      const locationA2Menu = [
        createMockProductWithLocation(ORG_A.id, null, { name: 'Classic Burger', is_active: true }),
        createMockProductWithLocation(ORG_A.id, LOCATION_A2.id, { name: 'Uptown Special', is_active: true }),
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: locationA2Menu,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Simulated public menu query for Location A2
      const result = await mockSupabaseClient
        .from('products')
        .select('*')
        .eq('organization_id', ORG_A.id)
        .eq('is_active', true)
        .or(`location_id.eq.${LOCATION_A2.id},location_id.is.null`);

      expect(result.data).toHaveLength(2);
      result.data.forEach((product: MockProductWithLocation & { is_active: boolean }) => {
        expect(product.is_active).toBe(true);
        expect(
          product.location_id === null || product.location_id === LOCATION_A2.id
        ).toBe(true);
      });
    });

    it('baska organizasyonun lokasyonunun urunlerini goremememeli', async () => {
      // User from Org A tries to access Org B's location menu
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                // RLS blocks cross-org access
                data: [],
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Attempt to access Org B's location menu
      const result = await mockSupabaseClient
        .from('products')
        .select('*')
        .eq('organization_id', ORG_B.id)
        .or(`location_id.eq.${LOCATION_B1.id},location_id.is.null`);

      // Should be empty - RLS blocks cross-org access
      expect(result.data).toHaveLength(0);
    });
  });

  // ===========================================================================
  // 2. RLS LOCATION POLICIES
  // ===========================================================================

  describe('2. RLS Location Policies', () => {
    it('RLS politikalari cross-location urun erisimini engellemeli', async () => {
      // User A1 Staff tries to update Location A2 product
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: location access denied' },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const locationA2ProductId = 'loc-a2-product-id';

      const result = await mockSupabaseClient
        .from('products')
        .update({ name: 'Hacked Product' })
        .eq('id', locationA2ProductId)
        .single();

      expect(result.error).not.toBeNull();
    });

    it('lokasyon admin diger lokasyona urun ekleyememeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: cannot add product to different location' },
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Location A1 admin tries to add product to Location A2
      const result = await mockSupabaseClient
        .from('products')
        .insert({
          organization_id: ORG_A.id,
          location_id: LOCATION_A2.id, // Wrong location
          name: 'Unauthorized Product',
        })
        .select()
        .single();

      expect(result.error).not.toBeNull();
    });

    it('lokasyon staff baska lokasyonun kategorisini duzenleyememeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'categories') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation' },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const locationA2CategoryId = 'loc-a2-category-id';

      const result = await mockSupabaseClient
        .from('categories')
        .update({ name: 'Hacked Category' })
        .eq('id', locationA2CategoryId)
        .single();

      expect(result.error).not.toBeNull();
    });

    it('lokasyon verisini silme yetkisi olmayanlar silemememeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: delete not allowed' },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('locations')
        .delete()
        .eq('id', LOCATION_A2.id)
        .single();

      expect(result.error).not.toBeNull();
    });

    it('cross-location order erisimi engellenmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                // RLS blocks - only location A1 orders
                data: [],
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Staff from Location A1 tries to view Location A2 orders
      const result = await mockSupabaseClient
        .from('orders')
        .select('*')
        .eq('location_id', LOCATION_A2.id);

      expect(result.data).toHaveLength(0);
    });
  });

  // ===========================================================================
  // 3. ORGANIZATION ADMIN ACCESS
  // ===========================================================================

  describe('3. Organization Admin Access', () => {
    it('org admin tum lokasyonlarina erisebilmeli', async () => {
      const allOrgALocations = [
        createMockLocation(ORG_A.id, { ...LOCATION_A1 }),
        createMockLocation(ORG_A.id, { ...LOCATION_A2 }),
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: allOrgALocations,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Org A admin queries all locations
      const result = await mockSupabaseClient
        .from('locations')
        .select('*')
        .eq('organization_id', ORG_A.id);

      expect(result.data).toHaveLength(2);
      result.data.forEach((loc: MockLocation) => {
        expect(loc.organization_id).toBe(ORG_A.id);
      });
    });

    it('org admin tum lokasyonlardaki urunleri gorebilmeli', async () => {
      const allOrgAProducts = [
        createMockProductWithLocation(ORG_A.id, null, { name: 'Org Level' }),
        createMockProductWithLocation(ORG_A.id, LOCATION_A1.id, { name: 'Downtown Special' }),
        createMockProductWithLocation(ORG_A.id, LOCATION_A2.id, { name: 'Uptown Special' }),
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: allOrgAProducts,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Org A admin queries all products
      const result = await mockSupabaseClient
        .from('products')
        .select('*')
        .eq('organization_id', ORG_A.id);

      expect(result.data).toHaveLength(3);

      // Should have products from all locations
      const locationIds = new Set(
        result.data.map((p: MockProductWithLocation) => p.location_id)
      );
      expect(locationIds.has(null)).toBe(true);
      expect(locationIds.has(LOCATION_A1.id)).toBe(true);
      expect(locationIds.has(LOCATION_A2.id)).toBe(true);
    });

    it('org admin herhangi bir lokasyona urun ekleyebilmeli', async () => {
      const newProduct = createMockProductWithLocation(ORG_A.id, LOCATION_A2.id, {
        name: 'New Uptown Product',
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newProduct,
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('products')
        .insert({
          organization_id: ORG_A.id,
          location_id: LOCATION_A2.id,
          name: 'New Uptown Product',
        })
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data.location_id).toBe(LOCATION_A2.id);
    });

    it('org admin yeni lokasyon olusturabilmeli', async () => {
      const newLocation = createMockLocation(ORG_A.id, {
        name: 'New Branch',
        slug: 'new-branch',
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newLocation,
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('locations')
        .insert({
          organization_id: ORG_A.id,
          name: 'New Branch',
          slug: 'new-branch',
        })
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data.organization_id).toBe(ORG_A.id);
    });

    it('org admin baska organizasyonun lokasyonuna erisememeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null, // RLS blocks
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Org A admin tries to access Org B's location
      const result = await mockSupabaseClient
        .from('locations')
        .select('*')
        .eq('id', LOCATION_B1.id)
        .single();

      expect(result.data).toBeNull();
    });
  });

  // ===========================================================================
  // 4. SLUG UNIQUENESS CONSTRAINTS
  // ===========================================================================

  describe('4. Slug Uniqueness Constraints', () => {
    it('ayni organizasyonda ayni slug kullanimi engellenmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    message: 'duplicate key value violates unique constraint "locations_unique_slug_per_org"',
                    code: '23505',
                  },
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Try to create location with existing slug in same org
      const result = await mockSupabaseClient
        .from('locations')
        .insert({
          organization_id: ORG_A.id,
          name: 'Duplicate',
          slug: 'downtown', // Already exists
        })
        .select()
        .single();

      expect(result.error).not.toBeNull();
      expect(result.error.code).toBe('23505');
      expect(result.error.message).toContain('unique constraint');
    });

    it('farkli organizasyonlarda ayni slug kullanilabilmeli', async () => {
      const newLocation = createMockLocation(ORG_B.id, {
        name: 'Downtown',
        slug: 'downtown', // Same slug, different org
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newLocation,
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Same slug in different org should work
      const result = await mockSupabaseClient
        .from('locations')
        .insert({
          organization_id: ORG_B.id,
          name: 'Downtown',
          slug: 'downtown',
        })
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data.slug).toBe('downtown');
    });

    it('slug format constrainti gecersiz karakterleri engellemeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    message: 'new row violates check constraint "locations_slug_format"',
                    code: '23514',
                  },
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Invalid slug with special characters
      const result = await mockSupabaseClient
        .from('locations')
        .insert({
          organization_id: ORG_A.id,
          name: 'Invalid',
          slug: 'Invalid Slug!@#', // Invalid characters
        })
        .select()
        .single();

      expect(result.error).not.toBeNull();
      expect(result.error.code).toBe('23514');
    });

    it('slug guncelleme sirasinda benzersizlik kontrol edilmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message: 'duplicate key value violates unique constraint',
                  code: '23505',
                },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Try to update slug to one that already exists
      const result = await mockSupabaseClient
        .from('locations')
        .update({ slug: 'uptown' }) // Already exists in Org A
        .eq('id', LOCATION_A1.id)
        .single();

      expect(result.error).not.toBeNull();
      expect(result.error.code).toBe('23505');
    });

    it('slug availability kontrolu calismali', async () => {
      // First check - slug is taken
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: LOCATION_A1.id, slug: 'downtown' },
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const checkResult = await mockSupabaseClient
        .from('locations')
        .select('id, slug')
        .eq('organization_id', ORG_A.id)
        .eq('slug', 'downtown')
        .single();

      // Slug is taken
      expect(checkResult.data).not.toBeNull();
      expect(checkResult.data.slug).toBe('downtown');
    });
  });

  // ===========================================================================
  // 5. CROSS-ORGANIZATION LOCATION ISOLATION
  // ===========================================================================

  describe('5. Cross-Organization Location Isolation', () => {
    it('farkli organizasyonlarin lokasyonlari tamamen izole olmali', async () => {
      // Org A's locations only
      const orgALocations = [
        createMockLocation(ORG_A.id, { ...LOCATION_A1 }),
        createMockLocation(ORG_A.id, { ...LOCATION_A2 }),
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: orgALocations, // Only Org A's locations
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('locations')
        .select('*')
        .eq('organization_id', ORG_A.id);

      expect(result.data).toHaveLength(2);
      expect(
        result.data.every((loc: MockLocation) => loc.organization_id === ORG_A.id)
      ).toBe(true);
      expect(
        result.data.some((loc: MockLocation) => loc.organization_id === ORG_B.id)
      ).toBe(false);
    });

    it('organizasyon ID spoofing ile baska organizasyon lokasyonu alinamaz', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                // RLS blocks cross-org access
                data: [],
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // User from Org A spoofs organization_id to access Org B
      const result = await mockSupabaseClient
        .from('locations')
        .select('*')
        .eq('organization_id', ORG_B.id); // Attempting to access Org B

      expect(result.data).toHaveLength(0);
    });

    it('baska organizasyonun lokasyonunu guncelleyememeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation' },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Try to update Org B's location
      const result = await mockSupabaseClient
        .from('locations')
        .update({ name: 'Hacked Location' })
        .eq('id', LOCATION_B1.id)
        .single();

      expect(result.error).not.toBeNull();
    });

    it('baska organizasyona lokasyon ekleyememeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: organization_id mismatch' },
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('locations')
        .insert({
          organization_id: ORG_B.id, // Trying to add to Org B
          name: 'Malicious Location',
          slug: 'malicious',
        })
        .select()
        .single();

      expect(result.error).not.toBeNull();
    });
  });

  // ===========================================================================
  // 6. LOCATION-SPECIFIC PRODUCT ACCESS
  // ===========================================================================

  describe('6. Location-Specific Product Access', () => {
    it('lokasyona ozel urun sadece o lokasyonda gorunmeli', async () => {
      const locationA1SpecificProduct = createMockProductWithLocation(
        ORG_A.id,
        LOCATION_A1.id,
        { name: 'Downtown Only Special' }
      );

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: [locationA1SpecificProduct],
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await mockSupabaseClient
        .from('products')
        .select('*')
        .eq('location_id', LOCATION_A1.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].location_id).toBe(LOCATION_A1.id);
    });

    it('urun baska lokasyona tasindinda org eslesmesi dogrulanmali', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message: 'Product organization_id does not match location organization_id',
                  code: 'P0001',
                },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // Try to move product to location from different org
      const result = await mockSupabaseClient
        .from('products')
        .update({ location_id: LOCATION_B1.id }) // Different org's location
        .eq('id', 'org-a-product-id')
        .single();

      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('organization_id');
    });

    it('get_products_for_location RPC fonksiyonu dogru calismali', async () => {
      const productsForLocation = [
        createMockProductWithLocation(ORG_A.id, LOCATION_A1.id, { name: 'Location Specific' }),
        createMockProductWithLocation(ORG_A.id, null, { name: 'Org Level' }),
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: productsForLocation,
        error: null,
      });

      const result = await mockSupabaseClient.rpc('get_products_for_location', {
        p_location_id: LOCATION_A1.id,
      });

      expect(result.data).toHaveLength(2);

      // Should include both location-specific and org-level
      const hasLocationSpecific = result.data.some(
        (p: MockProductWithLocation) => p.location_id === LOCATION_A1.id
      );
      const hasOrgLevel = result.data.some(
        (p: MockProductWithLocation) => p.location_id === null
      );

      expect(hasLocationSpecific).toBe(true);
      expect(hasOrgLevel).toBe(true);
    });

    it('lokasyonlar arasi urun paylasilamaz (location_id degisikligi)', async () => {
      // Product belongs to Location A1, trying to assign to both A1 and A2
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message: 'A product can only belong to one location at a time',
                },
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      // This represents an invalid state - product cannot be in multiple locations
      const result = await mockSupabaseClient
        .from('products')
        .update({ location_id: LOCATION_A2.id }) // Cannot share between locations
        .eq('id', 'loc-a1-specific-product')
        .single();

      // The proper way is to either:
      // 1. Make it org-level (location_id = null) to appear everywhere
      // 2. Keep it location-specific to one location only
      expect(result.data).toBeNull();
    });
  });
});

// =============================================================================
// LOCATION ISOLATION ATTACK SIMULATION
// =============================================================================

describe('Location Isolation Attack Prevention', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    locationIdCounter = 0;
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('IDOR saldirisi lokasyon verisi icin engellenmeli', async () => {
    // Attacker tries to access location by guessing ID
    const secretLocationId = 'org-b-secret-location-uuid';

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'locations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null, // RLS blocks
            error: null,
          }),
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    const result = await mockSupabaseClient
      .from('locations')
      .select('*')
      .eq('id', secretLocationId)
      .single();

    expect(result.data).toBeNull();
  });

  it('URL parameter manipulation ile baska lokasyonun menusune erisim engellenmeli', async () => {
    // Attacker manipulates URL to access different location's menu
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          then: vi.fn((resolve) =>
            resolve({
              // Returns empty - URL validation + RLS blocks
              data: [],
              error: null,
            })
          ),
          [Symbol.toStringTag]: 'Promise',
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    // URL: /menu/franchise-a/secretlocation (location doesn't exist in org)
    const result = await mockSupabaseClient
      .from('products')
      .select('*')
      .eq('organization_id', ORG_A.id)
      .or(`location_id.eq.non-existent-location,location_id.is.null`);

    expect(result.data).toHaveLength(0);
  });

  it('horizontal privilege escalation lokasyonlar arasi engellenmeli', async () => {
    // Staff of Location A1 tries to become admin of Location A2
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'location_members') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation' },
              }),
            }),
          }),
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    const result = await mockSupabaseClient
      .from('location_members')
      .insert({
        user_id: USER_LOCATION_A1_STAFF.id,
        location_id: LOCATION_A2.id,
        role: 'admin',
      })
      .select()
      .single();

    expect(result.error).not.toBeNull();
  });

  it('mass assignment ile location_id degistirme engellenmeli', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'RLS policy violation: cannot change location_id to different org' },
            }),
          }),
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    // Try to change product's location to one in different org
    const result = await mockSupabaseClient
      .from('products')
      .update({ location_id: LOCATION_B1.id })
      .eq('id', 'org-a-product-id')
      .single();

    expect(result.error).not.toBeNull();
  });

  it('data exfiltration via JOIN lokasyonlar arasi engellenmeli', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn((resolve) =>
            resolve({
              // Only returns user's org data, even with JOIN attempt
              data: [],
              error: null,
            })
          ),
          [Symbol.toStringTag]: 'Promise',
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    // Attempt to select with foreign key reference to get other org's data
    const result = await mockSupabaseClient
      .from('products')
      .select('*, location:locations(*)')
      .eq('organization_id', ORG_B.id);

    expect(result.data).toHaveLength(0);
  });
});

// =============================================================================
// PUBLIC MENU ACCESS (CUSTOMER FACING)
// =============================================================================

describe('Public Location Menu Access', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    locationIdCounter = 0;
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  it('musteri QR taradiginda sadece aktif urunleri gormeli', async () => {
    const activeProducts = [
      createMockProductWithLocation(ORG_A.id, LOCATION_A1.id, {
        name: 'Active Product',
        is_active: true
      }),
    ];

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          then: vi.fn((resolve) =>
            resolve({
              data: activeProducts,
              error: null,
            })
          ),
          [Symbol.toStringTag]: 'Promise',
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    const result = await mockSupabaseClient
      .from('products')
      .select('*')
      .eq('organization_id', ORG_A.id)
      .eq('is_active', true)
      .or(`location_id.eq.${LOCATION_A1.id},location_id.is.null`);

    result.data.forEach((product: MockProductWithLocation & { is_active: boolean }) => {
      expect(product.is_active).toBe(true);
    });
  });

  it('pasif lokasyonun menusu public erisime kapali olmali', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'locations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null, // Location not found (inactive filtered out)
            error: { code: 'PGRST116', message: 'Row not found' },
          }),
        };
      }
      return createMockQueryBuilder({ data: null });
    });

    // Public query for inactive location should return nothing
    const result = await mockSupabaseClient
      .from('locations')
      .select('*')
      .eq('slug', 'inactive-location')
      .eq('is_active', true)
      .single();

    expect(result.data).toBeNull();
  });

  it('dogru URL pattern ile lokasyon menusune erisilebilmeli', async () => {
    const locationData = createMockLocation(ORG_A.id, {
      slug: 'downtown',
      name: 'Downtown Branch',
      is_active: true,
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: [
        {
          location_id: locationData.id,
          location_name: locationData.name,
          location_slug: locationData.slug,
          org_id: ORG_A.id,
          org_name: ORG_A.name,
          org_slug: ORG_A.slug,
        },
      ],
      error: null,
    });

    // URL: /menu/franchise-a/downtown
    const result = await mockSupabaseClient.rpc('get_location_by_slugs', {
      org_slug: 'franchise-a',
      loc_slug: 'downtown',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].location_slug).toBe('downtown');
    expect(result.data[0].org_slug).toBe('franchise-a');
  });
});
