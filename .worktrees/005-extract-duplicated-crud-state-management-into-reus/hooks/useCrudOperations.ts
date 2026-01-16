'use client'

import { useCrudState, UseCrudStateOptions, CrudStateValue } from './useCrudState'
import {
  useModalState,
  UseModalStateOptions,
  ModalStateValue,
} from './useModalState'
import {
  useDeleteConfirmation,
  DeleteConfirmationValue,
} from './useDeleteConfirmation'

/**
 * Combined CRUD operations state and actions
 */
export interface CrudOperationsValue<TItem, TFormData> {
  /** Page-level CRUD state (loading, error, etc.) */
  crudState: CrudStateValue
  /** Modal and form state management */
  modalState: ModalStateValue<TItem, TFormData>
  /** Delete confirmation dialog management */
  deleteConfirmation: DeleteConfirmationValue<TItem>
}

/**
 * Options for useCrudOperations hook
 */
export interface UseCrudOperationsOptions<TFormData>
  extends UseCrudStateOptions {
  /** Default/initial form data structure for modal */
  defaultFormData: TFormData
}

/**
 * Hook that combines all CRUD operation hooks into one convenient interface
 *
 * This is the primary, all-in-one hook for managing CRUD pages. It combines three
 * specialized hooks into a single, comprehensive state management solution:
 *
 * 1. useCrudState: Page-level loading, error, saving, deleting states
 * 2. useModalState: Modal visibility, form data, and modal-based delete confirmation
 * 3. useDeleteConfirmation: Standalone delete confirmation for list-level operations
 *
 * This hook provides everything needed for a complete CRUD page implementation,
 * reducing boilerplate significantly and ensuring consistent state management patterns
 * across the entire application.
 *
 * Benefits:
 * - Single hook import instead of three separate imports
 * - All CRUD states organized into logical namespaces
 * - Reduces 100+ lines of boilerplate per CRUD page
 * - Type-safe with full TypeScript support
 * - Flexible: use all features or just what you need
 * - Consistent patterns across 19+ CRUD pages
 *
 * When to use:
 * - Any CRUD page with create/read/update/delete operations
 * - Pages with modal-based forms
 * - Pages with delete confirmation dialogs
 * - Pages that need loading and error state management
 *
 * @example
 * Complete CRUD page with all features:
 * ```tsx
 * interface Product {
 *   id: string
 *   name: string
 *   price: number
 * }
 *
 * interface ProductFormData {
 *   name: string
 *   price: number
 * }
 *
 * function ProductsPage() {
 *   const {
 *     crudState,
 *     modalState,
 *     deleteConfirmation,
 *   } = useCrudOperations<Product, ProductFormData>({
 *     defaultFormData: { name: '', price: 0 },
 *     initialLoading: true,
 *   })
 *
 *   const [products, setProducts] = useState<Product[]>([])
 *
 *   // Initial data load
 *   useEffect(() => {
 *     loadProducts()
 *   }, [])
 *
 *   async function loadProducts() {
 *     try {
 *       crudState.setIsLoading(true)
 *       crudState.clearError()
 *       const data = await fetchProducts()
 *       setProducts(data)
 *     } catch (err) {
 *       crudState.setError(err.message)
 *     } finally {
 *       crudState.setIsLoading(false)
 *     }
 *   }
 *
 *   // Modal handlers
 *   const handleAdd = () => {
 *     modalState.openCreateModal({ name: '', price: 0 })
 *   }
 *
 *   const handleEdit = (product: Product) => {
 *     modalState.openEditModal(product, {
 *       name: product.name,
 *       price: product.price,
 *     })
 *   }
 *
 *   const handleModalSubmit = async (e: FormEvent) => {
 *     e.preventDefault()
 *     try {
 *       modalState.setIsSaving(true)
 *       modalState.setFormError(null)
 *
 *       if (modalState.editingItem) {
 *         await updateProduct(modalState.editingItem.id, modalState.formData)
 *       } else {
 *         await createProduct(modalState.formData)
 *       }
 *
 *       modalState.closeModal()
 *       await loadProducts()
 *     } catch (err) {
 *       modalState.setFormError(err.message)
 *     } finally {
 *       modalState.setIsSaving(false)
 *     }
 *   }
 *
 *   // Delete from modal
 *   const handleModalDelete = async () => {
 *     if (!modalState.deleteTarget) return
 *
 *     try {
 *       modalState.setIsDeleting(true)
 *       await deleteProduct(modalState.deleteTarget.id)
 *       modalState.closeDeleteConfirmation()
 *       await loadProducts()
 *     } catch (err) {
 *       crudState.setError(err.message)
 *     } finally {
 *       modalState.setIsDeleting(false)
 *     }
 *   }
 *
 *   // Delete from list (standalone)
 *   const handleListDelete = async () => {
 *     await deleteConfirmation.handleDelete(async (product) => {
 *       await deleteProduct(product.id)
 *       await loadProducts()
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {crudState.isLoading && <LoadingSpinner />}
 *       {crudState.error && <ErrorMessage>{crudState.error}</ErrorMessage>}
 *
 *       <button onClick={handleAdd}>Add Product</button>
 *
 *       <ul>
 *         {products.map((product) => (
 *           <li key={product.id}>
 *             {product.name}
 *             <button onClick={() => handleEdit(product)}>Edit</button>
 *             <button onClick={() => deleteConfirmation.openDeleteConfirmation(product)}>
 *               Delete
 *             </button>
 *           </li>
 *         ))}
 *       </ul>
 *
 *       {/* Modal for create/edit *\/}
 *       <Modal isOpen={modalState.isModalOpen} onClose={modalState.closeModal}>
 *         <form onSubmit={handleModalSubmit}>
 *           <h2>{modalState.editingItem ? 'Edit' : 'Create'} Product</h2>
 *           {modalState.formError && <div>{modalState.formError}</div>}
 *           <input
 *             value={modalState.formData.name}
 *             onChange={(e) =>
 *               modalState.setFormData((prev) => ({ ...prev, name: e.target.value }))
 *             }
 *           />
 *           <input
 *             type="number"
 *             value={modalState.formData.price}
 *             onChange={(e) =>
 *               modalState.setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))
 *             }
 *           />
 *           <button type="submit" disabled={modalState.isSaving}>
 *             {modalState.editingItem ? 'Update' : 'Create'}
 *           </button>
 *         </form>
 *       </Modal>
 *
 *       {/* Delete confirmation from modal *\/}
 *       <Modal
 *         isOpen={!!modalState.deleteTarget}
 *         onClose={modalState.closeDeleteConfirmation}
 *       >
 *         <p>Delete {modalState.deleteTarget?.name}?</p>
 *         <button onClick={handleModalDelete} disabled={modalState.isDeleting}>
 *           Confirm Delete
 *         </button>
 *       </Modal>
 *
 *       {/* Standalone delete confirmation *\/}
 *       <Modal
 *         isOpen={!!deleteConfirmation.deleteTarget}
 *         onClose={deleteConfirmation.closeDeleteConfirmation}
 *       >
 *         <p>Delete {deleteConfirmation.deleteTarget?.name}?</p>
 *         <button onClick={handleListDelete} disabled={deleteConfirmation.isDeleting}>
 *           Confirm Delete
 *         </button>
 *       </Modal>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * Simple usage (only page-level state):
 * ```tsx
 * const { crudState } = useCrudOperations({
 *   defaultFormData: {}
 * })
 *
 * // Use only crudState.isLoading, crudState.error, etc.
 * ```
 *
 * @example
 * Modal-focused usage:
 * ```tsx
 * const { modalState } = useCrudOperations({
 *   defaultFormData: { name: '', email: '' }
 * })
 *
 * // Use only modal operations
 * ```
 *
 * @template TItem - The type of item being managed (e.g., Product, Category)
 * @template TFormData - The type of form data for create/edit operations
 * @param options - Configuration options
 * @returns CrudOperationsValue - Combined CRUD state and actions
 */
export function useCrudOperations<TItem, TFormData>(
  options: UseCrudOperationsOptions<TFormData>
): CrudOperationsValue<TItem, TFormData> {
  const { defaultFormData, initialLoading, initialError } = options

  // Initialize all sub-hooks
  const crudState = useCrudState({
    initialLoading,
    initialError,
  })

  const modalState = useModalState<TItem, TFormData>({
    defaultFormData,
  })

  const deleteConfirmation = useDeleteConfirmation<TItem>()

  return {
    crudState,
    modalState,
    deleteConfirmation,
  }
}
