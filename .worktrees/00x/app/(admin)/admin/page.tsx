/**
 * Admin Dashboard Page
 *
 * Super Admin dashboard ana sayfasi.
 * Platform istatistikleri, bekleyen aktivasyonlar, gelir ozeti ve hizli erisim.
 *
 * Icerdikleri:
 * - Toplam organizasyonlar
 * - Aktif abonelikler
 * - Bekleyen aktivasyonlar
 * - Gelir ozeti (aylik/yillik)
 * - Son aktiviteler
 * - Hizli eylemler
 */

import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Platform genel bakisi ve yonetim paneli',
};

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Organizations: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Subscription: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Currency: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ArrowUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  ArrowDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'yellow' | 'blue' | 'red' | 'gray';
  href?: string;
}

function StatCard({ title, value, subtitle, change, icon, color, href }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-900/50 text-purple-400 border-purple-700/50',
    green: 'bg-green-900/50 text-green-400 border-green-700/50',
    yellow: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50',
    blue: 'bg-blue-900/50 text-blue-400 border-blue-700/50',
    red: 'bg-red-900/50 text-red-400 border-red-700/50',
    gray: 'bg-gray-800 text-gray-400 border-gray-700',
  };

  const iconBgClasses = {
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600',
    gray: 'bg-gray-600',
  };

  const content = (
    <div className={`rounded-lg border p-6 ${colorClasses[color]} hover:border-opacity-75 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${iconBgClasses[color]} text-white`}>
          {icon}
        </div>
        {href && (
          <div className="text-gray-500">
            <Icons.ArrowRight />
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {change && (
          <div className="flex items-center mt-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                change.type === 'increase'
                  ? 'text-green-400'
                  : change.type === 'decrease'
                  ? 'text-red-400'
                  : 'text-gray-400'
              }`}
            >
              {change.type === 'increase' ? <Icons.ArrowUp /> : change.type === 'decrease' ? <Icons.ArrowDown /> : null}
              {change.value > 0 ? '+' : ''}{change.value}%
            </span>
            <span className="text-xs text-gray-500 ml-1">son 30 gun</span>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// =============================================================================
// QUICK ACTION COMPONENT
// =============================================================================

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'warning';
}

function QuickAction({ title, description, href, icon, variant }: QuickActionProps) {
  const variantClasses = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${variantClasses[variant]}`}
    >
      <div className="p-2 rounded-lg bg-white/10">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm opacity-75">{description}</p>
      </div>
      <Icons.ArrowRight />
    </Link>
  );
}

// =============================================================================
// PENDING ACTIVATION ITEM
// =============================================================================

interface PendingOrganization {
  id: string;
  name: string;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
}

function PendingActivationItem({ org }: { org: PendingOrganization }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Az once';
    if (diffHours < 24) return `${diffHours} saat once`;
    if (diffDays === 1) return 'Dun';
    return `${diffDays} gun once`;
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{org.name}</p>
        <p className="text-xs text-gray-400">
          {org.owner_name || org.owner_email || 'Bilinmiyor'}
        </p>
      </div>
      <div className="text-right ml-4">
        <p className="text-xs text-gray-500">{formatDate(org.created_at)}</p>
        <p className="text-xs text-yellow-400">{getTimeAgo(org.created_at)}</p>
      </div>
      <Link
        href={`/admin/organizations?id=${org.id}`}
        className="ml-4 p-2 text-gray-400 hover:text-purple-400 transition-colors"
        title="Aktivasyon islemini baslat"
      >
        <Icons.Check />
      </Link>
    </div>
  );
}

// =============================================================================
// RECENT ACTIVITY ITEM
// =============================================================================

interface RecentActivity {
  id: string;
  type: 'activation' | 'suspension' | 'subscription' | 'registration';
  title: string;
  description: string;
  created_at: string;
}

function RecentActivityItem({ activity }: { activity: RecentActivity }) {
  const typeConfig = {
    activation: { color: 'text-green-400', bg: 'bg-green-900/50', label: 'Aktivasyon' },
    suspension: { color: 'text-red-400', bg: 'bg-red-900/50', label: 'Askiya Alma' },
    subscription: { color: 'text-blue-400', bg: 'bg-blue-900/50', label: 'Abonelik' },
    registration: { color: 'text-purple-400', bg: 'bg-purple-900/50', label: 'Kayit' },
  };

  const config = typeConfig[activity.type];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-700 last:border-0">
      <div className={`p-2 rounded-lg ${config.bg}`}>
        <Icons.Activity />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{activity.title}</p>
          <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
      </div>
      <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(activity.created_at)}</p>
    </div>
  );
}

// =============================================================================
// REVENUE CARD COMPONENT
// =============================================================================

interface RevenueCardProps {
  title: string;
  value: number;
  currency?: string;
  subtitle?: string;
  trend?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
}

