'use client'

import { useState, useCallback } from 'react'

/**
 * Delete confirmation state interface
 */
export interface DeleteConfirmationState<TItem> {
  /** Item targeted for deletion (null when modal is closed) */
  deleteTarget: TItem | null
  /** Whether a delete operation is currently in progress */
  isDeleting: boolean
}

/**
 * Delete confirmation actions interface
 */
export interface DeleteConfirmationActions<TItem> {
  /** Open delete confirmation dialog for an item */
  openDeleteConfirmation: (item: TItem) => void
  /** Close delete confirmation dialog */
  closeDeleteConfirmation: () => void
  /** Set the deleting state (used during async delete operations) */
  setIsDeleting: (isDeleting: boolean) => void
  /** Execute delete operation with built-in state management */
  handleDelete: (deleteFn: (item: TItem) => Promise<void>) => Promise<void>
}

/**
 * Complete delete confirmation state value
 */
export type DeleteConfirmationValue<TItem> = DeleteConfirmationState<TItem> &
  DeleteConfirmationActions<TItem>

/**
 * Hook to manage delete confirmation dialog state
 *
 * This hook abstracts the common pattern of managing delete confirmation dialogs
 * found across CRUD pages. It provides a clean, reusable way to implement the
 * "Are you sure?" workflow for destructive delete operations.
 *
 * The hook manages:
 * 1. Delete target tracking (which item is being deleted)
 * 2. Confirmation dialog visibility state
 * 3. Delete operation in-progress state
 * 4. Automatic state cleanup after deletion
 *
 * Features:
 * - Two usage patterns: convenience wrapper or manual control
 * - Type-safe delete target with generics
 * - Built-in loading state management
 * - Automatic dialog closure on success
 * - Error propagation for proper error handling
 *
 * @example
 * Recommended usage with handleDelete wrapper:
 * ```tsx
 * function ProductsPage() {
 *   const {
 *     deleteTarget,
 *     isDeleting,
 *     openDeleteConfirmation,
 *     closeDeleteConfirmation,
 *     handleDelete
 *   } = useDeleteConfirmation<Product>()
 *
 *   const handleDeleteConfirm = async () => {
 *     try {
 *       await handleDelete(async (product) => {
 *         const supabase = createClient()
 *         const { error } = await supabase
 *           .from('products')
 *           .delete()
 *           .eq('id', product.id)
 *         if (error) throw error
 *         await fetchProducts() // Refresh list
 *       })
 *     } catch (err) {
 *       setError('Failed to delete product')
 *     }
 *   }
 *
 *   return (
 *     <>
 *       <button onClick={() => openDeleteConfirmation(product)}>
 *         Delete
 *       </button>
 *
 *       <Modal isOpen={!!deleteTarget} onClose={closeDeleteConfirmation}>
 *         <p>Delete {deleteTarget?.name}?</p>
 *         <button onClick={handleDeleteConfirm} disabled={isDeleting}>
 *           Confirm Delete
 *         </button>
 *       </Modal>
 *     </>
 *   )
 * }
 * ```
 *
 * @example
 * Alternative usage with manual state control:
 * ```tsx
 * const {
 *   deleteTarget,
 *   isDeleting,
 *   openDeleteConfirmation,
 *   closeDeleteConfirmation,
 *   setIsDeleting
 * } = useDeleteConfirmation<Product>()
 *
 * const handleDeleteConfirm = async () => {
 *   if (!deleteTarget) return
 *   setIsDeleting(true)
 *   try {
 *     const supabase = createClient()
 *     await supabase.from('products').delete().eq('id', deleteTarget.id)
 *     closeDeleteConfirmation()
 *     await fetchProducts()
 *   } catch (error) {
 *     setError('Delete failed')
 *   } finally {
 *     setIsDeleting(false)
 *   }
 * }
 * ```
 *
 * @template TItem - The type of item being deleted (e.g., Product, Category)
 * @returns DeleteConfirmationValue - Delete confirmation state and action methods
 */
export function useDeleteConfirmation<TItem>(): DeleteConfirmationValue<TItem> {
  // State
  const [deleteTarget, setDeleteTarget] = useState<TItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Open delete confirmation dialog for an item
   */
  const openDeleteConfirmation = useCallback((item: TItem) => {
    setDeleteTarget(item)
  }, [])

  /**
   * Close delete confirmation dialog and reset state
   */
  const closeDeleteConfirmation = useCallback(() => {
    setDeleteTarget(null)
    setIsDeleting(false)
  }, [])

  /**
   * Execute delete operation with automatic state management
   *
   * This is a convenience method that wraps the delete operation with
   * proper state management and cleanup.
   */
  const handleDelete = useCallback(
    async (deleteFn: (item: TItem) => Promise<void>) => {
      if (!deleteTarget) return

      setIsDeleting(true)
      try {
        await deleteFn(deleteTarget)
        closeDeleteConfirmation()
      } catch (error) {
        // Re-throw to allow caller to handle errors
        throw error
      } finally {
        setIsDeleting(false)
      }
    },
    [deleteTarget, closeDeleteConfirmation]
  )

  return {
    // State
    deleteTarget,
    isDeleting,
    // Actions
    openDeleteConfirmation,
    closeDeleteConfirmation,
    setIsDeleting,
    handleDelete,
  }
}
