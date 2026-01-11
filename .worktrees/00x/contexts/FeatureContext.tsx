/**
 * Feature Context Provider
 *
 * Client-side caching for organization features.
 * Provides FeatureProvider component and useFeatureContext hook.
 *
 * Bu context, organization features'larını client tarafında cache'ler ve
 * component'lar arası paylaşım sağlar. Server-side permission.ts ile
 * senkronize çalışır.
 *
 * @example
 * ```tsx
 * // 1. Layout'a FeatureProvider ekle
 * import { FeatureProvider } from '@/contexts/FeatureContext';
 *
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <FeatureProvider organizationId={orgId}>
 *       {children}
 *     </FeatureProvider>
 *   );
 * }
 *
 * // 2. Component'ta useFeatureContext kullan
 * import { useFeatureContext } from '@/contexts/FeatureContext';
 *
 * export function MyComponent() {
 *   const { hasFeature, getLimit, isLoading } = useFeatureContext();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (hasFeature('module_waiter_call')) {
 *     return <WaiterCallButton />;
 *   }
 *
 *   return <UpgradePrompt feature="module_waiter_call" />;
 * }
 * ```
 */
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FeatureKey, UUID, Plan } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Individual feature state
 */
export interface FeatureState {
  /** Whether the feature is enabled (for boolean features) */
  enabled: boolean;
  /** Numeric limit (for limit features). null = unlimited, 0 = not available */
  limit: number | null;
  /** Source of the feature value */
  source: 'plan' | 'override';
}

/**
 * Features map type
 */
export type FeaturesMap = Map<string, FeatureState>;

/**
 * Plan information from subscription
 */
export interface PlanInfo {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
}

/**
 * Feature context value
 */
export interface FeatureContextValue {
  /** Map of all features keyed by feature key */
  features: FeaturesMap;
  /** Current plan information */
  plan: PlanInfo | null;
  /** Whether features are currently loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh features from server */
  refresh: () => Promise<void>;
  /** Check if organization has a boolean feature */
  hasFeature: (featureKey: FeatureKey) => boolean;
  /** Get numeric limit for a feature (-1 = unlimited, 0 = not available) */
  getLimit: (featureKey: FeatureKey) => number;
  /** Get full feature state for a feature key */
  getFeatureState: (featureKey: FeatureKey) => FeatureState | null;
  /** Check if any features are loaded */
  hasLoadedFeatures: boolean;
  /** Organization ID this context is for */
  organizationId: UUID | null;
}

/**
 * Feature provider props
 */
export interface FeatureProviderProps {
  children: ReactNode;
  /** Organization ID to fetch features for */
  organizationId: UUID | null;
  /** Initial features from server (optional, for SSR) */
  initialFeatures?: Map<string, { enabled: boolean; limit: number | null }>;
  /** Initial plan info from server (optional, for SSR) */
  initialPlan?: PlanInfo | null;
}

// =============================================================================
// CONTEXT
// =============================================================================

const FeatureContext = createContext<FeatureContextValue | null>(null);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Default feature state when feature is not found
 */
const DEFAULT_FEATURE_STATE: FeatureState = {
  enabled: false,
  limit: 0,
  source: 'plan',
};

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * Feature Provider Component
 *
 * Wraps children with feature context. Fetches and caches organization features.
 *
 * @param organizationId - Organization UUID to fetch features for
 * @param initialFeatures - Optional pre-fetched features (for SSR)
 * @param initialPlan - Optional pre-fetched plan info (for SSR)
 */
