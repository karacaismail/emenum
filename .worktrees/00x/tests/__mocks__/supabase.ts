/**
 * Supabase Mock Utilities
 *
 * Bu modül Supabase client'ları test etmek için mock'lar sağlar.
 * INSERT-only price ledger pattern ve RLS politikaları için test yardımcıları içerir.
 */

import { vi } from 'vitest';
import type {
  User,
  Session,
  AuthChangeEvent,
  AuthError,
} from '@supabase/supabase-js';

// ============================================
// Mock Data Types
// ============================================

export interface MockUser {
  id: string;
  email: string;
  is_super_admin?: boolean;
  full_name?: string;
  created_at?: string;
}

export interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}

export interface MockProduct {
  id: string;
  organization_id: string;
  category_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface MockPriceLedgerEntry {
  id: string;
  product_id: string;
  price: number;
  currency: string;
  valid_from: string;
  valid_until?: string | null;
  created_by?: string;
  change_reason?: string;
  created_at: string;
}

export interface MockCategory {
  id: string;
  organization_id: string;
  name: string;
  sort_order?: number;
  created_at?: string;
}

export interface MockSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  started_at: string;
  expires_at?: string;
}

export interface MockPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  is_active?: boolean;
}

export interface MockFeature {
  key: string;
  name: string;
  description?: string;
  category?: string;
}

export interface MockPlanFeature {
  plan_id: string;
  feature_key: string;
  value_boolean?: boolean;
  value_limit?: number;
}

export interface MockServiceRequest {
  id: string;
  organization_id: string;
  table_id: string;
  request_type: 'waiter_call' | 'bill_request' | 'help_request';
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled';
  created_at: string;
}

export interface MockRestaurantTable {
  id: string;
  organization_id: string;
  qr_uuid: string;
  table_number: string;
  current_status: 'available' | 'occupied' | 'reserved' | 'service_requested';
  last_ping_at?: string;
}

// ============================================
// Mock Response Builders
// ============================================

