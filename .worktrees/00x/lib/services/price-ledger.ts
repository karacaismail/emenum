/**
 * Price Ledger Service
 *
 * Fiyat defteri (Price Ledger) yönetimi için servis modülü.
 * Bu modül, fiyat değişikliklerini değişmez (immutable) bir şekilde kaydeder.
 *
 * CRITICAL: Fiyatlar ASLA UPDATE edilmez, sadece INSERT yapılır!
 * Her fiyat değişikliği yeni bir satır olarak eklenir.
 * Bu, Ticaret Bakanlığı regülasyonlarına uyum için zorunludur.
 *
 * İş Akışı:
 * 1. Mevcut fiyatın valid_until değerini ayarla (eski fiyatı kapat)
 * 2. Yeni fiyatı INSERT et
 * 3. Otomatik menu snapshot oluştur (yasal uyumluluk için)
 *
 * @example
 * ```ts
 * import { insertPriceWithSnapshot, getCurrentPrice, getPriceHistory } from '@/lib/services/price-ledger';
 *
 * // Fiyat değişikliği (otomatik snapshot ile)
 * const result = await insertPriceWithSnapshot({
 *   productId: 'uuid-here',
 *   price: 125.50,
 *   changeReason: 'Malzeme maliyeti artışı'
 * });
 *
 * // Güncel fiyat sorgulama
 * const price = await getCurrentPrice(productId);
 *
 * // Fiyat geçmişi
 * const history = await getPriceHistory(productId);
 * ```
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createMenuSnapshot, type CreateSnapshotResult } from '@/lib/services/snapshot';
import type { UUID, CurrencyCode, PriceLedger, PriceLedgerInsert, CurrentPrice } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Price insert parameters
 */
export interface InsertPriceParams {
  /** Product UUID */
  productId: UUID;
  /** New price value */
  price: number;
  /** Reason for price change (required for audit) */
  changeReason: string;
  /** Currency code (default: TRY) */
  currency?: CurrencyCode;
  /** Valid from timestamp (default: NOW) */
  validFrom?: Date;
  /** Valid until timestamp (for Happy Hour, default: null = indefinite) */
  validUntil?: Date | null;
  /** User ID who made the change (default: current user) */
  createdBy?: UUID | null;
}

/**
 * Result of a price insert operation
 */
export interface InsertPriceResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The new price ledger entry ID */
  priceLedgerId: UUID | null;
  /** Previous price that was closed (if any) */
  previousPrice: number | null;
  /** New price that was inserted */
  newPrice: number;
  /** Error message if operation failed */
  error: string | null;
}

/**
 * Price history entry with enhanced data
 */
export interface PriceHistoryEntry {
  id: UUID;
  price: number;
  currency: CurrencyCode;
  validFrom: Date;
  validUntil: Date | null;
  changeReason: string | null;
  createdBy: UUID | null;
  createdAt: Date;
  isCurrent: boolean;
}

/**
 * Result of a price insert operation with snapshot
 *
 * Extends InsertPriceResult with snapshot information.
 * Used by insertPriceWithSnapshot function.
 */