export function FeatureProvider({
  children,
  organizationId,
  initialFeatures,
  initialPlan,
}: FeatureProviderProps) {
  // Convert initial features Map to internal format
  const getInitialFeaturesMap = (): FeaturesMap => {
    const map = new Map<string, FeatureState>();
    if (initialFeatures) {
      initialFeatures.forEach((value, key) => {
        map.set(key, {
          enabled: value.enabled,
          limit: value.limit,
          source: 'plan', // Initial features are from plan
        });
      });
    }
    return map;
  };

  const [features, setFeatures] = useState<FeaturesMap>(getInitialFeaturesMap);
  const [plan, setPlan] = useState<PlanInfo | null>(initialPlan ?? null);
  const [isLoading, setIsLoading] = useState(!initialFeatures);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all features for the organization
   */
  const fetchFeatures = useCallback(async () => {
    if (!organizationId) {
      setFeatures(new Map());
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const newFeaturesMap = new Map<string, FeatureState>();

      // 1. Fetch active subscription with plan features
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          expires_at,
          status,
          plan:plans!inner(
            id,
            name,
            slug,
            description,
            plan_features(
              feature:features!inner(key),
              value_boolean,
              value_limit
            )
          )
        `)
        .eq('organization_id', organizationId)
        .in('status', ['active', 'past_due'])
        .maybeSingle();

      if (subscriptionError) {
        throw new Error(`Abonelik yüklenirken hata: ${subscriptionError.message}`);
      }

      // Check if subscription exists and is not expired
      if (subscription?.expires_at && new Date(subscription.expires_at) < new Date()) {
        // Expired subscription - no features
        setFeatures(new Map());
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Extract plan info
      if (subscription?.plan) {
        // Handle the plan response type
        const planData = subscription.plan as unknown as {
          id: UUID;
          name: string;
          slug: string;
          description: string | null;
          plan_features: Array<{
            feature: { key: string } | null;
            value_boolean: boolean | null;
            value_limit: number | null;
          }>;
        };

        setPlan({
          id: planData.id,
          name: planData.name,
          slug: planData.slug,
          description: planData.description,
        });

        // Add plan features to map
        if (planData.plan_features) {
          for (const pf of planData.plan_features) {
            if (pf.feature?.key) {
              newFeaturesMap.set(pf.feature.key, {
                enabled: pf.value_boolean ?? false,
                limit: pf.value_limit,
                source: 'plan',
              });
            }
          }
        }
      } else {
        setPlan(null);
      }

      // 2. Fetch and apply overrides (overrides take precedence)
      const { data: overrides, error: overridesError } = await supabase
        .from('organization_feature_overrides')
        .select('feature_key, override_value, override_limit, expires_at')
        .eq('organization_id', organizationId);

      if (overridesError) {
        // Log but don't fail - overrides are optional
        console.warn('Override yüklenirken hata:', overridesError.message);
      }

      // Apply overrides
      if (overrides) {
        for (const override of overrides) {
          // Skip expired overrides
          if (override.expires_at && new Date(override.expires_at) < new Date()) {
            continue;
          }

          // Get existing feature or create new entry
          const existing = newFeaturesMap.get(override.feature_key);

          newFeaturesMap.set(override.feature_key, {
            enabled: override.override_value,
            limit: override.override_limit ?? existing?.limit ?? null,
            source: 'override',
          });
        }
      }

      setFeatures(newFeaturesMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
      console.error('Feature yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Fetch features on mount and when organizationId changes
  useEffect(() => {
    // Skip if we have initial features (SSR)
    if (initialFeatures && features.size > 0 && !error) {
      return;
    }

    fetchFeatures();
  }, [fetchFeatures, initialFeatures, features.size, error]);

  /**
   * Check if organization has a boolean feature enabled
   */
  const hasFeature = useCallback(
    (featureKey: FeatureKey): boolean => {
      const feature = features.get(featureKey);
      return feature?.enabled ?? false;
    },
    [features]
  );

  /**
   * Get numeric limit for a feature
   *
   * @returns -1 for unlimited, 0 for not available, >0 for specific limit
   */
  const getLimit = useCallback(
    (featureKey: FeatureKey): number => {
      const feature = features.get(featureKey);

      if (!feature) {
        return 0; // Feature not found = not available
      }

      // If feature is not enabled at all
      if (!feature.enabled && feature.limit === null) {
        return 0;
      }

      // null limit = unlimited
      if (feature.limit === null) {
        return -1;
      }

      return feature.limit;
    },
    [features]
  );

  /**
   * Get full feature state
   */
  const getFeatureState = useCallback(
    (featureKey: FeatureKey): FeatureState | null => {
      return features.get(featureKey) ?? null;
    },
    [features]
  );

  /**
   * Refresh features from server
   */
  const refresh = useCallback(async () => {
    await fetchFeatures();
  }, [fetchFeatures]);

  // Memoize context value
  const contextValue = useMemo<FeatureContextValue>(
    () => ({
      features,
      plan,
      isLoading,
      error,
      refresh,
      hasFeature,
      getLimit,
      getFeatureState,
      hasLoadedFeatures: features.size > 0,
      organizationId,
    }),
    [
      features,
      plan,
      isLoading,
      error,
      refresh,
      hasFeature,
      getLimit,
      getFeatureState,
      organizationId,
    ]
  );

  return (
    <FeatureContext.Provider value={contextValue}>
      {children}
    </FeatureContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access the feature context
 *
 * @throws Error if used outside of FeatureProvider
 */
export function useFeatureContext(): FeatureContextValue {
  const context = useContext(FeatureContext);

  if (!context) {
    throw new Error(
      'useFeatureContext must be used within a FeatureProvider. ' +
        'Make sure your component is wrapped with <FeatureProvider>.'
    );
  }

  return context;
}

/**
 * Hook to safely access feature context (returns null if not available)
 *
 * Useful for components that may be used both inside and outside FeatureProvider
 */
export function useFeatureContextSafe(): FeatureContextValue | null {
  return useContext(FeatureContext);
}
