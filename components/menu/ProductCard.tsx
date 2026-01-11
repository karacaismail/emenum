/**
 * ProductCard Component
 *
 * Reusable product card component for public menu display.
 * Shows product name, description, price, image (if available),
 * and badges (Chef's Special, Daily Special, Happy Hour).
 *
 * Features:
 * - Mobile-first responsive design
 * - Image with lazy loading and proper aspect ratio
 * - Badge display on image or inline when no image
 * - Price formatting with currency support (TRY, USD, EUR)
 * - Additional info display (prep time, calories, allergens)
 * - Happy Hour indicator for time-limited prices
 * - Accessibility support (ARIA labels)
 *
 * @example
 * ```tsx
 * import { ProductCard } from '@/components/menu';
 *
 * <ProductCard product={menuItem} />
 * <ProductCard product={menuItem} variant="compact" />
 * <ProductCard product={menuItem} showImage={false} />
 * ```
 */

'use client';

import Image from 'next/image';
import type { CurrencyCode } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Product data structure for the card component.
 * Matches the MenuView from database types.
 */
export interface ProductCardData {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  allergens: string | null;
  calories: number | null;
  preparation_time_minutes: number | null;
  is_chef_special: boolean;
  is_daily_special: boolean;
  price: number | null;
  currency: CurrencyCode | null;
  price_valid_from?: string | null;
  price_valid_until?: string | null;
}

/**
 * Product card display variants
 */
export type ProductCardVariant = 'default' | 'compact' | 'horizontal';

/**
 * ProductCard component props
 */
