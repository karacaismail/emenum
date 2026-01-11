'use client';

/**
 * Organizations Client Component
 *
 * Admin organizasyon yonetimi icin client-side interactive component.
 * - Arama ve filtreleme
 * - Durum degistirme (aktivasyon, askiya alma)
 * - Detay goruntusu
 * - Pagination
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ActivationModal, { type OrganizationDetails, type PlanOption as ActivationPlanOption } from '@/components/admin/ActivationModal';

// =============================================================================
// TYPES
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

interface OrganizationsClientProps {
  initialOrganizations: OrganizationWithOwner[];
  plans: PlanOption[];
  stats: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    cancelled: number;
  };
}

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'cancelled';

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  MoreVertical: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Spinner: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// =============================================================================
// STATUS CONFIG
// =============================================================================

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: {
    label: 'Beklemede',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/50',
    border: 'border-yellow-700/50',
  },
  active: {
    label: 'Aktif',
    color: 'text-green-400',
    bg: 'bg-green-900/50',
    border: 'border-green-700/50',
  },
  suspended: {
    label: 'Askida',
    color: 'text-red-400',
    bg: 'bg-red-900/50',
    border: 'border-red-700/50',
  },
  cancelled: {
    label: 'Iptal',
    color: 'text-gray-400',
    bg: 'bg-gray-800',
    border: 'border-gray-700',
  },
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: number;
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, isActive, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-lg border text-left transition-all
        ${isActive
          ? 'bg-purple-900/50 border-purple-500 ring-2 ring-purple-500/50'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </button>
  );
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const defaultConfig = {
    label: 'Bilinmiyor',
    color: 'text-gray-400',
    bg: 'bg-gray-800',
    border: 'border-gray-700',
  };
  const config = statusConfig[status] ?? defaultConfig;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
      {config.label}
    </span>
  );
}

// =============================================================================
// PLAN BADGE COMPONENT
// =============================================================================

function PlanBadge({ planName }: { planName: string | null }) {
  if (!planName) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
        Plan Yok
      </span>
    );
  }

  const planColors: Record<string, string> = {
    Lite: 'bg-gray-700 text-gray-300 border-gray-600',
    Pro: 'bg-purple-900/50 text-purple-400 border-purple-700/50',
    Premium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50',
  };

  const colorClass = planColors[planName] || planColors.Lite;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} border`}>
      {planName}
    </span>
  );
}

// =============================================================================
// ORGANIZATION ROW COMPONENT
// =============================================================================

interface OrganizationRowProps {
  org: OrganizationWithOwner;
  onStatusChange: (orgId: string, newStatus: 'active' | 'suspended') => void;
  onOpenActivation: (org: OrganizationWithOwner) => void;
  isUpdating: boolean;
}

function OrganizationRow({ org, onStatusChange, onOpenActivation, isUpdating }: OrganizationRowProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
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
    if (diffDays < 30) return `${diffDays} gun once`;
    return formatDate(dateStr);
  };

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
      {/* Organization Info */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {org.logo_url ? (
            <Image
              src={org.logo_url}
              alt={org.name}
              width={40}
              height={40}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 font-medium">
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-white truncate">{org.name}</div>
            <div className="text-sm text-gray-400 truncate">/{org.slug}</div>
          </div>
        </div>
      </td>

      {/* Owner Info */}
      <td className="px-4 py-4">
        <div className="text-sm">
          <div className="text-white truncate">{org.owner_name || 'Bilinmiyor'}</div>
          <div className="text-gray-400 truncate">{org.owner_email || '-'}</div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <StatusBadge status={org.status} />
      </td>

      {/* Plan */}
      <td className="px-4 py-4">
        <PlanBadge planName={org.plan_name} />
      </td>

      {/* Created At */}
      <td className="px-4 py-4 text-sm text-gray-400">
        <div>{formatDate(org.created_at)}</div>
        <div className="text-xs text-gray-500">{getTimeAgo(org.created_at)}</div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 justify-end relative">
          {/* Quick action buttons based on status */}
          {org.status === 'pending' && (
            <button
              onClick={() => onOpenActivation(org)}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              title="Aktif Et"
            >
              {isUpdating ? <Icons.Spinner /> : <Icons.Check />}
              Aktif Et
            </button>
          )}

          {org.status === 'active' && (
            <button
              onClick={() => onStatusChange(org.id, 'suspended')}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              title="Askiya Al"
            >
              {isUpdating ? <Icons.Spinner /> : <Icons.Pause />}
              Askiya Al
            </button>
          )}

          {org.status === 'suspended' && (
            <button
              onClick={() => onStatusChange(org.id, 'active')}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              title="Yeniden Aktif Et"
            >
              {isUpdating ? <Icons.Spinner /> : <Icons.Play />}
              Aktif Et
            </button>
          )}

          {/* More actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Diger islemler"
            >
              <Icons.MoreVertical />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                  <Link
                    href={`/menu/${org.slug}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <Icons.ExternalLink />
                    Menuyu Gor
                  </Link>
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Detaylari Gor
                  </Link>
                  {org.email && (
                    <a
                      href={`mailto:${org.email}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      E-posta Gonder
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={6} className="px-4 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-gray-400">{message}</p>
      </td>
    </tr>
  );
}

// =============================================================================
// PAGINATION COMPONENT
// =============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-700">
      <div className="text-sm text-gray-400">
        <span className="font-medium text-white">{totalItems}</span> kayittan{' '}
        <span className="font-medium text-white">{startItem}-{endItem}</span> gosteriliyor
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Onceki sayfa"
        >
          <Icons.ChevronLeft />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first, last, current, and adjacent pages
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`
                    min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors
                    ${currentPage === page
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }
                  `}
                >
                  {page}
                </button>
              );
            }
            // Show ellipsis for gaps
            if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 text-gray-500">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Sonraki sayfa"
        >
          <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CLIENT COMPONENT
// =============================================================================

const ITEMS_PER_PAGE = 10;

export default function OrganizationsClient({
  initialOrganizations,
  plans,
  stats,
}: OrganizationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial filters from URL
  const initialStatus = (searchParams.get('status') as StatusFilter) || 'all';
  const initialPlan = searchParams.get('plan') || 'all';
  const initialSearch = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  // State
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [planFilter, setPlanFilter] = useState(initialPlan);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Activation Modal state
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [selectedOrgForActivation, setSelectedOrgForActivation] = useState<OrganizationDetails | null>(null);

  // Convert plans to ActivationModal format
  const activationPlans: ActivationPlanOption[] = useMemo(() => {
    return plans.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      description: p.description,
    }));
  }, [plans]);

  // Filter and search organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // Status filter
      if (statusFilter !== 'all' && org.status !== statusFilter) {
        return false;
      }

      // Plan filter
      if (planFilter !== 'all') {
        if (planFilter === 'no_plan' && org.plan_name !== null) {
          return false;
        }
        if (planFilter !== 'no_plan' && org.plan_name !== planFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = org.name.toLowerCase().includes(query);
        const matchesSlug = org.slug.toLowerCase().includes(query);
        const matchesEmail = org.email?.toLowerCase().includes(query) || false;
        const matchesOwnerEmail = org.owner_email?.toLowerCase().includes(query) || false;
        const matchesOwnerName = org.owner_name?.toLowerCase().includes(query) || false;

        if (!matchesName && !matchesSlug && !matchesEmail && !matchesOwnerEmail && !matchesOwnerName) {
          return false;
        }
      }

      return true;
    });
  }, [organizations, statusFilter, planFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE);
  const paginatedOrganizations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrganizations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrganizations, currentPage]);

  // Update URL with filters
  const updateURL = useCallback((newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '1') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const queryString = params.toString();
    router.push(`/admin/organizations${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router, searchParams]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1);
    updateURL({ q: value, page: '1' });
  };

  // Handle status filter
  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
    updateURL({ status, page: '1' });
  };

  // Handle plan filter
  const handlePlanFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setPlanFilter(value);
    setCurrentPage(1);
    updateURL({ plan: value, page: '1' });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page: page.toString() });
  };

  // Handle status change (activate/suspend)
  const handleStatusChange = async (orgId: string, newStatus: 'active' | 'suspended') => {
    setUpdatingOrgId(orgId);

    try {
      const supabase = createClient();

      // Update organization status
      const { error } = await supabase
        .from('organizations')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId);

      if (error) {
        throw error;
      }

      // If activating, also update subscription if exists
      if (newStatus === 'active') {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('organization_id', orgId)
          .single();

        if (existingSub && existingSub.status === 'pending') {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);
        }
      }

      // Update local state
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId
            ? { ...org, status: newStatus, subscription_status: newStatus === 'active' ? 'active' : org.subscription_status }
            : org
        )
      );

      // Show success message (could use toast here)
      alert(newStatus === 'active' ? 'Organizasyon aktif edildi!' : 'Organizasyon askiya alindi.');
    } catch (error) {
      console.error('Error updating organization status:', error);
      alert('Bir hata olustu. Lutfen tekrar deneyin.');
    } finally {
      setUpdatingOrgId(null);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    // Add a small delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Open activation modal for pending organizations
  const handleOpenActivationModal = useCallback((org: OrganizationWithOwner) => {
    // Convert to OrganizationDetails format for the modal
    const orgDetails: OrganizationDetails = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      logo_url: org.logo_url,
      email: org.email,
      phone: org.phone,
      address: null,
      website: null,
      created_at: org.created_at,
      owner_id: org.owner_id,
      owner_email: org.owner_email,
      owner_name: org.owner_name,
    };
    setSelectedOrgForActivation(orgDetails);
    setActivationModalOpen(true);
  }, []);

  // Handle activation completion
  const handleActivationComplete = useCallback((organizationId: string) => {
    // Update local state to reflect the activation
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === organizationId
          ? { ...org, status: 'active' as const, subscription_status: 'active' }
          : org
      )
    );
    // Refresh to get updated data
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizasyonlar</h1>
          <p className="text-gray-400 mt-1">
            Tum organizasyonlari yonetin ve aktivasyonlari onaylayin
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {isRefreshing ? <Icons.Spinner /> : <Icons.Refresh />}
          Yenile
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard
          label="Toplam"
          value={stats.total}
          isActive={statusFilter === 'all'}
          onClick={() => handleStatusFilter('all')}
        />
        <StatCard
          label="Beklemede"
          value={stats.pending}
          isActive={statusFilter === 'pending'}
          onClick={() => handleStatusFilter('pending')}
        />
        <StatCard
          label="Aktif"
          value={stats.active}
          isActive={statusFilter === 'active'}
          onClick={() => handleStatusFilter('active')}
        />
        <StatCard
          label="Askida"
          value={stats.suspended}
          isActive={statusFilter === 'suspended'}
          onClick={() => handleStatusFilter('suspended')}
        />
        <StatCard
          label="Iptal"
          value={stats.cancelled}
          isActive={statusFilter === 'cancelled'}
          onClick={() => handleStatusFilter('cancelled')}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="Organizasyon adi, slug, email ile ara..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Plan Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icons.Filter />
          </div>
          <select
            value={planFilter}
            onChange={handlePlanFilter}
            className="pl-10 pr-8 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">Tum Paketler</option>
            <option value="no_plan">Plan Yok</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.name}>
                {plan.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {(searchQuery || statusFilter !== 'all' || planFilter !== 'all') && (
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-gray-400">
            <span className="font-medium text-white">{filteredOrganizations.length}</span> sonuc bulundu
            {searchQuery && <span> &quot;{searchQuery}&quot; icin</span>}
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setPlanFilter('all');
              setCurrentPage(1);
              router.push('/admin/organizations');
            }}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Organizasyon
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sahip
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Paket
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Olusturulma
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Islemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedOrganizations.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                      ? 'Aramaniza uygun organizasyon bulunamadi.'
                      : 'Henuz organizasyon bulunmuyor.'
                  }
                />
              ) : (
                paginatedOrganizations.map((org) => (
                  <OrganizationRow
                    key={org.id}
                    org={org}
                    onStatusChange={handleStatusChange}
                    onOpenActivation={handleOpenActivationModal}
                    isUpdating={updatingOrgId === org.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredOrganizations.length > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrganizations.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Activation Modal */}
      {selectedOrgForActivation && (
        <ActivationModal
          isOpen={activationModalOpen}
          onClose={() => {
            setActivationModalOpen(false);
            setSelectedOrgForActivation(null);
          }}
          organization={selectedOrgForActivation}
          plans={activationPlans}
          onActivationComplete={handleActivationComplete}
        />
      )}
    </div>
  );
}
