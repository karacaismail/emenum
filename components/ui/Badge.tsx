/**
 * Badge Component
 *
 * Yeniden kullanilabilir badge/etiket componenti.
 * Farkli varyantlar, boyutlar ve sekiller destekler.
 *
 * @example
 * ```tsx
 * // Basit kullanim
 * <Badge>Yeni</Badge>
 *
 * // Varyant ile
 * <Badge variant="success">Aktif</Badge>
 * <Badge variant="warning">Beklemede</Badge>
 * <Badge variant="error">Hatali</Badge>
 *
 * // Boyut ile
 * <Badge size="sm">Kucuk</Badge>
 * <Badge size="lg">Buyuk</Badge>
 *
 * // Nokta gostergesi ile
 * <Badge dot variant="success">Cevrimici</Badge>
 *
 * // Cikarilabilir
 * <Badge removable onRemove={handleRemove}>Etiket</Badge>
 * ```
 */

'use client';

import { type ReactNode, type HTMLAttributes } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Badge variants
 */
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

/**
 * Badge sizes
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Badge shapes
 */
export type BadgeShape = 'rounded' | 'pill' | 'square';

/**
 * Badge props interface
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Badge shape */
  shape?: BadgeShape;
  /** Show dot indicator */
  dot?: boolean;
  /** Dot position */
  dotPosition?: 'left' | 'right';
  /** Make badge removable */
  removable?: boolean;
  /** Remove callback */
  onRemove?: () => void;
  /** Left icon/element */
  leftIcon?: ReactNode;
  /** Right icon/element */
  rightIcon?: ReactNode;
  /** Children content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base badge styles
 */
const baseStyles = 'inline-flex items-center font-medium';

/**
 * Variant styles
 */
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  secondary: 'bg-gray-200 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

/**
 * Dot color styles
 */
const dotColorStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-primary-500',
  secondary: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

/**
 * Size styles
 */
const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

/**
 * Shape styles
 */
const shapeStyles: Record<BadgeShape, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
  square: 'rounded-none',
};

/**
 * Dot size styles
 */
const dotSizeStyles: Record<BadgeSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2 h-2',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Close/Remove icon SVG
 */
function CloseIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Badge Component
 *
 * Durum gostergesi, etiket veya sayac icin kullanilir.
 */
export default function Badge({
  variant = 'default',
  size = 'md',
  shape = 'pill',
  dot = false,
  dotPosition = 'left',
  removable = false,
  onRemove,
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const badgeClasses = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    shapeStyles[shape],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const dotClasses = [
    'rounded-full',
    dotColorStyles[variant],
    dotSizeStyles[size],
  ].join(' ');

  return (
    <span className={badgeClasses} {...props}>
      {/* Left dot */}
      {dot && dotPosition === 'left' && (
        <span className={`${dotClasses} mr-1.5`} aria-hidden="true" />
      )}

      {/* Left icon */}
      {leftIcon && <span className="mr-1">{leftIcon}</span>}

      {/* Content */}
      {children}

      {/* Right icon */}
      {rightIcon && <span className="ml-1">{rightIcon}</span>}

      {/* Right dot */}
      {dot && dotPosition === 'right' && (
        <span className={`${dotClasses} ml-1.5`} aria-hidden="true" />
      )}

      {/* Remove button */}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-0.5 hover:opacity-70 focus:outline-none"
          aria-label="Kaldir"
        >
          <CloseIcon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
        </button>
      )}
    </span>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Status Badge - Pre-styled for status indicators
 *
 * @example
 * ```tsx
 * <StatusBadge status="active">Aktif</StatusBadge>
 * <StatusBadge status="pending">Beklemede</StatusBadge>
 * <StatusBadge status="inactive">Pasif</StatusBadge>
 * ```
 */
export function StatusBadge({
  status,
  children,
  className = '',
}: {
  status: 'active' | 'pending' | 'inactive' | 'suspended' | 'cancelled' | 'error';
  children?: ReactNode;
  className?: string;
}) {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    active: { variant: 'success', label: 'Aktif' },
    pending: { variant: 'warning', label: 'Beklemede' },
    inactive: { variant: 'secondary', label: 'Pasif' },
    suspended: { variant: 'error', label: 'Askiya Alinmis' },
    cancelled: { variant: 'default', label: 'Iptal' },
    error: { variant: 'error', label: 'Hata' },
  };

  const statusInfo = statusMap[status] ?? statusMap.inactive;
  const { variant, label } = statusInfo!

  return (
    <Badge variant={variant} dot className={className}>
      {children || label}
    </Badge>
  );
}

/**
 * Role Badge - Pre-styled for user roles
 *
 * @example
 * ```tsx
 * <RoleBadge role="owner" />
 * <RoleBadge role="admin" />
 * <RoleBadge role="manager" />
 * ```
 */
export function RoleBadge({
  role,
  className = '',
}: {
  role: 'owner' | 'admin' | 'manager' | 'waiter' | 'viewer' | 'super_admin';
  className?: string;
}) {
  const roleMap: Record<string, { variant: BadgeVariant; label: string }> = {
    owner: { variant: 'primary', label: 'Sahip' },
    admin: { variant: 'info', label: 'Yonetici' },
    manager: { variant: 'success', label: 'Mudur' },
    waiter: { variant: 'warning', label: 'Garson' },
    viewer: { variant: 'secondary', label: 'Izleyici' },
    super_admin: { variant: 'error', label: 'Super Admin' },
  };

  const roleInfo = roleMap[role] ?? roleMap.viewer;
  const { variant, label } = roleInfo!

  return (
    <Badge variant={variant} size="sm" className={className}>
      {label}
    </Badge>
  );
}

/**
 * Count Badge - Badge for displaying numbers/counts
 *
 * @example
 * ```tsx
 * <CountBadge count={5} />
 * <CountBadge count={99} max={99} />
 * ```
 */
export function CountBadge({
  count,
  max = 99,
  variant = 'primary',
  className = '',
}: {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  className?: string;
}) {
  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant={variant}
      size="xs"
      shape="pill"
      className={`min-w-[1.25rem] justify-center ${className}`}
    >
      {displayCount}
    </Badge>
  );
}

/**
 * Tag Badge - For tag/label lists
 *
 * @example
 * ```tsx
 * <TagBadge onRemove={() => handleRemove('tag1')}>JavaScript</TagBadge>
 * ```
 */
export function TagBadge({
  children,
  onRemove,
  className = '',
}: {
  children: ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      size="sm"
      removable={!!onRemove}
      onRemove={onRemove}
      className={className}
    >
      {children}
    </Badge>
  );
}

/**
 * New Badge - "Yeni" badge for highlighting new items
 *
 * @example
 * ```tsx
 * <NewBadge />
 * ```
 */
export function NewBadge({ className = '' }: { className?: string }) {
  return (
    <Badge variant="success" size="xs" className={className}>
      Yeni
    </Badge>
  );
}

/**
 * Pro Badge - For Pro plan features
 *
 * @example
 * ```tsx
 * <ProBadge />
 * ```
 */
export function ProBadge({ className = '' }: { className?: string }) {
  return (
    <Badge variant="primary" size="xs" className={className}>
      Pro
    </Badge>
  );
}

/**
 * Premium Badge - For Premium plan features
 *
 * @example
 * ```tsx
 * <PremiumBadge />
 * ```
 */
export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <Badge
      variant="warning"
      size="xs"
      className={className}
      leftIcon={
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      }
    >
      Premium
    </Badge>
  );
}