export interface ProductCardProps {
  /** Product data to display */
  product: ProductCardData;
  /** Display variant */
  variant?: ProductCardVariant;
  /** Whether to show the product image */
  showImage?: boolean;
  /** Whether to show badges */
  showBadges?: boolean;
  /** Whether to show additional info (prep time, calories, allergens) */
  showInfo?: boolean;
  /** Click handler for the card */
  onClick?: (product: ProductCardData) => void;
  /** Additional className for the card container */
  className?: string;
  /** Image priority for above-the-fold images */
  imagePriority?: boolean;
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
  Sparkles: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with Turkish locale and currency
 */
export function formatPrice(price: number, currency: CurrencyCode = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Check if a product is currently in Happy Hour pricing
 */
export function isHappyHourActive(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  const endTime = new Date(validUntil);
  return endTime > new Date();
}

/**
 * Get Happy Hour time remaining as formatted string
 */
export function getHappyHourRemaining(validUntil: string): string {
  const endTime = new Date(validUntil);
  const now = new Date();
  const diffMs = endTime.getTime() - now.getTime();

  if (diffMs <= 0) return '';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} saat ${minutes} dk kaldi`;
  }
  return `${minutes} dk kaldi`;
}

// =============================================================================
// BADGE COMPONENTS
// =============================================================================

interface BadgeProps {
  variant: 'chef' | 'daily' | 'happyHour';
  onImage?: boolean;
}

function ProductBadge({ variant, onImage = false }: BadgeProps) {
  const baseClasses = onImage
    ? 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full'
    : 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full';

  const variants = {
    chef: {
      classes: onImage
        ? `${baseClasses} bg-amber-500 text-white`
        : `${baseClasses} bg-amber-100 text-amber-700`,
      icon: <Icons.ChefHat />,
      label: 'Sef Onerisi',
    },
    daily: {
      classes: onImage
        ? `${baseClasses} bg-orange-500 text-white`
        : `${baseClasses} bg-orange-100 text-orange-700`,
      icon: <Icons.Star />,
      label: 'Gunun Ozel',
    },
    happyHour: {
      classes: onImage
        ? `${baseClasses} bg-purple-500 text-white animate-pulse`
        : `${baseClasses} bg-purple-100 text-purple-700`,
      icon: <Icons.Sparkles />,
      label: 'Happy Hour',
    },
  };

  const { classes, icon, label } = variants[variant];

  return (
    <span className={classes} role="status" aria-label={label}>
      {icon}
      <span>{label}</span>
    </span>
  );
}

// =============================================================================
// PRODUCT BADGES COMPONENT
// =============================================================================

interface ProductBadgesProps {
  isChefSpecial: boolean;
  isDailySpecial: boolean;
  isHappyHour: boolean;
  onImage?: boolean;
}

function ProductBadges({
  isChefSpecial,
  isDailySpecial,
  isHappyHour,
  onImage = false,
}: ProductBadgesProps) {
  const hasBadges = isChefSpecial || isDailySpecial || isHappyHour;

  if (!hasBadges) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {isChefSpecial && <ProductBadge variant="chef" onImage={onImage} />}
      {isDailySpecial && <ProductBadge variant="daily" onImage={onImage} />}
      {isHappyHour && <ProductBadge variant="happyHour" onImage={onImage} />}
    </div>
  );
}

// =============================================================================
// PRODUCT INFO COMPONENT
// =============================================================================

interface ProductInfoProps {
  preparationTime: number | null;
  calories: number | null;
  allergens: string | null;
}

function ProductInfo({ preparationTime, calories, allergens }: ProductInfoProps) {
  const hasInfo = preparationTime || calories || allergens;

  if (!hasInfo) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
      {/* Preparation Time */}
      {preparationTime && (
        <span className="inline-flex items-center gap-1" title="Hazirlama suresi">
          <Icons.Clock />
          <span>{preparationTime} dk</span>
        </span>
      )}

      {/* Calories */}
      {calories && (
        <span className="inline-flex items-center gap-1" title="Kalori">
          <Icons.Fire />
          <span>{calories} kcal</span>
        </span>
      )}

      {/* Allergens */}
      {allergens && (
        <span
          className="inline-flex items-center gap-1 text-amber-600"
          title="Alerjen bilgisi"
          role="alert"
        >
          <Icons.AlertTriangle />
          <span>{allergens}</span>
        </span>
      )}
    </div>
  );
}

// =============================================================================
// DEFAULT PRODUCT CARD
// =============================================================================

function DefaultProductCard({
  product,
  showImage = true,
  showBadges = true,
  showInfo = true,
  onClick,
  className = '',
  imagePriority = false,
}: ProductCardProps) {
  const hasImage = showImage && !!product.image_url;
  const hasPrice = product.price !== null;
  const happyHourActive = isHappyHourActive(product.price_valid_until);

  const handleClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(product);
    }
  };

  return (
    <article
      className={`
        bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden
        hover:shadow-md transition-shadow
        ${onClick ? 'cursor-pointer focus-within:ring-2 focus-within:ring-primary-500' : ''}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : 'article'}
      aria-label={`${product.name}${hasPrice ? ` - ${formatPrice(product.price!, product.currency || 'TRY')}` : ''}`}
    >
      {/* Product Image */}
      {hasImage && (
        <div className="relative aspect-[16/9] bg-gray-100">
          <Image
            src={product.image_url!}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={imagePriority}
          />
          {/* Badges on image */}
          {showBadges && (
            <div className="absolute top-2 left-2">
              <ProductBadges
                isChefSpecial={product.is_chef_special}
                isDailySpecial={product.is_daily_special}
                isHappyHour={happyHourActive}
                onImage
              />
            </div>
          )}
        </div>
      )}

      {/* Product Content */}
      <div className="p-4">
        {/* Badges (when no image) */}
        {showBadges && !hasImage && (
          <div className="mb-2">
            <ProductBadges
              isChefSpecial={product.is_chef_special}
              isDailySpecial={product.is_daily_special}
              isHappyHour={happyHourActive}
              onImage={false}
            />
          </div>
        )}

        {/* Name and Price Row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 leading-tight">
            {product.name}
          </h3>
          {hasPrice && (
            <span
              className={`text-lg font-bold whitespace-nowrap ${
                happyHourActive ? 'text-purple-600' : 'text-primary-600'
              }`}
            >
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

        {/* Happy Hour remaining time */}
        {happyHourActive && product.price_valid_until && (
          <p className="mt-1 text-xs text-purple-600 font-medium">
            {getHappyHourRemaining(product.price_valid_until)}
          </p>
        )}

        {/* Additional Info */}
        {showInfo && (
          <ProductInfo
            preparationTime={product.preparation_time_minutes}
            calories={product.calories}
            allergens={product.allergens}
          />
        )}
      </div>
    </article>
  );
}

// =============================================================================
// COMPACT PRODUCT CARD
// =============================================================================

