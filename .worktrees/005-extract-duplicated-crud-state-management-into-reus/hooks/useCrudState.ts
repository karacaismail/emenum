'use client'

import { useState, useCallback } from 'react'

/**
 * CRUD state interface
 */
export interface CrudState {
  /** Whether data is being initially loaded */
  isLoading: boolean
  /** Error message if an operation failed */
  error: string | null
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Whether a delete operation is in progress */
  isDeleting: boolean
}

/**
 * CRUD state actions interface
 */
export interface CrudActions {
  /** Set the loading state */
  setIsLoading: (isLoading: boolean) => void
  /** Set an error message (or clear it with null) */
  setError: (error: string | null) => void
  /** Set the saving state */
  setIsSaving: (isSaving: boolean) => void
  /** Set the deleting state */
  setIsDeleting: (isDeleting: boolean) => void
  /** Clear all error states */
  clearError: () => void
  /** Reset all states to initial values */
  reset: () => void
}

/**
 * Complete CRUD state value combining state and actions
 */
export type CrudStateValue = CrudState & CrudActions

/**
 * Options for useCrudState hook
 */
export interface UseCrudStateOptions {
  /** Initial loading state (default: true) */
  initialLoading?: boolean
  /** Initial error state (default: null) */
  initialError?: string | null
}

/**
 * Hook to manage common CRUD operation states (loading, error, saving, deleting)
 *
 * This hook extracts the duplicated state management pattern found across 19+ CRUD pages
 * in the application. It provides a consistent, reusable way to manage the four core states
 * that nearly every CRUD page needs:
 *
 * 1. isLoading: Tracks initial data fetch state
 * 2. error: Manages error messages from failed operations
 * 3. isSaving: Indicates save/update operation in progress
 * 4. isDeleting: Indicates delete operation in progress
 *
 * Benefits:
 * - Reduces boilerplate code across CRUD pages
 * - Ensures consistent state management patterns
 * - Provides type-safe state and actions
 * - Includes convenient helper methods (clearError, reset)
 *
 * @example
 * Basic usage with data loading and saving:
 * ```tsx
 * function ProductsPage() {
 *   const {
 *     isLoading,
 *     error,
 *     isSaving,
 *     isDeleting,
 *     setIsLoading,
 *     setError,
 *     setIsSaving,
 *     setIsDeleting,
 *     clearError
 *   } = useCrudState()
 *
 *   useEffect(() => {
 *     loadProducts()
 *   }, [])
 *
 *   async function loadProducts() {
 *     try {
 *       setIsLoading(true)
 *       clearError()
 *       const data = await fetchProducts()
 *       setProducts(data)
 *     } catch (err) {
 *       setError(err.message)
 *     } finally {
 *       setIsLoading(false)
 *     }
 *   }
 *
 *   async function saveProduct(product: Product) {
 *     try {
 *       setIsSaving(true)
 *       clearError()
 *       await updateProduct(product)
 *     } catch (err) {
 *       setError(err.message)
 *     } finally {
 *       setIsSaving(false)
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       {isLoading && <LoadingSpinner />}
 *       {error && <ErrorMessage>{error}</ErrorMessage>}
 *       <button disabled={isSaving}>Save</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * Usage with custom initial state:
 * ```tsx
 * const crudState = useCrudState({
 *   initialLoading: false,  // Don't show loading on mount
 *   initialError: 'Please select an item'  // Show initial message
 * })
 * ```
 *
 * @param options - Configuration options for initial state
 * @returns CrudStateValue - CRUD state properties and action methods
 */
export function useCrudState(
  options: UseCrudStateOptions = {}
): CrudStateValue {
  const { initialLoading = true, initialError = null } = options

  // State
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading)
  const [error, setError] = useState<string | null>(initialError)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Reset all states to their initial values
   */
  const reset = useCallback(() => {
    setIsLoading(initialLoading)
    setError(initialError)
    setIsSaving(false)
    setIsDeleting(false)
  }, [initialLoading, initialError])

  return {
    // State
    isLoading,
    error,
    isSaving,
    isDeleting,
    // Actions
    setIsLoading,
    setError,
    setIsSaving,
    setIsDeleting,
    clearError,
    reset,
  }
}
