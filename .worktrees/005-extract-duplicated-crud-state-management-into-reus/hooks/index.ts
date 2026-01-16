/**
 * CRUD State Management Hooks
 *
 * This module provides reusable hooks for managing common CRUD operation patterns.
 * These hooks extract duplicated state management logic found across 19+ CRUD pages.
 */

// Core CRUD state hook
export { useCrudState } from './useCrudState'
export type {
  CrudState,
  CrudActions,
  CrudStateValue,
  UseCrudStateOptions,
} from './useCrudState'

// Modal state management hook
export { useModalState } from './useModalState'
export type {
  ModalState,
  ModalActions,
  ModalStateValue,
  UseModalStateOptions,
} from './useModalState'

// Delete confirmation hook
export { useDeleteConfirmation } from './useDeleteConfirmation'
export type {
  DeleteConfirmationState,
  DeleteConfirmationActions,
  DeleteConfirmationValue,
} from './useDeleteConfirmation'

// Combined CRUD operations hook (recommended for most use cases)
export { useCrudOperations } from './useCrudOperations'
export type {
  CrudOperationsValue,
  UseCrudOperationsOptions,
} from './useCrudOperations'
