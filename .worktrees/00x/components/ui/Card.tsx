/**
 * Card Component
 *
 * Yeniden kullanilabilir card (kart) componenti.
 * Header, body ve footer alanlarini destekler.
 *
 * @example
 * ```tsx
 * // Basit kullanim
 * <Card>
 *   <CardBody>Icerik burada</CardBody>
 * </Card>
 *
 * // Header ve footer ile
 * <Card>
 *   <CardHeader title="Baslik" subtitle="Alt baslik" />
 *   <CardBody>Icerik burada</CardBody>
 *   <CardFooter>
 *     <Button>Kaydet</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Compact ve hoverable
 * <Card variant="compact" hoverable>
 *   <CardBody>Tiklanabilir kart</CardBody>
 * </Card>
 * ```
 */

'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Card variants
 */
export type CardVariant = 'default' | 'compact' | 'bordered' | 'elevated';

/**
 * Card padding sizes
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Card props interface
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: CardVariant;
  /** Padding size */
  padding?: CardPadding;
  /** Enable hover effect */
  hoverable?: boolean;
  /** Make card clickable (adds cursor pointer) */
  clickable?: boolean;
  /** Children content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card header props
 */
export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Header title */
  title?: ReactNode;
  /** Header subtitle */
  subtitle?: ReactNode;
  /** Right side action/content */
  action?: ReactNode;
  /** Children (alternative to title/subtitle) */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Border bottom */
  bordered?: boolean;
}

/**
 * Card body props
 */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Children content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Padding size override */
  padding?: CardPadding;
}

/**
 * Card footer props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Children content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Border top */
  bordered?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base card styles
 */
const baseStyles = 'bg-white rounded-xl overflow-hidden';

/**
 * Variant styles
 */
const variantStyles: Record<CardVariant, string> = {
  default: 'border border-gray-200 shadow-sm',
  compact: 'border border-gray-200',
  bordered: 'border-2 border-gray-300',
  elevated: 'shadow-lg',
};

/**
 * Padding styles
 */
const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

/**
 * Footer justify styles
 */
const justifyStyles: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

// =============================================================================
// CARD COMPONENT
// =============================================================================

/**
 * Card Component
 *
 * Container component icin kullanilir.
 * Header, body ve footer ile birlikte kullanilabilir.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding,
      hoverable = false,
      clickable = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const cardClasses = [
      baseStyles,
      variantStyles[variant],
      padding ? paddingStyles[padding] : '',
      hoverable ? 'transition-shadow hover:shadow-md' : '',
      clickable ? 'cursor-pointer' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

// =============================================================================
// CARD HEADER COMPONENT
// =============================================================================

/**
 * Card Header Component
 *
 * Card'in ust kisminda baslik ve eylem alani saglar.
 */
export function CardHeader({
  title,
  subtitle,
  action,
  children,
  className = '',
  bordered = false,
  ...props
}: CardHeaderProps) {
  const headerClasses = [
    'px-4 py-4 sm:px-6',
    bordered ? 'border-b border-gray-200' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // If children provided, render them directly
  if (children) {
    return (
      <div className={headerClasses} {...props}>
        {children}
      </div>
    );
  }

  // Otherwise render title/subtitle/action layout
  return (
    <div className={headerClasses} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// =============================================================================
// CARD BODY COMPONENT
// =============================================================================

/**
 * Card Body Component
 *
 * Card'in ana icerik alani.
 */
export function CardBody({
  children,
  className = '',
  padding = 'md',
  ...props
}: CardBodyProps) {
  const bodyClasses = [paddingStyles[padding], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={bodyClasses} {...props}>
      {children}
    </div>
  );
}

// =============================================================================
// CARD FOOTER COMPONENT
// =============================================================================

/**
 * Card Footer Component
 *
 * Card'in alt kisminda eylemler icin alan saglar.
 */
export function CardFooter({
  children,
  className = '',
  justify = 'end',
  bordered = true,
  ...props
}: CardFooterProps) {
  const footerClasses = [
    'px-4 py-4 sm:px-6',
    'flex items-center gap-3',
    justifyStyles[justify],
    bordered ? 'border-t border-gray-200 bg-gray-50' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={footerClasses} {...props}>
      {children}
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Simple Card - Card with default padding (no sub-components needed)
 *
 * @example
 * ```tsx
 * <SimpleCard title="Baslik">
 *   Icerik burada
 * </SimpleCard>
 * ```
 */
export function SimpleCard({
  title,
  children,
  className = '',
  action,
  ...props
}: {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className} {...props}>
      {title && <CardHeader title={title} action={action} bordered />}
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/**
 * Stats Card - Card for displaying statistics
 *
 * @example
 * ```tsx
 * <StatsCard
 *   title="Toplam Urun"
 *   value={42}
 *   icon={<ProductIcon />}
 *   trend={{ value: 12, isPositive: true }}
 * />
 * ```
 */
export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardBody padding="md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <p
                className={`mt-1 text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}{trend.value}%
              </p>
            )}
          </div>
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Action Card - Card with action buttons at bottom
 *
 * @example
 * ```tsx
 * <ActionCard
 *   title="Urun Ekle"
 *   description="Yeni urun eklemek icin tiklayin"
 *   actions={<Button>Ekle</Button>}
 * />
 * ```
 */
export function ActionCard({
  title,
  description,
  children,
  actions,
  className = '',
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardBody>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </CardBody>
      <CardFooter>{actions}</CardFooter>
    </Card>
  );
}
