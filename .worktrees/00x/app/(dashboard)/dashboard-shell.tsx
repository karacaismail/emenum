/**
 * Dashboard Shell - Client-side Dashboard Layout Component
 *
 * Bu component dashboard layout'unun client-side kisimlarini icerir:
 * - Sidebar navigation (collapse/expand) - uses reusable Sidebar component
 * - Mobile hamburger menu
 * - User/organization display
 * - FeatureProvider integration
 * - Responsive design
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { FeatureProvider } from '@/contexts/FeatureContext';
import LogoutButton from '@/components/auth/LogoutButton';
import Sidebar from '@/components/dashboard/Sidebar';
import type { OrganizationData, UserData, MembershipData } from './layout';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardShellProps {
  children: React.ReactNode;
  user: UserData;
  organization: OrganizationData | null;
  membership: MembershipData | null;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

// =============================================================================
// HEADER COMPONENT
// =============================================================================

interface HeaderProps {
  onMenuClick: () => void;
  organization: OrganizationData | null;
}

function Header({ onMenuClick, organization }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2 text-gray-500 hover:text-gray-700 rounded-md"
        aria-label="Menuyu ac"
      >
        <Icons.Menu />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <rect x="7" y="7" width="4" height="4" fill="currentColor" />
              <rect x="13" y="7" width="4" height="4" fill="currentColor" />
              <rect x="7" y="13" width="4" height="4" fill="currentColor" />
              <rect x="13" y="13" width="4" height="4" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">
            {organization?.name || 'OzaMenu'}
          </span>
        </Link>
      </div>

      {/* Placeholder for right side - keeps logo centered */}
      <div className="w-10" />
    </header>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardShell({
  children,
  user,
  organization,
  membership,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <FeatureProvider organizationId={organization?.id ?? null}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar - uses reusable Sidebar component with LogoutButton */}
        <Sidebar
          user={user}
          organization={organization}
          membership={membership}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          footerContent={
            <LogoutButton showIcon className="w-full justify-center" variant="ghost" />
          }
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile header */}
          <Header onMenuClick={openSidebar} organization={organization} />

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="container-app py-6">
              {/* Organization pending warning */}
              {organization?.status === 'pending' && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-yellow-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Hesabiniz Onay Bekliyor
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        Isletmeniz henuz aktif edilmemis. Lutfen odeme islemini tamamlayin ve
                        aktivasyon icin bizimle iletisime gecin.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Organization suspended warning */}
              {organization?.status === 'suspended' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Hesabiniz Askiya Alindi
                      </h3>
                      <p className="mt-1 text-sm text-red-700">
                        Isletmeniz askiya alinmis durumda. Lutfen destek ekibiyle iletisime gecin.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No organization warning */}
              {!organization && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-blue-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Isletme Olusturun
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Baslamak icin bir isletme olusturmaniz gerekiyor. Kayit sirasinda isletme
                        olusturduysaniz, aktivasyon icin beklemeniz gerekebilir.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Page content */}
              {children}
            </div>
          </main>
        </div>
      </div>
    </FeatureProvider>
  );
}
