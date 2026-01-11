/**
 * LocationBadge Component
 *
 * Compact badge/chip component for displaying the current location on menu pages.
 * Shows location name, optional address, and provides navigation to location
 * selector for organizations with multiple locations.
 *
 * Features:
 * - Location name display with map pin icon
 * - Optional address display
 * - Link to location selector for multi-location organizations
 * - Compact and full size variants
 * - Mobile-first responsive design
 * - Tailwind CSS styling
 *
 * Usage:
 * - Location menu page: Show current location with link to other locations
 * - Header display: Compact variant for inline location indicator
 */

'use client';

import Link from 'next/link';
import type { Location } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

export interface LocationInfo {
  /** Location ID */
  id: string;
  /** Location name (e.g., "Downtown", "Airport Terminal") */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Street address (optional) */
  address?: string | null;
  /** City (optional) */
  city?: string | null;
  /** Phone number (optional) */
  phone?: string | null;
}

export interface OrganizationInfo {
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** URL-safe slug */
  slug: string;
}

export interface LocationBadgeProps {
  /** Current location information */
  location: LocationInfo;
  /** Organization information for building URLs */
  organization: OrganizationInfo;
  /** Other locations in the organization (for multi-location link) */
  otherLocations?: Location[];
  /** Display variant */
  variant?: 'default' | 'compact';
  /** Whether to show the address */
  showAddress?: boolean;
  /** Custom link text for location selector */
  linkText?: string;
  /** Additional className for the container */
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  MapPin: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  ChevronDown: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),
  Building: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
};

// =============================================================================
// LOCATION BADGE COMPONENT
// =============================================================================

/**
 * LocationBadge displays the current location as a compact badge/chip.
 *
 * @example
 * // Default variant with address and multi-location link
 * <LocationBadge
 *   location={{ id: '1', name: 'Downtown', slug: 'downtown', address: '123 Main St' }}
 *   organization={{ id: '1', name: 'My Restaurant', slug: 'my-restaurant' }}
 *   otherLocations={[{ id: '2', name: 'Airport', slug: 'airport', ... }]}
 * />
 *
 * @example
 * // Compact variant for headers
 * <LocationBadge
 *   location={location}
 *   organization={organization}
 *   variant="compact"
 *   showAddress={false}
 * />
 */
export function LocationBadge({
  location,
  organization,
  otherLocations = [],
  variant = 'default',
  showAddress = true,
  linkText,
  className = '',
}: LocationBadgeProps) {
  const hasMultipleLocations = otherLocations.length > 0;
  const isCompact = variant === 'compact';

  // Determine display address (address or city fallback)
  const displayAddress = location.address || location.city;

  // Default link text based on context
  const defaultLinkText = isCompact ? 'Degistir' : 'Diger Subeler';
  const finalLinkText = linkText || defaultLinkText;

  // Compact variant: simple inline badge
  if (isCompact) {
    return (
      <div
        className={`inline-flex items-center gap-2 ${className}`}
        role="status"
        aria-label={`Mevcut konum: ${location.name}`}
      >
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full">
          <Icons.MapPin className="w-3.5 h-3.5" />
          <span className="text-sm font-medium truncate max-w-[150px]">
            {location.name}
          </span>
        </div>

        {hasMultipleLocations && (
          <Link
            href={`/menu/${organization.slug}`}
            className="text-xs text-primary-600 hover:text-primary-700 hover:underline transition-colors"
            aria-label={`${finalLinkText} - ${otherLocations.length} sube mevcut`}
          >
            {finalLinkText}
          </Link>
        )}
      </div>
    );
  }

  // Default variant: card-style badge
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
      role="status"
      aria-label={`Mevcut konum: ${location.name}`}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {/* Location Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-full bg-primary-100 text-primary-600 flex-shrink-0">
            <Icons.MapPin />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {location.name}
            </p>
            {showAddress && displayAddress && (
              <p className="text-xs text-gray-500 truncate">{displayAddress}</p>
            )}
          </div>
        </div>

        {/* Multi-location Link */}
        {hasMultipleLocations && (
          <Link
            href={`/menu/${organization.slug}`}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-full transition-colors"
            aria-label={`${finalLinkText} - ${otherLocations.length} sube mevcut`}
          >
            <span>{finalLinkText}</span>
            <Icons.ChevronDown className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Location count hint (optional, shown when multiple locations) */}
      {hasMultipleLocations && otherLocations.length > 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400">
            {otherLocations.length + 1} sube mevcut
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SIMPLE LOCATION INDICATOR (Alternative Compact Component)
// =============================================================================

export interface LocationIndicatorProps {
  /** Location name to display */
  locationName: string;
  /** Optional organization slug for link */
  organizationSlug?: string;
  /** Whether to show as a link */
  asLink?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Simple location indicator for inline use (e.g., in headers)
 *
 * @example
 * <LocationIndicator locationName="Downtown" />
 *
 * @example
 * <LocationIndicator
 *   locationName="Downtown"
 *   organizationSlug="my-restaurant"
 *   asLink
 * />
 */
export function LocationIndicator({
  locationName,
  organizationSlug,
  asLink = false,
  className = '',
}: LocationIndicatorProps) {
  const content = (
    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
      <Icons.MapPin className="w-3.5 h-3.5" />
      <span className="truncate max-w-[200px]">{locationName}</span>
    </span>
  );

  if (asLink && organizationSlug) {
    return (
      <Link
        href={`/menu/${organizationSlug}`}
        className={`inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors ${className}`}
        aria-label={`Konum: ${locationName} - Degistirmek icin tiklayin`}
      >
        <Icons.MapPin className="w-3.5 h-3.5" />
        <span className="truncate max-w-[200px]">{locationName}</span>
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LocationBadge;
