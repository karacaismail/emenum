/**
 * UI Components Library
 *
 * Tum UI componentlerini tek bir yerden import etmek icin barrel export dosyasi.
 *
 * @example
 * ```tsx
 * import {
 *   Button,
 *   Input,
 *   Card,
 *   Modal,
 *   Badge,
 *   ToastProvider,
 *   useToast,
 * } from '@/components/ui';
 * ```
 */

// =============================================================================
// BUTTON
// =============================================================================

export { default as Button, IconButton, ButtonGroup } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// =============================================================================
// INPUT
// =============================================================================

export { default as Input, Textarea, SearchInput, FormField } from './Input';
export type {
  InputProps,
  TextareaProps,
  InputComponentProps,
  InputSize,
} from './Input';

// =============================================================================
// CARD
// =============================================================================

export {
  default as Card,
  CardHeader,
  CardBody,
  CardFooter,
  SimpleCard,
  StatsCard,
  ActionCard,
} from './Card';
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
  CardVariant,
  CardPadding,
} from './Card';

// =============================================================================
// MODAL
// =============================================================================

export {
  default as Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmModal,
  AlertModal,
} from './Modal';
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalSize,
} from './Modal';

// =============================================================================
// BADGE
// =============================================================================

export {
  default as Badge,
  StatusBadge,
  RoleBadge,
  CountBadge,
  TagBadge,
  NewBadge,
  ProBadge,
  PremiumBadge,
} from './Badge';
export type {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  BadgeShape,
} from './Badge';

// =============================================================================
// TOAST
// =============================================================================

export {
  default as ToastProvider,
  useToast,
  useToastSafe,
  toast,
} from './Toast';
export type {
  ToastProviderProps,
  ToastContextValue,
  ToastItem,
  ToastOptions,
  ToastType,
  ToastPosition,
} from './Toast';

// =============================================================================
// UPGRADE PROMPT (already exists)
// =============================================================================

export {
  default as UpgradePrompt,
  UpgradeModal,
  LockedButton,
  LimitBanner,
} from './UpgradePrompt';
export type {
  UpgradePromptProps,
  UpgradePromptVariant,
  UpgradeModalProps,
  LimitInfo,
} from './UpgradePrompt';
