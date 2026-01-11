/**
 * CategoryTabs Component
 *
 * Mobile-first category navigation tabs for public menu pages.
 * Provides sticky header behavior, smooth scroll navigation to
 * category sections, and active category highlighting.
 *
 * Features:
 * - Sticky positioning at top of viewport
 * - Horizontal scrolling on mobile (touch-friendly)
 * - Smooth scroll to category sections
 * - Active category highlighting based on scroll position
 * - Product count badges
 * - Animation for active indicator
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryItem {
  /** Category ID (null for uncategorized) */
  id: string | null;
  /** Category name */
  name: string | null;
  /** Number of products in this category */
  productCount: number;
  /** Sort order for display */
  sortOrder?: number;
}

export interface CategoryTabsProps {
  /** Array of categories to display */
  categories: CategoryItem[];
  /** Currently active category ID */
  activeCategoryId?: string | null;
  /** Callback when a category tab is clicked */
  onCategoryClick?: (categoryId: string | null) => void;
  /** Whether to enable sticky behavior */
  sticky?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Whether to show product counts */
  showProductCounts?: boolean;
  /** Whether to auto-scroll to active tab */
  autoScrollToActive?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the element ID for a category section
 */
function getCategoryElementId(categoryId: string | null): string {
  return categoryId || 'uncategorized';
}

/**
 * Smooth scroll to a category section
 */
function scrollToCategory(categoryId: string | null): void {
  const elementId = getCategoryElementId(categoryId);
  const element = document.getElementById(elementId);

  if (element) {
    // Get the sticky header height
    const stickyHeader = document.querySelector('[data-sticky-nav]');
    const offset = stickyHeader?.getBoundingClientRect().height || 60;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - offset - 16;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }
}

// =============================================================================
// CATEGORY TAB COMPONENT
// =============================================================================

interface CategoryTabProps {
  category: CategoryItem;
  isActive: boolean;
  showProductCount: boolean;
  onClick: () => void;
}

function CategoryTab({
  category,
  isActive,
  showProductCount,
  onClick,
}: CategoryTabProps) {
  const displayName = category.name || 'Diger';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full
        transition-all duration-200 whitespace-nowrap
        active:scale-95 touch-pan-x
        ${
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
        }
      `}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`${displayName} kategorisi${showProductCount ? `, ${category.productCount} urun` : ''}`}
    >
      <span>{displayName}</span>
      {showProductCount && (
        <span
          className={`
            ml-1.5 text-xs
            ${isActive ? 'text-primary-200' : 'text-gray-500'}
          `}
        >
          ({category.productCount})
        </span>
      )}
    </button>
  );
}

// =============================================================================
// SCROLL INDICATOR COMPONENT
// =============================================================================

interface ScrollIndicatorProps {
  direction: 'left' | 'right';
  onClick: () => void;
  visible: boolean;
}

function ScrollIndicator({ direction, onClick, visible }: ScrollIndicatorProps) {
  if (!visible) return null;

  const isLeft = direction === 'left';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        absolute top-1/2 -translate-y-1/2 z-10
        w-8 h-8 flex items-center justify-center
        bg-white/90 backdrop-blur-sm rounded-full shadow-md
        text-gray-600 hover:text-gray-900
        transition-opacity duration-200
        ${isLeft ? 'left-2' : 'right-2'}
      `}
      aria-label={isLeft ? 'Sola kaydir' : 'Saga kaydir'}
    >
      <svg
        className={`w-4 h-4 ${isLeft ? '' : 'rotate-180'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}

// =============================================================================
// MAIN CATEGORY TABS COMPONENT
// =============================================================================

export function CategoryTabs({
  categories,
  activeCategoryId,
  onCategoryClick,
  sticky = true,
  className = '',
  showProductCounts = true,
  autoScrollToActive = true,
}: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  // Check if we should render (for use after hooks)
  const shouldRender = categories.length > 1;

  // Check scroll indicators visibility
  const updateScrollIndicators = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftIndicator(scrollLeft > 10);
    setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  // Handle scroll events
  useEffect(() => {
    if (!shouldRender) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollIndicators();

    container.addEventListener('scroll', updateScrollIndicators, { passive: true });
    window.addEventListener('resize', updateScrollIndicators, { passive: true });

    return () => {
      container.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators, shouldRender]);

  // Auto-scroll to active tab
  useEffect(() => {
    if (!shouldRender) return;
    if (!autoScrollToActive || activeCategoryId === undefined) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const activeIndex = categories.findIndex((c) => c.id === activeCategoryId);
    if (activeIndex === -1) return;

    const activeButton = container.children[activeIndex] as HTMLElement;
    if (!activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    // Check if button is outside visible area
    if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
      const scrollLeft =
        activeButton.offsetLeft -
        container.clientWidth / 2 +
        activeButton.clientWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [activeCategoryId, autoScrollToActive, categories, shouldRender]);

  // Handle tab click
  const handleTabClick = useCallback((categoryId: string | null) => {
    scrollToCategory(categoryId);
    onCategoryClick?.(categoryId);
  }, [onCategoryClick]);

  // Handle scroll indicator clicks
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: -200, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: 200, behavior: 'smooth' });
  }, []);

  // Don't render if there's only one or no categories
  if (!shouldRender) {
    return null;
  }

  return (
    <nav
      data-sticky-nav
      className={`
        ${sticky ? 'sticky top-0 z-20' : ''}
        bg-white border-b border-gray-200 shadow-sm
        ${className}
      `}
      aria-label="Kategori navigasyonu"
    >
      <div className="relative max-w-6xl mx-auto">
        {/* Scroll indicators */}
        <ScrollIndicator
          direction="left"
          onClick={scrollLeft}
          visible={showLeftIndicator}
        />
        <ScrollIndicator
          direction="right"
          onClick={scrollRight}
          visible={showRightIndicator}
        />

        {/* Tabs container */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide py-3 gap-2 px-4 touch-pan-x"
        >
          {categories.map((category) => (
            <CategoryTab
              key={category.id || 'uncategorized'}
              category={category}
              isActive={activeCategoryId === category.id}
              showProductCount={showProductCounts}
              onClick={() => handleTabClick(category.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// HOOK: USE CATEGORY SCROLL TRACKING
// =============================================================================

interface UseCategoryScrollOptions {
  /** Categories to track */
  categories: CategoryItem[];
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Root margin for early triggering */
  rootMargin?: string;
}

/**
 * Hook to track which category is currently in view
 */
export function useCategoryScrollTracking(options: UseCategoryScrollOptions) {
  const { categories, threshold = 0.3, rootMargin = '-20% 0px -60% 0px' } = options;
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible
        let mostVisibleEntry: IntersectionObserverEntry | null = null;
        let highestRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
            highestRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry) {
          const categoryId = (mostVisibleEntry as IntersectionObserverEntry).target.id;
          setActiveCategoryId(categoryId === 'uncategorized' ? null : categoryId);
        }
      },
      { threshold, rootMargin }
    );

    // Observe all category sections
    categories.forEach((category) => {
      const elementId = getCategoryElementId(category.id);
      const element = document.getElementById(elementId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [categories, threshold, rootMargin]);

  return { activeCategoryId, setActiveCategoryId };
}

// =============================================================================
// CATEGORY SECTION WRAPPER
// =============================================================================

interface CategorySectionWrapperProps {
  /** Category ID for scroll targeting */
  categoryId: string | null;
  /** Category name for display */
  categoryName: string | null;
  /** Optional category description */
  categoryDescription?: string | null;
  /** Children elements (products) */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Wrapper component for category sections that enables scroll tracking
 */
export function CategorySectionWrapper({
  categoryId,
  categoryName,
  categoryDescription,
  children,
  className = '',
}: CategorySectionWrapperProps) {
  const elementId = getCategoryElementId(categoryId);
  const displayName = categoryName || 'Diger';

  return (
    <section
      id={elementId}
      data-category-id={categoryId || 'uncategorized'}
      className={`scroll-mt-20 ${className}`}
    >
      {/* Category Header */}
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          {displayName}
        </h2>
        {categoryDescription && (
          <p className="mt-1 text-sm text-gray-600">{categoryDescription}</p>
        )}
      </div>

      {/* Category Content */}
      {children}
    </section>
  );
}

// =============================================================================
// SIMPLE CATEGORY NAV (for server components)
// =============================================================================

interface SimpleCategoryNavProps {
  categories: CategoryItem[];
  className?: string;
  showProductCounts?: boolean;
}

/**
 * Simple category navigation without scroll tracking
 * Can be used in server components
 */
export function SimpleCategoryNav({
  categories,
  className = '',
  showProductCounts = true,
}: SimpleCategoryNavProps) {
  if (categories.length <= 1) return null;

  return (
    <nav
      className={`sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm ${className}`}
      aria-label="Kategori navigasyonu"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex overflow-x-auto scrollbar-hide py-3 gap-2 -mx-4 px-4 touch-pan-x">
          {categories.map((category) => {
            const elementId = getCategoryElementId(category.id);
            const displayName = category.name || 'Diger';

            return (
              <a
                key={category.id || 'uncategorized'}
                href={`#${elementId}`}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors whitespace-nowrap active:scale-95"
              >
                {displayName}
                {showProductCounts && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({category.productCount})
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default CategoryTabs;

// Re-export helper function for external use
export { scrollToCategory, getCategoryElementId };
