/**
 * Hooks - Barrel Export
 *
 * Central export file for all custom React hooks.
 * Import hooks from '@/hooks' for clean imports.
 *
 * @example
 * ```tsx
 * import {
 *   useTableContext,
 *   useFeature,
 *   useFeatureLimit,
 * } from '@/hooks';
 * ```
 */

// =============================================================================
// TABLE CONTEXT
// =============================================================================

export {
  useTableContext,
  useSimpleTableContext,
  useIsAtTable,
  useTableIdForApi,
  isValidTableId,
} from './useTableContext';

export type {
  UseTableContextResult,
  UseTableContextOptions,
  TableContextMetadata,
} from './useTableContext';

// =============================================================================
// FEATURE PERMISSIONS
// =============================================================================

export {
  useFeature,
  useFeatureLimit,
  useMultipleFeatures,
  useAllFeatures,
  useFeatureSafe,
  useUpgradePrompt,
  useFeatureContext,
  useFeatureContextSafe,
} from './useFeature';

export type {
  UseFeatureResult,
  UseFeatureLimitResult,
  UseMultipleFeaturesResult,
  FeatureState,
} from './useFeature';

// =============================================================================
// SERVICE REQUESTS (REALTIME)
// =============================================================================

export {
  useServiceRequests,
  usePendingRequestCount,
  useTableServiceRequests,
  getUrgencyLevel,
  formatWaitingTime,
} from './useServiceRequests';

export type {
  ServiceRequestData,
  UseServiceRequestsOptions,
  UseServiceRequestsResult,
  ConnectionStatus,
} from './useServiceRequests';
