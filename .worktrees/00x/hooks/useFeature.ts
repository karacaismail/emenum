/**
 * useFeature Hook
 *
 * Client-side hook for checking feature permissions in React components.
 * Uses FeatureContext for cached feature data.
 *
 * Bu hook, component'lar içinde özellik kontrolü yapmak için kullanılır.
 * Server-side permission.ts guard'ı ile aynı mantığı client tarafında sağlar.
 *
 * CRITICAL: NO hard-coded package checks (e.g., if (plan === 'Pro') is FORBIDDEN)
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useFeature, useFeatureLimit, useMultipleFeatures } from '@/hooks/useFeature';
 *
 * // Boolean feature check
 * function WaiterCallSection() {
 *   const { hasFeature, isLoading, planName } = useFeature('module_waiter_call');
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!hasFeature) return <UpgradePrompt feature="module_waiter_call" />;
 *
 *   return <WaiterCallButton />;
 * }
 *
 * // Numeric limit check
 * function AddProductButton({ currentCount }) {
 *   const { limit, remaining, canAdd, isUnlimited } = useFeatureLimit('limit_menu_items', currentCount);
 *
 *   if (!canAdd) {
 *     return <UpgradePrompt message={`Ürün limitine ulaştınız (${currentCount}/${limit})`} />;
 *   }
 *
 *   return <button>Ürün Ekle ({remaining} kalan)</button>;
 * }
 * ```
 */
'use client';

import { useMemo } from 'react';
import {
  useFeatureContext,
  useFeatureContextSafe,
  type FeatureState,
} from '@/contexts/FeatureContext';
import type { FeatureKey } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of useFeature hook
 */
export interface UseFeatureResult {
  /** Whether the feature is enabled */
  hasFeature: boolean;
  /** Whether features are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Full feature state (if available) */
  featureState: FeatureState | null;
  /** Whether the feature came from an override */
  isOverride: boolean;
  /** Current plan name (if available) */
  planName: string | null;
  /** Current plan slug (if available) */
  planSlug: string | null;
  /** Refresh features from server */
  refresh: () => Promise<void>;
}

/**
 * Result of useFeatureLimit hook
 */
export interface UseFeatureLimitResult {
  /** The numeric limit (-1 = unlimited, 0 = not available) */
  limit: number;
  /** Current usage count */
  currentCount: number;
  /** Remaining count (-1 = infinite) */
  remaining: number;
  /** Whether adding one more item is allowed */
  canAdd: boolean;
  /** Whether the limit is unlimited */
  isUnlimited: boolean;
  /** Usage percentage (0-100, null if unlimited) */
  usagePercent: number | null;
  /** Whether approaching limit (>80% usage) */
  shouldWarn: boolean;
  /** Whether features are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Human-readable message in Turkish */
  message: string;
  /** Refresh features from server */
  refresh: () => Promise<void>;
}

/**
 * Result of useMultipleFeatures hook
 */
export interface UseMultipleFeaturesResult {
  /** Map of feature keys to their enabled state */
  features: Record<string, boolean>;
  /** Whether all requested features are enabled */
  hasAllFeatures: boolean;
  /** Whether any of the requested features are enabled */
  hasAnyFeature: boolean;
  /** List of missing (disabled) features */
  missingFeatures: FeatureKey[];
  /** Whether features are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh features from server */
  refresh: () => Promise<void>;
}

// =============================================================================
// HELPER FUNCTIONS
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
    module_waiter_call: 'Garson Çağır',
    module_happy_hour: 'Happy Hour',
    module_cross_sell: 'Çapraz Satış',
    module_nutrition_info: 'Besin Değeri',
    module_social_share: 'Sosyal Paylaşım',
    has_images: 'Ürün Görselleri',
    has_logo: 'Logo',
    has_chef_special: "Şef'in Önerisi",
    has_daily_special: 'Günün Özel Menüsü',
    has_background_color: 'Arkaplan Rengi',
  };

  return labels[featureKey] || 'Özellik';
}

/**
 * Generate limit message in Turkish
 */
