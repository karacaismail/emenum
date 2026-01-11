/**
 * Admin Feature Overrides Page
 *
 * Super Admin ozellik override yonetim sayfasi.
 * Organizasyonlara plandaki ozelliklerden bagimsiz olarak izin ver veya kapat.
 *
 * Icerdikleri:
 * - Override listesi (tum organizasyonlar ve ozellikler)
 * - Override ekleme/duzenleme
 * - Override silme
 * - Gecici override'lar (expires_at)
 */

import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import OverridesClient from './overrides-client';

export const metadata: Metadata = {
  title: 'Ozellik Override',
  description: 'Organizasyonlara ozel ozellik izinleri ver veya kaldir',
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

function OverridesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-56 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-12 bg-gray-700 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="h-6 w-48 bg-gray-700 rounded animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-700 flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-6 w-24 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// DATA TYPES
// =============================================================================

export interface FeatureOverrideWithDetails {
  id: string;
  organization_id: string;
  feature_key: string;
  override_value: boolean;
  override_limit: number | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  organization_name: string;
  organization_slug: string;
  organization_status: string;
  feature_name: string | null;
  feature_type: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
}

export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_name: string | null;
}

export interface FeatureOption {
  id: string;
  key: string;
  name: string;
  description: string | null;
  feature_type: 'boolean' | 'limit';
  category: string | null;
}

export interface OverridesStats {
  total_overrides: number;
  active_overrides: number;
  expired_overrides: number;
  orgs_with_overrides: number;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getOverridesData(): Promise<{
  overrides: FeatureOverrideWithDetails[];
  organizations: OrganizationOption[];
  features: FeatureOption[];
  stats: OverridesStats;
}> {
  const supabase = await createServerSupabaseClient();

  // Fetch all overrides with organization and creator info
  const { data: overrides, error: overridesError } = await supabase
    .from('organization_feature_overrides')
    .select(`
      id,
      organization_id,
      feature_key,
      override_value,
      override_limit,
      reason,
      created_by,
      created_at,
      expires_at,
      organizations!inner(
        name,
        slug,
        status
      ),
      users:created_by(
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false });

  if (overridesError) {
    console.error('Error fetching overrides:', overridesError);
    return {
      overrides: [],
      organizations: [],
      features: [],
      stats: { total_overrides: 0, active_overrides: 0, expired_overrides: 0, orgs_with_overrides: 0 },
    };
  }

  // Fetch all features for dropdown
  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('id, key, name, description, feature_type, category')
    .eq('is_active', true)
    .order('category')
    .order('sort_order');

  if (featuresError) {
    console.error('Error fetching features:', featuresError);
  }

  // Fetch all organizations for dropdown with their plan info
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      status,
      subscriptions(
        status,
        plans(name)
      )
    `)
    .order('name');

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError);
  }

  // Create feature key to name map
  const featureKeyMap: Record<string, { name: string; type: string }> = {};
  (features || []).forEach((f) => {
    featureKeyMap[f.key] = { name: f.name, type: f.feature_type };
  });

  // Process overrides data
  interface RawOverride {
    id: string;
    organization_id: string;
    feature_key: string;
    override_value: boolean;
    override_limit: number | null;
    reason: string | null;
    created_by: string | null;
    created_at: string;
    expires_at: string | null;
    organizations: { name: string; slug: string; status: string } | { name: string; slug: string; status: string }[] | null;
    users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
  }

  const processedOverrides: FeatureOverrideWithDetails[] = ((overrides as RawOverride[]) || []).map((o) => {
    const org = Array.isArray(o.organizations) ? o.organizations[0] : o.organizations;
    const user = Array.isArray(o.users) ? o.users[0] : o.users;
    const featureInfo = featureKeyMap[o.feature_key];

    return {
      id: o.id,
      organization_id: o.organization_id,
      feature_key: o.feature_key,
      override_value: o.override_value,
      override_limit: o.override_limit,
      reason: o.reason,
      created_by: o.created_by,
      created_at: o.created_at,
      expires_at: o.expires_at,
      organization_name: org?.name || 'Bilinmiyor',
      organization_slug: org?.slug || '',
      organization_status: org?.status || 'unknown',
      feature_name: featureInfo?.name || o.feature_key,
      feature_type: featureInfo?.type || 'boolean',
      created_by_email: user?.email || null,
      created_by_name: user?.full_name || null,
    };
  });

  // Process organizations data
  interface RawOrg {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptions: Array<{ status: string; plans: { name: string } | { name: string }[] | null }> | null;
  }

  const processedOrgs: OrganizationOption[] = ((organizations as RawOrg[]) || []).map((o) => {
    const activeSub = o.subscriptions?.find((s) => s.status === 'active' || s.status === 'past_due');
    const plan = activeSub?.plans;
    const planName = Array.isArray(plan) ? plan[0]?.name : plan?.name;

    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      plan_name: planName || null,
    };
  });

  // Calculate stats
  const now = new Date();
  const uniqueOrgs = new Set(processedOverrides.map((o) => o.organization_id));
  const activeOverrides = processedOverrides.filter(
    (o) => !o.expires_at || new Date(o.expires_at) > now
  );
  const expiredOverrides = processedOverrides.filter(
    (o) => o.expires_at && new Date(o.expires_at) <= now
  );

  const stats: OverridesStats = {
    total_overrides: processedOverrides.length,
    active_overrides: activeOverrides.length,
    expired_overrides: expiredOverrides.length,
    orgs_with_overrides: uniqueOrgs.size,
  };

  return {
    overrides: processedOverrides,
    organizations: processedOrgs,
    features: (features || []) as FeatureOption[],
    stats,
  };
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default async function AdminOverridesPage() {
  const { overrides, organizations, features, stats } = await getOverridesData();

  return (
    <Suspense fallback={<OverridesLoading />}>
      <OverridesClient
        initialOverrides={overrides}
        organizations={organizations}
        features={features}
        stats={stats}
      />
    </Suspense>
  );
}
