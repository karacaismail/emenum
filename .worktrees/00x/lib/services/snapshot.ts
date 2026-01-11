/**
 * Snapshot Service
 *
 * Menu snapshot (anlık görüntü) yönetimi için servis modülü.
 * Bu modül, menü durumunu (ürünler + güncel fiyatlar) JSON olarak yakalayıp
 * menu_snapshots tablosuna saklar.
 *
 * CRITICAL: Menu snapshot'ları yasal uyumluluk için IMMUTABLE'dır!
 * Bu tabloya UPDATE ve DELETE yapılamaz (database trigger ile engellenir).
 *
 * İş Akışı:
 * 1. Tüm aktif ürünleri ve güncel fiyatlarını getir
 * 2. JSON snapshot oluştur
 * 3. SHA-256 hash hesapla
 * 4. menu_snapshots tablosuna INSERT et
 *
 * @example
 * ```ts
 * import { createMenuSnapshot, getLatestSnapshot, verifySnapshotHash } from '@/lib/services/snapshot';
 *
 * // Menü snapshot'ı oluştur
 * const result = await createMenuSnapshot(organizationId);
 *
 * // Son snapshot'ı getir
 * const latest = await getLatestSnapshot(organizationId);
 *
 * // Hash doğrula
 * const isValid = await verifySnapshotHash(snapshotId);
 * ```
 */

import { createHash } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  UUID,
  CurrencyCode,
  MenuSnapshot,
  MenuSnapshotData,
  MenuSnapshotProduct,
  MenuSnapshotInsert,
} from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Snapshot creation result
 */
export interface CreateSnapshotResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The created snapshot ID */
  snapshotId: UUID | null;
  /** The SHA-256 hash of the snapshot */
  hash: string | null;
  /** Number of products included in the snapshot */
  productCount: number;
  /** Error message if operation failed */
  error: string | null;
}

/**
 * Snapshot with verification status
 */
export interface SnapshotWithVerification extends MenuSnapshot {
  /** Whether the stored hash matches the computed hash */
  isValid: boolean;
  /** The recomputed hash for comparison */
  computedHash: string;
}

/**
 * Snapshot summary for listing
 */
export interface SnapshotSummary {
  id: UUID;
  createdAt: Date;
  productCount: number;
  hash: string;
  triggeredByPriceChange: boolean;
}

/**
 * Product data used in snapshot creation (from view)
 */
interface ProductWithCurrentPrice {
  id: UUID;
  name: string;
  current_price: number | null;
  current_currency: CurrencyCode | null;
  category_name: string | null;
  is_active: boolean;
  organization_id: UUID;
}

// =============================================================================
// HASH COMPUTATION
// =============================================================================

/**
 * Compute SHA-256 hash of a snapshot data object.
 *
 * CRITICAL: The hash is computed from the stringified JSON.
 * The same JSON structure must produce the same hash for verification.
 *
 * @param data - The menu snapshot data
 * @returns SHA-256 hash as 64 character hex string
 */
