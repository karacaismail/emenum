/**
 * Feature Permission Guard
 *
 * Dinamik paket kontrolü için kullanılır.
 * ASLA hard-coded paket kontrolü yapılmaz (if package == 'Pro' YASAK).
 *
 * Kontrol sırası:
 * 1. organization_feature_overrides tablosu kontrol edilir
 * 2. Override yoksa, plan_features tablosu kontrol edilir
 *
 * @example
 * ```ts
 * // Server Component veya Route Handler içinde
 * import { hasPermission, getFeatureLimit } from '@/lib/guards/permission';
 *
 * // Boolean özellik kontrolü
 * if (await hasPermission(orgId, 'module_waiter_call')) {
 *   // Garson çağırma özelliği aktif
 * }
 *
 * // Limit kontrolü
 * const maxProducts = await getFeatureLimit(orgId, 'limit_menu_items');
 * if (maxProducts === -1 || currentCount < maxProducts) {
 *   // Yeni ürün eklenebilir
 * }
 * ```
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { FeatureKey, FeatureCheckResult, UUID } from '@/types';

// Type definitions for Supabase query results
interface PlanFeatureResult {
  feature: { key: string } | null;
  value_boolean: boolean | null;
  value_limit: number | null;
}

interface PlanWithFeatures {
  plan_features: PlanFeatureResult[];
}

interface SubscriptionWithPlan {
  expires_at: string | null;
  status?: string;
  plan: PlanWithFeatures;
}

/**
 * Check if an organization has permission for a specific feature.
 *
 * This function follows the override-first pattern:
 * 1. First checks organization_feature_overrides (custom grants/revokes)
 * 2. If no override, checks plan_features from active subscription
 *
 * CRITICAL: NO hard-coded package checks (e.g., if (plan === 'Pro') is FORBIDDEN)
 *
 * @param organizationId - The organization UUID to check permission for
 * @param featureKey - The feature key to check (e.g., 'module_waiter_call')
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
export async function hasPermission(
  organizationId: UUID,
  featureKey: FeatureKey
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  // 1. Check organization_feature_overrides first (highest priority)
  const { data: override, error: overrideError } = await supabase
    .from('organization_feature_overrides')
    .select('override_value, expires_at')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .maybeSingle();

  if (overrideError) {
    // Log error but continue to plan check
    console.error('Error checking feature override:', overrideError);
  }

  // If override exists and is not expired, use its value
  if (override) {
    const isExpired = override.expires_at
      ? new Date(override.expires_at) < new Date()
      : false;

    if (!isExpired) {
      return override.override_value;
    }
  }

  // 2. No override found - check plan features from active subscription
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select(`
      expires_at,
      plan:plans!inner(
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
    console.error('Error checking subscription features:', subscriptionError);
    return false;
  }

  // No active subscription = no features
  if (!subscription) {
    return false;
  }

  // Check subscription expiry
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
    return false;
  }

  // Cast to expected type and handle array/object ambiguity
  const typedSub = subscription as unknown as SubscriptionWithPlan;
  const plan = typedSub.plan;

  if (!plan || !plan.plan_features) {
    return false;
  }

  // Find the specific feature in plan_features
  const feature = plan.plan_features.find(
    (pf) => pf.feature?.key === featureKey
  );

  // Feature not in plan = no permission
  if (!feature) {
    return false;
  }

  // Return value_boolean (default to false if null)
  return feature.value_boolean ?? false;
}

/**
 * Get the numeric limit for a feature.
 *
 * @param organizationId - The organization UUID
 * @param featureKey - The feature key (e.g., 'limit_menu_items')
 * @returns Promise<number> - The limit value (-1 = unlimited, 0 = not allowed)
 */
