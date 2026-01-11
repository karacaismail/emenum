/**
 * Admin Organizations Page
 *
 * Super Admin organizasyon yonetim sayfasi.
 * Tum organizasyonlari listeler, arama, filtreleme ve manuel aktivasyon saglar.
 *
 * Icerdikleri:
 * - Organizasyon listesi (tum durumlar)
 * - Arama (isim, slug, email)
 * - Durum filtreleme (pending, active, suspended, cancelled)
 * - Paket filtreleme (Lite, Pro, Premium)
 * - Manuel aktivasyon toggle
 */

import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import OrganizationsClient from './organizations-client';

export const metadata: Metadata = {
  title: 'Organizasyonlar',
  description: 'Tum organizasyonlari yonet, aktif et veya askiya al',
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

function OrganizationsLoading() {
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

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 h-10 bg-gray-800 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-gray-800 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="h-6 w-48 bg-gray-700 rounded animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-700 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// DATA FETCHING
// =============================================================================

interface OrganizationWithOwner {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string | null;
  owner_name: string | null;
  owner_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number | null;
  description: string | null;
}

async function getOrganizationsData() {
  const supabase = await createServerSupabaseClient();

  // Fetch organizations with owner and subscription info
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      status,
      logo_url,
      email,
      phone,
      created_at,
      updated_at,
      organization_members!inner(
        user_id,
        role,
        users(id, email, full_name)
      ),
      subscriptions(
        id,
        status,
        plan_id,
        plans(id, name, slug)
      )
    `)
    .eq('organization_members.role', 'owner')
    .order('created_at', { ascending: false });

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError);
    return { organizations: [], plans: [], stats: { total: 0, active: 0, pending: 0, suspended: 0, cancelled: 0 } };
  }

  // Fetch available plans with pricing
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, name, slug, price_monthly, price_yearly, description')
    .eq('is_active', true)
    .order('sort_order');

  if (plansError) {
    console.error('Error fetching plans:', plansError);
  }

  // Process organizations data
  interface MemberData {
    user_id: string;
    role: string;
    users: Array<{ id: string; email: string; full_name: string | null }> | { id: string; email: string; full_name: string | null } | null;
  }

  interface SubscriptionData {
    id: string;
    status: string;
    plan_id: string;
    plans: Array<{ id: string; name: string; slug: string }> | { id: string; name: string; slug: string } | null;
  }

  const processedOrgs: OrganizationWithOwner[] = (organizations || []).map((org) => {
    const members = org.organization_members as MemberData[] | null;
    const firstMember = members?.[0];
    const usersData = firstMember?.users;
    const owner = Array.isArray(usersData) ? usersData[0] : usersData;

    const subs = org.subscriptions as SubscriptionData[] | null;
    const activeSub = subs?.find((s) => s.status === 'active') || subs?.[0];
    const plansData = activeSub?.plans;
    const plan = Array.isArray(plansData) ? plansData[0] : plansData;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status as 'pending' | 'active' | 'suspended' | 'cancelled',
      logo_url: org.logo_url,
      email: org.email,
      phone: org.phone,
      created_at: org.created_at,
      updated_at: org.updated_at,
      owner_email: owner?.email || null,
      owner_name: owner?.full_name || null,
      owner_id: owner?.id || null,
      plan_id: plan?.id || null,
      plan_name: plan?.name || null,
      subscription_status: activeSub?.status || null,
    };
  });

  // Calculate stats
  const stats = {
    total: processedOrgs.length,
    active: processedOrgs.filter((o) => o.status === 'active').length,
    pending: processedOrgs.filter((o) => o.status === 'pending').length,
    suspended: processedOrgs.filter((o) => o.status === 'suspended').length,
    cancelled: processedOrgs.filter((o) => o.status === 'cancelled').length,
  };

  const planOptions: PlanOption[] = (plans || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_monthly: p.price_monthly || 0,
    price_yearly: p.price_yearly || null,
    description: p.description || null,
  }));

  return { organizations: processedOrgs, plans: planOptions, stats };
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default async function AdminOrganizationsPage() {
  const { organizations, plans, stats } = await getOrganizationsData();

  return (
    <Suspense fallback={<OrganizationsLoading />}>
      <OrganizationsClient
        initialOrganizations={organizations}
        plans={plans}
        stats={stats}
      />
    </Suspense>
  );
}
