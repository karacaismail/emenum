/**
 * Location-Specific Public Menu Page
 *
 * Public-facing menu page for customers at a specific location.
 * Loads organization and location by slugs, displays categories
 * and products with current prices from price_ledger view.
 *
 * URL Pattern: /menu/{organization-slug}/{location-slug}
 *
 * Features:
 * - Organization and location branding
 * - Location-specific menu items (products with matching location_id)
 * - Organization-level menu items (products with null location_id)
 * - Products grouped by category with current prices
 * - Mobile-first responsive design
 * - Badge display (Chef's Special, Daily Special)
 * - Allergen and calorie information
 * - Table context support via URL params (table_id)
 * - Contact information display (location-specific)
 * - Location badge showing current location
 *
 * This page is public and does not require authentication.
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocationBySlug, getLocationsByOrganization } from '@/lib/db/locations';
import { LocationBadge } from '@/components/menu/LocationBadge';
import type { Metadata } from 'next';
import type { MenuView, CurrencyCode, Location } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface LocationMenuPageProps {
  params: Promise<{
    'organization-slug': string;
    'location-slug': string;
  }>;
  searchParams: Promise<{ table_id?: string }>;
}

interface CategoryGroup {
  id: string | null;
  name: string | null;
  description: string | null;
  sortOrder: number | null;
  products: MenuView[];
}

interface OrganizationInfo {
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

interface LocationInfo {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({
  params,
}: LocationMenuPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const orgSlug = resolvedParams['organization-slug'];
  const locSlug = resolvedParams['location-slug'];

  const locationWithOrg = await getLocationBySlug(orgSlug, locSlug);

  if (!locationWithOrg) {
    return {
      title: 'Menu Bulunamadi',
      description: 'Aradiginiz menu bulunamadi.',
    };
  }

  const org = locationWithOrg.organization;
  const locationName = locationWithOrg.name;

  return {
    title: `${org.name} - ${locationName} - Menu`,
    description:
      org.description || `${org.name} ${locationName} subesi dijital menu`,
    openGraph: {
      title: `${org.name} - ${locationName} - Menu`,
      description:
        org.description || `${org.name} ${locationName} subesi dijital menu`,
      images: org.logo_url ? [org.logo_url] : undefined,
    },
  };
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  ChefHat: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3c-2.67 0-8 1.33-8 8 0 2.67 0 4 0 5h16c0-1 0-2.33 0-5 0-6.67-5.33-8-8-8z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 16v2a2 2 0 002 2h8a2 2 0 002-2v-2"
      />
    </svg>
  ),
  Star: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Fire: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
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
  AlertTriangle: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with Turkish locale
 */
function formatPrice(price: number, currency: CurrencyCode = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Group products by category
 */
function groupProductsByCategory(products: MenuView[]): CategoryGroup[] {
  const categoryMap = new Map<string | null, CategoryGroup>();

  // First pass: create category groups
  products.forEach((product) => {
    const categoryId = product.category_id;

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: product.category_name,
        description: product.category_description,
        sortOrder: product.category_sort_order,
        products: [],
      });
    }

    categoryMap.get(categoryId)!.products.push(product);
  });

  // Convert to array and sort by category sort order
  const groups = Array.from(categoryMap.values());
  groups.sort((a, b) => {
    // Uncategorized (null) items go to the end
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
  });

  // Sort products within each category by sort_order
  groups.forEach((group) => {
    group.products.sort((a, b) => a.sort_order - b.sort_order);
  });

  return groups;
}

// =============================================================================
// PRODUCT CARD COMPONENT
// =============================================================================

interface ProductCardProps {
  product: MenuView;
}