export function createMockResponse<T>(data: T | null, error: Error | null = null) {
  return {
    data,
    error,
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}

export function createMockError(message: string, code?: string): AuthError {
  return {
    name: 'AuthError',
    message,
    status: 400,
    code,
  } as AuthError;
}

// ============================================
// Mock Data Factories
// ============================================

let mockIdCounter = 0;
const generateMockId = () => `mock-id-${++mockIdCounter}`;
const generateMockUUID = () =>
  `${generateMockId()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: generateMockUUID(),
    email: `test-${mockIdCounter}@example.com`,
    is_super_admin: false,
    full_name: `Test User ${mockIdCounter}`,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockOrganization(
  overrides: Partial<MockOrganization> = {}
): MockOrganization {
  const id = overrides.id || generateMockUUID();
  return {
    id,
    name: `Test Organization ${mockIdCounter}`,
    slug: `test-org-${mockIdCounter}`,
    status: 'active',
    phone: '+90 555 123 4567',
    email: `org-${mockIdCounter}@example.com`,
    address: 'Test Address',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockProduct(
  organizationId: string,
  overrides: Partial<MockProduct> = {}
): MockProduct {
  return {
    id: generateMockUUID(),
    organization_id: organizationId,
    name: `Test Product ${mockIdCounter}`,
    description: 'Test product description',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCategory(
  organizationId: string,
  overrides: Partial<MockCategory> = {}
): MockCategory {
  return {
    id: generateMockUUID(),
    organization_id: organizationId,
    name: `Test Category ${mockIdCounter}`,
    sort_order: mockIdCounter,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockPriceLedgerEntry(
  productId: string,
  overrides: Partial<MockPriceLedgerEntry> = {}
): MockPriceLedgerEntry {
  return {
    id: generateMockUUID(),
    product_id: productId,
    price: 100 + mockIdCounter * 10,
    currency: 'TRY',
    valid_from: new Date().toISOString(),
    valid_until: null,
    change_reason: 'Test price change',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSubscription(
  organizationId: string,
  planId: string,
  overrides: Partial<MockSubscription> = {}
): MockSubscription {
  return {
    id: generateMockUUID(),
    organization_id: organizationId,
    plan_id: planId,
    status: 'active',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

export function createMockPlan(overrides: Partial<MockPlan> = {}): MockPlan {
  return {
    id: generateMockUUID(),
    name: 'Pro',
    slug: 'pro',
    price_monthly: 299,
    is_active: true,
    ...overrides,
  };
}

export function createMockRestaurantTable(
  organizationId: string,
  overrides: Partial<MockRestaurantTable> = {}
): MockRestaurantTable {
  return {
    id: generateMockUUID(),
    organization_id: organizationId,
    qr_uuid: generateMockUUID(),
    table_number: `T${mockIdCounter}`,
    current_status: 'available',
    ...overrides,
  };
}

export function createMockServiceRequest(
  organizationId: string,
  tableId: string,
  overrides: Partial<MockServiceRequest> = {}
): MockServiceRequest {
  return {
    id: generateMockUUID(),
    organization_id: organizationId,
    table_id: tableId,
    request_type: 'waiter_call',
    status: 'pending',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Supabase Query Builder Mock
// ============================================

type QueryBuilderMethod =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'upsert'
  | 'rpc';

export interface MockQueryBuilderOptions<T> {
  data?: T | T[] | null;
  error?: Error | null;
  count?: number;
}

export function createMockQueryBuilder<T>(
  options: MockQueryBuilderOptions<T> = {}
) {
  const { data = null, error = null, count = 0 } = options;

  const response = {
    data,
    error,
    count,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };

  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      ...response,
      data: Array.isArray(data) ? data[0] : data,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      ...response,
      data: Array.isArray(data) ? data[0] : data,
    }),
    then: vi.fn((resolve) => resolve(response)),
    // Promise compatibility
    [Symbol.toStringTag]: 'Promise',
  };

  // Make the builder thenable (async/await compatible)
  Object.setPrototypeOf(builder, Promise.prototype);

  return builder;
}

// ============================================
// Supabase Auth Mock
// ============================================

export interface MockAuthOptions {
  user?: User | null;
  session?: Session | null;
  error?: AuthError | null;
}

export function createMockAuth(options: MockAuthOptions = {}) {
  const { user = null, session = null, error = null } = options;

  return {
    getUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    getSession: vi.fn().mockResolvedValue({ data: { session }, error }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user, session },
      error,
    }),
    signUp: vi.fn().mockResolvedValue({ data: { user, session }, error }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session }, error }),
    updateUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({
      data: { user, session },
      error,
    }),
  };
}

// ============================================
// Supabase Realtime Mock
// ============================================

export function createMockRealtimeChannel() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({
      data: { status: 'SUBSCRIBED' },
      error: null,
    }),
    unsubscribe: vi.fn().mockResolvedValue({ data: {}, error: null }),
    send: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

export function createMockRealtime() {
  return {
    channel: vi.fn().mockReturnValue(createMockRealtimeChannel()),
    removeChannel: vi.fn().mockResolvedValue({ data: {}, error: null }),
    removeAllChannels: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

// ============================================
// Supabase Storage Mock
// ============================================

export function createMockStorage() {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test/path/file.jpg' },
        error: null,
      }),
      download: vi.fn().mockResolvedValue({
        data: new Blob(['test']),
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test/path/file.jpg' },
      }),
      remove: vi.fn().mockResolvedValue({
        data: [{ name: 'file.jpg' }],
        error: null,
      }),
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'file.jpg', id: '1', metadata: {} }],
        error: null,
      }),
      move: vi.fn().mockResolvedValue({ data: { message: 'success' }, error: null }),
      copy: vi.fn().mockResolvedValue({ data: { path: 'new/path' }, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null,
      }),
    }),
    createBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
    listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
    deleteBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
    emptyBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

// ============================================
// Complete Supabase Client Mock
// ============================================

export interface MockSupabaseClientOptions {
  auth?: MockAuthOptions;
  defaultQueryData?: unknown;
}

export function createMockSupabaseClient(
  options: MockSupabaseClientOptions = {}
) {
  const { auth = {}, defaultQueryData = null } = options;

  const mockClient = {
    auth: createMockAuth(auth),
    storage: createMockStorage(),
    realtime: createMockRealtime(),
    channel: vi.fn().mockReturnValue(createMockRealtimeChannel()),
    from: vi.fn().mockReturnValue(
      createMockQueryBuilder({ data: defaultQueryData })
    ),
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
  };

  return mockClient;
}

// ============================================
// Mock Module Setup Helpers
// ============================================

/**
 * Supabase client mock'larını kurar
 * @example
 * // Test dosyasının başında:
 * import { setupSupabaseMocks, createMockUser } from '@/tests/__mocks__/supabase';
 *
 * const mockUser = createMockUser({ email: 'test@example.com' });
 * const { mockClient } = setupSupabaseMocks({ auth: { user: mockUser } });
 */
export function setupSupabaseMocks(options: MockSupabaseClientOptions = {}) {
  const mockClient = createMockSupabaseClient(options);

  // lib/supabase/client mock
  vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => mockClient),
  }));

  // lib/supabase/server mock
  vi.mock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: vi.fn(() => Promise.resolve(mockClient)),
  }));

  return { mockClient };
}

/**
 * Belirli bir tablo için query mock'u döndürür
 * @example
 * mockClient.from.mockImplementation((table) => {
 *   if (table === 'products') {
 *     return createMockQueryBuilder({ data: mockProducts });
 *   }
 *   return createMockQueryBuilder();
 * });
 */
export function createTableMock(tableDataMap: Record<string, unknown>) {
  return vi.fn().mockImplementation((table: string) => {
    const data = tableDataMap[table] ?? null;
    return createMockQueryBuilder({ data });
  });
}

// ============================================
// Reset Helpers
// ============================================

export function resetMockIdCounter() {
  mockIdCounter = 0;
}

export function resetAllSupabaseMocks() {
  resetMockIdCounter();
  vi.clearAllMocks();
}
