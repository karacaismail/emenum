/**
 * Button Component
 *
 * Yeniden kullanilabilir buton componenti.
 * Farkli varyantlar, boyutlar ve durumlar destekler.
 *
 * @example
 * ```tsx
 * // Primary buton
 * <Button variant="primary">Kaydet</Button>
 *
 * // Secondary buton
 * <Button variant="secondary">Iptal</Button>
 *
 * // Danger buton
 * <Button variant="danger">Sil</Button>
 *
 * // Loading durumu
 * <Button isLoading>Kaydediliyor...</Button>
 *
 * // Ikon ile
 * <Button leftIcon={<PlusIcon />}>Yeni Ekle</Button>
 *
 * // Sadece ikon
 * <Button variant="ghost" size="sm" iconOnly aria-label="Duzenle">
 *   <EditIcon />
 * </Button>
 * ```
 */

'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Button variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';

/**
 * Button sizes
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button props interface
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  isLoading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon only (for square buttons) */
  iconOnly?: boolean;
  /** Left icon */
  leftIcon?: ReactNode;
  /** Right icon */
  rightIcon?: ReactNode;
  /** Children content */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base button styles
 */
const baseStyles = `
  inline-flex items-center justify-center
  font-medium rounded-lg
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-60 disabled:cursor-not-allowed
`;

/**
 * Variant styles map
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500 active:bg-gray-100',
  danger: 'bg-error-600 text-white hover:bg-error-500 focus:ring-error-500 active:bg-red-700',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200',
  link: 'text-primary-600 hover:text-primary-700 hover:underline focus:ring-primary-500 p-0',
};

/**
 * Size styles map
 */
const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-2 text-base',
  xl: 'px-6 py-3 text-base',
};

/**
 * Icon only size styles (square buttons)
 */
const iconOnlySizeStyles: Record<ButtonSize, string> = {
  xs: 'p-1',
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
  xl: 'p-3',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Loading spinner component
 */
function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Button Component
 *
 * Yeniden kullanilabilir buton componenti.
 * Primary, secondary, danger, ghost ve link varyantlari destekler.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      iconOnly = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Determine size styles based on iconOnly flag
    const appliedSizeStyles = iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size];

    // Build class string
    const buttonClasses = [
      baseStyles,
      variantStyles[variant],
      appliedSizeStyles,
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Determine if button should be disabled
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={buttonClasses}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <Spinner className={children || leftIcon || rightIcon ? 'mr-2 w-4 h-4' : 'w-4 h-4'} />
        )}

        {/* Left icon */}
        {!isLoading && leftIcon && (
          <span className={children ? 'mr-2' : ''}>{leftIcon}</span>
        )}

        {/* Children */}
        {!isLoading || children ? children : null}

        {/* Right icon */}
        {!isLoading && rightIcon && (
          <span className={children ? 'ml-2' : ''}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Icon Button - Square button for icons only
 *
 * @example
 * ```tsx
 * <IconButton aria-label="Duzenle">
 *   <EditIcon />
 * </IconButton>
 * ```
 */
export function IconButton({
  children,
  size = 'md',
  variant = 'ghost',
  ...props
}: ButtonProps) {
  return (
    <Button variant={variant} size={size} iconOnly {...props}>
      {children}
    </Button>
  );
}

/**
 * Button Group - Group buttons together
 *
 * @example
 * ```tsx
 * <ButtonGroup>
 *   <Button variant="secondary">Onceki</Button>
 *   <Button variant="primary">Sonraki</Button>
 * </ButtonGroup>
 * ```
 */
export function ButtonGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}
