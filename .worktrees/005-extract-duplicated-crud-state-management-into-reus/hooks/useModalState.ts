'use client'

import { useState, useCallback } from 'react'

/**
 * Modal state interface
 */
export interface ModalState<TItem, TFormData> {
  /** Whether the modal is currently open */
  isModalOpen: boolean
  /** Item being edited (null for create mode) */
  editingItem: TItem | null
  /** Whether a save/submit operation is in progress */
  isSaving: boolean
  /** Form data for modal inputs */
  formData: TFormData
  /** Error message for form submission */
  formError: string | null
  /** Item targeted for deletion */
  deleteTarget: TItem | null
  /** Whether a delete operation is in progress */
  isDeleting: boolean
}

/**
 * Modal actions interface
 */
export interface ModalActions<TItem, TFormData> {
  /** Open modal for creating a new item */
  openCreateModal: (initialFormData: TFormData) => void
  /** Open modal for editing an existing item */
  openEditModal: (item: TItem, formData: TFormData) => void
  /** Close the modal and reset form state */
  closeModal: () => void
  /** Update form data */
  setFormData: (data: TFormData | ((prev: TFormData) => TFormData)) => void
  /** Set form error message */
  setFormError: (error: string | null) => void
  /** Set saving state */
  setIsSaving: (isSaving: boolean) => void
  /** Open delete confirmation modal */
  openDeleteConfirmation: (item: TItem) => void
  /** Close delete confirmation modal */
  closeDeleteConfirmation: () => void
  /** Set deleting state */
  setIsDeleting: (isDeleting: boolean) => void
  /** Reset all modal state */
  resetModalState: () => void
}

/**
 * Complete modal state value
 */
export type ModalStateValue<TItem, TFormData> = ModalState<TItem, TFormData> &
  ModalActions<TItem, TFormData>

/**
 * Options for useModalState hook
 */
export interface UseModalStateOptions<TFormData> {
  /** Default/initial form data structure */
  defaultFormData: TFormData
}

/**
 * Hook to manage modal and form state for CRUD operations
 *
 * This hook abstracts the common pattern of managing modal state, form data,
 * and delete confirmation dialogs used across CRUD pages. It consolidates
 * multiple related state concerns into a single, cohesive interface.
 *
 * The hook manages:
 * 1. Modal open/close state and visibility
 * 2. Create vs Edit mode detection (via editingItem)
 * 3. Form data state with type-safe updates
 * 4. Form submission state (isSaving) and error handling
 * 5. Delete confirmation dialog state
 * 6. Complete state reset capabilities
 *
 * Benefits:
 * - Single source of truth for all modal-related state
 * - Type-safe form data management with generics
 * - Automatic state cleanup on modal close
 * - Built-in delete confirmation workflow
 * - Reduces 50+ lines of boilerplate per CRUD page
 *
 * @example
 * Complete CRUD modal with create/edit:
 * ```tsx
 * interface CategoryFormData {
 *   name: string
 *   slug: string
 *   sort_order: number
 * }
 *
 * function CategoriesPage() {
 *   const {
 *     isModalOpen,
 *     editingItem,
 *     formData,
 *     formError,
 *     isSaving,
 *     deleteTarget,
 *     isDeleting,
 *     openCreateModal,
 *     openEditModal,
 *     closeModal,
 *     setFormData,
 *     setFormError,
 *     setIsSaving,
 *     openDeleteConfirmation,
 *     closeDeleteConfirmation,
 *     setIsDeleting,
 *   } = useModalState<Category, CategoryFormData>({
 *     defaultFormData: { name: '', slug: '', sort_order: 0 }
 *   })
 *
 *   const handleAdd = () => {
 *     openCreateModal({ name: '', slug: '', sort_order: categories.length })
 *   }
 *
 *   const handleEdit = (category: Category) => {
 *     openEditModal(category, {
 *       name: category.name,
 *       slug: category.slug,
 *       sort_order: category.sort_order,
 *     })
 *   }
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault()
 *     setIsSaving(true)
 *     try {
 *       if (editingItem) {
 *         await updateCategory(editingItem.id, formData)
 *       } else {
 *         await createCategory(formData)
 *       }
 *       closeModal()
 *     } catch (err) {
 *       setFormError('Save failed')
 *     } finally {
 *       setIsSaving(false)
 *     }
 *   }
 *
 *   return (
 *     <Modal isOpen={isModalOpen} onClose={closeModal}>
 *       <form onSubmit={handleSubmit}>
 *         <h2>{editingItem ? 'Edit' : 'Create'} Category</h2>
 *         {formError && <div>{formError}</div>}
 *         <input
 *           value={formData.name}
 *           onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
 *         />
 *         <button type="submit" disabled={isSaving}>
 *           {editingItem ? 'Update' : 'Create'}
 *         </button>
 *       </form>
 *     </Modal>
 *   )
 * }
 * ```
 *
 * @example
 * Simple usage with read-only modal:
 * ```tsx
 * const modalState = useModalState<User, {}>({
 *   defaultFormData: {}
 * })
 *
 * // Open modal to view details
 * modalState.openEditModal(user, {})
 * ```
 *
 * @template TItem - The type of item being created/edited (e.g., Category, Product)
 * @template TFormData - The type of form data structure
 * @param options - Configuration options including default form data
 * @returns ModalStateValue - Complete modal state and action methods
 */
export function useModalState<TItem, TFormData>(
  options: UseModalStateOptions<TFormData>
): ModalStateValue<TItem, TFormData> {
  const { defaultFormData } = options

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<TFormData>(defaultFormData)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<TItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Open modal for creating a new item
   */
  const openCreateModal = useCallback(
    (initialFormData: TFormData) => {
      setEditingItem(null)
      setFormData(initialFormData)
      setFormError(null)
      setIsModalOpen(true)
    },
    []
  )

  /**
   * Open modal for editing an existing item
   */
  const openEditModal = useCallback((item: TItem, formDataForEdit: TFormData) => {
    setEditingItem(item)
    setFormData(formDataForEdit)
    setFormError(null)
    setIsModalOpen(true)
  }, [])

  /**
   * Close the modal and reset form state
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingItem(null)
    setFormError(null)
    setIsSaving(false)
  }, [])

  /**
   * Open delete confirmation modal
   */
  const openDeleteConfirmation = useCallback((item: TItem) => {
    setDeleteTarget(item)
  }, [])

  /**
   * Close delete confirmation modal
   */
  const closeDeleteConfirmation = useCallback(() => {
    setDeleteTarget(null)
    setIsDeleting(false)
  }, [])

  /**
   * Reset all modal state to defaults
   */
  const resetModalState = useCallback(() => {
    setIsModalOpen(false)
    setEditingItem(null)
    setIsSaving(false)
    setFormData(defaultFormData)
    setFormError(null)
    setDeleteTarget(null)
    setIsDeleting(false)
  }, [defaultFormData])

  return {
    // State
    isModalOpen,
    editingItem,
    isSaving,
    formData,
    formError,
    deleteTarget,
    isDeleting,
    // Actions
    openCreateModal,
    openEditModal,
    closeModal,
    setFormData,
    setFormError,
    setIsSaving,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    setIsDeleting,
    resetModalState,
  }
}
