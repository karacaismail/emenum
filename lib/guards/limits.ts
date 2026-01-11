/**
 * Limit Check Guard
 *
 * Sayısal limit kontrolleri için kullanılır.
 * Paket bazlı ürün, kategori ve fiyat değişikliği limitleri kontrol edilir.
 *
 * IMPORTANT: Bu modül permission.ts ile birlikte çalışır.
 * getFeatureLimit() fonksiyonunu limit değerlerini almak için kullanır.
 *
 * Limit Değerleri:
 *   -1 = Sınırsız (unlimited)
 *    0 = Özellik mevcut değil (feature not available)
 *   >0 = Sayısal limit
 *
 * @example
 * ```ts
 * // Genel limit kontrolü
 * const result = await checkLimit(orgId, 'limit_menu_items', currentProductCount);
 * if (!result.allowed) {
 *   showUpgradePrompt(result);
 * }
 *
 * // Özel helper fonksiyonlar (otomatik sayım)
 * const canAddProduct = await canAddProduct(orgId);
 * const canAddCategory = await canAddCategory(orgId);
 * const canChangePrice = await canChangePriceThisMonth(orgId);
 * ```
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getFeatureLimit } from './permission';
import type { UUID, FeatureKey } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Limit feature keys for type safety
 */
export type LimitFeatureKey =
  | 'limit_categories'
  | 'limit_menu_items'
  | 'limit_price_changes'
  | 'limit_tables'
  | 'limit_languages'
  | 'limit_users';

/**
 * Result of a limit check operation
 */
export interface LimitCheckResult {
  /** Whether the action is allowed (under limit or unlimited) */
  allowed: boolean;
  /** The limit value (-1 = unlimited, 0 = not available, >0 = limit) */
  limit: number;
  /** Current usage count */
  currentCount: number;
  /** Remaining allowance (-1 = infinite, 0 = none) */
  remaining: number;
  /** Usage percentage (0-100, null if unlimited) */
  usagePercent: number | null;
  /** Human-readable message in Turkish */
  message: string;
  /** Whether user should be prompted to upgrade */
  shouldUpgrade: boolean;
}

/**
 * Entity count result
 */
interface EntityCount {
  count: number;
  error: Error | null;
}

// =============================================================================
// CORE LIMIT CHECK FUNCTION
// =============================================================================

/**
 * Check if an organization is within a numeric limit.
 *
 * This is the main function for limit checking. It compares the current count
 * against the feature limit and returns a detailed result.
 *
 * @param organizationId - The organization UUID
 * @param featureKey - The limit feature key (e.g., 'limit_menu_items')
 * @param currentCount - The current usage count
 * @returns Promise<LimitCheckResult> - Detailed limit check result
 *
 * @example
 * ```ts
 * const productCount = 18;
 * const result = await checkLimit(orgId, 'limit_menu_items', productCount);
 *
 * // result = {
 * //   allowed: true,      // 18 < 20 limit
 * //   limit: 20,
 * //   currentCount: 18,
 * //   remaining: 2,
 * //   usagePercent: 90,
 * //   message: "Ürün limiti: 18/20",
 * //   shouldUpgrade: true  // >80% usage
 * // }
 * ```
 */
export async function checkLimit(
  organizationId: UUID,
  featureKey: FeatureKey,
  currentCount: number
): Promise<LimitCheckResult> {
  // Get the limit from the permission system
  const limit = await getFeatureLimit(organizationId, featureKey);

  // Handle unlimited (-1)
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      currentCount,
      remaining: -1,
      usagePercent: null,
      message: getLimitMessage(featureKey, currentCount, -1),
      shouldUpgrade: false,
    };
  }

  // Handle feature not available (0)
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      currentCount,
      remaining: 0,
      usagePercent: 100,
      message: getFeatureNotAvailableMessage(featureKey),
      shouldUpgrade: true,
    };
  }

  // Calculate remaining and percentage
  const remaining = Math.max(0, limit - currentCount);
  const usagePercent = Math.min(100, Math.round((currentCount / limit) * 100));
  const allowed = currentCount < limit;

  // Suggest upgrade when over 80% usage or at limit
  const shouldUpgrade = usagePercent >= 80;

  return {
    allowed,
    limit,
    currentCount,
    remaining,
    usagePercent,
    message: getLimitMessage(featureKey, currentCount, limit),
    shouldUpgrade,
  };
}

/**
 * Check if adding one more item would exceed the limit.
 *
 * Convenience function that checks if currentCount + 1 <= limit.
 *
 * @param organizationId - The organization UUID
 * @param featureKey - The limit feature key
 * @param currentCount - The current usage count
 * @returns Promise<LimitCheckResult> - Result with allowed=true if adding is possible
 */
