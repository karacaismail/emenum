/**
 * MenuLayout Component
 *
 * Mobile-first menu layout wrapper that provides consistent structure
 * for public menu pages. Includes organization branding (logo, cover image),
 * sticky header support, smooth scroll navigation, and responsive design.
 *
 * Features:
 * - Organization logo display (top 20% cover area)
 * - Background color customization
 * - Sticky header support
 * - Smooth scroll to category sections
 * - Mobile-first responsive design
 * - Table context display
 * - Contact information section
 * - Footer with OzaMenu branding
 */

'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

export interface OrganizationBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  backgroundColor: string | null;
  phone: string | null;
  address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  website: string | null;
}

export interface MenuLayoutProps {
  /** Organization branding information */
  organization: OrganizationBranding;
  /** Table ID from QR code scan (optional) */
  tableId?: string | null;
  /** Children elements (main content) */
  children: ReactNode;
  /** Category navigation component (optional) */
  categoryNav?: ReactNode;
  /** Whether to show contact info section */
  showContactInfo?: boolean;
  /** Whether to show footer */
  showFooter?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Callback when user scrolls to a category */
  onCategoryInView?: (categoryId: string | null) => void;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Phone: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  ),
  Location: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Instagram: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  Facebook: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  Twitter: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  ),
  Table: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ),
};

// =============================================================================
// MENU HEADER COMPONENT
// =============================================================================

interface MenuHeaderProps {
  organization: OrganizationBranding;
  tableId?: string | null;
}