export async function getFeatureLimit(
  organizationId: UUID,
  featureKey: FeatureKey
): Promise<number> {
  const supabase = await createServerSupabaseClient();

  // 1. Check override first
  const { data: override } = await supabase
    .from('organization_feature_overrides')
    .select('override_limit, expires_at')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .maybeSingle();

  // If override exists, not expired, and has a limit value
  if (override?.override_limit !== null && override?.override_limit !== undefined) {
    const isExpired = override.expires_at
      ? new Date(override.expires_at) < new Date()
      : false;

    if (!isExpired) {
      return override.override_limit;
    }
  }

  // 2. Check plan features
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      expires_at,
      plan:plans!inner(
        plan_features(
          feature:features!inner(key),
          value_limit
        )
      )
    `)
    .eq('organization_id', organizationId)
    .in('status', ['active', 'past_due'])
    .maybeSingle();

  // No subscription = 0 (no access)
  if (!subscription) {
    return 0;
  }

  // Expired subscription = 0
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
    return 0;
  }

  // Cast to expected type
  const typedSub = subscription as unknown as SubscriptionWithPlan;
  const plan = typedSub.plan;

  if (!plan || !plan.plan_features) {
    return 0;
  }

  // Find the feature
  const feature = plan.plan_features.find(
    (pf) => pf.feature?.key === featureKey
  );

  // Feature not found = 0
  if (!feature) {
    return 0;
  }

  // null value_limit = unlimited (-1)
  return feature.value_limit ?? -1;
}

/**
 * Get detailed feature check result with reason.
 *
 * This is useful for showing upsell prompts with proper context.
 *
 * @param organizationId - The organization UUID
 * @param featureKey - The feature key to check
 * @returns Promise<FeatureCheckResult> - Detailed check result
 */
export async function checkFeature(
  organizationId: UUID,
  featureKey: FeatureKey
): Promise<FeatureCheckResult> {
  const supabase = await createServerSupabaseClient();

  // 1. Check override first
  const { data: override } = await supabase
    .from('organization_feature_overrides')
    .select('override_value, override_limit, expires_at')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .maybeSingle();

  if (override) {
    const isExpired = override.expires_at
      ? new Date(override.expires_at) < new Date()
      : false;

    if (!isExpired) {
      return {
        allowed: override.override_value,
        reason: 'override',
        limit: override.override_limit ?? undefined,
      };
    }
  }

  // 2. Check subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      expires_at,
      status,
      plan:plans!inner(
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

  // No subscription
  if (!subscription) {
    return {
      allowed: false,
      reason: 'no_subscription',
    };
  }

  // Expired subscription
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
    return {
      allowed: false,
      reason: 'expired',
    };
  }

  // Cast to expected type
  const typedSub = subscription as unknown as SubscriptionWithPlan;
  const plan = typedSub.plan;

  if (!plan || !plan.plan_features) {
    return {
      allowed: false,
      reason: 'no_subscription',
    };
  }

  // Find feature
  const feature = plan.plan_features.find(
    (pf) => pf.feature?.key === featureKey
  );

  if (!feature) {
    return {
      allowed: false,
      reason: 'plan_feature',
    };
  }

  return {
    allowed: feature.value_boolean ?? false,
    reason: 'plan_feature',
    limit: feature.value_limit ?? undefined,
  };
}

/**
 * Get all features for an organization (for client-side caching).
 *
 * Returns a map of feature keys to their values/limits.
 * Useful for loading all features at once instead of individual checks.
 *
 * @param organizationId - The organization UUID
 * @returns Promise<Map<string, { enabled: boolean; limit: number | null }>>
 */
export async function getAllFeatures(
  organizationId: UUID
): Promise<Map<string, { enabled: boolean; limit: number | null }>> {
  const supabase = await createServerSupabaseClient();
  const featuresMap = new Map<string, { enabled: boolean; limit: number | null }>();

  // 1. Get all features from the plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      expires_at,
      plan:plans!inner(
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

  // Check expiry
  if (subscription?.expires_at && new Date(subscription.expires_at) < new Date()) {
    return featuresMap; // Return empty map for expired subscription
  }

  // Cast and get plan features
  if (subscription) {
    const typedSub = subscription as unknown as SubscriptionWithPlan;
    const plan = typedSub.plan;

    // Add plan features to map
    if (plan?.plan_features) {
      for (const pf of plan.plan_features) {
        if (pf.feature?.key) {
          featuresMap.set(pf.feature.key, {
            enabled: pf.value_boolean ?? false,
            limit: pf.value_limit,
          });
        }
      }
    }
  }

  // 2. Apply overrides (overrides take precedence)
  const { data: overrides } = await supabase
    .from('organization_feature_overrides')
    .select('feature_key, override_value, override_limit, expires_at')
    .eq('organization_id', organizationId);

  if (overrides) {
    for (const override of overrides) {
      // Skip expired overrides
      if (override.expires_at && new Date(override.expires_at) < new Date()) {
        continue;
      }

      // Get existing feature or create new entry
      const existing = featuresMap.get(override.feature_key) || {
        enabled: false,
        limit: null,
      };

      // Apply override
      featuresMap.set(override.feature_key, {
        enabled: override.override_value,
        limit: override.override_limit ?? existing.limit,
      });
    }
  }

  return featuresMap;
}

/**
 * Check if current usage is within the feature limit.
 *
 * @param organizationId - The organization UUID
 * @param featureKey - The feature key (e.g., 'limit_menu_items')
 * @param currentUsage - The current usage count
 * @returns Promise<{ allowed: boolean; limit: number; remaining: number }>
 */
export async function checkUsageLimit(
  organizationId: UUID,
  featureKey: FeatureKey,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const limit = await getFeatureLimit(organizationId, featureKey);

  // -1 = unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      remaining: -1, // Infinite
    };
  }

  // 0 = feature not available
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
    };
  }

  const remaining = limit - currentUsage;

  return {
    allowed: remaining > 0,
    limit,
    remaining: Math.max(0, remaining),
  };
}