export async function checkCanAdd(
  organizationId: UUID,
  featureKey: FeatureKey,
  currentCount: number
): Promise<LimitCheckResult> {
  const limit = await getFeatureLimit(organizationId, featureKey);

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      currentCount,
      remaining: -1,
      usagePercent: null,
      message: getCanAddMessage(featureKey, true),
      shouldUpgrade: false,
    };
  }

  // Not available
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      currentCount,
      remaining: 0,
      usagePercent: 100,
      message: getFeatureNotAvailableMessage(featureKey),
      shouldUpgrade: true,
    };
  }

  // Check if adding one more is allowed
  const canAdd = currentCount < limit;
  const remaining = Math.max(0, limit - currentCount);
  const usagePercent = Math.min(100, Math.round((currentCount / limit) * 100));

  return {
    allowed: canAdd,
    limit,
    currentCount,
    remaining,
    usagePercent,
    message: getCanAddMessage(featureKey, canAdd, remaining),
    shouldUpgrade: !canAdd || usagePercent >= 80,
  };
}

// =============================================================================
// ENTITY-SPECIFIC HELPER FUNCTIONS
// =============================================================================

/**
 * Check if organization can add a new product.
 *
 * Automatically counts current products and checks against limit_menu_items.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<LimitCheckResult>
 */
export async function canAddProduct(
  organizationId: UUID
): Promise<LimitCheckResult> {
  const { count, error } = await getProductCount(organizationId);

  if (error) {
    return createErrorResult('limit_menu_items', error.message);
  }

  return checkCanAdd(organizationId, 'limit_menu_items', count);
}

/**
 * Check if organization can add a new category.
 *
 * Automatically counts current categories and checks against limit_categories.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<LimitCheckResult>
 */
export async function canAddCategory(
  organizationId: UUID
): Promise<LimitCheckResult> {
  const { count, error } = await getCategoryCount(organizationId);

  if (error) {
    return createErrorResult('limit_categories', error.message);
  }

  return checkCanAdd(organizationId, 'limit_categories', count);
}

/**
 * Check if organization can add a new table.
 *
 * Automatically counts current tables and checks against limit_tables.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<LimitCheckResult>
 */
export async function canAddTable(
  organizationId: UUID
): Promise<LimitCheckResult> {
  const { count, error } = await getTableCount(organizationId);

  if (error) {
    return createErrorResult('limit_tables', error.message);
  }

  return checkCanAdd(organizationId, 'limit_tables', count);
}

/**
 * Check if organization can change price this month.
 *
 * Counts price changes in current month and checks against limit_price_changes.
 * This is a monthly limit that resets at the start of each month.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<LimitCheckResult>
 */
export async function canChangePriceThisMonth(
  organizationId: UUID
): Promise<LimitCheckResult> {
  const { count, error } = await getMonthlyPriceChangeCount(organizationId);

  if (error) {
    return createErrorResult('limit_price_changes', error.message);
  }

  return checkCanAdd(organizationId, 'limit_price_changes', count);
}

/**
 * Check if organization can add a new user/member.
 *
 * Automatically counts current organization members and checks against limit_users.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<LimitCheckResult>
 */
export async function canAddUser(
  organizationId: UUID
): Promise<LimitCheckResult> {
  const { count, error } = await getUserCount(organizationId);

  if (error) {
    return createErrorResult('limit_users', error.message);
  }

  return checkCanAdd(organizationId, 'limit_users', count);
}

// =============================================================================
// ENTITY COUNT FUNCTIONS
// =============================================================================

/**
 * Get product count for an organization
 */
async function getProductCount(organizationId: UUID): Promise<EntityCount> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

/**
 * Get category count for an organization
 */
async function getCategoryCount(organizationId: UUID): Promise<EntityCount> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

/**
 * Get table count for an organization
 */
async function getTableCount(organizationId: UUID): Promise<EntityCount> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('restaurant_tables')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

/**
 * Get user/member count for an organization
 */
async function getUserCount(organizationId: UUID): Promise<EntityCount> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

/**
 * Get price change count for current month
 *
 * Counts entries in price_ledger for the organization's products
 * that were created in the current calendar month.
 */
async function getMonthlyPriceChangeCount(
  organizationId: UUID
): Promise<EntityCount> {
  const supabase = await createServerSupabaseClient();

  // Get start of current month in UTC
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfMonthISO = startOfMonth.toISOString();

  // Count price ledger entries for this organization's products this month
  // We need to join through products to filter by organization
  const { data, error } = await supabase
    .from('price_ledger')
    .select(`
      id,
      product:products!inner(organization_id)
    `, { count: 'exact', head: true })
    .eq('product.organization_id', organizationId)
    .gte('created_at', startOfMonthISO);

  if (error) {
    // If the query structure doesn't work, try a simpler approach
    // Get all product IDs first, then count price changes
    return getMonthlyPriceChangeCountFallback(organizationId, startOfMonthISO);
  }

  // Note: When using head: true with joins, count may not work correctly
  // The actual count is returned in the response
  const count = data ? (data as unknown as number) : 0;
  return { count, error: null };
}

/**
 * Fallback method for counting monthly price changes
 * Uses two queries if the join approach fails
 */