export interface InsertPriceWithSnapshotResult extends InsertPriceResult {
  /** Snapshot creation result (null if skipped or failed) */
  snapshot: CreateSnapshotResult | null;
  /** Organization ID of the product */
  organizationId: UUID | null;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Insert a new price for a product.
 *
 * CRITICAL: This function NEVER updates existing records!
 * - It closes the previous price by setting valid_until via database function
 * - It inserts a new price record
 *
 * The close_current_price() database function is called with SECURITY DEFINER
 * to bypass the immutability trigger for closing the previous price period.
 *
 * @param params - Price insert parameters
 * @returns Promise<InsertPriceResult> - Result of the operation
 *
 * @example
 * ```ts
 * // Simple price change
 * const result = await insertPrice({
 *   productId: 'uuid-here',
 *   price: 150.00,
 *   changeReason: 'Malzeme maliyeti artışı'
 * });
 *
 * if (result.success) {
 *   console.log(`Fiyat değiştirildi: ${result.previousPrice} -> ${result.newPrice}`);
 * }
 *
 * // Happy Hour pricing
 * const happyHourResult = await insertPrice({
 *   productId: 'uuid-here',
 *   price: 75.00,
 *   changeReason: 'Happy Hour',
 *   validFrom: new Date('2024-01-15T17:00:00'),
 *   validUntil: new Date('2024-01-15T19:00:00')
 * });
 * ```
 */
export async function insertPrice(
  params: InsertPriceParams
): Promise<InsertPriceResult> {
  const {
    productId,
    price,
    changeReason,
    currency = 'TRY',
    validFrom = new Date(),
    validUntil = null,
    createdBy = null,
  } = params;

  const supabase = await createServerSupabaseClient();

  // Validate price
  if (price < 0) {
    return {
      success: false,
      priceLedgerId: null,
      previousPrice: null,
      newPrice: price,
      error: 'Fiyat negatif olamaz',
    };
  }

  // Validate change reason
  if (!changeReason || changeReason.trim().length === 0) {
    return {
      success: false,
      priceLedgerId: null,
      previousPrice: null,
      newPrice: price,
      error: 'Fiyat değişikliği nedeni gereklidir',
    };
  }

  // Get current user if not provided
  let userId = createdBy;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  // Get the current price before closing it
  const { data: currentPriceData } = await supabase
    .from('price_ledger')
    .select('id, price')
    .eq('product_id', productId)
    .is('valid_until', null)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousPrice = currentPriceData?.price ?? null;

  // Call the database function to close the current price
  // This function uses SECURITY DEFINER to bypass the immutability trigger
  // It only sets valid_until and does NOT modify the price value
  if (currentPriceData) {
    const { error: closeError } = await supabase.rpc('close_current_price', {
      p_product_id: productId,
      p_close_at: validFrom.toISOString(),
    });

    if (closeError) {
      // If close_current_price fails, continue anyway
      // The new price will still be valid and the view will use the latest
      console.error('Warning: Could not close previous price:', closeError.message);
    }
  }

  // Insert the new price record
  const newPriceData: PriceLedgerInsert = {
    product_id: productId,
    price,
    currency,
    valid_from: validFrom.toISOString(),
    valid_until: validUntil?.toISOString() ?? null,
    created_by: userId,
    change_reason: changeReason.trim(),
  };

  const { data: insertedPrice, error: insertError } = await supabase
    .from('price_ledger')
    .insert(newPriceData)
    .select('id')
    .single();

  if (insertError) {
    return {
      success: false,
      priceLedgerId: null,
      previousPrice,
      newPrice: price,
      error: `Fiyat eklenirken hata oluştu: ${insertError.message}`,
    };
  }

  return {
    success: true,
    priceLedgerId: insertedPrice.id,
    previousPrice,
    newPrice: price,
    error: null,
  };
}

/**
 * Simplified insertPrice function with positional parameters.
 *
 * This is a convenience wrapper for common use cases.
 *
 * @param productId - The product UUID
 * @param price - The new price value
 * @param changeReason - The reason for the price change
 * @returns Promise<InsertPriceResult>
 */
export async function insertPriceSimple(
  productId: UUID,
  price: number,
  changeReason: string
): Promise<InsertPriceResult> {
  return insertPrice({
    productId,
    price,
    changeReason,
  });
}

/**
 * Get the current price for a product.
 *
 * Returns the currently valid price from price_ledger.
 * Uses the same logic as the current_prices database view.
 *
 * @param productId - The product UUID
 * @returns Promise<CurrentPrice | null> - The current price or null if no price exists
 */
export async function getCurrentPrice(productId: UUID): Promise<CurrentPrice | null> {
  const supabase = await createServerSupabaseClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('price_ledger')
    .select('id, product_id, price, currency, valid_from, valid_until, created_by, change_reason, created_at')
    .eq('product_id', productId)
    .lte('valid_from', now)
    .or(`valid_until.is.null,valid_until.gt.${now}`)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    product_id: data.product_id,
    price_ledger_id: data.id,
    price: data.price,
    currency: data.currency as CurrencyCode,
    valid_from: data.valid_from,
    valid_until: data.valid_until,
    created_by: data.created_by,
    change_reason: data.change_reason,
    created_at: data.created_at,
  };
}

/**
 * Get the price history for a product.
 *
 * Returns all price entries ordered by valid_from descending (newest first).
 *
 * @param productId - The product UUID
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Promise<PriceHistoryEntry[]> - Array of price history entries
 */