export function computeSnapshotHash(data: MenuSnapshotData): string {
  const jsonString = JSON.stringify(data);
  return createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Validate SHA-256 hash format.
 *
 * @param hash - The hash to validate
 * @returns True if hash is valid 64-character hex string
 */
export function isValidHashFormat(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Create a menu snapshot for an organization.
 *
 * Captures the complete menu state (all active products with current prices)
 * and stores it in the menu_snapshots table with a SHA-256 hash.
 *
 * @param organizationId - The organization UUID
 * @param triggeredByPriceLedgerId - Optional: The price_ledger entry that triggered this snapshot
 * @returns Promise<CreateSnapshotResult> - Result of the operation
 *
 * @example
 * ```ts
 * // Create manual snapshot
 * const result = await createMenuSnapshot(orgId);
 *
 * // Create snapshot triggered by price change
 * const result = await createMenuSnapshot(orgId, priceLedgerId);
 *
 * if (result.success) {
 *   console.log(`Snapshot oluşturuldu: ${result.snapshotId}`);
 *   console.log(`Hash: ${result.hash}`);
 *   console.log(`${result.productCount} ürün dahil edildi`);
 * }
 * ```
 */
export async function createMenuSnapshot(
  organizationId: UUID,
  triggeredByPriceLedgerId?: UUID | null
): Promise<CreateSnapshotResult> {
  const supabase = await createServerSupabaseClient();

  // Validate organization exists
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    return {
      success: false,
      snapshotId: null,
      hash: null,
      productCount: 0,
      error: 'İşletme bulunamadı',
    };
  }

  // Get all active products with current prices using the view
  const { data: products, error: productsError } = await supabase
    .from('products_with_current_price')
    .select('id, name, current_price, current_currency, category_name, is_active, organization_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (productsError) {
    return {
      success: false,
      snapshotId: null,
      hash: null,
      productCount: 0,
      error: `Ürünler alınırken hata oluştu: ${productsError.message}`,
    };
  }

  // Build snapshot data structure
  const now = new Date();
  const snapshotProducts: MenuSnapshotProduct[] = (products || []).map(
    (p: ProductWithCurrentPrice) => ({
      id: p.id,
      name: p.name,
      category: p.category_name || 'Kategorisiz',
      price: p.current_price ?? 0,
      currency: (p.current_currency as CurrencyCode) ?? 'TRY',
    })
  );

  const snapshotData: MenuSnapshotData = {
    organization_id: organizationId,
    created_at: now.toISOString(),
    products: snapshotProducts,
  };

  // Compute SHA-256 hash
  const hash = computeSnapshotHash(snapshotData);

  // Insert snapshot into database
  const snapshotInsert: MenuSnapshotInsert = {
    organization_id: organizationId,
    snapshot_json: snapshotData,
    sha256_hash: hash,
    triggered_by_price_ledger_id: triggeredByPriceLedgerId ?? null,
  };

  const { data: insertedSnapshot, error: insertError } = await supabase
    .from('menu_snapshots')
    .insert(snapshotInsert)
    .select('id')
    .single();

  if (insertError) {
    return {
      success: false,
      snapshotId: null,
      hash: null,
      productCount: snapshotProducts.length,
      error: `Snapshot kaydedilirken hata oluştu: ${insertError.message}`,
    };
  }

  return {
    success: true,
    snapshotId: insertedSnapshot.id,
    hash,
    productCount: snapshotProducts.length,
    error: null,
  };
}

/**
 * Get the latest menu snapshot for an organization.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<MenuSnapshot | null> - The latest snapshot or null
 */
export async function getLatestSnapshot(
  organizationId: UUID
): Promise<MenuSnapshot | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as MenuSnapshot;
}

/**
 * Get a specific snapshot by ID.
 *
 * @param snapshotId - The snapshot UUID
 * @returns Promise<MenuSnapshot | null> - The snapshot or null
 */
export async function getSnapshotById(
  snapshotId: UUID
): Promise<MenuSnapshot | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as MenuSnapshot;
}

/**
 * Get snapshot history for an organization.
 *
 * Returns a paginated list of snapshots ordered by creation time (newest first).
 *
 * @param organizationId - The organization UUID
 * @param limit - Maximum number of snapshots to return (default: 50)
 * @param offset - Number of snapshots to skip (default: 0)
 * @returns Promise<SnapshotSummary[]> - Array of snapshot summaries
 */
export async function getSnapshotHistory(
  organizationId: UUID,
  limit = 50,
  offset = 0
): Promise<SnapshotSummary[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('id, created_at, sha256_hash, triggered_by_price_ledger_id, snapshot_json')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    return [];
  }

  return data.map((s) => {
    const snapshotJson = s.snapshot_json as MenuSnapshotData;
    return {
      id: s.id,
      createdAt: new Date(s.created_at),
      productCount: snapshotJson?.products?.length ?? 0,
      hash: s.sha256_hash,
      triggeredByPriceChange: s.triggered_by_price_ledger_id !== null,
    };
  });
}

/**
 * Get the total count of snapshots for an organization.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<number> - The total number of snapshots
 */