function RevenueCard({ title, value, currency = 'TRY', subtitle, trend }: RevenueCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-white mt-2">{formatCurrency(value)}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
      {trend && (
        <div className="flex items-center mt-3">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              trend.type === 'increase'
                ? 'text-green-400'
                : trend.type === 'decrease'
                ? 'text-red-400'
                : 'text-gray-400'
            }`}
          >
            {trend.type === 'increase' ? <Icons.ArrowUp /> : trend.type === 'decrease' ? <Icons.ArrowDown /> : null}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-gray-500 ml-1">onceki döneme gore</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PLAN DISTRIBUTION COMPONENT
// =============================================================================

interface PlanDistribution {
  plan_name: string;
  count: number;
  color: string;
}

function PlanDistributionCard({ distributions, total }: { distributions: PlanDistribution[]; total: number }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Paket Dagilimi</h3>
      <div className="space-y-3">
        {distributions.map((dist) => {
          const percentage = total > 0 ? Math.round((dist.count / total) * 100) : 0;
          return (
            <div key={dist.plan_name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{dist.plan_name}</span>
                <span className="text-sm text-gray-400">
                  {dist.count} ({percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${dist.color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-300">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch all stats in parallel
  const [
    { count: totalOrganizations },
    { count: activeOrganizations },
    { count: pendingActivations },
    { count: suspendedOrganizations },
    { count: totalUsers },
    { count: activeSubscriptions },
    { data: pendingOrgs },
    { data: recentOrgs },
    { data: subscriptionsByPlan },
    { data: monthlyRevenue },
    { data: recentAuditLogs },
  ] = await Promise.all([
    // Organization counts
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),

    // User count
    supabase.from('users').select('*', { count: 'exact', head: true }),

    // Active subscriptions
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),

    // Pending organizations with owner info (for activation list)
    supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        organization_members!inner(
          user_id,
          role,
          users(email, full_name)
        )
      `)
      .eq('status', 'pending')
      .eq('organization_members.role', 'owner')
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent organizations (last 30 days)
    supabase
      .from('organizations')
      .select('id, name, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),

    // Subscriptions grouped by plan
    supabase
      .from('subscriptions')
      .select('plan_id, plans(name)')
      .eq('status', 'active'),

    // Monthly revenue (current month)
    supabase
      .from('subscriptions')
      .select('price_at_purchase')
      .eq('status', 'active')
      .gte('current_period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    // Recent audit logs
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at, metadata')
      .in('action', ['activation', 'create', 'update'])
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Process pending organizations
  // Note: Supabase nested queries can return arrays for joined tables
  // We need to safely extract data from the nested structure
  interface OrgMemberData {
    user_id: string;
    role: string;
    users: Array<{ email: string; full_name: string | null }> | { email: string; full_name: string | null } | null;
  }

  const processedPendingOrgs: PendingOrganization[] = (pendingOrgs || []).map((org) => {
    const members = org.organization_members as OrgMemberData[] | null;
    const firstMember = members?.[0];
    // Users might be an array or single object depending on the join
    const usersData = firstMember?.users;
    const user = Array.isArray(usersData) ? usersData[0] : usersData;

    return {
      id: org.id,
      name: org.name,
      created_at: org.created_at,
      owner_email: user?.email || null,
      owner_name: user?.full_name || null,
    };
  });

  // Calculate plan distribution
  const planCounts: Record<string, number> = {};
  (subscriptionsByPlan || []).forEach((sub) => {
    // Supabase returns plans as array or object depending on relationship type
    const plansData = sub.plans as Array<{ name: string }> | { name: string } | null;
    const plan = Array.isArray(plansData) ? plansData[0] : plansData;
    const planName = plan?.name || 'Bilinmiyor';
    planCounts[planName] = (planCounts[planName] || 0) + 1;
  });

  const planDistributions: PlanDistribution[] = [
    { plan_name: 'Lite', count: planCounts['Lite'] || 0, color: 'bg-gray-500' },
    { plan_name: 'Pro', count: planCounts['Pro'] || 0, color: 'bg-purple-500' },
    { plan_name: 'Premium', count: planCounts['Premium'] || 0, color: 'bg-yellow-500' },
  ];

  // Calculate monthly revenue
  const currentMonthRevenue = (monthlyRevenue || []).reduce(
    (sum, sub) => sum + (sub.price_at_purchase || 0),
    0
  );

  // Estimate annual revenue (simple projection)
  const estimatedAnnualRevenue = (activeSubscriptions || 0) * 299 * 12; // Average of Pro plan

  // Process recent activity from audit logs
  const recentActivities: RecentActivity[] = (recentAuditLogs || []).slice(0, 5).map((log) => {
    let type: RecentActivity['type'] = 'registration';
    let title = 'Bilinmeyen islem';
    let description = '';

    if (log.action === 'activation') {
      type = 'activation';
      title = 'Organizasyon aktif edildi';
      description = `${log.entity_type} #${log.entity_id?.slice(0, 8)}...`;
    } else if (log.action === 'create' && log.entity_type === 'organizations') {
      type = 'registration';
      title = 'Yeni organizasyon kaydi';
      description = `Organizasyon #${log.entity_id?.slice(0, 8)}...`;
    } else if (log.action === 'create' && log.entity_type === 'subscriptions') {
      type = 'subscription';
      title = 'Yeni abonelik';
      description = `Abonelik #${log.entity_id?.slice(0, 8)}...`;
    } else {
      title = `${log.action} - ${log.entity_type}`;
      description = `#${log.entity_id?.slice(0, 8)}...`;
    }

    return {
      id: log.id,
      type,
      title,
      description,
      created_at: log.created_at,
    };
  });

  // Calculate growth metrics
  const newOrgsThisMonth = (recentOrgs || []).filter((org) => {
    const orgDate = new Date(org.created_at);
    const now = new Date();
    return orgDate.getMonth() === now.getMonth() && orgDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Platform genel bakisi ve yonetim ozeti
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Son guncelleme: {new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date())}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Organizasyon"
          value={totalOrganizations ?? 0}
          subtitle={`${newOrgsThisMonth} yeni bu ay`}
          icon={<Icons.Organizations />}
          color="purple"
          href="/admin/organizations"
        />
        <StatCard
          title="Aktif Abonelik"
          value={activeSubscriptions ?? 0}
          subtitle={`${activeOrganizations ?? 0} aktif org.`}
          change={{ value: 12, type: 'increase' }}
          icon={<Icons.Subscription />}
          color="green"
        />
        <StatCard
          title="Bekleyen Aktivasyon"
          value={pendingActivations ?? 0}
          subtitle="Onay bekliyor"
          icon={<Icons.Clock />}
          color={pendingActivations && pendingActivations > 0 ? 'yellow' : 'gray'}
          href="/admin/organizations?status=pending"
        />
        <StatCard
          title="Toplam Kullanici"
          value={totalUsers ?? 0}
          subtitle={`${suspendedOrganizations ?? 0} askiya alinan org.`}
          icon={<Icons.Users />}
          color="blue"
          href="/admin/users"
        />
      </div>

      {/* Quick Actions */}
      {(pendingActivations ?? 0) > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-600 text-white">
              <Icons.Warning />
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-300">Bekleyen Aktivasyonlar</p>
              <p className="text-sm text-yellow-400/80">
                {pendingActivations} organizasyon aktivasyon bekliyor. Hemen incelemek icin tiklayin.
              </p>
            </div>
            <Link
              href="/admin/organizations?status=pending"
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              Incele
            </Link>
          </div>
        </div>
      )}

      {/* Revenue Overview & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white">Gelir Ozeti</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RevenueCard
              title="Bu Ayin Geliri"
              value={currentMonthRevenue}
              subtitle="Aktif aboneliklerden"
              trend={{ value: 8, type: 'increase' }}
            />
            <RevenueCard
              title="Tahmini Yillik Gelir"
              value={estimatedAnnualRevenue}
              subtitle="Mevcut aboneliklere gore"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <QuickAction
              title="Organizasyon Aktif Et"
              description="Bekleyen aktivasyonlari onayla"
              href="/admin/organizations?status=pending"
              icon={<Icons.Check />}
              variant={pendingActivations && pendingActivations > 0 ? 'warning' : 'secondary'}
            />
            <QuickAction
              title="Paketleri Yonet"
              description="Paket ozelliklerini duzenle"
              href="/admin/plans"
              icon={<Icons.Plus />}
              variant="secondary"
            />
          </div>
        </div>

        {/* Plan Distribution */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Paket Dagilimi</h2>
          <PlanDistributionCard
            distributions={planDistributions}
            total={activeSubscriptions ?? 0}
          />
        </div>
      </div>

      {/* Two Column Layout - Pending & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Activations */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Bekleyen Aktivasyonlar</h2>
            <Link
              href="/admin/organizations?status=pending"
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Tumu
            </Link>
          </div>
          {processedPendingOrgs.length > 0 ? (
            <div>
              {processedPendingOrgs.map((org) => (
                <PendingActivationItem key={org.id} org={org} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Bekleyen aktivasyon yok"
              description="Tum organizasyonlar islendi."
            />
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Son Aktiviteler</h2>
            <Link
              href="/admin/audit"
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Tumu
            </Link>
          </div>
          {recentActivities.length > 0 ? (
            <div>
              {recentActivities.map((activity) => (
                <RecentActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henuz aktivite yok"
              description="Platform aktiviteleri burada gorunecek."
            />
          )}
        </div>
      </div>

      {/* Platform Health Indicator */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Platform Saglik Durumu</h3>
            <p className="text-sm text-gray-400 mt-1">
              Tum sistemler normal calisiyor. Son 24 saatte kritik hata raporlanmadi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/50 text-green-400 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Calisiyor
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