export async function getPriceHistory(
  productId: UUID,
  limit = 50
): Promise<PriceHistoryEntry[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('price_ledger')
    .select('id, price, currency, valid_from, valid_until, change_reason, created_by, created_at')
    .eq('product_id', productId)
    .order('valid_from', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const now = new Date();

  return data.map((entry) => ({
    id: entry.id,
    price: entry.price,
    currency: entry.currency as CurrencyCode,
    validFrom: new Date(entry.valid_from),
    validUntil: entry.valid_until ? new Date(entry.valid_until) : null,
    changeReason: entry.change_reason,
    createdBy: entry.created_by,
    createdAt: new Date(entry.created_at),
    isCurrent:
      new Date(entry.valid_from) <= now &&
      (entry.valid_until === null || new Date(entry.valid_until) > now),
  }));
}

/**
 * Get the price at a specific point in time.
 *
 * Useful for historical reporting and audit purposes.
 *
 * @param productId - The product UUID
 * @param timestamp - The point in time to query
 * @returns Promise<PriceLedger | null> - The price record valid at that time
 */
export async function getPriceAtTime(
  productId: UUID,
  timestamp: Date
): Promise<PriceLedger | null> {
  const supabase = await createServerSupabaseClient();

  const timestampISO = timestamp.toISOString();

  const { data, error } = await supabase
    .from('price_ledger')
    .select('*')
    .eq('product_id', productId)
    .lte('valid_from', timestampISO)
    .or(`valid_until.is.null,valid_until.gt.${timestampISO}`)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PriceLedger;
}

/**
 * Check if a product has any price history.
 *
 * @param productId - The product UUID
 * @returns Promise<boolean> - True if product has at least one price entry
 */
export async function hasPrice(productId: UUID): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('price_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Get the number of price changes for a product.
 *
 * @param productId - The product UUID
 * @returns Promise<number> - The number of price entries
 */
export async function getPriceChangeCount(productId: UUID): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('price_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

// =============================================================================
// HAPPY HOUR / SCHEDULED PRICING FUNCTIONS
// =============================================================================

/**
 * Schedule a Happy Hour price.
 *
 * Creates a time-limited price that will automatically become active
 * during the specified time window.
 *
 * @param productId - The product UUID
 * @param happyHourPrice - The discounted price
 * @param startTime - When the Happy Hour starts
 * @param endTime - When the Happy Hour ends
 * @param reason - Reason for the Happy Hour (default: 'Happy Hour')
 * @returns Promise<InsertPriceResult>
 *
 * @example
 * ```ts
 * // Schedule daily Happy Hour from 5pm to 7pm
 * await scheduleHappyHour(
 *   productId,
 *   75.00,
 *   new Date('2024-01-15T17:00:00'),
 *   new Date('2024-01-15T19:00:00')
 * );
 * ```
 */
export async function scheduleHappyHour(
  productId: UUID,
  happyHourPrice: number,
  startTime: Date,
  endTime: Date,
  reason = 'Happy Hour'
): Promise<InsertPriceResult> {
  // Validate time window
  if (endTime <= startTime) {
    return {
      success: false,
      priceLedgerId: null,
      previousPrice: null,
      newPrice: happyHourPrice,
      error: 'Happy Hour bitiş zamanı başlangıç zamanından sonra olmalıdır',
    };
  }

  return insertPrice({
    productId,
    price: happyHourPrice,
    changeReason: reason,
    validFrom: startTime,
    validUntil: endTime,
  });
}

/**
 * Get upcoming scheduled prices for a product.
 *
 * Returns future price entries that haven't started yet.
 *
 * @param productId - The product UUID
 * @returns Promise<PriceHistoryEntry[]> - Array of scheduled price entries
 */
export async function getScheduledPrices(productId: UUID): Promise<PriceHistoryEntry[]> {
  const supabase = await createServerSupabaseClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('price_ledger')
    .select('id, price, currency, valid_from, valid_until, change_reason, created_by, created_at')
    .eq('product_id', productId)
    .gt('valid_from', now)
    .order('valid_from', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: entry.id,
    price: entry.price,
    currency: entry.currency as CurrencyCode,
    validFrom: new Date(entry.valid_from),
    validUntil: entry.valid_until ? new Date(entry.valid_until) : null,
    changeReason: entry.change_reason,
    createdBy: entry.created_by,
    createdAt: new Date(entry.created_at),
    isCurrent: false, // Future prices are not current
  }));
}

// =============================================================================
// ORGANIZATION-LEVEL FUNCTIONS
// =============================================================================

/**
 * Get all current prices for an organization.
 *
 * Uses the products_with_current_price view for efficient querying.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<Map<UUID, CurrentPrice>> - Map of product ID to current price
 */
export async function getOrganizationCurrentPrices(
  organizationId: UUID
): Promise<Map<UUID, CurrentPrice>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('products_with_current_price')
    .select('id, current_price, current_currency, price_valid_from, price_valid_until, last_change_reason, price_changed_by')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  const priceMap = new Map<UUID, CurrentPrice>();

  if (error || !data) {
    return priceMap;
  }

  for (const product of data) {
    if (product.current_price !== null) {
      priceMap.set(product.id, {
        product_id: product.id,
        price_ledger_id: product.id, // Not available in view, using product ID
        price: product.current_price,
        currency: (product.current_currency as CurrencyCode) ?? 'TRY',
        valid_from: product.price_valid_from ?? new Date().toISOString(),
        valid_until: product.price_valid_until,
        created_by: product.price_changed_by,
        change_reason: product.last_change_reason,
        created_at: product.price_valid_from ?? new Date().toISOString(),
      });
    }
  }

  return priceMap;
}

