/**
 * Modal Component
 *
 * Yeniden kullanilabilir modal/dialog componenti.
 * Overlay, close butonu ve farkli boyutlar destekler.
 *
 * @example
 * ```tsx
 * // Basit kullanim
 * <Modal isOpen={isOpen} onClose={handleClose} title="Baslik">
 *   Modal icerigi
 * </Modal>
 *
 * // Boyut ve footer ile
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Onayla"
 *   size="sm"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={handleClose}>Iptal</Button>
 *       <Button onClick={handleConfirm}>Onayla</Button>
 *     </>
 *   }
 * >
 *   Emin misiniz?
 * </Modal>
 *
 * // Fullscreen modal
 * <Modal isOpen={isOpen} onClose={handleClose} fullscreen>
 *   Tam ekran icerik
 * </Modal>
 * ```
 */

'use client';

import {
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Modal sizes
 */
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/**
 * Modal props interface
 */
export interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Modal title */
  title?: ReactNode;
  /** Modal description (below title) */
  description?: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Children content */
  children: ReactNode;
  /** Footer content (e.g., action buttons) */
  footer?: ReactNode;
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Additional class for modal content */
  className?: string;
  /** Fullscreen mode */
  fullscreen?: boolean;
  /** Center content vertically */
  centered?: boolean;
  /** Prevent scroll on body when open */
  preventScroll?: boolean;
  /** Z-index for stacking modals */
  zIndex?: number;
}

/**
 * Modal header props
 */
export interface ModalHeaderProps {
  /** Title content */
  title?: ReactNode;
  /** Description content */
  description?: ReactNode;
  /** Close callback */
  onClose?: () => void;
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Children content (alternative to title/description) */
  children?: ReactNode;
  /** Additional class */
  className?: string;
}

/**
 * Modal body props
 */
export interface ModalBodyProps {
  /** Children content */
  children: ReactNode;
  /** Additional class */
  className?: string;
}

/**
 * Modal footer props
 */
export interface ModalFooterProps {
  /** Children content */
  children: ReactNode;
  /** Additional class */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Size styles mapping
 */
const sizeStyles: Record<ModalSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Close icon SVG
 */
function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
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
// SUB-COMPONENTS
// =============================================================================

/**
 * Modal Header Component
 */
export function ModalHeader({
  title,
  description,
  onClose,
  hideCloseButton = false,
  children,
  className = '',
}: ModalHeaderProps) {
  // If children provided, render them directly
  if (children) {
    return (
      <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">{children}</div>
          {!hideCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Kapat"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {title && (
            <h3
              className="text-lg font-semibold text-gray-900"
              id="modal-title"
            >
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500" id="modal-description">
              {description}
            </p>
          )}
        </div>
        {!hideCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Kapat"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Modal Body Component
 */
export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`px-6 py-4 overflow-y-auto ${className}`}>{children}</div>
  );
}

/**
 * Modal Footer Component
 */
export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 ${className}`}
    >
      {children}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Modal Component
 *
 * Dialog/Modal penceresi icin kullanilir.
 * Overlay, close butonu ve farkli boyutlar destekler.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  fullscreen = false,
  centered = true,
  preventScroll = true,
  zIndex = 50,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (event: MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, preventScroll]);

  // Don't render if not open
  if (!isOpen) return null;

  // Calculate modal classes
  const modalClasses = fullscreen
    ? 'fixed inset-4 sm:inset-8'
    : `relative w-full ${sizeStyles[size]}`;

  const containerClasses = centered
    ? 'flex min-h-full items-center justify-center p-4'
    : 'flex min-h-full items-start justify-center p-4 pt-16';

  // Modal content
  const modalContent = (
    <div
      className={`fixed inset-0 overflow-y-auto`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleOverlayClick as unknown as React.MouseEventHandler}
      />

      {/* Modal container */}
      <div className={containerClasses}>
        {/* Modal panel */}
        <div
          className={`
            ${modalClasses}
            transform overflow-hidden rounded-xl bg-white shadow-xl
            transition-all
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || description || !hideCloseButton) && (
            <ModalHeader
              title={title}
              description={description}
              onClose={onClose}
              hideCloseButton={hideCloseButton}
            />
          )}

          {/* Body */}
          <ModalBody>{children}</ModalBody>

          {/* Footer */}
          {footer && <ModalFooter>{footer}</ModalFooter>}
        </div>
      </div>
    </div>
  );

  // Render through portal to ensure modal is at document root
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Confirmation Modal - Pre-styled for confirmation dialogs
 *
 * @example
 * ```tsx
 * <ConfirmModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onConfirm={handleConfirm}
 *   title="Silmeyi Onayla"
 *   message="Bu urunu silmek istediginize emin misiniz?"
 *   confirmText="Sil"
 *   cancelText="Iptal"
 *   variant="danger"
 * />
 * ```
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Onayla',
  message,
  confirmText = 'Onayla',
  cancelText = 'Iptal',
  variant = 'primary',
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
}) {
  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-error-600 text-white hover:bg-error-500 focus:ring-error-500'
      : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn-primary ${confirmButtonClass}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {confirmText}
              </span>
            ) : (
              confirmText
            )}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}

/**
 * Alert Modal - For displaying important information
 *
 * @example
 * ```tsx
 * <AlertModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Basarili!"
 *   message="Islem tamamlandi."
 *   type="success"
 * />
 * ```
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Tamam',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  buttonText?: string;
}) {
  const iconColors: Record<string, string> = {
    info: 'text-primary-600 bg-primary-100',
    success: 'text-green-600 bg-green-100',
    warning: 'text-amber-600 bg-amber-100',
    error: 'text-error-600 bg-error-100',
  };

  const icons: Record<string, ReactNode> = {
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      hideCloseButton
      footer={
        <button type="button" onClick={onClose} className="btn-primary w-full">
          {buttonText}
        </button>
      }
    >
      <div className="text-center">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconColors[type]}`}
        >
          {icons[type]}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </Modal>
  );
}