function ProductCard({ product }: ProductCardProps) {
  const hasImage = !!product.image_url;
  const hasPrice = product.price !== null;
  const isHappyHour =
    product.price_valid_until &&
    new Date(product.price_valid_until) > new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      {hasImage && (
        <div className="relative aspect-[16/9] bg-gray-100">
          <Image
            src={product.image_url!}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Badges on image */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.is_chef_special && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-500 text-white rounded-full">
                <Icons.ChefHat />
                <span>Sef Onerisi</span>
              </span>
            )}
            {product.is_daily_special && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded-full">
                <Icons.Star />
                <span>Gunun Ozel</span>
              </span>
            )}
            {isHappyHour && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-500 text-white rounded-full animate-pulse">
                Happy Hour
              </span>
            )}
          </div>
        </div>
      )}

      {/* Product Content */}
      <div className="p-4">
        {/* Badges (when no image) */}
        {!hasImage && (product.is_chef_special || product.is_daily_special || isHappyHour) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.is_chef_special && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                <Icons.ChefHat />
                <span>Sef Onerisi</span>
              </span>
            )}
            {product.is_daily_special && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                <Icons.Star />
                <span>Gunun Ozel</span>
              </span>
            )}
            {isHappyHour && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                Happy Hour
              </span>
            )}
          </div>
        )}

        {/* Name and Price Row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 leading-tight">
            {product.name}
          </h3>
          {hasPrice && (
            <span className="text-lg font-bold text-primary-600 whitespace-nowrap">
              {formatPrice(product.price!, product.currency || 'TRY')}
            </span>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Additional Info */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {/* Preparation Time */}
          {product.preparation_time_minutes && (
            <span className="inline-flex items-center gap-1">
              <Icons.Clock />
              {product.preparation_time_minutes} dk
            </span>
          )}

          {/* Calories */}
          {product.calories && (
            <span className="inline-flex items-center gap-1">
              <Icons.Fire />
              {product.calories} kcal
            </span>
          )}

          {/* Allergens */}
          {product.allergens && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Icons.AlertTriangle />
              <span>{product.allergens}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CATEGORY SECTION COMPONENT
// =============================================================================

interface CategorySectionProps {
  category: CategoryGroup;
}

function CategorySection({ category }: CategorySectionProps) {
  return (
    <section id={category.id || 'uncategorized'} className="scroll-mt-20">
      {/* Category Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {category.name || 'Diger'}
        </h2>
        {category.description && (
          <p className="mt-1 text-sm text-gray-600">{category.description}</p>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// MENU HEADER COMPONENT
// =============================================================================

interface MenuHeaderProps {
  organization: OrganizationInfo;
  location: LocationInfo;
  tableId?: string;
}

function MenuHeader({ organization, location, tableId }: MenuHeaderProps) {
  const hasCoverImage = !!organization.coverImageUrl;
  const backgroundColor = organization.backgroundColor || '#ffffff';

  return (
    <header className="relative">
      {/* Cover Image (top 20% of page) */}
      {hasCoverImage ? (
        <div className="relative h-[20vh] min-h-[120px] max-h-[200px] w-full">
          <Image
            src={organization.coverImageUrl!}
            alt={`${organization.name} cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      ) : (
        <div
          className="h-[15vh] min-h-[100px] max-h-[150px] w-full"
          style={{ backgroundColor }}
        />
      )}

      {/* Organization Info */}
      <div className="relative px-4 pb-4 -mt-12">
        <div className="flex items-end gap-4">
          {/* Logo */}
          {organization.logoUrl ? (
            <div className="relative w-24 h-24 rounded-xl bg-white shadow-lg overflow-hidden border-4 border-white flex-shrink-0">
              <Image
                src={organization.logoUrl}
                alt={`${organization.name} logo`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white flex-shrink-0">
              <span className="text-3xl font-bold text-gray-400">
                {organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name, Location, and Table Info */}
          <div className="pb-2">
            <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
              <Icons.MapPin />
              <span>{location.name}</span>
            </p>
            {tableId && (
              <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                Masa: {tableId}
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
  organization: OrganizationInfo;
  location: LocationInfo;
}

function ContactInfo({ organization, location }: ContactInfoProps) {
  // Use location-specific contact info if available, fallback to organization
  const phone = location.phone || organization.phone;
  const address = location.address || organization.address;

  const hasContactInfo =
    phone ||
    address ||
    organization.instagram_url ||
    organization.facebook_url ||
    organization.twitter_url ||
    organization.website;

  if (!hasContactInfo) return null;

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phone */}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Icons.Phone />
              </div>
              <div>
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="text-sm font-medium text-gray-900">{phone}</p>
              </div>
            </a>
          )}

          {/* Address */}
          {address && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Icons.Location />
              </div>
              <div>
                <p className="text-xs text-gray-500">Adres</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-1">
                  {address}
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
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                <Icons.Globe />
              </div>
              <div>
                <p className="text-xs text-gray-500">Web Sitesi</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-1">
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
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <Icons.Instagram />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Sosyal Medya</p>
                <div className="flex items-center gap-2">
                  {organization.instagram_url && (
                    <a
                      href={organization.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:opacity-80 transition-opacity"
                    >
                      <Icons.Instagram />
                    </a>
                  )}
                  {organization.facebook_url && (
                    <a
                      href={organization.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-blue-600 text-white hover:opacity-80 transition-opacity"
                    >
                      <Icons.Facebook />
                    </a>
                  )}
                  {organization.twitter_url && (
                    <a
                      href={organization.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-black text-white hover:opacity-80 transition-opacity"
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
// CATEGORY NAVIGATION COMPONENT
// =============================================================================

interface CategoryNavProps {
  categories: CategoryGroup[];
}

function CategoryNav({ categories }: CategoryNavProps) {
  if (categories.length <= 1) return null;

  return (
    <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex overflow-x-auto scrollbar-hide py-3 gap-2 -mx-4 px-4">
          {categories.map((category) => (
            <a
              key={category.id || 'uncategorized'}
              href={`#${category.id || 'uncategorized'}`}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors whitespace-nowrap"
            >
              {category.name || 'Diger'}
              <span className="ml-1 text-xs text-gray-500">
                ({category.products.length})
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// EMPTY MENU STATE
// =============================================================================

function EmptyMenuState({
  organizationName,
  locationName,
}: {
  organizationName: string;
  locationName: string;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-gray-400"
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
      <h2 className="text-xl font-bold text-gray-900 mb-2">Menu Hazirlaniyor</h2>
      <p className="text-gray-600">
        {organizationName} - {locationName} subesi menusunde henuz urun
        bulunmuyor. Lutfen daha sonra tekrar deneyin.
      </p>
    </div>
  );
}

// =============================================================================
// MENU NOT FOUND STATE
// =============================================================================

function MenuNotFoundState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-500"
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">Menu Bulunamadi</h2>
        <p className="text-gray-600">
          Aradiginiz menu mevcut degil veya aktif degil. Lutfen QR kodu tekrar
          tarayin veya isletme ile iletisime gecin.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// FOOTER COMPONENT
// =============================================================================

function MenuFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8">
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
        <p className="text-xs mt-2">Dijital Menu ve Fiyat Defteri Cozumu</p>
      </div>
    </footer>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default async function LocationMenuPage({
  params,
  searchParams,
}: LocationMenuPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const orgSlug = resolvedParams['organization-slug'];
  const locSlug = resolvedParams['location-slug'];
  const { table_id: tableId } = resolvedSearchParams;

  // Fetch location with organization data
  const locationWithOrg = await getLocationBySlug(orgSlug, locSlug);

  // Handle location or organization not found
  if (!locationWithOrg) {
    notFound();
  }

  const org = locationWithOrg.organization;

  // Check if organization is active
  if (org.status !== 'active') {
    return <MenuNotFoundState />;
  }

  // Transform organization data
  const orgInfo: OrganizationInfo = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    coverImageUrl: org.cover_image_url,
    backgroundColor: org.background_color,
    phone: org.phone,
    address: org.address,
    instagram_url: org.instagram_url,
    facebook_url: org.facebook_url,
    twitter_url: org.twitter_url,
    website: org.website,
  };

  // Transform location data
  const locInfo: LocationInfo = {
    id: locationWithOrg.id,
    name: locationWithOrg.name,
    slug: locationWithOrg.slug,
    address: locationWithOrg.address,
    city: locationWithOrg.city,
    phone: locationWithOrg.phone,
    email: locationWithOrg.email,
  };

  // Fetch other locations for the location badge
  const otherLocations = await getLocationsByOrganization(org.id, {
    activeOnly: true,
  });
  const otherActiveLocations = otherLocations.filter(
    (loc) => loc.id !== locationWithOrg.id
  );

  // Fetch menu items using menu_view
  // Include both location-specific products AND org-level products (location_id IS NULL)
  const supabase = await createServerSupabaseClient();
  const { data: menuItems } = await supabase
    .from('menu_view')
    .select('*')
    .eq('organization_id', org.id)
    .or(`location_id.eq.${locationWithOrg.id},location_id.is.null`);

  // Group products by category
  const categoryGroups = groupProductsByCategory((menuItems as MenuView[]) || []);

  // If no products, show empty state
  if (categoryGroups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MenuHeader organization={orgInfo} location={locInfo} tableId={tableId} />
        <div className="max-w-6xl mx-auto w-full px-4 py-4">
          <LocationBadge
            location={locInfo}
            organization={orgInfo}
            otherLocations={otherActiveLocations}
          />
        </div>
        <div className="flex-1">
          <EmptyMenuState organizationName={org.name} locationName={locInfo.name} />
        </div>
        <ContactInfo organization={orgInfo} location={locInfo} />
        <MenuFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with cover and logo */}
      <MenuHeader organization={orgInfo} location={locInfo} tableId={tableId} />

      {/* Location Badge */}
      <div className="max-w-6xl mx-auto w-full px-4 py-4">
        <LocationBadge
          location={locInfo}
          organization={orgInfo}
          otherLocations={otherActiveLocations}
        />
      </div>

      {/* Category Navigation (sticky) */}
      <CategoryNav categories={categoryGroups} />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="space-y-10">
          {categoryGroups.map((category) => (
            <CategorySection
              key={category.id || 'uncategorized'}
              category={category}
            />
          ))}
        </div>
      </main>

      {/* Contact Information */}
      <ContactInfo organization={orgInfo} location={locInfo} />

      {/* Footer */}
      <MenuFooter />
    </div>
  );
}
