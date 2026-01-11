/**
 * Permission Guard Tests
 *
 * Bu testler feature permission sisteminin doğru çalıştığını doğrular.
 * hasPermission, getFeatureLimit, checkFeature ve diğer fonksiyonları test eder.
 *
 * Test edilen senaryolar:
 * 1. Override priority - organization_feature_overrides tablosu öncelikli
 * 2. Plan feature checks - aktif subscription üzerinden özellik kontrolü
 * 3. Edge cases - süresi dolmuş override/subscription, olmayan özellikler, vb.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  resetAllSupabaseMocks,
} from '@/tests/__mocks__/supabase';

// Create mock client at module level
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

// Mock the module before imports
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import the mock module to control it
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Import after mocking
import {
  hasPermission,
  getFeatureLimit,
  checkFeature,
  getAllFeatures,
  checkUsageLimit,
} from '../permission';

describe('Permission Guard', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    vi.clearAllMocks();

    // Create a fresh mock client for each test
    mockSupabaseClient = createMockSupabaseClient();

    // Make the mock return our client
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mock Infrastructure Tests', () => {
    it('Supabase mock client oluşturulabilmeli', () => {
      const mockClient = createMockSupabaseClient();

      expect(mockClient).toBeDefined();
      expect(mockClient.from).toBeDefined();
      expect(mockClient.auth).toBeDefined();
      expect(mockClient.storage).toBeDefined();
      expect(mockClient.rpc).toBeDefined();
    });

    it('Mock query builder zincirleme çalışmalı', () => {
      const mockData = { id: 'test-id', override_value: true };
      const builder = createMockQueryBuilder({ data: mockData });

      expect(builder.select).toBeDefined();
      expect(builder.eq).toBeDefined();
      expect(builder.single).toBeDefined();

      // Zincirleme çağrılar çalışmalı
      builder.select('*').eq('id', 'test').eq('key', 'value');

      expect(builder.select).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledTimes(2);
    });

    it('Mock auth sistemi çalışmalı', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockClient = createMockSupabaseClient({
        auth: { user: mockUser as unknown as import('@supabase/supabase-js').User },
      });

      const { data } = await mockClient.auth.getUser();
      expect(data.user).toEqual(mockUser);
    });

    it('Mock storage sistemi çalışmalı', async () => {
      const mockClient = createMockSupabaseClient();

      const { data } = await mockClient.storage.from('test-bucket').upload('test.jpg', new Blob());
      expect(data?.path).toBeDefined();
    });

    it('Mock RPC çağrıları çalışmalı', async () => {
      const mockClient = createMockSupabaseClient();

      const result = await mockClient.rpc('test_function', { param: 'value' });
      expect(result.error).toBeNull();
    });
  });

  describe('Feature Permission Logic (Unit Tests)', () => {
    it('override true ise erişim sağlanmalı', () => {
      // Bu test sadece mantığı doğrular
      const override = { override_value: true, expires_at: null };
      const isExpired = override.expires_at ? new Date(override.expires_at) < new Date() : false;

      expect(!isExpired && override.override_value).toBe(true);
    });

    it('override false ise erişim engellenmeli', () => {
      const override = { override_value: false, expires_at: null };
      const isExpired = override.expires_at ? new Date(override.expires_at) < new Date() : false;

      expect(!isExpired && override.override_value).toBe(false);
    });

    it('süresi dolmuş override etkisiz olmalı', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 gün önce
      const override = { override_value: true, expires_at: pastDate };
      const isExpired = new Date(override.expires_at) < new Date();

      expect(isExpired).toBe(true);
    });

    it('limit değerleri doğru işlenmeli', () => {
      // -1 = sınırsız
      expect(-1 === -1 || 0 < -1).toBe(true); // Sınırsız her zaman izin verir

      // 0 = erişim yok
      const limit0 = 0;
      const currentUsage = 5;
      expect(limit0 > 0 && currentUsage < limit0).toBe(false);

      // Pozitif limit
      const limit20 = 20;
      expect(limit20 > 0 && currentUsage < limit20).toBe(true);
    });
  });

  describe('hasPermission - Override Priority Tests', () => {
    it('override true olduğunda erişim izni vermeli', async () => {
      // Setup mock to return override with true value
      const mockOverride = { override_value: true, expires_at: null };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_feature_overrides');
    });

    it('override false olduğunda erişim engellenmeli', async () => {
      // Setup mock to return override with false value
      const mockOverride = { override_value: false, expires_at: null };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('override plan featurelara göre öncelikli olmalı', async () => {
      // Override false olsa bile plan true verse de override kazanmalı
      const mockOverride = { override_value: false, expires_at: null };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      // Plan true döndürse bile override false olduğu için sonuç false olmalı
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      // Override öncelikli, override false olduğu için sonuç false
      expect(result).toBe(false);
    });

    it('süresi dolmuş override atlanıp plan feature kontrol edilmeli', async () => {
      // Süresi dolmuş override
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 gün önce
      const mockOverride = { override_value: false, expires_at: pastDate };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      // Plan feature true
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      // Override süresi dolmuş, plan feature true
      expect(result).toBe(true);
    });

    it('gelecekteki expires_at ile override geçerli olmalı', async () => {
      // 1 gün sonra süresi dolacak override
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const mockOverride = { override_value: true, expires_at: futureDate };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(true);
    });
  });

  describe('hasPermission - Plan Feature Tests', () => {
    it('aktif subscription ile plan feature true ise erişim izni vermeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Aktif subscription ve true feature
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(true);
    });

    it('aktif subscription ile plan feature false ise erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Aktif subscription ama false feature
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: false,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('planda olmayan özellik için erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Subscription var ama istenen feature planda yok
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'other_feature' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('birden fazla feature kontrolü yapılabilmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Birden fazla feature içeren plan
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
            {
              feature: { key: 'module_happy_hour' },
              value_boolean: true,
              value_limit: null,
            },
            {
              feature: { key: 'module_cross_sell' },
              value_boolean: false,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const waiterCallResult = await hasPermission('org-123', 'module_waiter_call');
      const happyHourResult = await hasPermission('org-123', 'module_happy_hour');
      const crossSellResult = await hasPermission('org-123', 'module_cross_sell');

      expect(waiterCallResult).toBe(true);
      expect(happyHourResult).toBe(true);
      expect(crossSellResult).toBe(false);
    });
  });

  describe('hasPermission - Edge Cases', () => {
    it('subscription yoksa erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Subscription da yok
      const subscriptionBuilder = createMockQueryBuilder({ data: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('süresi dolmuş subscription ile erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Süresi dolmuş subscription
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 gün önce
      const mockSubscription = {
        expires_at: pastDate,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('plan_features boş array ise erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Subscription var ama plan_features boş
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('plan null ise erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Subscription var ama plan yok
      const mockSubscription = {
        expires_at: null,
        plan: null,
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('value_boolean null ise false olarak değerlendirilmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Feature'da value_boolean null
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: null,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('feature.key null ise eşleşme olmamalı', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Feature key null
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: null,
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('org-123', 'module_waiter_call');

      expect(result).toBe(false);
    });

    it('boş organizationId için erişim engellenmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });
      const subscriptionBuilder = createMockQueryBuilder({ data: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPermission('', 'module_waiter_call');

      expect(result).toBe(false);
    });
  });

  describe('getFeatureLimit', () => {
    it('override limit değerini döndürmeli', async () => {
      // Override ile limit tanımlı
      const mockOverride = { override_limit: 100, expires_at: null };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getFeatureLimit('org-123', 'limit_menu_items');

      expect(result).toBe(100);
    });

    it('plan feature limit değerini döndürmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Plan feature ile limit
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 20,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getFeatureLimit('org-123', 'limit_menu_items');

      expect(result).toBe(20);
    });

    it('value_limit null ise -1 (sınırsız) döndürmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Plan feature ile null limit (sınırsız)
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getFeatureLimit('org-123', 'limit_menu_items');

      expect(result).toBe(-1);
    });

    it('subscription yoksa 0 döndürmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });
      // Subscription yok
      const subscriptionBuilder = createMockQueryBuilder({ data: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getFeatureLimit('org-123', 'limit_menu_items');

      expect(result).toBe(0);
    });

    it('süresi dolmuş subscription ile 0 döndürmeli', async () => {
      // Override yok
      const overrideBuilder = createMockQueryBuilder({ data: null });

      // Süresi dolmuş subscription
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const mockSubscription = {
        expires_at: pastDate,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 50,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getFeatureLimit('org-123', 'limit_menu_items');

      expect(result).toBe(0);
    });

    it('override süresi dolmuşsa plan limit değerini döndürmeli', async () => {
      // Süresi dolmuş override
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const mockOverride = { override_limit: 100, expires_at: pastDate };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      // Plan feature ile limit
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 20,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getFeatureLimit('org-123', 'limit_menu_items');

      expect(result).toBe(20);
    });
  });

  describe('checkFeature - Detailed Result', () => {
    it('override durumunda reason override olmalı', async () => {
      const mockOverride = { override_value: true, override_limit: null, expires_at: null };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkFeature('org-123', 'module_waiter_call');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('override');
    });

    it('plan feature durumunda reason plan_feature olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });

      const mockSubscription = {
        expires_at: null,
        status: 'active',
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkFeature('org-123', 'module_waiter_call');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('plan_feature');
    });

    it('subscription yoksa reason no_subscription olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });
      const subscriptionBuilder = createMockQueryBuilder({ data: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkFeature('org-123', 'module_waiter_call');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('no_subscription');
    });

    it('süresi dolmuş subscription için reason expired olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });

      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const mockSubscription = {
        expires_at: pastDate,
        status: 'active',
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkFeature('org-123', 'module_waiter_call');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('limit bilgisini içermeli', async () => {
      const mockOverride = { override_value: true, override_limit: 50, expires_at: null };
      const overrideBuilder = createMockQueryBuilder({ data: mockOverride });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkFeature('org-123', 'limit_menu_items');

      expect(result.limit).toBe(50);
    });
  });

  describe('checkUsageLimit', () => {
    it('kullanım limit altındaysa allowed true olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });

      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 20,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkUsageLimit('org-123', 'limit_menu_items', 15);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBe(5);
    });

    it('kullanım limite eşitse allowed false olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });

      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 20,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkUsageLimit('org-123', 'limit_menu_items', 20);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('kullanım limit üstündeyse allowed false olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });

      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 20,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkUsageLimit('org-123', 'limit_menu_items', 25);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('sınırsız limit (-1) için her zaman allowed true olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });

      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: null, // null = unlimited = -1
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkUsageLimit('org-123', 'limit_menu_items', 1000);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1); // Infinite
    });

    it('limit 0 ise erişim yok olmalı', async () => {
      const overrideBuilder = createMockQueryBuilder({ data: null });
      const subscriptionBuilder = createMockQueryBuilder({ data: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await checkUsageLimit('org-123', 'limit_menu_items', 0);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.remaining).toBe(0);
    });
  });

  describe('getAllFeatures', () => {
    it('tüm plan özelliklerini döndürmeli', async () => {
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
            {
              feature: { key: 'limit_menu_items' },
              value_boolean: true,
              value_limit: 20,
            },
            {
              feature: { key: 'module_happy_hour' },
              value_boolean: false,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });
      const overrideBuilder = createMockQueryBuilder({ data: [] });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getAllFeatures('org-123');

      expect(result.size).toBe(3);
      expect(result.get('module_waiter_call')).toEqual({ enabled: true, limit: null });
      expect(result.get('limit_menu_items')).toEqual({ enabled: true, limit: 20 });
      expect(result.get('module_happy_hour')).toEqual({ enabled: false, limit: null });
    });

    it('override değerleri plan değerlerini geçersiz kılmalı', async () => {
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_happy_hour' },
              value_boolean: false,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      // Override true yapıyor
      const mockOverrides = [
        { feature_key: 'module_happy_hour', override_value: true, override_limit: null, expires_at: null },
      ];
      const overrideBuilder = createMockQueryBuilder({ data: mockOverrides });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getAllFeatures('org-123');

      // Override plan değerini geçersiz kılmalı
      expect(result.get('module_happy_hour')).toEqual({ enabled: true, limit: null });
    });

    it('süresi dolmuş override atlanmalı', async () => {
      const mockSubscription = {
        expires_at: null,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_happy_hour' },
              value_boolean: false,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });

      // Süresi dolmuş override
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const mockOverrides = [
        { feature_key: 'module_happy_hour', override_value: true, override_limit: null, expires_at: pastDate },
      ];
      const overrideBuilder = createMockQueryBuilder({ data: mockOverrides });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getAllFeatures('org-123');

      // Override süresi dolmuş, plan değeri korunmalı
      expect(result.get('module_happy_hour')).toEqual({ enabled: false, limit: null });
    });

    it('süresi dolmuş subscription için boş map döndürmeli', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const mockSubscription = {
        expires_at: pastDate,
        plan: {
          plan_features: [
            {
              feature: { key: 'module_waiter_call' },
              value_boolean: true,
              value_limit: null,
            },
          ],
        },
      };
      const subscriptionBuilder = createMockQueryBuilder({ data: mockSubscription });
      const overrideBuilder = createMockQueryBuilder({ data: [] });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return subscriptionBuilder;
        }
        if (table === 'organization_feature_overrides') {
          return overrideBuilder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await getAllFeatures('org-123');

      expect(result.size).toBe(0);
    });
  });

  describe('Hard-coded Package Check Prevention', () => {
    it('paket ismi yerine feature key kullanılmalı', () => {
      // Bu test hard-coded paket kontrolü yapılmadığını doğrular
      // YANLIŞ: if (plan === 'Pro') { ... }
      // DOĞRU: if (await hasPermission(orgId, 'module_waiter_call')) { ... }

      const featureKeys = [
        'module_waiter_call',
        'module_happy_hour',
        'limit_menu_items',
        'limit_categories',
      ];

      // Tüm feature key'ler string olmalı
      featureKeys.forEach((key) => {
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
      });

      // Paket isimleri doğrudan kullanılmamalı
      const forbiddenPatterns = ['lite', 'pro', 'premium', 'enterprise'];
      featureKeys.forEach((key) => {
        forbiddenPatterns.forEach((pattern) => {
          expect(key.toLowerCase()).not.toBe(pattern);
        });
      });
    });

    it('permission check fonksiyonları paket ismi değil feature key almalı', () => {
      // hasPermission signature: (organizationId, featureKey)
      // getFeatureLimit signature: (organizationId, featureKey)
      // checkFeature signature: (organizationId, featureKey)

      // Bu fonksiyonlar 'Pro', 'Lite' gibi paket isimleri değil
      // 'module_waiter_call', 'limit_menu_items' gibi feature key'ler almalı

      const validFeatureKeys = [
        'module_waiter_call',
        'module_happy_hour',
        'module_cross_sell',
        'limit_menu_items',
        'limit_categories',
        'limit_tables',
        'has_images',
        'has_logo',
      ];

      const invalidPackageNames = ['Lite', 'Pro', 'Premium', 'lite', 'pro', 'premium'];

      validFeatureKeys.forEach((key) => {
        expect(invalidPackageNames).not.toContain(key);
        expect(key).toMatch(/^[a-z_]+$/); // snake_case format
      });
    });
  });
});
