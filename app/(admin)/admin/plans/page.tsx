/**
 * Admin Plans Page
 *
 * Super Admin paket yonetim sayfasi.
 * Paket olusturma/duzenleme, ozellik atama ve limit ayarlama.
 *
 * Icerdikleri:
 * - Paket listesi (Lite, Pro, Premium)
 * - Paket ekleme/duzenleme
 * - Ozellik atama (plan_features)
 * - Limit ayarlama (value_limit)
 */

import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import PlansClient from './plans-client';

export const metadata: Metadata = {
  title: 'Paketler',
  description: 'Abonelik paketlerini yonet, ozellik atamalarini duzenle',
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

function PlansLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-12 bg-gray-700 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Plans grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="h-6 w-24 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-32 bg-gray-700 rounded mt-4 animate-pulse" />
            <div className="space-y-3 mt-6">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-4 w-full bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// DATA TYPES
// =============================================================================

export interface PlanWithFeatures {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  is_featured: boolean;
  badge_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  features: PlanFeatureMapping[];
  subscription_count: number;
}

export interface PlanFeatureMapping {
  id: string;
  plan_id: string;
  feature_id: string;
  value_boolean: boolean | null;
  value_limit: number | null;
  feature: FeatureData;
}

export interface FeatureData {
  id: string;
  key: string;
  name: string;
  description: string | null;
  feature_type: 'boolean' | 'limit';
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PlansStats {
  total_plans: number;
  active_plans: number;
  total_features: number;
  total_subscriptions: number;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getPlansData(): Promise<{
  plans: PlanWithFeatures[];
  features: FeatureData[];
  stats: PlansStats;
}> {
  const supabase = await createServerSupabaseClient();

  // Fetch plans with their feature mappings
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select(`
      id,
      name,
      slug,
      description,
      price_monthly,
      price_yearly,
      currency,
      is_featured,
      badge_text,
      is_active,
      sort_order,
      created_at,
      updated_at,
      plan_features(
        id,
        plan_id,
        feature_id,
        value_boolean,
        value_limit,
        features(
          id,
          key,
          name,
          description,
          feature_type,
          category,
          is_active,
          sort_order
        )
      )
    `)
    .order('sort_order');

  if (plansError) {
    console.error('Error fetching plans:', plansError);
    return {
      plans: [],
      features: [],
      stats: { total_plans: 0, active_plans: 0, total_features: 0, total_subscriptions: 0 },
    };
  }

  // Fetch all features for the feature assignment dropdown
  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('id, key, name, description, feature_type, category, is_active, sort_order')
    .order('category')
    .order('sort_order');

  if (featuresError) {
    console.error('Error fetching features:', featuresError);
  }

  // Fetch subscription counts per plan
  const { data: subscriptionCounts, error: subError } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .in('status', ['active', 'past_due']);

  if (subError) {
    console.error('Error fetching subscription counts:', subError);
  }

  // Count subscriptions per plan
  const subCountMap: Record<string, number> = {};
  (subscriptionCounts || []).forEach((sub) => {
    const planId = sub.plan_id as string;
    subCountMap[planId] = (subCountMap[planId] || 0) + 1;
  });

  // Process plans data
  interface RawPlanFeature {
    id: string;
    plan_id: string;
    feature_id: string;
    value_boolean: boolean | null;
    value_limit: number | null;
    features: FeatureData | FeatureData[] | null;
  }

  const processedPlans: PlanWithFeatures[] = (plans || []).map((plan) => {
    const planFeatures = (plan.plan_features as RawPlanFeature[] | null) || [];
    const features: PlanFeatureMapping[] = planFeatures.map((pf) => {
      const featureData = Array.isArray(pf.features) ? pf.features[0] : pf.features;
      return {
        id: pf.id,
        plan_id: pf.plan_id,
        feature_id: pf.feature_id,
        value_boolean: pf.value_boolean,
        value_limit: pf.value_limit,
        feature: featureData as FeatureData,
      };
    }).filter((pf) => pf.feature);

    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currency: plan.currency,
      is_featured: plan.is_featured,
      badge_text: plan.badge_text,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      features,
      subscription_count: subCountMap[plan.id] || 0,
    };
  });

  // Calculate stats
  const stats: PlansStats = {
    total_plans: processedPlans.length,
    active_plans: processedPlans.filter((p) => p.is_active).length,
    total_features: (features || []).length,
    total_subscriptions: Object.values(subCountMap).reduce((a, b) => a + b, 0),
  };

  return {
    plans: processedPlans,
    features: (features || []) as FeatureData[],
    stats,
  };
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default async function AdminPlansPage() {
  const { plans, features, stats } = await getPlansData();

  return (
    <Suspense fallback={<PlansLoading />}>
      <PlansClient
        initialPlans={plans}
        allFeatures={features}
        stats={stats}
      />
    </Suspense>
  );
}
