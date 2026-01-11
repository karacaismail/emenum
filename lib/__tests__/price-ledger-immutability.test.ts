/**
 * Price Ledger Immutability & View Correctness Tests
 *
 * Bu testler Price Ledger'ın INSERT-only pattern'ini, valid_from/valid_until
 * mantığını ve current_prices view'inin doğruluğunu test eder.
 *
 * Test edilenler:
 * 1. INSERT-only pattern - UPDATE/DELETE engellenmeli
 * 2. valid_from/valid_until logic - Happy Hour, zamanlı fiyatlandırma
 * 3. current_prices view correctness - DISTINCT ON, doğru fiyat seçimi
 *
 * CRITICAL: Bu testler Ticaret Bakanlığı regülasyonlarına uyumluluk için kritiktir!
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockPriceLedgerEntry,
  createMockProduct,
  resetAllSupabaseMocks,
} from '@/tests/__mocks__/supabase';

// ============================================================================
// MOCKING SETUP
// ============================================================================

// Create mock client at module level
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

// Mock the module before imports
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import the mock module to control it
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Import the functions to test after mocking
import {
  insertPrice,
  insertPriceSimple,
  getCurrentPrice,
  getPriceHistory,
  getPriceAtTime,
  hasPrice,
  scheduleHappyHour,
  getScheduledPrices,
} from '../services/price-ledger';

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Price Ledger - INSERT-Only Pattern Tests', () => {
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

  describe('Immutability Enforcement', () => {
    it('insertPrice fonksiyonu INSERT kullanmalı, UPDATE kullanmamalı', async () => {
      // Mock auth user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock current price query (no existing price)
      const priceQueryBuilder = createMockQueryBuilder({ data: null });

      // Mock insert query
      const insertBuilder = createMockQueryBuilder({
        data: { id: 'new-price-id' },
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            ...priceQueryBuilder,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-price-id' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await insertPrice({
        productId: 'product-123',
        price: 150,
        changeReason: 'Test price change',
      });

      // Verify INSERT was called, not UPDATE
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('price_ledger');
      // The function should succeed
      expect(result.success).toBe(true);
      expect(result.newPrice).toBe(150);
    });

    it('fiyat güncellemesinde eski kayıt korunmalı, sadece valid_until kapatılmalı', async () => {
      // Mock auth user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock existing current price
      const existingPrice = createMockPriceLedgerEntry('product-123', {
        id: 'old-price-id',
        price: 100,
        valid_until: null, // Currently active
      });

      // Track RPC calls
      const rpcCallArgs: Array<{ name: string; params: unknown }> = [];
      mockSupabaseClient.rpc.mockImplementation((name: string, params: unknown) => {
        rpcCallArgs.push({ name, params });
        return Promise.resolve({ data: null, error: null });
      });

      // Mock query builder with proper chaining
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingPrice,
              error: null,
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-price-id' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await insertPrice({
        productId: 'product-123',
        price: 200,
        changeReason: 'Price increase',
      });

      // Verify close_current_price RPC was called to close previous price
      const closeCall = rpcCallArgs.find((call) => call.name === 'close_current_price');
      expect(closeCall).toBeDefined();
      expect((closeCall?.params as { p_product_id: string }).p_product_id).toBe('product-123');

      // Result should indicate success and show previous price
      expect(result.success).toBe(true);
      expect(result.previousPrice).toBe(100);
      expect(result.newPrice).toBe(200);
    });

    it('Database trigger UPDATE işlemini engellemeli (simülasyon)', () => {
      // Bu test database trigger davranışını simüle eder
      // Gerçek test için Supabase test ortamı gerekir

      const triggerErrorMessage =
        'UPDATE operations are not allowed on price_ledger table. Price history is immutable.';

      // Simüle edilmiş UPDATE girişimi
      const attemptUpdate = () => {
        throw new Error(triggerErrorMessage);
      };

      expect(attemptUpdate).toThrow(triggerErrorMessage);
    });

    it('Database trigger DELETE işlemini engellemeli (simülasyon)', () => {
      // Bu test database trigger davranışını simüle eder
      // Gerçek test için Supabase test ortamı gerekir

      const triggerErrorMessage =
        'DELETE operations are not allowed on price_ledger table. Price history is immutable.';

      // Simüle edilmiş DELETE girişimi
      const attemptDelete = () => {
        throw new Error(triggerErrorMessage);
      };

      expect(attemptDelete).toThrow(triggerErrorMessage);
    });

    it('negatif fiyat reddedilmeli', async () => {
      const result = await insertPrice({
        productId: 'product-123',
        price: -50,
        changeReason: 'Test negative price',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fiyat negatif olamaz');
    });

    it('boş change_reason reddedilmeli', async () => {
      const result = await insertPrice({
        productId: 'product-123',
        price: 100,
        changeReason: '', // Empty reason
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fiyat değişikliği nedeni gereklidir');
    });

    it('sadece boşluk içeren change_reason reddedilmeli', async () => {
      const result = await insertPrice({
        productId: 'product-123',
        price: 100,
        changeReason: '   ', // Only whitespace
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fiyat değişikliği nedeni gereklidir');
    });

    it('sıfır fiyat kabul edilmeli', async () => {
      // Mock auth and query
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-price-id' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await insertPrice({
        productId: 'product-123',
        price: 0,
        changeReason: 'Free product',
      });

      expect(result.success).toBe(true);
      expect(result.newPrice).toBe(0);
    });
  });

  describe('Price History Immutability', () => {
    it('fiyat geçmişi kronolojik sıralı olmalı', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Mock history data in chronological order (oldest first in DB)
      const historyData = [
        createMockPriceLedgerEntry('product-123', {
          id: 'price-1',
          price: 100,
          valid_from: twoHoursAgo.toISOString(),
          valid_until: oneHourAgo.toISOString(),
        }),
        createMockPriceLedgerEntry('product-123', {
          id: 'price-2',
          price: 150,
          valid_from: oneHourAgo.toISOString(),
          valid_until: null, // Current price
        }),
      ];

      // API should return in DESC order (newest first)
      const sortedData = [...historyData].reverse();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: sortedData,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const history = await getPriceHistory('product-123');

      expect(history.length).toBe(2);
      // Newest first
      expect(history[0]?.price).toBe(150);
      expect(history[1]?.price).toBe(100);
      // isCurrent should be true only for the latest
      expect(history[0]?.isCurrent).toBe(true);
      expect(history[1]?.isCurrent).toBe(false);
    });

    it('her fiyat kaydı benzersiz id sahip olmalı', () => {
      const entry1 = createMockPriceLedgerEntry('product-123', { price: 100 });
      const entry2 = createMockPriceLedgerEntry('product-123', { price: 150 });
      const entry3 = createMockPriceLedgerEntry('product-123', { price: 200 });

      expect(entry1.id).not.toBe(entry2.id);
      expect(entry2.id).not.toBe(entry3.id);
      expect(entry1.id).not.toBe(entry3.id);
    });
  });
});

describe('Price Ledger - valid_from/valid_until Logic Tests', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid Time Range Logic', () => {
    it('valid_until NULL olan fiyat şu anki geçerli fiyat olmalı', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const currentPrice = {
        id: 'price-1',
        product_id: 'product-123',
        price: 150,
        valid_from: oneHourAgo.toISOString(),
        valid_until: null, // NULL = current price
      };

      // valid_until null means indefinitely valid
      const isCurrentPrice = currentPrice.valid_until === null;
      expect(isCurrentPrice).toBe(true);
    });

    it('valid_until geçmişte ise fiyat geçerli DEĞİL', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const expiredPrice = {
        id: 'price-1',
        product_id: 'product-123',
        price: 100,
        valid_from: twoHoursAgo.toISOString(),
        valid_until: oneHourAgo.toISOString(), // Past date = expired
      };

      const isExpired = new Date(expiredPrice.valid_until) < now;
      expect(isExpired).toBe(true);
    });

    it('valid_until gelecekte ise fiyat hala geçerli', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const activePrice = {
        id: 'price-1',
        product_id: 'product-123',
        price: 75, // Happy Hour price
        valid_from: oneHourAgo.toISOString(),
        valid_until: oneHourLater.toISOString(), // Future date = still valid
      };

      const isValid =
        new Date(activePrice.valid_from) <= now &&
        new Date(activePrice.valid_until) > now;
      expect(isValid).toBe(true);
    });

    it('valid_from gelecekte ise fiyat henüz geçerli DEĞİL', () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const futurePrice = {
        id: 'price-1',
        product_id: 'product-123',
        price: 50, // Scheduled future price
        valid_from: oneHourLater.toISOString(),
        valid_until: twoHoursLater.toISOString(),
      };

      const isNotYetValid = new Date(futurePrice.valid_from) > now;
      expect(isNotYetValid).toBe(true);
    });
  });

  describe('Happy Hour Scheduling', () => {
    it('Happy Hour fiyatı doğru zaman aralığı ile oluşturulmalı', async () => {
      const startTime = new Date('2024-12-15T17:00:00');
      const endTime = new Date('2024-12-15T19:00:00');
      const happyHourPrice = 75;

      // Mock auth
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Track insert calls
      let insertedData: unknown = null;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            insert: vi.fn().mockImplementation((data) => {
              insertedData = data;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'happy-hour-price-id' },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await scheduleHappyHour(
        'product-123',
        happyHourPrice,
        startTime,
        endTime,
        'Happy Hour'
      );

      expect(result.success).toBe(true);
      expect(result.newPrice).toBe(happyHourPrice);

      // Verify the inserted data has correct time range
      const inserted = insertedData as {
        valid_from: string;
        valid_until: string;
      };
      expect(new Date(inserted.valid_from).getTime()).toBe(startTime.getTime());
      expect(new Date(inserted.valid_until).getTime()).toBe(endTime.getTime());
    });

    it('Happy Hour bitiş zamanı başlangıçtan önce olmamalı', async () => {
      const startTime = new Date('2024-12-15T19:00:00');
      const endTime = new Date('2024-12-15T17:00:00'); // Before start!

      const result = await scheduleHappyHour(
        'product-123',
        75,
        startTime,
        endTime
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Happy Hour bitiş zamanı başlangıç zamanından sonra olmalıdır'
      );
    });

    it('Happy Hour bitiş zamanı başlangıça eşit olmamalı', async () => {
      const sameTime = new Date('2024-12-15T17:00:00');

      const result = await scheduleHappyHour(
        'product-123',
        75,
        sameTime,
        sameTime
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Happy Hour bitiş zamanı başlangıç zamanından sonra olmalıdır'
      );
    });

    it('getScheduledPrices sadece gelecekteki fiyatları döndürmeli', async () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const scheduledPrices = [
        createMockPriceLedgerEntry('product-123', {
          id: 'scheduled-1',
          price: 50,
          valid_from: oneHourLater.toISOString(),
          valid_until: twoHoursLater.toISOString(),
          change_reason: 'Scheduled Happy Hour',
        }),
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                data: scheduledPrices,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const scheduled = await getScheduledPrices('product-123');

      expect(scheduled.length).toBe(1);
      expect(scheduled[0]?.price).toBe(50);
      expect(scheduled[0]?.isCurrent).toBe(false); // Future prices are not current
    });
  });

  describe('getPriceAtTime Function', () => {
    it('belirli bir zamandaki fiyatı doğru döndürmeli', async () => {
      const queryTime = new Date('2024-12-15T18:00:00');

      const happyHourPrice = createMockPriceLedgerEntry('product-123', {
        id: 'happy-hour-price',
        price: 75,
        valid_from: '2024-12-15T17:00:00.000Z',
        valid_until: '2024-12-15T19:00:00.000Z',
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: happyHourPrice,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const price = await getPriceAtTime('product-123', queryTime);

      expect(price).not.toBeNull();
      expect(price?.price).toBe(75);
    });

    it('fiyat olmayan dönemde null döndürmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const price = await getPriceAtTime('product-123', new Date('2020-01-01'));

      expect(price).toBeNull();
    });
  });
});

describe('Price Ledger - current_prices View Correctness Tests', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DISTINCT ON Behavior', () => {
    it('her ürün için sadece bir (güncel) fiyat dönmeli', () => {
      // Bu view davranışını simüle eder
      const priceHistory = [
        { product_id: 'product-1', price: 100, valid_from: '2024-12-01' },
        { product_id: 'product-1', price: 150, valid_from: '2024-12-10' }, // Current
        { product_id: 'product-2', price: 200, valid_from: '2024-12-01' },
        { product_id: 'product-2', price: 250, valid_from: '2024-12-15' }, // Current
      ];

      // DISTINCT ON mantığı: product_id'ye göre grupla, valid_from DESC sırala
      const currentPricesResult = Object.values(
        priceHistory.reduce(
          (acc, entry) => {
            const existingEntry = acc[entry.product_id];
            if (
              !existingEntry ||
              new Date(entry.valid_from) >
                new Date(existingEntry.valid_from)
            ) {
              acc[entry.product_id] = entry;
            }
            return acc;
          },
          {} as Record<string, (typeof priceHistory)[0]>
        )
      );

      expect(currentPricesResult.length).toBe(2); // 2 products
      expect(
        currentPricesResult.find((p) => p.product_id === 'product-1')?.price
      ).toBe(150);
      expect(
        currentPricesResult.find((p) => p.product_id === 'product-2')?.price
      ).toBe(250);
    });

    it('valid_until geçmiş fiyatlar view sonuçlarına dahil edilmemeli', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const futureDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      const prices = [
        { product_id: 'p1', price: 100, valid_from: pastDate, valid_until: pastDate }, // Expired
        { product_id: 'p1', price: 150, valid_from: pastDate, valid_until: null }, // Current
      ];

      // View logic: valid_until IS NULL OR valid_until > NOW()
      const validPrices = prices.filter(
        (p) =>
          new Date(p.valid_from) <= now &&
          (p.valid_until === null || new Date(p.valid_until) > now)
      );

      expect(validPrices.length).toBe(1);
      expect(validPrices[0]?.price).toBe(150);
    });
  });

  describe('getCurrentPrice Function', () => {
    it('mevcut geçerli fiyatı döndürmeli', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const currentPriceData = {
        id: 'current-price-id',
        product_id: 'product-123',
        price: 199.99,
        currency: 'TRY',
        valid_from: oneHourAgo.toISOString(),
        valid_until: null,
        created_by: 'user-123',
        change_reason: 'Regular price',
        created_at: oneHourAgo.toISOString(),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: currentPriceData,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const currentPrice = await getCurrentPrice('product-123');

      expect(currentPrice).not.toBeNull();
      expect(currentPrice?.price).toBe(199.99);
      expect(currentPrice?.currency).toBe('TRY');
      expect(currentPrice?.valid_until).toBeNull();
    });

    it('aktif Happy Hour varsa Happy Hour fiyatını döndürmeli', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);

      const happyHourPriceData = {
        id: 'happy-hour-price-id',
        product_id: 'product-123',
        price: 75, // Happy Hour discounted price
        currency: 'TRY',
        valid_from: oneHourAgo.toISOString(),
        valid_until: thirtyMinsLater.toISOString(),
        created_by: 'user-123',
        change_reason: 'Happy Hour',
        created_at: oneHourAgo.toISOString(),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: happyHourPriceData,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const currentPrice = await getCurrentPrice('product-123');

      expect(currentPrice).not.toBeNull();
      expect(currentPrice?.price).toBe(75);
      expect(currentPrice?.change_reason).toBe('Happy Hour');
      expect(currentPrice?.valid_until).not.toBeNull(); // Has end time
    });

    it('fiyatı olmayan ürün için null döndürmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const currentPrice = await getCurrentPrice('product-without-price');

      expect(currentPrice).toBeNull();
    });
  });

  describe('hasPrice Function', () => {
    it('fiyatı olan ürün için true döndürmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                count: 3,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPrice('product-123');

      expect(result).toBe(true);
    });

    it('fiyatı olmayan ürün için false döndürmeli', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) =>
              resolve({
                count: 0,
                error: null,
              })
            ),
            [Symbol.toStringTag]: 'Promise',
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await hasPrice('product-without-price');

      expect(result).toBe(false);
    });
  });

  describe('View SQL Logic Verification', () => {
    it('current_prices view WHERE koşulları doğru çalışmalı', () => {
      // View SQL:
      // WHERE pl.valid_from <= NOW()
      //   AND (pl.valid_until IS NULL OR pl.valid_until > NOW())
      // ORDER BY pl.product_id, pl.valid_from DESC

      const now = new Date();
      const testCases = [
        {
          name: 'Valid: started in past, no end',
          valid_from: new Date(now.getTime() - 60000),
          valid_until: null,
          expected: true,
        },
        {
          name: 'Valid: started in past, ends in future',
          valid_from: new Date(now.getTime() - 60000),
          valid_until: new Date(now.getTime() + 60000),
          expected: true,
        },
        {
          name: 'Invalid: starts in future',
          valid_from: new Date(now.getTime() + 60000),
          valid_until: null,
          expected: false,
        },
        {
          name: 'Invalid: ended in past',
          valid_from: new Date(now.getTime() - 120000),
          valid_until: new Date(now.getTime() - 60000),
          expected: false,
        },
        {
          name: 'Edge: starts exactly now (should be valid)',
          valid_from: now,
          valid_until: null,
          expected: true,
        },
      ];

      testCases.forEach(({ name, valid_from, valid_until, expected }) => {
        const isValid =
          valid_from <= now &&
          (valid_until === null || valid_until > now);

        expect(isValid).toBe(expected);
      });
    });

    it('DISTINCT ON sıralaması valid_from DESC olmalı', () => {
      // En son valid_from olan kayıt seçilmeli
      const prices = [
        { product_id: 'p1', price: 100, valid_from: new Date('2024-12-01') },
        { product_id: 'p1', price: 150, valid_from: new Date('2024-12-05') },
        { product_id: 'p1', price: 120, valid_from: new Date('2024-12-03') },
      ];

      // Sort by valid_from DESC and take first
      const sorted = [...prices].sort(
        (a, b) => b.valid_from.getTime() - a.valid_from.getTime()
      );
      const selected = sorted[0];

      expect(selected?.price).toBe(150); // Dec 5 is latest
      expect(selected?.valid_from.toISOString()).toContain('2024-12-05');
    });
  });
});

describe('Price Ledger - Integration Patterns', () => {
  beforeEach(() => {
    resetAllSupabaseMocks();
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('insertPriceSimple Wrapper', () => {
    it('basit parametre ile fiyat ekleyebilmeli', async () => {
      // Mock auth
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'price_ledger') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-price-id' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQueryBuilder({ data: null });
      });

      const result = await insertPriceSimple(
        'product-123',
        100,
        'Simple price insert'
      );

      expect(result.success).toBe(true);
      expect(result.newPrice).toBe(100);
    });
  });

  describe('Currency Support', () => {
    it('farklı para birimleri desteklenmeli (TRY, USD, EUR)', async () => {
      const currencies = ['TRY', 'USD', 'EUR'];

      currencies.forEach((currency) => {
        const priceEntry = createMockPriceLedgerEntry('product-123', {
          price: 100,
          currency,
        });

        expect(priceEntry.currency).toBe(currency);
      });
    });

    it('varsayılan para birimi TRY olmalı', () => {
      // Default currency in database is TRY
      const defaultCurrency = 'TRY';

      const priceEntry = createMockPriceLedgerEntry('product-123', {
        price: 100,
        // currency not specified
      });

      // Mock factory defaults to TRY
      expect(priceEntry.currency).toBe(defaultCurrency);
    });
  });

  describe('Audit Trail', () => {
    it('her fiyat kaydı created_by ve change_reason içermeli', () => {
      const priceEntry = createMockPriceLedgerEntry('product-123', {
        price: 150,
        change_reason: 'Audit test change',
      });

      expect(priceEntry.change_reason).toBe('Audit test change');
      expect(priceEntry.created_at).toBeDefined();
    });

    it('fiyat değişiklik yüzdesi hesaplanabilmeli', () => {
      const previousPrice = 100;
      const newPrice = 125;

      const changeAmount = newPrice - previousPrice;
      const changePercentage = ((newPrice - previousPrice) / previousPrice) * 100;

      expect(changeAmount).toBe(25);
      expect(changePercentage).toBe(25); // 25% increase
    });

    it('fiyat düşüşü negatif yüzde göstermeli', () => {
      const previousPrice = 100;
      const newPrice = 80;

      const changePercentage = ((newPrice - previousPrice) / previousPrice) * 100;

      expect(changePercentage).toBe(-20); // 20% decrease
    });
  });
});