/**
 * Get recent price changes for an organization.
 *
 * Useful for dashboard display and audit review.
 *
 * @param organizationId - The organization UUID
 * @param limit - Maximum number of entries (default: 10)
 * @returns Promise<Array<PriceLedger & { product_name: string }>>
 */
export async function getRecentPriceChanges(
  organizationId: UUID,
  limit = 10
): Promise<Array<PriceLedger & { product_name: string }>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('price_history_view')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: entry.id,
    product_id: entry.product_id,
    price: entry.price,
    currency: entry.currency as CurrencyCode,
    valid_from: entry.valid_from,
    valid_until: entry.valid_until,
    created_by: entry.created_by,
    change_reason: entry.change_reason,
    created_at: entry.created_at,
    product_name: entry.product_name,
  }));
}

// =============================================================================
// SNAPSHOT INTEGRATION FUNCTIONS
// =============================================================================

/**
 * Get organization ID from a product ID.
 *
 * Helper function used by insertPriceWithSnapshot to determine
 * which organization's menu snapshot to create.
 *
 * @param productId - The product UUID
 * @returns Promise<UUID | null> - The organization UUID or null if product not found
 */
export async function getOrganizationIdFromProduct(productId: UUID): Promise<UUID | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('organization_id')
    .eq('id', productId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.organization_id;
}

/**
 * Insert a new price and automatically create a menu snapshot.
 *
 * This is the RECOMMENDED function for price changes as it ensures
 * that a menu snapshot is created for legal compliance.
 *
 * The database trigger `auto_create_snapshot_on_price_change` also creates
 * snapshots, but this function provides additional control and error handling
 * at the application layer.
 *
 * CRITICAL: This function implements the INSERT-only pattern for price_ledger.
 * - It closes the previous price by setting valid_until
 * - It inserts a new price record
 * - It creates a menu snapshot linked to the price change
 *
 * @param params - Price insert parameters
 * @param options - Additional options for snapshot creation
 * @returns Promise<InsertPriceWithSnapshotResult> - Result including snapshot info
 *
 * @example
 * ```ts
 * // Standard price change with automatic snapshot
 * const result = await insertPriceWithSnapshot({
 *   productId: 'uuid-here',
 *   price: 150.00,
 *   changeReason: 'Malzeme maliyeti artışı'
 * });
 *
 * if (result.success) {
 *   console.log(`Fiyat değiştirildi: ${result.previousPrice} -> ${result.newPrice}`);
 *   console.log(`Snapshot ID: ${result.snapshot?.snapshotId}`);
 *   console.log(`Snapshot Hash: ${result.snapshot?.hash}`);
 * }
 *
 * // Skip snapshot creation (only use if you have a specific reason!)
 * const result = await insertPriceWithSnapshot({
 *   productId: 'uuid-here',
 *   price: 75.00,
 *   changeReason: 'Bulk import'
 * }, { skipSnapshot: true });
 * ```
 */
export async function insertPriceWithSnapshot(
  params: InsertPriceParams,
  options: { skipSnapshot?: boolean } = {}
): Promise<InsertPriceWithSnapshotResult> {
  const { skipSnapshot = false } = options;

  // First, get the organization ID from the product
  const organizationId = await getOrganizationIdFromProduct(params.productId);

  if (!organizationId) {
    return {
      success: false,
      priceLedgerId: null,
      previousPrice: null,
      newPrice: params.price,
      error: 'Ürün bulunamadı veya organization_id alınamadı',
      snapshot: null,
      organizationId: null,
    };
  }

  // Insert the price
  const priceResult = await insertPrice(params);

  // If price insert failed, return error
  if (!priceResult.success) {
    return {
      ...priceResult,
      snapshot: null,
      organizationId,
    };
  }

  // If snapshot creation is skipped (e.g., bulk imports), return without snapshot
  // NOTE: The database trigger will still create a snapshot!
  if (skipSnapshot) {
    return {
      ...priceResult,
      snapshot: null,
      organizationId,
    };
  }

  // Create the menu snapshot linked to this price change
  // NOTE: The database trigger `auto_create_snapshot_on_price_change` may have
  // already created a snapshot. This application-level snapshot creation
  // serves as a backup and provides better error handling.
  let snapshotResult: CreateSnapshotResult | null = null;

  try {
    snapshotResult = await createMenuSnapshot(
      organizationId,
      priceResult.priceLedgerId
    );
  } catch (error) {
    // Log the error but don't fail the price change
    // The database trigger should have created a snapshot anyway
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    snapshotResult = {
      success: false,
      snapshotId: null,
      hash: null,
      productCount: 0,
      error: `Snapshot oluşturulurken hata: ${errorMessage}`,
    };
  }

  return {
    ...priceResult,
    snapshot: snapshotResult,
    organizationId,
  };
}