export async function getSnapshotCount(organizationId: UUID): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('menu_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Verify the integrity of a snapshot by recomputing its hash.
 *
 * This function recomputes the SHA-256 hash from the stored JSON data
 * and compares it with the stored hash to verify data integrity.
 *
 * @param snapshotId - The snapshot UUID to verify
 * @returns Promise<SnapshotWithVerification | null> - Snapshot with verification status
 *
 * @example
 * ```ts
 * const result = await verifySnapshotHash(snapshotId);
 *
 * if (result && result.isValid) {
 *   console.log('Snapshot bütünlüğü doğrulandı');
 * } else if (result) {
 *   console.error('UYARI: Snapshot değiştirilmiş olabilir!');
 *   console.log(`Saklanan hash: ${result.sha256_hash}`);
 *   console.log(`Hesaplanan hash: ${result.computedHash}`);
 * }
 * ```
 */
export async function verifySnapshotHash(
  snapshotId: UUID
): Promise<SnapshotWithVerification | null> {
  const snapshot = await getSnapshotById(snapshotId);

  if (!snapshot) {
    return null;
  }

  // Recompute hash from stored JSON data
  const computedHash = computeSnapshotHash(snapshot.snapshot_json);

  return {
    ...snapshot,
    isValid: computedHash === snapshot.sha256_hash,
    computedHash,
  };
}

/**
 * Verify all snapshots for an organization.
 *
 * Useful for periodic integrity audits.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<{ total: number; valid: number; invalid: UUID[] }> - Verification summary
 */
export async function verifyAllSnapshots(
  organizationId: UUID
): Promise<{ total: number; valid: number; invalid: UUID[] }> {
  const supabase = await createServerSupabaseClient();

  const { data: snapshots, error } = await supabase
    .from('menu_snapshots')
    .select('id, sha256_hash, snapshot_json')
    .eq('organization_id', organizationId);

  if (error || !snapshots) {
    return { total: 0, valid: 0, invalid: [] };
  }

  const invalid: UUID[] = [];
  let valid = 0;

  for (const snapshot of snapshots) {
    const snapshotJson = snapshot.snapshot_json as MenuSnapshotData;
    const computedHash = computeSnapshotHash(snapshotJson);

    if (computedHash === snapshot.sha256_hash) {
      valid++;
    } else {
      invalid.push(snapshot.id);
    }
  }

  return {
    total: snapshots.length,
    valid,
    invalid,
  };
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Compare two snapshots to find differences.
 *
 * @param snapshotId1 - First snapshot UUID
 * @param snapshotId2 - Second snapshot UUID
 * @returns Promise<SnapshotDifference | null> - Differences between snapshots
 */
export interface SnapshotDifference {
  snapshot1Id: UUID;
  snapshot2Id: UUID;
  snapshot1CreatedAt: string;
  snapshot2CreatedAt: string;
  addedProducts: MenuSnapshotProduct[];
  removedProducts: MenuSnapshotProduct[];
  priceChanges: {
    productId: UUID;
    productName: string;
    oldPrice: number;
    newPrice: number;
    oldCurrency: CurrencyCode;
    newCurrency: CurrencyCode;
  }[];
}

export async function compareSnapshots(
  snapshotId1: UUID,
  snapshotId2: UUID
): Promise<SnapshotDifference | null> {
  const snapshot1 = await getSnapshotById(snapshotId1);
  const snapshot2 = await getSnapshotById(snapshotId2);

  if (!snapshot1 || !snapshot2) {
    return null;
  }

  const products1 = snapshot1.snapshot_json.products;
  const products2 = snapshot2.snapshot_json.products;

  const productMap1 = new Map(products1.map((p) => [p.id, p]));
  const productMap2 = new Map(products2.map((p) => [p.id, p]));

  // Find added products (in snapshot2 but not in snapshot1)
  const addedProducts: MenuSnapshotProduct[] = [];
  for (const product of products2) {
    if (!productMap1.has(product.id)) {
      addedProducts.push(product);
    }
  }

  // Find removed products (in snapshot1 but not in snapshot2)
  const removedProducts: MenuSnapshotProduct[] = [];
  for (const product of products1) {
    if (!productMap2.has(product.id)) {
      removedProducts.push(product);
    }
  }

  // Find price changes
  const priceChanges: SnapshotDifference['priceChanges'] = [];
  for (const product1 of products1) {
    const product2 = productMap2.get(product1.id);
    if (product2 && (product1.price !== product2.price || product1.currency !== product2.currency)) {
      priceChanges.push({
        productId: product1.id,
        productName: product1.name,
        oldPrice: product1.price,
        newPrice: product2.price,
        oldCurrency: product1.currency,
        newCurrency: product2.currency,
      });
    }
  }

  return {
    snapshot1Id: snapshotId1,
    snapshot2Id: snapshotId2,
    snapshot1CreatedAt: snapshot1.snapshot_json.created_at,
    snapshot2CreatedAt: snapshot2.snapshot_json.created_at,
    addedProducts,
    removedProducts,
    priceChanges,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get snapshots triggered by a specific price ledger entry.
 *
 * @param priceLedgerId - The price_ledger UUID
 * @returns Promise<MenuSnapshot[]> - Snapshots triggered by this price change
 */
export async function getSnapshotsByPriceLedgerId(
  priceLedgerId: UUID
): Promise<MenuSnapshot[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('*')
    .eq('triggered_by_price_ledger_id', priceLedgerId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as MenuSnapshot[];
}

/**
 * Check if a snapshot exists for the current menu state.
 *
 * Computes a hash of the current menu state and compares it
 * with the latest snapshot hash.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<{ hasChanges: boolean; latestSnapshot: MenuSnapshot | null }> -
 *          Whether the menu has changed since the last snapshot
 */
export async function hasMenuChangedSinceLastSnapshot(
  organizationId: UUID
): Promise<{ hasChanges: boolean; latestSnapshot: MenuSnapshot | null }> {
  const supabase = await createServerSupabaseClient();

  // Get latest snapshot
  const latestSnapshot = await getLatestSnapshot(organizationId);

  if (!latestSnapshot) {
    return { hasChanges: true, latestSnapshot: null };
  }

  // Get current products
  const { data: products } = await supabase
    .from('products_with_current_price')
    .select('id, name, current_price, current_currency, category_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!products) {
    return { hasChanges: false, latestSnapshot };
  }

  // Build current snapshot data
  const currentData: MenuSnapshotData = {
    organization_id: organizationId,
    created_at: latestSnapshot.snapshot_json.created_at, // Use same timestamp for comparison
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category_name || 'Kategorisiz',
      price: p.current_price ?? 0,
      currency: (p.current_currency as CurrencyCode) ?? 'TRY',
    })),
  };

  const currentHash = computeSnapshotHash(currentData);
  const hasChanges = currentHash !== latestSnapshot.sha256_hash;

  return { hasChanges, latestSnapshot };
}

/**
 * Create a snapshot only if the menu has changed.
 *
 * This is useful for automated snapshot creation to avoid duplicates.
 *
 * @param organizationId - The organization UUID
 * @param triggeredByPriceLedgerId - Optional: The price_ledger entry that triggered this
 * @returns Promise<CreateSnapshotResult> - Result with success=true if created, or indication that no changes
 */
export async function createSnapshotIfChanged(
  organizationId: UUID,
  triggeredByPriceLedgerId?: UUID | null
): Promise<CreateSnapshotResult & { skipped?: boolean }> {
  const { hasChanges, latestSnapshot } = await hasMenuChangedSinceLastSnapshot(organizationId);

  if (!hasChanges && latestSnapshot) {
    return {
      success: true,
      snapshotId: latestSnapshot.id,
      hash: latestSnapshot.sha256_hash,
      productCount: latestSnapshot.snapshot_json.products.length,
      error: null,
      skipped: true,
    };
  }

  const result = await createMenuSnapshot(organizationId, triggeredByPriceLedgerId);
  return { ...result, skipped: false };
}
