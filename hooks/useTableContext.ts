/**
 * useTableContext Hook
 *
 * Client-side hook for managing table context from QR code scans.
 * Reads table_id from URL params, stores in localStorage, and persists across page refreshes.
 *
 * Bu hook, QR kod taramalarından gelen masa bilgisini yönetir.
 * URL'den table_id parametresini okur, localStorage'a kaydeder ve sayfa yenilemelerinde korur.
 *
 * Flow:
 * 1. Müşteri QR kodu tarar → URL'de table_id parametresi olur
 * 2. Hook URL'den table_id'yi okur ve localStorage'a kaydeder
 * 3. Sayfa yenilendiğinde localStorage'dan okur
 * 4. Müşteri masadan ayrıldığında clearTableContext() ile temizlenir
 *
 * Edge Cases Handled:
 * - Invalid UUID format: Returns null and doesn't store invalid IDs
 * - Safari incognito mode: Graceful fallback when localStorage unavailable
 * - Offline access: localStorage persists even when offline
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useTableContext } from '@/hooks/useTableContext';
 *
 * function MenuPage() {
 *   const { tableId, isLoading, clearTable } = useTableContext();
 *
 *   if (tableId) {
 *     return (
 *       <div>
 *         <p>Masa: {tableId}</p>
 *         <button onClick={clearTable}>Masadan Ayrıl</button>
 *       </div>
 *     );
 *   }
 *
 *   return <p>QR kodu tarayarak masanızı seçin</p>;
 * }
 * ```
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

// =============================================================================
// CONSTANTS
// =============================================================================

/** localStorage key for table_id */
const TABLE_ID_STORAGE_KEY = 'table_id';

/** localStorage key for table context metadata */
const TABLE_CONTEXT_STORAGE_KEY = 'table_context';

/** UUID v4 regex pattern for validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Table context metadata stored alongside table_id
 */
export interface TableContextMetadata {
  /** When the table context was set */
  setAt: string;
  /** Organization slug (if available) */
  organizationSlug?: string;
  /** Source of the table_id (url or storage) */
  source: 'url' | 'storage';
}

/**
 * Result of useTableContext hook
 */
export interface UseTableContextResult {
  /** Current table ID (null if not set) */
  tableId: string | null;
  /** Whether the hook is still initializing */
  isLoading: boolean;
  /** Whether the tableId came from URL (fresh QR scan) or localStorage */
  source: 'url' | 'storage' | null;
  /** When the table context was set (ISO string) */
  setAt: string | null;
  /** Whether a table context exists */
  hasTableContext: boolean;
  /** Clear the table context (when leaving table) */
  clearTable: () => void;
  /** Set table ID manually (for testing or manual override) */
  setTableId: (id: string) => boolean;
  /** Metadata about the table context */
  metadata: TableContextMetadata | null;
}

/**
 * Options for useTableContext hook
 */
export interface UseTableContextOptions {
  /** Whether to validate table_id as UUID format (default: true) */
  validateUUID?: boolean;
  /** Organization slug to store in metadata */
  organizationSlug?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if localStorage is available (handles Safari incognito mode)
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if a string is a valid UUID v4 format
 * @param id - String to validate
 * @returns True if valid UUID format
 */
export function isValidTableId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id);
}

/**
 * Get table_id from localStorage (safe)
 */
