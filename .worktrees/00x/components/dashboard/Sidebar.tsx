/**
 * Sidebar Component - Reusable Dashboard Navigation
 *
 * Bu component, dashboard layout icin yeniden kullanilabilir sidebar navigasyonu saglar.
 * - Navigation items: Dashboard, Products, Categories, Tables, Settings
 * - Role-based visibility (RBAC)
 * - Feature-gated items shown as locked (not hidden)
 * - Mobile responsive with overlay
 * - Organization and user info display
 *
 * Feature-gated items are shown in a "locked" state with a lock icon
 * instead of being hidden, allowing users to see what features are
 * available in higher plans.
 *
 * @example
 * ```tsx
 * <Sidebar
 *   user={user}
 *   organization={organization}
 *   membership={membership}
 *   isOpen={sidebarOpen}
 *   onClose={closeSidebar}
 * />
 * ```
 */
'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useFeatureContextSafe } from '@/contexts/FeatureContext';
import type { FeatureKey } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Organization data structure
 */
export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
}

/**
 * User data structure
 */
export interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
}

/**
 * Membership data structure
 */
export interface MembershipData {
  role: 'owner' | 'admin' | 'manager' | 'waiter' | 'viewer';
}

/**
 * Navigation item structure
 */
export interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  /** Feature key required to access this item - shown as locked if not available */
  featureKey?: FeatureKey;
  /** Minimum role required to access this item - hidden if not met */
  minRole?: 'owner' | 'admin' | 'manager' | 'waiter' | 'viewer';
  /** Description shown in tooltip when locked */
  lockedDescription?: string;
}

/**
 * Props for the Sidebar component
 */
export interface SidebarProps {
  /** Current user data */
  user: UserData;
  /** Organization data (null if user has no organization) */
  organization: OrganizationData | null;
  /** Membership data (null if user has no membership) */
  membership: MembershipData | null;
  /** Whether sidebar is open (for mobile) */
  isOpen: boolean;
  /** Callback to close sidebar */
  onClose: () => void;
  /** Optional custom navigation items (overrides defaults) */
  customNavItems?: NavItem[];
  /** Optional footer content */
  footerContent?: React.ReactNode;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Role hierarchy for permission checking
 * Higher number = higher permission level
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  waiter: 2,
  viewer: 1,
};

/**
 * Turkish labels for roles
 */
const ROLE_LABELS: Record<string, string> = {
  owner: 'Sahip',
  admin: 'Yonetici',
  manager: 'Mudur',
  waiter: 'Garson',
  viewer: 'Izleyici',
};

/**
 * Turkish labels for organization status
 */
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  pending: 'Beklemede',
  suspended: 'Askiya Alinmis',
  cancelled: 'Iptal',
};

/**
 * Status badge colors
 */
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has minimum required role
 */
export function hasMinRole(userRole: string | undefined, minRole: string): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return userLevel >= requiredLevel;
}

// =============================================================================
// ICONS
// =============================================================================

export const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Products: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Categories: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Tables: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  Waiter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Audit: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Close: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Sparkle: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  QR: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="7" y="7" width="4" height="4" fill="currentColor" />
      <rect x="13" y="7" width="4" height="4" fill="currentColor" />
      <rect x="7" y="13" width="4" height="4" fill="currentColor" />
      <rect x="13" y="13" width="4" height="4" fill="currentColor" />
    </svg>
  ),
};

// =============================================================================
// DEFAULT NAVIGATION ITEMS
// =============================================================================

/**
 * Get default navigation items for merchant dashboard
 * Items with featureKey will show as locked if feature is not available
 */
export function getDefaultNavItems(): NavItem[] {
  return [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <Icons.Dashboard />,
    },
    {
      name: 'Urunler',
      href: '/products',
      icon: <Icons.Products />,
      minRole: 'viewer',
    },
    {
      name: 'Kategoriler',
      href: '/categories',
      icon: <Icons.Categories />,
      minRole: 'manager',
    },
    {
      name: 'Masalar',
      href: '/tables',
      icon: <Icons.Tables />,
      featureKey: 'module_table_management',
      lockedDescription: 'Masa yonetimi Pro pakette mevcut',
      minRole: 'manager',
    },
    {
      name: 'Garson Paneli',
      href: '/waiter',
      icon: <Icons.Waiter />,
      featureKey: 'module_waiter_call',
      lockedDescription: 'Garson cagir ozelligi Pro pakette mevcut',
      minRole: 'waiter',
    },
    {
      name: 'Denetim Kaydi',
      href: '/audit',
      icon: <Icons.Audit />,
      featureKey: 'module_audit_log',
      lockedDescription: 'Denetim gunlugu Premium pakette mevcut',
      minRole: 'admin',
    },
    {
      name: 'Ayarlar',
      href: '/settings',
      icon: <Icons.Settings />,
      minRole: 'admin',
    },
  ];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Organization info display in sidebar
 */
