/**
 * MenuSkeleton Component
 *
 * Skeleton loading states for the public menu page.
 * Provides visual feedback while menu data is being loaded.
 *
 * Features:
 * - Full page skeleton layout
 * - Header skeleton (logo, cover image area)
 * - Category tabs skeleton
 * - Product cards skeleton
 * - Animated shimmer effect
 * - Mobile-first responsive design
 *
 * @example
 * ```tsx
 * import { MenuPageSkeleton } from '@/components/menu';
 *
 * export default function Loading() {
 *   return <MenuPageSkeleton />;
 * }
 * ```
 */

'use client';

import { ReactNode } from 'react';

// =============================================================================
// SHIMMER WRAPPER
// =============================================================================

interface ShimmerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Shimmer wrapper that adds animated gradient effect
 */
function Shimmer({ children, className = '' }: ShimmerProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children}
    </div>
  );
}

// =============================================================================
// SKELETON ELEMENTS
// =============================================================================

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton element with gray background
 */
function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`bg-gray-200 rounded ${className}`} />;
}

// =============================================================================
// HEADER SKELETON
// =============================================================================

/**
 * Skeleton for the menu header (cover image + logo area)
 */
export function MenuHeaderSkeleton() {
  return (
    <header className="relative">
      {/* Cover image skeleton */}
      <Shimmer>
        <div className="h-[20vh] min-h-[120px] max-h-[200px] w-full bg-gray-200" />
      </Shimmer>

      {/* Organization info skeleton */}
      <div className="relative px-4 pb-4 -mt-12">
        <div className="flex items-end gap-3 sm:gap-4">
          {/* Logo skeleton */}
          <Shimmer>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-300 border-4 border-white flex-shrink-0" />
          </Shimmer>

          {/* Name and table info skeleton */}
          <div className="pb-1 sm:pb-2 flex-1 min-w-0">
            <Shimmer>
              <Skeleton className="h-6 sm:h-7 w-48 max-w-full" />
            </Shimmer>
            <Shimmer className="mt-2">
              <Skeleton className="h-5 w-20" />
            </Shimmer>
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// CATEGORY TABS SKELETON
// =============================================================================

/**
 * Skeleton for the category navigation tabs
 */
export function CategoryTabsSkeleton() {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <Shimmer>
        <div className="flex overflow-hidden px-4 py-3 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-8 flex-shrink-0 ${
                index === 0 ? 'w-20 bg-gray-300' : 'w-24'
              }`}
            />
          ))}
        </div>
      </Shimmer>
    </div>
  );
}

// =============================================================================
// PRODUCT CARD SKELETON
// =============================================================================

interface ProductCardSkeletonProps {
  showImage?: boolean;
  variant?: 'default' | 'compact' | 'horizontal';
}

/**
 * Skeleton for individual product cards
 */
export function MenuProductCardSkeleton({
  showImage = true,
  variant = 'default',
}: ProductCardSkeletonProps) {
  if (variant === 'compact') {
    return (
      <Shimmer>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <div className="flex items-start gap-3">
            {showImage && (
              <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </Shimmer>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Shimmer>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex">
            {showImage && (
              <Skeleton className="w-32 sm:w-40 aspect-square flex-shrink-0" />
            )}
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="mt-2 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </Shimmer>
    );
  }

  // Default variant
  return (
    <Shimmer>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {showImage && <Skeleton className="aspect-[16/9]" />}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </Shimmer>
  );
}

// =============================================================================
// PRODUCT GRID SKELETON
// =============================================================================

interface ProductGridSkeletonProps {
  count?: number;
  showImages?: boolean;
  variant?: 'default' | 'compact' | 'horizontal';
  columns?: 1 | 2 | 3;
}

/**
 * Skeleton for a grid of product cards
 */
export function ProductGridSkeleton({
  count = 6,
  showImages = true,
  variant = 'default',
  columns = 2,
}: ProductGridSkeletonProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={`grid gap-4 ${columnClasses[columns]}`}>
      {Array.from({ length: count }).map((_, index) => (
        <MenuProductCardSkeleton
          key={index}
          showImage={showImages}
          variant={variant}
        />
      ))}
    </div>
  );
}

// =============================================================================
// CATEGORY SECTION SKELETON
// =============================================================================

interface CategorySectionSkeletonProps {
  productCount?: number;
  showImages?: boolean;
}

/**
 * Skeleton for a category section with title and products
 */
export function CategorySectionSkeleton({
  productCount = 4,
  showImages = true,
}: CategorySectionSkeletonProps) {
  return (
    <section className="mb-8">
      {/* Category title skeleton */}
      <Shimmer className="mb-4">
        <Skeleton className="h-7 w-32" />
      </Shimmer>

      {/* Products grid skeleton */}
      <ProductGridSkeleton
        count={productCount}
        showImages={showImages}
        columns={2}
      />
    </section>
  );
}

// =============================================================================
// CONTACT INFO SKELETON
// =============================================================================

/**
 * Skeleton for the contact info section
 */
export function ContactInfoSkeleton() {
  return (
    <div className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Shimmer>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white rounded-lg"
              >
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Shimmer>
      </div>
    </div>
  );
}

// =============================================================================
// FOOTER SKELETON
// =============================================================================

/**
 * Skeleton for the footer section
 */
export function FooterSkeleton() {
  return (
    <footer className="bg-gray-900 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <Shimmer>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-32 bg-gray-700" />
            <Skeleton className="h-3 w-48 bg-gray-700" />
          </div>
        </Shimmer>
      </div>
    </footer>
  );
}

// =============================================================================
// FLOATING BUTTON SKELETON
// =============================================================================

/**
 * Skeleton for the floating call waiter button
 */
export function FloatingButtonSkeleton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Shimmer>
        <Skeleton className="w-14 h-14 rounded-full shadow-lg" />
      </Shimmer>
    </div>
  );
}

// =============================================================================
// FULL PAGE SKELETON
// =============================================================================

interface MenuPageSkeletonProps {
  /** Number of category sections to show */
  categorySections?: number;
  /** Number of products per category */
  productsPerCategory?: number;
  /** Whether to show product images */
  showImages?: boolean;
  /** Whether to show the floating call button */
  showFloatingButton?: boolean;
  /** Whether to show contact info section */
  showContactInfo?: boolean;
  /** Whether to show footer */
  showFooter?: boolean;
}

/**
 * Full page skeleton for the menu page.
 * Use this as the loading.tsx file for the menu/[slug] route.
 *
 * @example
 * ```tsx
 * // app/menu/[slug]/loading.tsx
 * import { MenuPageSkeleton } from '@/components/menu';
 *
 * export default function Loading() {
 *   return <MenuPageSkeleton />;
 * }
 * ```
 */
export function MenuPageSkeleton({
  categorySections = 3,
  productsPerCategory = 4,
  showImages = true,
  showFloatingButton = true,
  showContactInfo = true,
  showFooter = true,
}: MenuPageSkeletonProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header skeleton */}
      <MenuHeaderSkeleton />

      {/* Category tabs skeleton */}
      <CategoryTabsSkeleton />

      {/* Main content skeleton */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 sm:py-6">
        {Array.from({ length: categorySections }).map((_, index) => (
          <CategorySectionSkeleton
            key={index}
            productCount={productsPerCategory}
            showImages={showImages}
          />
        ))}
      </main>

      {/* Contact info skeleton */}
      {showContactInfo && <ContactInfoSkeleton />}

      {/* Footer skeleton */}
      {showFooter && <FooterSkeleton />}

      {/* Floating button skeleton */}
      {showFloatingButton && <FloatingButtonSkeleton />}
    </div>
  );
}

// =============================================================================
// INLINE SKELETON COMPONENTS
// =============================================================================

/**
 * Inline text skeleton for loading text content
 */
export function TextSkeleton({
  width = 'w-24',
  height = 'h-4',
}: {
  width?: string;
  height?: string;
}) {
  return (
    <Shimmer>
      <Skeleton className={`${width} ${height}`} />
    </Shimmer>
  );
}

/**
 * Price skeleton for loading price content
 */
export function PriceSkeleton() {
  return (
    <Shimmer>
      <Skeleton className="h-6 w-20" />
    </Shimmer>
  );
}

/**
 * Badge skeleton for loading badge content
 */
export function BadgeSkeleton() {
  return (
    <Shimmer>
      <Skeleton className="h-5 w-16 rounded-full" />
    </Shimmer>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default MenuPageSkeleton;