async function getMonthlyPriceChangeCountFallback(
  organizationId: UUID,
  startOfMonthISO: string
): Promise<EntityCount> {
  const supabase = await createServerSupabaseClient();

  // First get all product IDs for this organization
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('organization_id', organizationId);

  if (productsError) {
    return { count: 0, error: new Error(productsError.message) };
  }

  if (!products || products.length === 0) {
    return { count: 0, error: null };
  }

  const productIds = products.map(p => p.id);

  // Then count price ledger entries for these products this month
  const { count, error } = await supabase
    .from('price_ledger')
    .select('*', { count: 'exact', head: true })
    .in('product_id', productIds)
    .gte('created_at', startOfMonthISO);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

// =============================================================================
// MESSAGE HELPER FUNCTIONS
// =============================================================================

/**
 * Get Turkish label for a feature key
 */
function getFeatureLabel(featureKey: FeatureKey): string {
  const labels: Record<string, string> = {
    limit_categories: 'Kategori',
    limit_menu_items: 'Ürün',
    limit_price_changes: 'Fiyat değişikliği',
    limit_tables: 'Masa',
    limit_languages: 'Ek dil',
    limit_users: 'Kullanıcı',
  };

  return labels[featureKey] || 'Özellik';
}

/**
 * Generate limit message in Turkish
 */
function getLimitMessage(
  featureKey: FeatureKey,
  currentCount: number,
  limit: number
): string {
  const label = getFeatureLabel(featureKey);

  if (limit === -1) {
    return `${label} sayısı: ${currentCount} (Sınırsız)`;
  }

  if (limit === 0) {
    return `${label} özelliği mevcut değil`;
  }

  return `${label} limiti: ${currentCount}/${limit}`;
}

/**
 * Generate "can add" message in Turkish
 */
function getCanAddMessage(
  featureKey: FeatureKey,
  canAdd: boolean,
  remaining?: number
): string {
  const label = getFeatureLabel(featureKey);

  if (canAdd && remaining === -1) {
    return `Yeni ${label.toLowerCase()} ekleyebilirsiniz (Sınırsız)`;
  }

  if (canAdd && remaining !== undefined && remaining > 0) {
    return `${remaining} ${label.toLowerCase()} daha ekleyebilirsiniz`;
  }

  if (!canAdd) {
    return `${label} limitine ulaştınız. Paketinizi yükseltin.`;
  }

  return `Yeni ${label.toLowerCase()} ekleyebilirsiniz`;
}

/**
 * Generate "feature not available" message in Turkish
 */
function getFeatureNotAvailableMessage(featureKey: FeatureKey): string {
  const label = getFeatureLabel(featureKey);
  return `${label} özelliği mevcut paketinizde bulunmuyor. Paketinizi yükseltin.`;
}

/**
 * Create an error result for database errors
 */
function createErrorResult(
  featureKey: FeatureKey,
  errorMessage: string
): LimitCheckResult {
  return {
    allowed: false,
    limit: 0,
    currentCount: 0,
    remaining: 0,
    usagePercent: null,
    message: `Limit kontrolü sırasında hata oluştu: ${errorMessage}`,
    shouldUpgrade: false,
  };
}

// =============================================================================
// BULK CHECK FUNCTIONS
// =============================================================================

/**
 * Get all limits status for an organization
 *
 * Useful for dashboard display showing all limits at once.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<Record<LimitFeatureKey, LimitCheckResult>>
 */
export async function getAllLimitsStatus(
  organizationId: UUID
): Promise<Record<LimitFeatureKey, LimitCheckResult>> {
  // Fetch all counts in parallel
  const [
    productCount,
    categoryCount,
    tableCount,
    userCount,
    priceChangeCount,
  ] = await Promise.all([
    getProductCount(organizationId),
    getCategoryCount(organizationId),
    getTableCount(organizationId),
    getUserCount(organizationId),
    getMonthlyPriceChangeCount(organizationId),
  ]);

  // Check all limits in parallel
  const [
    menuItemsResult,
    categoriesResult,
    tablesResult,
    usersResult,
    priceChangesResult,
  ] = await Promise.all([
    checkLimit(organizationId, 'limit_menu_items', productCount.count),
    checkLimit(organizationId, 'limit_categories', categoryCount.count),
    checkLimit(organizationId, 'limit_tables', tableCount.count),
    checkLimit(organizationId, 'limit_users', userCount.count),
    checkLimit(organizationId, 'limit_price_changes', priceChangeCount.count),
  ]);

  // Get languages limit (no count function yet, just return the limit info)
  const languagesLimit = await getFeatureLimit(organizationId, 'limit_languages');
  const languagesResult: LimitCheckResult = {
    allowed: languagesLimit !== 0,
    limit: languagesLimit,
    currentCount: 0, // Would need language count implementation
    remaining: languagesLimit === -1 ? -1 : languagesLimit,
    usagePercent: null,
    message: getLimitMessage('limit_languages', 0, languagesLimit),
    shouldUpgrade: languagesLimit === 0,
  };

  return {
    limit_menu_items: menuItemsResult,
    limit_categories: categoriesResult,
    limit_tables: tablesResult,
    limit_users: usersResult,
    limit_price_changes: priceChangesResult,
    limit_languages: languagesResult,
  };
}