function OrganizationInfo({ organization }: { organization: OrganizationData }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        {organization.logo_url ? (
          <Image
            src={organization.logo_url}
            alt={organization.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-cover"
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-lg font-medium text-gray-500">
              {organization.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {organization.name}
          </p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[organization.status] || ''}`}>
            {STATUS_LABELS[organization.status] || organization.status}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * User section display in sidebar
 */
function UserSection({
  user,
  membership,
  children,
}: {
  user: UserData;
  membership: MembershipData | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-center space-x-3 mb-3">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.full_name || user.email}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.full_name || 'Kullanici'}
          </p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
      </div>

      {/* Role badges */}
      {membership && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {ROLE_LABELS[membership.role] || membership.role}
          </span>
          {user.is_super_admin && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
              Super Admin
            </span>
          )}
        </div>
      )}

      {/* Footer content (e.g., logout button) */}
      {children}
    </div>
  );
}

/**
 * Navigation item component - handles active state and locked state
 */
function NavItemComponent({
  item,
  isActive,
  isLocked,
  onClose,
}: {
  item: NavItem;
  isActive: boolean;
  isLocked: boolean;
  onClose: () => void;
}) {
  // Locked item - show as locked with lock icon
  if (isLocked) {
    return (
      <div
        className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-not-allowed opacity-60 text-gray-500 bg-gray-50"
        title={item.lockedDescription || `${item.name} - Paket yukseltmesi gerekli`}
      >
        <span className="mr-3 text-gray-400">
          {item.icon}
        </span>
        <span className="flex-1">{item.name}</span>
        <span className="ml-auto flex items-center gap-1 text-amber-600">
          <Icons.Lock />
          <span className="text-xs hidden sm:inline">Pro</span>
        </span>
      </div>
    );
  }

  // Regular clickable item
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`
        group flex items-center px-3 py-2 text-sm font-medium rounded-lg
        transition-colors duration-150
        ${isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
    >
      <span className={`mr-3 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
        {item.icon}
      </span>
      <span className="flex-1">{item.name}</span>
      {item.badge && (
        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Sidebar Component
 *
 * Reusable dashboard sidebar navigation with:
 * - Nav items: Dashboard, Products, Categories, Tables, Settings
 * - Feature-gated items shown as locked (not hidden)
 * - Role-based visibility
 * - Mobile responsive
 */
export default function Sidebar({
  user,
  organization,
  membership,
  isOpen,
  onClose,
  customNavItems,
  footerContent,
  className = '',
}: SidebarProps) {
  const pathname = usePathname();
  const featureContext = useFeatureContextSafe();

  // Get navigation items
  const navItems = useMemo(
    () => customNavItems || getDefaultNavItems(),
    [customNavItems]
  );

  /**
   * Check if nav item should be visible based on role
   * Items are hidden if user doesn't have minimum role
   */
  const isItemVisible = useCallback(
    (item: NavItem): boolean => {
      if (item.minRole && !hasMinRole(membership?.role, item.minRole)) {
        return false;
      }
      return true;
    },
    [membership?.role]
  );

  /**
   * Check if nav item is locked based on feature key
   * Items are locked (shown but disabled) if feature is not available
   */
  const isItemLocked = useCallback(
    (item: NavItem): boolean => {
      if (!item.featureKey) return false;
      if (!featureContext) return false; // Outside provider = not locked
      return !featureContext.hasFeature(item.featureKey);
    },
    [featureContext]
  );

  /**
   * Check if current path matches nav item
   */
  const isActive = useCallback(
    (href: string): boolean => {
      if (href === '/dashboard') {
        return pathname === '/dashboard';
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center space-x-2">
              {/* Logo */}
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600">
                <Icons.QR />
              </div>
              <span className="font-semibold text-gray-900">OzaMenu</span>
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 rounded-md"
              aria-label="Menuyu kapat"
            >
              <Icons.Close />
            </button>
          </div>

          {/* Organization info */}
          {organization && <OrganizationInfo organization={organization} />}

          {/* No organization warning */}
          {!organization && (
            <div className="px-4 py-3 border-b border-gray-200 bg-yellow-50">
              <p className="text-sm text-yellow-800">
                Henuz bir isletmeniz yok. Lutfen bir isletme olusturun.
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const visible = isItemVisible(item);
              const locked = isItemLocked(item);
              const active = isActive(item.href);

              // Hidden items (role-based) - don't render at all
              if (!visible) {
                return null;
              }

              return (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  isActive={active}
                  isLocked={locked}
                  onClose={onClose}
                />
              );
            })}

            {/* Menu Preview Link */}
            {organization && (
              <a
                href={`/menu/${organization.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 mt-4 border-t border-gray-200 pt-4"
              >
                <span className="mr-3 text-gray-400 group-hover:text-gray-500">
                  <Icons.ExternalLink />
                </span>
                <span className="flex-1">Menuyu Goruntule</span>
              </a>
            )}
          </nav>

          {/* User section */}
          <UserSection user={user} membership={membership}>
            {footerContent}
          </UserSection>
        </div>
      </aside>
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  OrganizationInfo,
  UserSection,
  NavItemComponent,
};
