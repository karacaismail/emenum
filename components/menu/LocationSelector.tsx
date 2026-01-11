/**
 * LocationSelector Component
 *
 * Mobile-first component for selecting between multiple restaurant locations.
 * Displays a list of active locations with navigation to location-specific menus.
 *
 * Features:
 * - Location list with name, address, city, and phone display
 * - Active location highlighting
 * - Clickable cards that navigate to location-specific menu
 * - Preserves table_id query parameter across navigation
 * - Responsive design with mobile-first approach
 * - Empty state handling
 * - Compact mode for inline location switching
 *
 * Usage:
 * - Organization page: Full selector with title and description
 * - Location menu page: Compact selector for switching locations
 */

'use client';

import Link from 'next/link';
import type { Location } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

export interface LocationSelectorProps {
  /** List of active locations to display */
  locations: Location[];
  /** Organization slug for building URLs */
  organizationSlug: string;
  /** Optional table ID to preserve in navigation */
  tableId?: string;
  /** Currently active location slug (for highlighting) */
  activeLocationSlug?: string;
  /** Display mode: 'full' shows title/description, 'compact' is minimal */
  mode?: 'full' | 'compact';
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Additional className for the container */
  className?: string;
}

export interface LocationCardProps {
  /** Location data */
  location: Location;
  /** Organization slug for building URL */
  organizationSlug: string;
  /** Optional table ID to preserve in navigation */
  tableId?: string;
  /** Whether this location is currently active */
  isActive?: boolean;
  /** Card size variant */
  size?: 'default' | 'compact';
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  MapPin: () => (
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
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  Store: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
};

// =============================================================================
// LOCATION CARD COMPONENT
// =============================================================================

/**
 * Individual location card with navigation link
 */
export function LocationCard({
  location,
  organizationSlug,
  tableId,
  isActive = false,
  size = 'default',
}: LocationCardProps) {
  // Build URL with optional table_id preservation
  const href = tableId
    ? `/menu/${organizationSlug}/${location.slug}?table_id=${tableId}`
    : `/menu/${organizationSlug}/${location.slug}`;

  const isCompact = size === 'compact';

  return (
    <Link
      href={href}
      className={`
        block rounded-xl transition-all group
        ${isCompact ? 'p-3' : 'p-5'}
        ${
          isActive
            ? 'bg-primary-50 border-2 border-primary-500 shadow-sm'
            : 'bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          {/* Location Name with Active Indicator */}
          <div className="flex items-center gap-2">
            <h3
              className={`
                font-semibold transition-colors truncate
                ${isCompact ? 'text-base' : 'text-lg'}
                ${
                  isActive
                    ? 'text-primary-700'
                    : 'text-gray-900 group-hover:text-primary-600'
                }
              `}
            >
              {location.name}
            </h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full flex-shrink-0">
                <Icons.Check />
                <span>Aktif</span>
              </span>
            )}
          </div>

          {/* Address */}
          {location.address && (
            <div
              className={`flex items-start gap-2 text-gray-600 ${isCompact ? 'mt-1' : 'mt-2'}`}
            >
              <span className="flex-shrink-0 mt-0.5">
                <Icons.MapPin />
              </span>
              <span className={`${isCompact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>
                {location.address}
              </span>
            </div>
          )}

          {/* City (show only if no address) */}
          {location.city && !location.address && (
            <div
              className={`flex items-center gap-2 text-gray-600 ${isCompact ? 'mt-1' : 'mt-2'}`}
            >
              <Icons.MapPin />
              <span className={`${isCompact ? 'text-xs' : 'text-sm'}`}>{location.city}</span>
            </div>
          )}

          {/* Phone (hide in compact mode) */}
          {location.phone && !isCompact && (
            <div className="flex items-center gap-2 mt-2 text-gray-500">
              <Icons.Phone />
              <span className="text-sm">{location.phone}</span>
            </div>
          )}
        </div>

        {/* Arrow Icon */}
        <div
          className={`
            flex-shrink-0 rounded-full transition-colors
            ${isCompact ? 'p-1.5' : 'p-2'}
            ${
              isActive
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-50 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600'
            }
          `}
        >
          <Icons.ChevronRight />
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyLocationStateProps {
  organizationName?: string;
}

function EmptyLocationState({ organizationName }: EmptyLocationStateProps) {
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
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
        Sube Bulunamadi
      </h2>
      <p className="text-sm sm:text-base text-gray-600">
        {organizationName
          ? `${organizationName} icin aktif sube bulunmuyor.`
          : 'Aktif sube bulunmuyor.'}{' '}
        Lutfen daha sonra tekrar deneyin veya isletme ile iletisime gecin.
      </p>
    </div>
  );
}

// =============================================================================
// MAIN LOCATION SELECTOR COMPONENT
// =============================================================================

/**
 * Location selector component for choosing between multiple locations
 *
 * @example
 * // Full mode for organization page
 * <LocationSelector
 *   locations={locations}
 *   organizationSlug="my-restaurant"
 *   mode="full"
 * />
 *
 * @example
 * // Compact mode for location switching
 * <LocationSelector
 *   locations={locations}
 *   organizationSlug="my-restaurant"
 *   activeLocationSlug="downtown"
 *   mode="compact"
 *   title="Diger Subeler"
 * />
 */
export function LocationSelector({
  locations,
  organizationSlug,
  tableId,
  activeLocationSlug,
  mode = 'full',
  title,
  description,
  className = '',
}: LocationSelectorProps) {
  const isFullMode = mode === 'full';
  const isCompact = mode === 'compact';

  // Handle empty locations
  if (locations.length === 0) {
    return <EmptyLocationState />;
  }

  // Default title and description
  const displayTitle = title || (isFullMode ? 'Sube Seciniz' : 'Subelerimiz');
  const displayDescription =
    description || (isFullMode ? 'Menuyu goruntulemek istediginiz subeyi secin' : undefined);

  return (
    <div className={`${isFullMode ? 'max-w-2xl mx-auto' : ''} ${className}`}>
      {/* Header */}
      {(isFullMode || title) && (
        <div className={`${isFullMode ? 'text-center mb-6' : 'mb-4'}`}>
          {isFullMode && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-3">
              <Icons.Store />
            </div>
          )}
          <h2
            className={`font-bold text-gray-900 ${isFullMode ? 'text-xl' : 'text-lg'}`}
          >
            {displayTitle}
          </h2>
          {displayDescription && (
            <p className={`text-gray-600 ${isFullMode ? 'mt-1' : 'mt-0.5 text-sm'}`}>
              {displayDescription}
            </p>
          )}
        </div>
      )}

      {/* Location List */}
      <div className={`space-y-${isCompact ? '2' : '3'}`}>
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            organizationSlug={organizationSlug}
            tableId={tableId}
            isActive={activeLocationSlug === location.slug}
            size={isCompact ? 'compact' : 'default'}
          />
        ))}
      </div>

      {/* Location count hint in compact mode */}
      {isCompact && locations.length > 1 && (
        <p className="text-center text-xs text-gray-500 mt-3">
          {locations.length} sube mevcut
        </p>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LocationSelector;