function getLimitMessage(
  featureKey: FeatureKey,
  currentCount: number,
  limit: number,
  canAdd: boolean
): string {
  const label = getFeatureLabel(featureKey);

  // Unlimited
  if (limit === -1) {
    return `${label} sayısı: ${currentCount} (Sınırsız)`;
  }

  // Not available
  if (limit === 0) {
    return `${label} özelliği mevcut paketinizde bulunmuyor.`;
  }

  // At or over limit
  if (!canAdd) {
    return `${label} limitine ulaştınız (${currentCount}/${limit}). Paketinizi yükseltin.`;
  }

  // Has remaining
  const remaining = limit - currentCount;
  return `${label}: ${currentCount}/${limit} (${remaining} kalan)`;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to check if a boolean feature is enabled
 *
 * @param featureKey - The feature key to check
 * @returns Feature status and metadata
 *
 * @example
 * ```tsx
 * const { hasFeature, isLoading } = useFeature('module_waiter_call');
 *
 * if (isLoading) return <Spinner />;
 * if (!hasFeature) return <UpgradePrompt />;
 * return <WaiterCallButton />;
 * ```
 */
export function useFeature(featureKey: FeatureKey): UseFeatureResult {
  const context = useFeatureContext();

  return useMemo(
    () => ({
      hasFeature: context.hasFeature(featureKey),
      isLoading: context.isLoading,
      error: context.error,
      featureState: context.getFeatureState(featureKey),
      isOverride: context.getFeatureState(featureKey)?.source === 'override',
      planName: context.plan?.name ?? null,
      planSlug: context.plan?.slug ?? null,
      refresh: context.refresh,
    }),
    [context, featureKey]
  );
}

/**
 * Hook to check numeric feature limits
 *
 * @param featureKey - The limit feature key (e.g., 'limit_menu_items')
 * @param currentCount - Current usage count
 * @returns Limit status with calculated remaining
 *
 * @example
 * ```tsx
 * const { canAdd, remaining, limit } = useFeatureLimit('limit_menu_items', productCount);
 *
 * if (!canAdd) {
 *   return <UpgradePrompt />;
 * }
 *
 * return <button disabled={!canAdd}>Ürün Ekle ({remaining} kalan)</button>;
 * ```
 */
export function useFeatureLimit(
  featureKey: FeatureKey,
  currentCount: number
): UseFeatureLimitResult {
  const context = useFeatureContext();

  return useMemo(() => {
    const limit = context.getLimit(featureKey);

    // Unlimited (-1)
    if (limit === -1) {
      return {
        limit,
        currentCount,
        remaining: -1,
        canAdd: true,
        isUnlimited: true,
        usagePercent: null,
        shouldWarn: false,
        isLoading: context.isLoading,
        error: context.error,
        message: getLimitMessage(featureKey, currentCount, limit, true),
        refresh: context.refresh,
      };
    }

    // Not available (0) or has limit
    const remaining = Math.max(0, limit - currentCount);
    const canAdd = currentCount < limit;
    const usagePercent = limit > 0 ? Math.min(100, Math.round((currentCount / limit) * 100)) : 100;
    const shouldWarn = limit > 0 && usagePercent >= 80;

    return {
      limit,
      currentCount,
      remaining,
      canAdd,
      isUnlimited: false,
      usagePercent,
      shouldWarn,
      isLoading: context.isLoading,
      error: context.error,
      message: getLimitMessage(featureKey, currentCount, limit, canAdd),
      refresh: context.refresh,
    };
  }, [context, featureKey, currentCount]);
}

/**
 * Hook to check multiple features at once
 *
 * @param featureKeys - Array of feature keys to check
 * @returns Combined feature status
 *
 * @example
 * ```tsx
 * const { hasAllFeatures, missingFeatures } = useMultipleFeatures([
 *   'module_waiter_call',
 *   'has_images',
 * ]);
 *
 * if (!hasAllFeatures) {
 *   return <UpgradePrompt features={missingFeatures} />;
 * }
 * ```
 */
export function useMultipleFeatures(
  featureKeys: FeatureKey[]
): UseMultipleFeaturesResult {
  const context = useFeatureContext();

  return useMemo(() => {
    const features: Record<string, boolean> = {};
    const missingFeatures: FeatureKey[] = [];

    for (const key of featureKeys) {
      const hasIt = context.hasFeature(key);
      features[key] = hasIt;
      if (!hasIt) {
        missingFeatures.push(key);
      }
    }

    return {
      features,
      hasAllFeatures: missingFeatures.length === 0,
      hasAnyFeature: featureKeys.some((key) => features[key]),
      missingFeatures,
      isLoading: context.isLoading,
      error: context.error,
      refresh: context.refresh,
    };
  }, [context, featureKeys]);
}

/**
 * Hook to get all available features (for debugging/admin)
 *
 * @returns All features with their states
 */
export function useAllFeatures() {
  const context = useFeatureContext();

  return useMemo(
    () => ({
      features: context.features,
      plan: context.plan,
      isLoading: context.isLoading,
      error: context.error,
      hasLoadedFeatures: context.hasLoadedFeatures,
      refresh: context.refresh,
    }),
    [context]
  );
}

/**
 * Hook to safely use features (doesn't throw if outside provider)
 *
 * @param featureKey - The feature key to check
 * @returns Feature status or defaults if outside provider
 *
 * @example
 * ```tsx
 * // Safe to use in components that may be outside FeatureProvider
 * const { hasFeature, isReady } = useFeatureSafe('module_waiter_call');
 *
 * if (!isReady) {
 *   // Outside provider or still loading
 *   return <FallbackComponent />;
 * }
 * ```
 */
export function useFeatureSafe(featureKey: FeatureKey): UseFeatureResult & { isReady: boolean } {
  const context = useFeatureContextSafe();

  return useMemo(() => {
    if (!context) {
      return {
        hasFeature: false,
        isLoading: false,
        error: null,
        featureState: null,
        isOverride: false,
        planName: null,
        planSlug: null,
        refresh: async () => {},
        isReady: false,
      };
    }

    return {
      hasFeature: context.hasFeature(featureKey),
      isLoading: context.isLoading,
      error: context.error,
      featureState: context.getFeatureState(featureKey),
      isOverride: context.getFeatureState(featureKey)?.source === 'override',
      planName: context.plan?.name ?? null,
      planSlug: context.plan?.slug ?? null,
      refresh: context.refresh,
      isReady: !context.isLoading,
    };
  }, [context, featureKey]);
}

/**
 * Hook to check if user should see upgrade prompt
 *
 * Returns true if user is close to a limit or missing a feature
 *
 * @example
 * ```tsx
 * const { shouldShowUpgrade, upgradeReason } = useUpgradePrompt({
 *   checkFeature: 'module_waiter_call',
 *   checkLimit: 'limit_menu_items',
 *   currentCount: productCount,
 * });
 *
 * if (shouldShowUpgrade) {
 *   return <UpgradePrompt reason={upgradeReason} />;
 * }
 * ```
 */
export function useUpgradePrompt(options: {
  checkFeature?: FeatureKey;
  checkLimit?: FeatureKey;
  currentCount?: number;
}): {
  shouldShowUpgrade: boolean;
  upgradeReason: string | null;
  isLoading: boolean;
} {
  const context = useFeatureContext();

  return useMemo(() => {
    if (context.isLoading) {
      return {
        shouldShowUpgrade: false,
        upgradeReason: null,
        isLoading: true,
      };
    }

    // Check boolean feature
    if (options.checkFeature) {
      const hasIt = context.hasFeature(options.checkFeature);
      if (!hasIt) {
        const label = getFeatureLabel(options.checkFeature);
        return {
          shouldShowUpgrade: true,
          upgradeReason: `${label} özelliği mevcut paketinizde bulunmuyor.`,
          isLoading: false,
        };
      }
    }

    // Check limit feature
    if (options.checkLimit && options.currentCount !== undefined) {
      const limit = context.getLimit(options.checkLimit);

      // Not available
      if (limit === 0) {
        const label = getFeatureLabel(options.checkLimit);
        return {
          shouldShowUpgrade: true,
          upgradeReason: `${label} özelliği mevcut paketinizde bulunmuyor.`,
          isLoading: false,
        };
      }

      // Check if at/over limit
      if (limit > 0 && options.currentCount >= limit) {
        const label = getFeatureLabel(options.checkLimit);
        return {
          shouldShowUpgrade: true,
          upgradeReason: `${label} limitine ulaştınız (${options.currentCount}/${limit}).`,
          isLoading: false,
        };
      }

      // Check if approaching limit (>80%)
      if (limit > 0) {
        const usagePercent = Math.round((options.currentCount / limit) * 100);
        if (usagePercent >= 80) {
          const label = getFeatureLabel(options.checkLimit);
          const remaining = limit - options.currentCount;
          return {
            shouldShowUpgrade: true,
            upgradeReason: `${label} limitine yaklaşıyorsunuz (${remaining} kalan).`,
            isLoading: false,
          };
        }
      }
    }

    return {
      shouldShowUpgrade: false,
      upgradeReason: null,
      isLoading: false,
    };
  }, [context, options.checkFeature, options.checkLimit, options.currentCount]);
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export context hooks for convenience
export { useFeatureContext, useFeatureContextSafe } from '@/contexts/FeatureContext';
export type { FeatureState } from '@/contexts/FeatureContext';
