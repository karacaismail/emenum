/**
 * Menu Components Barrel Export
 *
 * This file exports all public-facing menu components for easy importing.
 * These components are designed for the customer-facing menu pages.
 *
 * Usage:
 * import { MenuLayout, CategoryTabs, ProductCard, useCategoryScrollTracking } from '@/components/menu';
 * import { MenuPageSkeleton, InvalidSlugError, OfflineMessage } from '@/components/menu';
 */

// =============================================================================
// MENU LAYOUT EXPORTS
// =============================================================================

export {
  MenuLayout,
  MenuHeader,
  ContactInfo,
  MenuFooter,
  EmptyMenuState,
  MenuNotFound,
  useScrollObserver,
} from './MenuLayout';

export type {
  OrganizationBranding,
  MenuLayoutProps,
} from './MenuLayout';

// =============================================================================
// CATEGORY TABS EXPORTS
// =============================================================================

export {
  CategoryTabs,
  CategorySectionWrapper,
  SimpleCategoryNav,
  useCategoryScrollTracking,
  scrollToCategory,
  getCategoryElementId,
} from './CategoryTabs';

export type {
  CategoryItem,
  CategoryTabsProps,
} from './CategoryTabs';

// =============================================================================
// PRODUCT CARD EXPORTS
// =============================================================================

export {
  ProductCard,
  ProductCardSkeleton,
  ProductCardGrid,
  formatPrice,
  isHappyHourActive,
  getHappyHourRemaining,
} from './ProductCard';

export type {
  ProductCardData,
  ProductCardProps,
  ProductCardVariant,
} from './ProductCard';

// =============================================================================
// CALL WAITER BUTTON EXPORTS
// =============================================================================

export {
  CallWaiterButton,
  FloatingCallButton,
  CompactCallButton,
  BillRequestButton,
  CallWaiterSection,
} from './CallWaiterButton';

export type {
  CallWaiterButtonProps,
  ServiceRequestType,
} from './CallWaiterButton';

// =============================================================================
// MENU SKELETON EXPORTS
// =============================================================================

export {
  MenuPageSkeleton,
  MenuHeaderSkeleton,
  CategoryTabsSkeleton,
  MenuProductCardSkeleton,
  ProductGridSkeleton,
  CategorySectionSkeleton,
  ContactInfoSkeleton,
  FooterSkeleton,
  FloatingButtonSkeleton,
  TextSkeleton,
  PriceSkeleton,
  BadgeSkeleton,
} from './MenuSkeleton';

export type {} from './MenuSkeleton';

// =============================================================================
// MENU ERROR EXPORTS
// =============================================================================

export {
  MenuError,
  InvalidSlugError,
  OrganizationInactiveError,
  OfflineMessage,
  NetworkError,
  OfflineAwareWrapper,
  ErrorBoundaryFallback,
  useOnlineStatus,
} from './MenuError';

export type {
  ErrorStateProps,
  InvalidSlugErrorProps,
  OrganizationInactiveErrorProps,
  OfflineMessageProps,
} from './MenuError';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export { MenuLayout as default } from './MenuLayout';
