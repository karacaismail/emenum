/**
 * Services - Barrel Exports
 *
 * Tum servis modullerinin tek yerden export edilmesi icin.
 *
 * @example
 * ```ts
 * import { insertPrice, generateTableQRCode } from '@/lib/services';
 *
 * // Location-scoped queries
 * import {
 *   getLocationBySlug,
 *   getLocationsByOrganization,
 *   createLocation
 * } from '@/lib/services';
 *
 * // Slug utilities
 * import {
 *   generateSlug,
 *   validateSlug,
 *   handleSlugCollision
 * } from '@/lib/services';
 * ```
 */

// =============================================================================
// PRICE LEDGER SERVICE
// =============================================================================

export {
  // Main functions
  insertPrice,
  insertPriceSimple,
  getCurrentPrice,
  getPriceHistory,
  getPriceAtTime,
  hasPrice,
  getPriceChangeCount,

  // Happy Hour functions
  scheduleHappyHour,
  getScheduledPrices,

  // Organization functions
  getOrganizationCurrentPrices,
  getRecentPriceChanges,

  // Types
  type InsertPriceParams,
  type InsertPriceResult,
  type PriceHistoryEntry,
} from './price-ledger';

// =============================================================================
// QR CODE GENERATOR SERVICE
// =============================================================================

export {
  // URL generation
  generateMenuUrl,
  generateMenuUrlWithoutTable,

  // QR code generation - Data URL
  generateQRCodeDataUrl,
  generateTableQRCode,
  generateTableQRCodeSimple,

  // QR code generation - Buffer (server-side)
  generateQRCodeBuffer,
  generateTableQRCodeBuffer,

  // Bulk generation
  generateBulkTableQRCodes,

  // Download utilities (client-side)
  generateQRFilename,
  downloadQRCode,
  downloadTableQRCode,
  downloadBulkQRCodes,

  // Validation utilities
  isValidQRCodeUrl,
  isValidTableId,
  extractTableIdFromUrl,
  extractOrgSlugFromUrl,

  // Presets
  generateQRCodeWithPreset,
  QR_PRESETS,

  // Constants
  HIGH_RES_SIZE,
  STANDARD_SIZE,
  PREVIEW_SIZE,

  // Types
  type QRCodeOptions,
  type GenerateTableQRParams,
  type GenerateTableQRParamsWithSize,
  type TableQRInfo,
  type QRCodeResult,
  type BulkQRCodeResult,
} from './qr-generator';

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

export {
  // Singleton instance
  notificationService,
  default as notificationServiceDefault,

  // Helper functions
  formatNotificationTime,
  formatRequestType,
  getRequestTypeIcon,

  // Types
  type NotificationType,
  type RequestNotificationData,
  type NotificationData,
  type NotificationHistoryEntry,
  type NotificationSettings,
  type NotificationEventHandlers,
} from './notification';

// =============================================================================
// SNAPSHOT SERVICE
// =============================================================================

export {
  // Hash computation
  computeSnapshotHash,
  isValidHashFormat,

  // Main functions
  createMenuSnapshot,
  getLatestSnapshot,
  getSnapshotById,
  getSnapshotHistory,
  getSnapshotCount,

  // Verification functions
  verifySnapshotHash,
  verifyAllSnapshots,

  // Comparison functions
  compareSnapshots,

  // Helper functions
  getSnapshotsByPriceLedgerId,
  hasMenuChangedSinceLastSnapshot,
  createSnapshotIfChanged,

  // Types
  type CreateSnapshotResult,
  type SnapshotWithVerification,
  type SnapshotSummary,
  type SnapshotDifference,
} from './snapshot';

// =============================================================================
// LOCATION SERVICE
// =============================================================================

export {
  // Read operations
  getLocationBySlug,
  getLocationById,
  getLocationWithOrganization,
  getLocationsByOrganization,
  getLocationsByOrganizationSlug,
  getLocationCount,
  getDefaultLocation,
  getDefaultLocationByOrgSlug,
  isSlugAvailable,

  // Write operations
  createLocation,
  updateLocation,
  deleteLocation,
  reactivateLocation,

  // Types
  type CreateLocationResult,
  type UpdateLocationResult,
  type DeleteLocationResult,
  type GetLocationsParams,
} from '../db/locations';

// =============================================================================
// SLUG UTILITIES
// =============================================================================

export {
  // Slug generation
  generateSlug,
  generateLocationSlug,
  generateOrganizationSlug,
  normalizeSlug,

  // Character normalization
  normalizeTurkishChars,
  normalizeExtendedChars,

  // Slug validation
  validateSlug,
  isValidSlug,

  // Collision handling
  handleSlugCollision,
  generateSlugVariants,

  // Utility functions
  parseSlugNumber,
  areSlugsRelated,

  // Constants
  DEFAULT_MAX_LENGTH,
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
  SLUG_PATTERN,
  TURKISH_CHAR_MAP,
  EXTENDED_CHAR_MAP,

  // Types
  type SlugValidationResult,
  type SlugifyOptions,
  type CollisionOptions,
} from '../utils/slugify';