export function MenuHeader({ organization, tableId }: MenuHeaderProps) {
  const hasCoverImage = !!organization.coverImageUrl;
  const backgroundColor = organization.backgroundColor || '#ffffff';

  return (
    <header className="relative">
      {/* Cover Image (top 20% of page) - Mobile first */}
      {hasCoverImage ? (
        <div className="relative h-[20vh] min-h-[120px] max-h-[200px] w-full">
          <Image
            src={organization.coverImageUrl!}
            alt={`${organization.name} kapak`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      ) : (
        <div
          className="h-[15vh] min-h-[100px] max-h-[150px] w-full"
          style={{ backgroundColor }}
        />
      )}

      {/* Organization Info - Positioned over cover image */}
      <div className="relative px-4 pb-4 -mt-12 safe-bottom">
        <div className="flex items-end gap-3 sm:gap-4">
          {/* Logo - Responsive sizing */}
          {organization.logoUrl ? (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white shadow-lg overflow-hidden border-4 border-white flex-shrink-0">
              <Image
                src={organization.logoUrl}
                alt={`${organization.name} logo`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 80px, 96px"
              />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white flex-shrink-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-400">
                {organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name and Table Info */}
          <div className="pb-1 sm:pb-2 min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {organization.name}
            </h1>
            {tableId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                <Icons.Table />
                <span>Masa {tableId}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// CONTACT INFO COMPONENT
// =============================================================================

interface ContactInfoProps {
  organization: OrganizationBranding;
}

export function ContactInfo({ organization }: ContactInfoProps) {
  const hasContactInfo =
    organization.phone ||
    organization.address ||
    organization.instagram_url ||
    organization.facebook_url ||
    organization.twitter_url ||
    organization.website;

  if (!hasContactInfo) return null;

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="sr-only">Iletisim Bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Phone */}
          {organization.phone && (
            <a
              href={`tel:${organization.phone}`}
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              <div className="p-2 rounded-full bg-green-100 text-green-600 flex-shrink-0">
                <Icons.Phone />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {organization.phone}
                </p>
              </div>
            </a>
          )}

          {/* Address */}
          {organization.address && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                <Icons.Location />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Adres</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {organization.address}
                </p>
              </div>
            </div>
          )}

          {/* Website */}
          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              <div className="p-2 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                <Icons.Globe />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Web Sitesi</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {organization.website.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </a>
          )}

          {/* Social Media */}
          {(organization.instagram_url ||
            organization.facebook_url ||
            organization.twitter_url) && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600 flex-shrink-0">
                <Icons.Instagram />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Sosyal Medya</p>
                <div className="flex items-center gap-2">
                  {organization.instagram_url && (
                    <a
                      href={organization.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:opacity-80 active:scale-95 transition-all"
                      aria-label="Instagram"
                    >
                      <Icons.Instagram />
                    </a>
                  )}
                  {organization.facebook_url && (
                    <a
                      href={organization.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-blue-600 text-white hover:opacity-80 active:scale-95 transition-all"
                      aria-label="Facebook"
                    >
                      <Icons.Facebook />
                    </a>
                  )}
                  {organization.twitter_url && (
                    <a
                      href={organization.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-black text-white hover:opacity-80 active:scale-95 transition-all"
                      aria-label="Twitter/X"
                    >
                      <Icons.Twitter />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MENU FOOTER COMPONENT
// =============================================================================

export function MenuFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6 sm:py-8 safe-bottom">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-sm">
          Powered by{' '}
          <Link
            href="/"
            className="text-primary-400 hover:text-primary-300 font-medium"
          >
            OzaMenu
          </Link>
        </p>
        <p className="text-xs mt-2">
          Dijital Menu ve Fiyat Defteri Cozumu
        </p>
      </div>
    </footer>
  );
}

// =============================================================================
// EMPTY MENU STATE
// =============================================================================

interface EmptyMenuStateProps {
  organizationName: string;
}

export function EmptyMenuState({ organizationName }: EmptyMenuStateProps) {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
        Menu Hazirlaniyor
      </h2>
      <p className="text-sm sm:text-base text-gray-600">
        {organizationName} menusunde henuz urun bulunmuyor. Lutfen daha sonra
        tekrar deneyin.
      </p>
    </div>
  );
}

// =============================================================================
// NOT FOUND STATE
// =============================================================================

export function MenuNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 safe-top safe-bottom">
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-red-500"
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
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          Menu Bulunamadi
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Aradiginiz menu mevcut degil veya aktif degil. Lutfen QR kodu tekrar
          tarayin veya isletme ile iletisime gecin.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// SCROLL OBSERVER HOOK
// =============================================================================

interface UseScrollObserverOptions {
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Root margin for early triggering */
  rootMargin?: string;
  /** Callback when category comes into view */
  onCategoryInView?: (categoryId: string | null) => void;
}

export function useScrollObserver(options: UseScrollObserverOptions = {}) {
  const {
    threshold = 0.3,
    rootMargin = '-20% 0px -60% 0px',
    onCategoryInView,
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback(
    (element: HTMLElement | null) => {
      if (!element || typeof IntersectionObserver === 'undefined') return;

      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Create new observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && onCategoryInView) {
              const categoryId = entry.target.getAttribute('data-category-id');
              onCategoryInView(categoryId);
            }
          });
        },
        { threshold, rootMargin }
      );

      // Observe all category sections
      const sections = element.querySelectorAll('[data-category-id]');
      sections.forEach((section) => {
        observerRef.current?.observe(section);
      });
    },
    [threshold, rootMargin, onCategoryInView]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { observe };
}

// =============================================================================
// MAIN MENU LAYOUT COMPONENT
// =============================================================================

export function MenuLayout({
  organization,
  tableId,
  children,
  categoryNav,
  showContactInfo = true,
  showFooter = true,
  className = '',
  onCategoryInView,
}: MenuLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for sticky header effects
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Set up scroll observer for category tracking
  const { observe } = useScrollObserver({ onCategoryInView });

  useEffect(() => {
    if (mainRef.current && onCategoryInView) {
      observe(mainRef.current);
    }
  }, [observe, onCategoryInView]);

  return (
    <div
      className={`min-h-screen bg-gray-50 flex flex-col ${className}`}
      data-scrolled={isScrolled}
    >
      {/* Header with cover and logo */}
      <MenuHeader organization={organization} tableId={tableId} />

      {/* Category Navigation (sticky) */}
      {categoryNav}

      {/* Main Content */}
      <main
        ref={mainRef}
        className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 sm:py-6"
      >
        {children}
      </main>

      {/* Contact Information */}
      {showContactInfo && <ContactInfo organization={organization} />}

      {/* Footer */}
      {showFooter && <MenuFooter />}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default MenuLayout;