/**
 * Simplified insertPriceWithSnapshot function with positional parameters.
 *
 * This is a convenience wrapper for common use cases.
 * Always creates a snapshot after successful price insert.
 *
 * @param productId - The product UUID
 * @param price - The new price value
 * @param changeReason - The reason for the price change
 * @returns Promise<InsertPriceWithSnapshotResult>
 */
export async function insertPriceWithSnapshotSimple(
  productId: UUID,
  price: number,
  changeReason: string
): Promise<InsertPriceWithSnapshotResult> {
  return insertPriceWithSnapshot({
    productId,
    price,
    changeReason,
  });
}

/**
 * Bulk insert prices with a single snapshot at the end.
 *
 * Use this for bulk price imports where you want to avoid creating
 * multiple snapshots. Only one snapshot is created after all prices
 * are inserted.
 *
 * @param priceChanges - Array of price insert parameters
 * @returns Promise<{
 *   results: InsertPriceResult[];
 *   snapshot: CreateSnapshotResult | null;
 *   organizationId: UUID | null;
 * }>
 *
 * @example
 * ```ts
 * const priceChanges = [
 *   { productId: 'uuid-1', price: 100, changeReason: 'Bulk import' },
 *   { productId: 'uuid-2', price: 150, changeReason: 'Bulk import' },
 *   { productId: 'uuid-3', price: 200, changeReason: 'Bulk import' },
 * ];
 *
 * const result = await bulkInsertPricesWithSnapshot(priceChanges);
 * console.log(`${result.results.filter(r => r.success).length} fiyat güncellendi`);
 * console.log(`Snapshot: ${result.snapshot?.snapshotId}`);
 * ```
 */
export async function bulkInsertPricesWithSnapshot(
  priceChanges: InsertPriceParams[]
): Promise<{
  results: InsertPriceResult[];
  snapshot: CreateSnapshotResult | null;
  organizationId: UUID | null;
}> {
  if (priceChanges.length === 0) {
    return {
      results: [],
      snapshot: null,
      organizationId: null,
    };
  }

  // Get the first price change
  const firstPriceChange = priceChanges[0];
  if (!firstPriceChange) {
    return {
      results: [],
      snapshot: null,
      organizationId: null,
    };
  }

  // Get organization ID from the first product
  const organizationId = await getOrganizationIdFromProduct(firstPriceChange.productId);

  if (!organizationId) {
    return {
      results: [{
        success: false,
        priceLedgerId: null,
        previousPrice: null,
        newPrice: firstPriceChange.price,
        error: 'Ürün bulunamadı veya organization_id alınamadı',
      }],
      snapshot: null,
      organizationId: null,
    };
  }

  // Insert all prices (database trigger will create snapshots, but we'll create one final snapshot)
  const results: InsertPriceResult[] = [];
  let lastSuccessfulPriceLedgerId: UUID | null = null;

  for (const priceChange of priceChanges) {
    const result = await insertPrice(priceChange);
    results.push(result);

    if (result.success && result.priceLedgerId) {
      lastSuccessfulPriceLedgerId = result.priceLedgerId;
    }
  }

  // Create a final snapshot if any price was successfully inserted
  let snapshotResult: CreateSnapshotResult | null = null;

  if (lastSuccessfulPriceLedgerId) {
    try {
      snapshotResult = await createMenuSnapshot(
        organizationId,
        lastSuccessfulPriceLedgerId
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      snapshotResult = {
        success: false,
        snapshotId: null,
        hash: null,
        productCount: 0,
        error: `Bulk snapshot oluşturulurken hata: ${errorMessage}`,
      };
    }
  }

  return {
    results,
    snapshot: snapshotResult,
    organizationId,
  };
}
