/**
 * Public Menu Page - Organization Level
 *
 * Public-facing menu page for customers. This page handles organization-level
 * routing and determines whether to:
 * - Redirect to location-specific menu (single-location organizations)
 * - Show location selector (multi-location organizations)
 *
 * URL Pattern: /menu/{organization-slug}
 *
 * Features:
 * - Single-location: Auto-redirect to /menu/{org-slug}/{location-slug}
 * - Multi-location: Display location selector with all active locations
 * - Organization branding (logo, cover image, background color)
 * - Mobile-first responsive design
 * - Contact information display
 *
 * This page is public and does not require authentication.
 */

import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocationsByOrganizationSlug } from '@/lib/db/locations';
import { LocationSelector } from '@/components/menu/LocationSelector';
import type { Metadata } from 'next';
import type { Organization } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface MenuPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table_id?: string }>;
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

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: MenuPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createServerSupabaseClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('name, description, logo_url')
    .eq('slug', resolvedParams.slug)
    .eq('status', 'active')
    .single();

  if (!org) {
    return {
      title: 'Menu Bulunamadi',
      description: 'Aradiginiz menu bulunamadi.',
    };
  }

  return {
    title: `${org.name} - Subeler`,
    description: org.description || `${org.name} subelerimiz`,
    openGraph: {
      title: `${org.name} - Subeler`,
      description: org.description || `${org.name} subelerimiz`,
      images: org.logo_url ? [org.logo_url] : undefined,
    },
  };
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
};


// =============================================================================
// ORGANIZATION HEADER COMPONENT
// =============================================================================

interface OrgHeaderProps {
  organization: OrganizationInfo;
}

function OrgHeader({ organization }: OrgHeaderProps) {
  const hasCoverImage = !!organization.coverImageUrl;
  const backgroundColor = organization.backgroundColor || '#ffffff';

  return (
    <header className="relative">
      {/* Cover Image */}
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

          {/* Name */}
          <div className="pb-2">
            <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}



// =============================================================================
// NOT FOUND STATE
// =============================================================================

function MenuNotFound() {
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
// CONTACT INFO COMPONENT
// =============================================================================

interface ContactInfoProps {
  organization: OrganizationInfo;
}

function ContactInfo({ organization }: ContactInfoProps) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phone */}
          {organization.phone && (
            <a
              href={`tel:${organization.phone}`}
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Icons.Phone />
              </div>
              <div>
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="text-sm font-medium text-gray-900">
                  {organization.phone}
                </p>
              </div>
            </a>
          )}

          {/* Address */}
          {organization.address && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Icons.Location />
              </div>
              <div>
                <p className="text-xs text-gray-500">Adres</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-1">
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

export default async function MenuPage({ params, searchParams }: MenuPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { slug } = resolvedParams;
  const { table_id: tableId } = resolvedSearchParams;

  const supabase = await createServerSupabaseClient();

  // Fetch organization by slug
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select(
      `
      id,
      name,
      slug,
      logo_url,
      cover_image_url,
      background_color,
      phone,
      address,
      instagram_url,
      facebook_url,
      twitter_url,
      website,
      status
    `
    )
    .eq('slug', slug)
    .single();

  // Handle organization not found
  if (orgError || !organization) {
    notFound();
  }

  // Check if organization is active
  if ((organization as Organization).status !== 'active') {
    return <MenuNotFound />;
  }

  // Transform organization data
  const orgInfo: OrganizationInfo = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logoUrl: organization.logo_url,
    coverImageUrl: organization.cover_image_url,
    backgroundColor: organization.background_color,
    phone: organization.phone,
    address: organization.address,
    instagram_url: organization.instagram_url,
    facebook_url: organization.facebook_url,
    twitter_url: organization.twitter_url,
    website: organization.website,
  };

  // Fetch active locations for this organization
  const locations = await getLocationsByOrganizationSlug(slug, { activeOnly: true });

  // Handle no locations - show empty state via LocationSelector
  if (locations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <OrgHeader organization={orgInfo} />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          <LocationSelector
            locations={[]}
            organizationSlug={slug}
          />
        </main>
        <ContactInfo organization={orgInfo} />
        <MenuFooter />
      </div>
    );
  }

  // Single location: redirect to location-specific menu
  if (locations.length === 1 && locations[0]) {
    const defaultLocation = locations[0];
    const redirectUrl = tableId
      ? `/menu/${slug}/${defaultLocation.slug}?table_id=${tableId}`
      : `/menu/${slug}/${defaultLocation.slug}`;
    redirect(redirectUrl);
  }

  // Multiple locations: show location selector
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with cover and logo */}
      <OrgHeader organization={orgInfo} />

      {/* Main Content - Location Selector */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <LocationSelector
          locations={locations}
          organizationSlug={slug}
          tableId={tableId}
        />
      </main>

      {/* Contact Information */}
      <ContactInfo organization={orgInfo} />

      {/* Footer */}
      <MenuFooter />
    </div>
  );
}
