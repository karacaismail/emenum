'use client';

/**
 * Admin Shell - Super Admin Panel Client Component
 *
 * Super admin panelinin client-side shell'i.
 * - Sidebar navigation (admin-specific routes)
 * - Platform stats display
 * - Responsive design (mobil menu)
 * - Admin-specific branding (mor/koyu tema)
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoutButton from '@/components/auth/LogoutButton';
import type { AdminUserData, PlatformStats } from './layout';

interface AdminShellProps {
  user: AdminUserData;
  stats: PlatformStats;
  children: React.ReactNode;
}

/**
 * Admin navigation items
 */
interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

/**
 * Icons for admin navigation
 */
const Icons = {
  Dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Organizations: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Plans: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Features: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Audit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Menu: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

/**
 * Get admin navigation items with pending activation badge
 */
function getAdminNavItems(pendingCount: number): AdminNavItem[] {
  return [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: Icons.Dashboard,
    },
    {
      href: '/admin/organizations',
      label: 'Organizasyonlar',
      icon: Icons.Organizations,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      href: '/admin/plans',
      label: 'Paketler',
      icon: Icons.Plans,
    },
    {
      href: '/admin/features',
      label: 'Ozellikler',
      icon: Icons.Features,
    },
    {
      href: '/admin/users',
      label: 'Kullanicilar',
      icon: Icons.Users,
    },
    {
      href: '/admin/audit',
      label: 'Denetim Kayitlari',
      icon: Icons.Audit,
    },
    {
      href: '/admin/settings',
      label: 'Ayarlar',
      icon: Icons.Settings,
    },
  ];
}

/**
 * Admin navigation item component
 */
function NavItem({
  item,
  isActive,
}: {
  item: AdminNavItem;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
        ${
          isActive
            ? 'bg-purple-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }
      `}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Stats mini card for sidebar
 */
function StatsMiniCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    danger: 'bg-red-900/50 text-red-400',
  };

  return (
    <div className={`px-3 py-2 rounded-lg ${variantClasses[variant]}`}>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/**
 * Admin user section for sidebar
 */
function AdminUserSection({ user }: { user: AdminUserData }) {
  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex items-center gap-3">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.full_name || 'Admin'}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
            {(user.full_name || user.email || 'A').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {user.full_name || user.email}
          </div>
          <div className="flex items-center gap-1 text-xs text-purple-400">
            {Icons.Shield}
            <span>Super Admin</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <LogoutButton variant="ghost" className="w-full text-gray-400 hover:text-white hover:bg-gray-700" />
      </div>
    </div>
  );
}

export default function AdminShell({ user, stats, children }: AdminShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = getAdminNavItems(stats.pendingActivations);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile header */}
      <header className="lg:hidden bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            {Icons.Shield}
          </div>
          <span className="font-semibold text-white">Admin Panel</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white"
          aria-label={isMobileMenuOpen ? 'Menuyu kapat' : 'Menuyu ac'}
        >
          {isMobileMenuOpen ? Icons.Close : Icons.Menu}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gray-800 border-r border-gray-700">
          {/* Logo */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                {Icons.Shield}
              </div>
              <div>
                <div className="font-semibold text-white">OzaMenu</div>
                <div className="text-xs text-purple-400">Super Admin Panel</div>
              </div>
            </div>
          </div>

          {/* Stats overview */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Platform Durumu
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatsMiniCard label="Toplam Org." value={stats.totalOrganizations} />
              <StatsMiniCard label="Aktif" value={stats.activeOrganizations} variant="success" />
              <StatsMiniCard
                label="Bekleyen"
                value={stats.pendingActivations}
                variant={stats.pendingActivations > 0 ? 'warning' : 'default'}
              />
              <StatsMiniCard
                label="Askida"
                value={stats.suspendedOrganizations}
                variant={stats.suspendedOrganizations > 0 ? 'danger' : 'default'}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                />
              ))}
            </div>
          </nav>

          {/* User section */}
          <AdminUserSection user={user} />
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 z-50 overflow-y-auto">
              {/* Logo */}
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                    {Icons.Shield}
                  </div>
                  <div>
                    <div className="font-semibold text-white">OzaMenu</div>
                    <div className="text-xs text-purple-400">Super Admin</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-white"
                  aria-label="Menuyu kapat"
                >
                  {Icons.Close}
                </button>
              </div>

              {/* Stats overview */}
              <div className="p-4 border-b border-gray-700">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Platform Durumu
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatsMiniCard label="Toplam" value={stats.totalOrganizations} />
                  <StatsMiniCard label="Aktif" value={stats.activeOrganizations} variant="success" />
                  <StatsMiniCard
                    label="Bekleyen"
                    value={stats.pendingActivations}
                    variant={stats.pendingActivations > 0 ? 'warning' : 'default'}
                  />
                  <StatsMiniCard
                    label="Askida"
                    value={stats.suspendedOrganizations}
                    variant={stats.suspendedOrganizations > 0 ? 'danger' : 'default'}
                  />
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-4">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    />
                  ))}
                </div>
              </nav>

              {/* User section */}
              <AdminUserSection user={user} />
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          {/* Pending activations warning banner */}
          {stats.pendingActivations > 0 && (
            <div className="bg-yellow-900/50 border-b border-yellow-700 px-4 py-2 flex items-center gap-2 text-yellow-300 text-sm">
              {Icons.Warning}
              <span>
                <strong>{stats.pendingActivations}</strong> organizasyon aktivasyon bekliyor.
              </span>
              <Link
                href="/admin/organizations?status=pending"
                className="ml-auto text-yellow-400 hover:text-yellow-300 underline"
              >
                Goruntule
              </Link>
            </div>
          )}

          {/* Page content */}
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