function getStoredTableId(): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  try {
    return localStorage.getItem(TABLE_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get table context metadata from localStorage (safe)
 */
function getStoredMetadata(): TableContextMetadata | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  try {
    const stored = localStorage.getItem(TABLE_CONTEXT_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as TableContextMetadata;
  } catch {
    return null;
  }
}

/**
 * Store table_id in localStorage (safe)
 */
function storeTableId(id: string, metadata: TableContextMetadata): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  try {
    localStorage.setItem(TABLE_ID_STORAGE_KEY, id);
    localStorage.setItem(TABLE_CONTEXT_STORAGE_KEY, JSON.stringify(metadata));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear table context from localStorage (safe)
 */
function clearStoredTableId(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  try {
    localStorage.removeItem(TABLE_ID_STORAGE_KEY);
    localStorage.removeItem(TABLE_CONTEXT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook to manage table context from QR code scans
 *
 * Reads table_id from URL params, stores in localStorage, and persists across page refreshes.
 *
 * @param options - Optional configuration
 * @returns Table context state and utilities
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { tableId } = useTableContext();
 *
 * // With options
 * const { tableId, clearTable } = useTableContext({
 *   validateUUID: true,
 *   organizationSlug: 'my-restaurant'
 * });
 *
 * // In waiter call button
 * if (tableId) {
 *   await createServiceRequest(tableId);
 * }
 * ```
 */
export function useTableContext(options: UseTableContextOptions = {}): UseTableContextResult {
  const { validateUUID = true, organizationSlug } = options;

  const searchParams = useSearchParams();

  const [tableId, setTableIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<'url' | 'storage' | null>(null);
  const [metadata, setMetadata] = useState<TableContextMetadata | null>(null);

  /**
   * Initialize table context from URL or localStorage
   */
  useEffect(() => {
    // Get table_id from URL
    const urlTableId = searchParams.get('table_id');

    if (urlTableId) {
      // Validate if required
      if (validateUUID && !isValidTableId(urlTableId)) {
        // Invalid UUID - try localStorage fallback
        const storedId = getStoredTableId();
        const storedMeta = getStoredMetadata();

        if (storedId && (!validateUUID || isValidTableId(storedId))) {
          setTableIdState(storedId);
          setSource('storage');
          setMetadata(storedMeta);
        } else {
          setTableIdState(null);
          setSource(null);
          setMetadata(null);
        }
        setIsLoading(false);
        return;
      }

      // Valid table_id from URL - store it
      const newMetadata: TableContextMetadata = {
        setAt: new Date().toISOString(),
        organizationSlug,
        source: 'url',
      };

      storeTableId(urlTableId, newMetadata);
      setTableIdState(urlTableId);
      setSource('url');
      setMetadata(newMetadata);
      setIsLoading(false);
      return;
    }

    // No URL param - try localStorage
    const storedId = getStoredTableId();
    const storedMeta = getStoredMetadata();

    if (storedId) {
      // Validate stored ID if required
      if (validateUUID && !isValidTableId(storedId)) {
        // Invalid stored ID - clear it
        clearStoredTableId();
        setTableIdState(null);
        setSource(null);
        setMetadata(null);
        setIsLoading(false);
        return;
      }

      setTableIdState(storedId);
      setSource('storage');
      setMetadata(storedMeta);
    } else {
      setTableIdState(null);
      setSource(null);
      setMetadata(null);
    }

    setIsLoading(false);
  }, [searchParams, validateUUID, organizationSlug]);

  /**
   * Clear the table context (when leaving table)
   */
  const clearTable = useCallback(() => {
    clearStoredTableId();
    setTableIdState(null);
    setSource(null);
    setMetadata(null);
  }, []);

  /**
   * Set table ID manually
   * @param id - Table ID to set
   * @returns True if set successfully
   */
  const setTableId = useCallback((id: string): boolean => {
    // Validate if required
    if (validateUUID && !isValidTableId(id)) {
      return false;
    }

    const newMetadata: TableContextMetadata = {
      setAt: new Date().toISOString(),
      organizationSlug,
      source: 'url', // Treat manual set as URL source
    };

    const stored = storeTableId(id, newMetadata);
    if (stored) {
      setTableIdState(id);
      setSource('url');
      setMetadata(newMetadata);
    }
    return stored;
  }, [validateUUID, organizationSlug]);

  return {
    tableId,
    isLoading,
    source,
    setAt: metadata?.setAt ?? null,
    hasTableContext: tableId !== null,
    clearTable,
    setTableId,
    metadata,
  };
}

// =============================================================================
// SIMPLE HOOK (Matches spec pattern exactly)
// =============================================================================

/**
 * Simple hook matching the spec pattern exactly
 *
 * For cases where you just need the table_id and nothing else.
 *
 * @returns Table ID or null
 *
 * @example
 * ```tsx
 * const tableId = useSimpleTableContext();
 *
 * if (tableId) {
 *   // Show waiter call button
 * }
 * ```
 */
export function useSimpleTableContext(): string | null {
  const searchParams = useSearchParams();
  const [tableId, setTableId] = useState<string | null>(null);

  useEffect(() => {
    // URL'den table_id al
    const urlTableId = searchParams.get('table_id');

    if (urlTableId) {
      // localStorage'a kaydet
      if (isLocalStorageAvailable()) {
        try {
          localStorage.setItem('table_id', urlTableId);
        } catch {
          // Ignore storage errors
        }
      }
      setTableId(urlTableId);
    } else {
      // localStorage'dan oku
      if (isLocalStorageAvailable()) {
        try {
          const storedTableId = localStorage.getItem('table_id');
          setTableId(storedTableId);
        } catch {
          setTableId(null);
        }
      }
    }
  }, [searchParams]);

  return tableId;
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to check if user is at a table
 *
 * @returns Boolean indicating if table context exists
 *
 * @example
 * ```tsx
 * const isAtTable = useIsAtTable();
 *
 * return isAtTable ? <CallWaiterButton /> : null;
 * ```
 */
export function useIsAtTable(): boolean {
  const { hasTableContext, isLoading } = useTableContext();

  // Return false while loading to prevent flash
  if (isLoading) return false;

  return hasTableContext;
}

/**
 * Hook to get table_id for API calls
 *
 * Returns null if not at a table or still loading.
 * Use this when making API calls that require table_id.
 *
 * @returns Table ID ready for API use, or null
 *
 * @example
 * ```tsx
 * const tableIdForApi = useTableIdForApi();
 *
 * async function callWaiter() {
 *   if (!tableIdForApi) {
 *     alert('Lutfen QR kodu tarayin');
 *     return;
 *   }
 *
 *   await fetch('/api/service-request', {
 *     method: 'POST',
 *     body: JSON.stringify({ table_id: tableIdForApi })
 *   });
 * }
 * ```
 */
export function useTableIdForApi(): string | null {
  const { tableId, isLoading } = useTableContext();

  // Return null while loading to prevent premature API calls
  if (isLoading) return null;

  return tableId;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useTableContext;