function CompactProductCard({
  product,
  showImage = true,
  showBadges = true,
  onClick,
  className = '',
}: ProductCardProps) {
  const hasImage = showImage && !!product.image_url;
  const hasPrice = product.price !== null;
  const happyHourActive = isHappyHourActive(product.price_valid_until);

  const handleClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  return (
    <article
      className={`
        bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden
        hover:shadow-md transition-shadow p-3
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleClick}
      role={onClick ? 'button' : 'article'}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {hasImage && (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            <Image
              src={product.image_url!}
              alt={product.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          {showBadges && (
            <div className="mb-1">
              <ProductBadges
                isChefSpecial={product.is_chef_special}
                isDailySpecial={product.is_daily_special}
                isHappyHour={happyHourActive}
                onImage={false}
              />
            </div>
          )}

          {/* Name */}
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
              {product.description}
            </p>
          )}
        </div>

        {/* Price */}
        {hasPrice && (
          <span
            className={`text-sm font-bold whitespace-nowrap ${
              happyHourActive ? 'text-purple-600' : 'text-primary-600'
            }`}
          >
            {formatPrice(product.price!, product.currency || 'TRY')}
          </span>
        )}
      </div>
    </article>
  );
}

// =============================================================================
// HORIZONTAL PRODUCT CARD
// =============================================================================

function HorizontalProductCard({
  product,
  showImage = true,
  showBadges = true,
  showInfo = true,
  onClick,
  className = '',
}: ProductCardProps) {
  const hasImage = showImage && !!product.image_url;
  const hasPrice = product.price !== null;
  const happyHourActive = isHappyHourActive(product.price_valid_until);

  const handleClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  return (
    <article
      className={`
        bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden
        hover:shadow-md transition-shadow
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleClick}
      role={onClick ? 'button' : 'article'}
    >
      <div className="flex">
        {/* Image */}
        {hasImage && (
          <div className="relative w-32 sm:w-40 flex-shrink-0 bg-gray-100">
            <Image
              src={product.image_url!}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 128px, 160px"
            />
            {/* Badges on image */}
            {showBadges && (
              <div className="absolute top-2 left-2">
                <ProductBadges
                  isChefSpecial={product.is_chef_special}
                  isDailySpecial={product.is_daily_special}
                  isHappyHour={happyHourActive}
                  onImage
                />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          {/* Badges (when no image) */}
          {showBadges && !hasImage && (
            <div className="mb-2">
              <ProductBadges
                isChefSpecial={product.is_chef_special}
                isDailySpecial={product.is_daily_special}
                isHappyHour={happyHourActive}
                onImage={false}
              />
            </div>
          )}

          {/* Name and Price */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {product.name}
            </h3>
            {hasPrice && (
              <span
                className={`text-lg font-bold whitespace-nowrap ${
                  happyHourActive ? 'text-purple-600' : 'text-primary-600'
                }`}
              >
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
          {showInfo && (
            <ProductInfo
              preparationTime={product.preparation_time_minutes}
              calories={product.calories}
              allergens={product.allergens}
            />
          )}
        </div>
      </div>
    </article>
  );
}

// =============================================================================
// MAIN PRODUCT CARD COMPONENT
// =============================================================================

/**
 * ProductCard component for displaying menu items.
 *
 * Supports three variants:
 * - default: Full card with vertical layout
 * - compact: Minimal card with horizontal layout, suitable for lists
 * - horizontal: Full card with horizontal image and content layout
 *
 * @example Default usage
 * ```tsx
 * <ProductCard product={product} />
 * ```
 *
 * @example Compact variant
 * ```tsx
 * <ProductCard product={product} variant="compact" />
 * ```
 *
 * @example With click handler
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onClick={(p) => openProductModal(p)}
 * />
 * ```
 *
 * @example Without image
 * ```tsx
 * <ProductCard product={product} showImage={false} />
 * ```
 */
export function ProductCard(props: ProductCardProps) {
  const { variant = 'default' } = props;

  switch (variant) {
    case 'compact':
      return <CompactProductCard {...props} />;
    case 'horizontal':
      return <HorizontalProductCard {...props} />;
    default:
      return <DefaultProductCard {...props} />;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * ProductCardSkeleton - Loading placeholder for ProductCard
 */
export function ProductCardSkeleton({
  variant = 'default',
  showImage = true,
}: {
  variant?: ProductCardVariant;
  showImage?: boolean;
}) {
  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="flex items-start gap-3">
          {showImage && (
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {showImage && <div className="aspect-[16/9] bg-gray-200" />}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}

/**
 * ProductCardGrid - Grid container for ProductCards
 */
export function ProductCardGrid({
  children,
  columns = 3,
  className = '',
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${columnClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default ProductCard;
