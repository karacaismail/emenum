# CRUD Hooks Migration Guide

## Table of Contents

1. [Overview](#overview)
2. [Available Hooks](#available-hooks)
3. [Quick Start](#quick-start)
4. [Migration Guide](#migration-guide)
5. [Common Patterns](#common-patterns)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Examples](#examples)

---

## Overview

This guide documents the custom CRUD hooks created to eliminate duplicated state management across 19+ pages in the application. These hooks reduce boilerplate code by 100+ lines per CRUD page while ensuring consistent patterns for loading states, error handling, modals, and delete confirmations.

### What Problem Do These Hooks Solve?

Before the hooks, every CRUD page had to manually manage:
- Loading states (`isLoading`, `isSaving`, `isDeleting`)
- Error states (`error`, `formError`)
- Modal states (`isModalOpen`, `editingItem`)
- Form data states (`formData`)
- Delete confirmation states (`deleteTarget`)

This resulted in:
- 8-10 `useState` hooks per page
- 204 occurrences of `setIsLoading`/`setError`/`setIsSaving` calls
- Inconsistent error handling and state management
- Bugs that needed to be fixed in 19 places

### Benefits of Using the Hooks

✅ **Reduced Boilerplate**: 100+ lines of code saved per CRUD page
✅ **Consistency**: Uniform state management across all pages
✅ **Type Safety**: Full TypeScript support with generics
✅ **Maintainability**: Bugs fixed once in the hook, not 19 times
✅ **Productivity**: New CRUD pages can be built faster
✅ **Testing**: Easier to test centralized logic

---

## Available Hooks

### 1. `useCrudState` - Page-Level State Management

**Purpose**: Manages loading, error, saving, and deleting states for any CRUD page.

**When to use**:
- Simple pages that only need loading/error state
- Auth pages (login, register, password reset)
- Pages without modals or complex forms
- As part of `useCrudOperations` for full CRUD pages

**Import**:
```tsx
import { useCrudState } from '@/hooks/useCrudState'
```

**Returns**:
```tsx
{
  // State
  isLoading: boolean
  error: string | null
  isSaving: boolean
  isDeleting: boolean

  // Actions
  setIsLoading: (value: boolean) => void
  setError: (error: string | null) => void
  setIsSaving: (value: boolean) => void
  setIsDeleting: (value: boolean) => void
  clearError: () => void
  reset: () => void
}
```

---

### 2. `useModalState` - Modal and Form Management

**Purpose**: Manages modal visibility, form data, create/edit mode, and delete confirmation within modals.

**When to use**:
- Pages with create/edit modals
- Pages with form-based workflows
- When you need to track whether you're creating or editing
- As part of `useCrudOperations` for full CRUD pages

**Import**:
```tsx
import { useModalState } from '@/hooks/useModalState'
```

**Returns**:
```tsx
{
  // State
  isModalOpen: boolean
  editingItem: TItem | null
  isSaving: boolean
  formData: TFormData
  formError: string | null
  deleteTarget: TItem | null
  isDeleting: boolean

  // Actions
  openCreateModal: (initialFormData: TFormData) => void
  openEditModal: (item: TItem, formData: TFormData) => void
  closeModal: () => void
  setFormData: (data: TFormData | ((prev: TFormData) => TFormData)) => void
  setFormError: (error: string | null) => void
  setIsSaving: (value: boolean) => void
  openDeleteConfirmation: (item: TItem) => void
  closeDeleteConfirmation: () => void
  setIsDeleting: (value: boolean) => void
  resetModalState: () => void
}
```

---

### 3. `useDeleteConfirmation` - Standalone Delete Dialogs

**Purpose**: Manages delete confirmation dialogs for list-level delete operations.

**When to use**:
- Delete buttons on list items
- Standalone delete confirmations (not within a modal)
- When you need a separate delete workflow from modal operations
- As part of `useCrudOperations` for full CRUD pages

**Import**:
```tsx
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation'
```

**Returns**:
```tsx
{
  // State
  deleteTarget: TItem | null
  isDeleting: boolean

  // Actions
  openDeleteConfirmation: (item: TItem) => void
  closeDeleteConfirmation: () => void
  setIsDeleting: (value: boolean) => void
  handleDelete: (deleteFn: (item: TItem) => Promise<void>) => Promise<void>
}
```

---

### 4. `useCrudOperations` - All-in-One CRUD Hook ⭐

**Purpose**: Combines all three hooks above into a single, comprehensive interface for complete CRUD pages.

**When to use**:
- Full CRUD pages with create, read, update, delete operations
- Pages with modals for create/edit
- Pages with delete confirmations
- Any complex page with multiple state concerns
- **This is the recommended hook for most CRUD pages**

**Import**:
```tsx
import { useCrudOperations } from '@/hooks/useCrudOperations'
```

**Returns**:
```tsx
{
  crudState: {
    // All useCrudState properties and methods
  },
  modalState: {
    // All useModalState properties and methods
  },
  deleteConfirmation: {
    // All useDeleteConfirmation properties and methods
  }
}
```

---

## Quick Start

### Simple Auth Page (useCrudState only)

```tsx
import { useCrudState } from '@/hooks/useCrudState'

export default function LoginPage() {
  const { error, isSaving, setError, setIsSaving, clearError } = useCrudState({
    initialLoading: false
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      clearError()
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button disabled={isSaving}>Login</button>
    </form>
  )
}
```

### Full CRUD Page (useCrudOperations)

```tsx
import { useCrudOperations } from '@/hooks/useCrudOperations'

interface Product {
  id: string
  name: string
  price: number
}

interface ProductFormData {
  name: string
  price: number
}

export default function ProductsPage() {
  const {
    crudState,
    modalState,
    deleteConfirmation
  } = useCrudOperations<Product, ProductFormData>({
    defaultFormData: { name: '', price: 0 },
    initialLoading: true
  })

  const [products, setProducts] = useState<Product[]>([])

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      crudState.setIsLoading(true)
      crudState.clearError()
      const data = await fetchProducts()
      setProducts(data)
    } catch (err) {
      crudState.setError(err.message)
    } finally {
      crudState.setIsLoading(false)
    }
  }

  // Modal handlers
  const handleAdd = () => {
    modalState.openCreateModal({ name: '', price: 0 })
  }

  const handleEdit = (product: Product) => {
    modalState.openEditModal(product, {
      name: product.name,
      price: product.price
    })
  }

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      modalState.setIsSaving(true)
      modalState.setFormError(null)

      if (modalState.editingItem) {
        await updateProduct(modalState.editingItem.id, modalState.formData)
      } else {
        await createProduct(modalState.formData)
      }

      modalState.closeModal()
      await loadProducts()
    } catch (err) {
      modalState.setFormError(err.message)
    } finally {
      modalState.setIsSaving(false)
    }
  }

  // Delete handler (convenience wrapper)
  const handleDeleteConfirm = async () => {
    try {
      await deleteConfirmation.handleDelete(async (product) => {
        await deleteProduct(product.id)
        await loadProducts()
      })
    } catch (err) {
      crudState.setError(err.message)
    }
  }

  return (
    <div>
      {crudState.isLoading && <LoadingSpinner />}
      {crudState.error && <ErrorMessage>{crudState.error}</ErrorMessage>}

      <button onClick={handleAdd}>Add Product</button>

      <ul>
        {products.map(product => (
          <li key={product.id}>
            {product.name}
            <button onClick={() => handleEdit(product)}>Edit</button>
            <button onClick={() => deleteConfirmation.openDeleteConfirmation(product)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalState.isModalOpen} onClose={modalState.closeModal}>
        <form onSubmit={handleModalSubmit}>
          <h2>{modalState.editingItem ? 'Edit' : 'Create'} Product</h2>
          {modalState.formError && <div>{modalState.formError}</div>}
          <input
            value={modalState.formData.name}
            onChange={e => modalState.setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <button type="submit" disabled={modalState.isSaving}>
            {modalState.editingItem ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirmation.deleteTarget}
        onClose={deleteConfirmation.closeDeleteConfirmation}
      >
        <p>Delete {deleteConfirmation.deleteTarget?.name}?</p>
        <button onClick={handleDeleteConfirm} disabled={deleteConfirmation.isDeleting}>
          Confirm Delete
        </button>
      </Modal>
    </div>
  )
}
```

---

## Migration Guide

### Step 1: Identify Your Page Type

**Does your page have modals with create/edit forms?**
- ✅ Yes → Use `useCrudOperations`
- ❌ No → Does it have loading/error states?
  - ✅ Yes → Use `useCrudState`
  - ❌ No → You might not need these hooks

### Step 2: Define Your TypeScript Interfaces

Before migrating, define the types for your data and forms:

```tsx
// Define the item type
interface Product {
  id: string
  name: string
  price: number
  category_id: string
}

// Define the form data type (usually a subset of the item)
interface ProductFormData {
  name: string
  price: number
  category_id: string
}
```

### Step 3: Replace Old State with Hook

#### Before (Old Pattern):
```tsx
export default function ProductsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>({ name: '', price: 0 })
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ... rest of component
}
```

#### After (New Pattern):
```tsx
import { useCrudOperations } from '@/hooks/useCrudOperations'

export default function ProductsPage() {
  const {
    crudState,
    modalState,
    deleteConfirmation
  } = useCrudOperations<Product, ProductFormData>({
    defaultFormData: { name: '', price: 0 },
    initialLoading: true
  })

  // ... rest of component
}
```

### Step 4: Update State References

Find and replace all state references in your component:

| Old | New |
|-----|-----|
| `isLoading` | `crudState.isLoading` |
| `setIsLoading(true)` | `crudState.setIsLoading(true)` |
| `error` | `crudState.error` |
| `setError('...')` | `crudState.setError('...')` |
| `setError(null)` | `crudState.clearError()` |
| `isSaving` | `modalState.isSaving` |
| `setIsSaving(true)` | `modalState.setIsSaving(true)` |
| `isModalOpen` | `modalState.isModalOpen` |
| `setIsModalOpen(true)` | `modalState.openCreateModal(...)` |
| `setIsModalOpen(false)` | `modalState.closeModal()` |
| `editingItem` | `modalState.editingItem` |
| `setEditingItem(item)` | `modalState.openEditModal(item, formData)` |
| `formData` | `modalState.formData` |
| `setFormData(...)` | `modalState.setFormData(...)` |
| `formError` | `modalState.formError` |
| `setFormError(...)` | `modalState.setFormError(...)` |
| `deleteTarget` | `deleteConfirmation.deleteTarget` |
| `setDeleteTarget(item)` | `deleteConfirmation.openDeleteConfirmation(item)` |
| `setDeleteTarget(null)` | `deleteConfirmation.closeDeleteConfirmation()` |
| `isDeleting` | `deleteConfirmation.isDeleting` |
| `setIsDeleting(true)` | `deleteConfirmation.setIsDeleting(true)` |

### Step 5: Update Modal Open Handlers

#### Before:
```tsx
const handleAdd = () => {
  setEditingItem(null)
  setFormData({ name: '', price: 0 })
  setFormError(null)
  setIsModalOpen(true)
}

const handleEdit = (product: Product) => {
  setEditingItem(product)
  setFormData({
    name: product.name,
    price: product.price
  })
  setFormError(null)
  setIsModalOpen(true)
}
```

#### After:
```tsx
const handleAdd = () => {
  modalState.openCreateModal({ name: '', price: 0 })
}

const handleEdit = (product: Product) => {
  modalState.openEditModal(product, {
    name: product.name,
    price: product.price
  })
}
```

### Step 6: Simplify Delete Handlers (Optional)

You can use the convenience `handleDelete` wrapper:

#### Before:
```tsx
const handleDeleteConfirm = async () => {
  if (!deleteTarget) return
  setIsDeleting(true)
  try {
    await deleteProduct(deleteTarget.id)
    setDeleteTarget(null)
    await loadProducts()
  } catch (err) {
    setError(err.message)
  } finally {
    setIsDeleting(false)
  }
}
```

#### After (Option 1 - Convenience Wrapper):
```tsx
const handleDeleteConfirm = async () => {
  try {
    await deleteConfirmation.handleDelete(async (product) => {
      await deleteProduct(product.id)
      await loadProducts()
    })
  } catch (err) {
    crudState.setError(err.message)
  }
}
```

#### After (Option 2 - Manual Control):
```tsx
const handleDeleteConfirm = async () => {
  if (!deleteConfirmation.deleteTarget) return
  deleteConfirmation.setIsDeleting(true)
  try {
    await deleteProduct(deleteConfirmation.deleteTarget.id)
    deleteConfirmation.closeDeleteConfirmation()
    await loadProducts()
  } catch (err) {
    crudState.setError(err.message)
  } finally {
    deleteConfirmation.setIsDeleting(false)
  }
}
```

### Step 7: Test Your Page

After migration, verify:
- ✅ Page loads correctly
- ✅ Create modal opens and creates items
- ✅ Edit modal opens with pre-filled data
- ✅ Update operations work
- ✅ Delete confirmations work
- ✅ Loading states display correctly
- ✅ Error messages display correctly
- ✅ No console errors

---

## Common Patterns

### Pattern 1: Simple Loading Page (useCrudState)

```tsx
export default function DashboardPage() {
  const { isLoading, error, setIsLoading, setError, clearError } = useCrudState()
  const [data, setData] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      clearError()
      const result = await fetchData()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage>{error}</ErrorMessage>

  return <div>{/* render data */}</div>
}
```

### Pattern 2: Form Submission (useCrudState)

```tsx
export default function SettingsPage() {
  const { isSaving, error, setIsSaving, setError, clearError } = useCrudState({
    initialLoading: false
  })

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      clearError()
      await saveSettings(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave}>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button disabled={isSaving}>Save</button>
    </form>
  )
}
```

### Pattern 3: Modal Form (useModalState)

```tsx
export default function CategoriesPage() {
  const modalState = useModalState<Category, CategoryFormData>({
    defaultFormData: { name: '', slug: '' }
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      modalState.setIsSaving(true)
      modalState.setFormError(null)

      if (modalState.editingItem) {
        await updateCategory(modalState.editingItem.id, modalState.formData)
      } else {
        await createCategory(modalState.formData)
      }

      modalState.closeModal()
      await loadCategories()
    } catch (err) {
      modalState.setFormError(err.message)
    } finally {
      modalState.setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={modalState.isModalOpen} onClose={modalState.closeModal}>
      <form onSubmit={handleSubmit}>
        {modalState.formError && <div>{modalState.formError}</div>}
        <input
          value={modalState.formData.name}
          onChange={e => modalState.setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
        <button disabled={modalState.isSaving}>
          {modalState.editingItem ? 'Update' : 'Create'}
        </button>
      </form>
    </Modal>
  )
}
```

### Pattern 4: Multiple Independent CRUD Operations

Some pages manage multiple entities (like the admin plans page with plans, features, and plan-features):

```tsx
export default function PlansPage() {
  // Separate CRUD hook for each entity
  const plansCrud = useCrudOperations<Plan, PlanFormData>({
    defaultFormData: { name: '', price: 0 }
  })

  const featuresCrud = useCrudOperations<Feature, FeatureFormData>({
    defaultFormData: { name: '', code: '' }
  })

  const planFeaturesCrud = useCrudOperations<PlanFeature, PlanFeatureFormData>({
    defaultFormData: { plan_id: '', feature_id: '' }
  })

  // Each entity has its own state management
  return (
    <div>
      {/* Plans section */}
      <Modal isOpen={plansCrud.modalState.isModalOpen}>...</Modal>

      {/* Features section */}
      <Modal isOpen={featuresCrud.modalState.isModalOpen}>...</Modal>

      {/* Plan-Features section */}
      <Modal isOpen={planFeaturesCrud.modalState.isModalOpen}>...</Modal>
    </div>
  )
}
```

### Pattern 5: Conditional Form Fields

Update form data based on other fields:

```tsx
const handleNameChange = (name: string) => {
  modalState.setFormData(prev => ({
    ...prev,
    name,
    slug: !slugEdited ? generateSlug(name) : prev.slug
  }))
}
```

---

## Best Practices

### ✅ DO

1. **Use `useCrudOperations` for full CRUD pages**
   - It's the most comprehensive and covers all needs
   - Use namespaced properties: `crudState.*`, `modalState.*`, `deleteConfirmation.*`

2. **Use `useCrudState` for simple pages**
   - Auth pages (login, register)
   - Read-only pages with loading states
   - Pages without modals

3. **Set `initialLoading: false` when appropriate**
   - Forms that don't load data on mount
   - Pages that start in an empty state

4. **Always use `clearError()` before operations**
   ```tsx
   const handleSubmit = async () => {
     try {
       setIsSaving(true)
       clearError() // ✅ Clear previous errors
       await saveData()
     } catch (err) {
       setError(err.message)
     } finally {
       setIsSaving(false)
     }
   }
   ```

5. **Define TypeScript interfaces for type safety**
   ```tsx
   interface Product {
     id: string
     name: string
   }

   interface ProductFormData {
     name: string
   }

   const { modalState } = useCrudOperations<Product, ProductFormData>({
     defaultFormData: { name: '' }
   })
   ```

6. **Use the delete convenience wrapper when possible**
   ```tsx
   await deleteConfirmation.handleDelete(async (item) => {
     await deleteItem(item.id)
     await reloadList()
   })
   ```

### ❌ DON'T

1. **Don't mix old and new patterns**
   - Migrate completely or not at all
   - Don't use `useState` for states covered by hooks

2. **Don't forget to handle errors in modal submissions**
   ```tsx
   // ❌ Bad
   const handleSubmit = async () => {
     await saveData()
     modalState.closeModal()
   }

   // ✅ Good
   const handleSubmit = async () => {
     try {
       modalState.setIsSaving(true)
       modalState.setFormError(null)
       await saveData()
       modalState.closeModal()
     } catch (err) {
       modalState.setFormError(err.message)
     } finally {
       modalState.setIsSaving(false)
     }
   }
   ```

3. **Don't use page-level error for form errors**
   ```tsx
   // ❌ Bad - mixing concerns
   crudState.setError('Form validation failed')

   // ✅ Good - use form-specific error
   modalState.setFormError('Form validation failed')
   ```

4. **Don't forget to pass `defaultFormData`**
   ```tsx
   // ❌ Bad
   useCrudOperations<Product, ProductFormData>({})

   // ✅ Good
   useCrudOperations<Product, ProductFormData>({
     defaultFormData: { name: '', price: 0 }
   })
   ```

5. **Don't destructure unnecessarily**
   ```tsx
   // ❌ Bad - loses namespace organization
   const { isLoading, error, isModalOpen, formData } = useCrudOperations(...)

   // ✅ Good - keeps logical grouping
   const { crudState, modalState } = useCrudOperations(...)
   ```

---

## Troubleshooting

### Issue: TypeScript errors about missing properties

**Problem**: `Property 'name' does not exist on type 'never'`

**Solution**: Provide type parameters to the hook:
```tsx
// ❌ Wrong
const { modalState } = useCrudOperations({ defaultFormData: {} })

// ✅ Correct
const { modalState } = useCrudOperations<Product, ProductFormData>({
  defaultFormData: { name: '', price: 0 }
})
```

### Issue: Form doesn't reset when opening create modal

**Problem**: Old data appears in create modal

**Solution**: Use `openCreateModal` with fresh form data:
```tsx
// ❌ Wrong
modalState.openEditModal(null, modalState.formData)

// ✅ Correct
modalState.openCreateModal({ name: '', price: 0 })
```

### Issue: Modal doesn't close after successful submission

**Problem**: Modal stays open after save

**Solution**: Call `closeModal()` after successful operation:
```tsx
try {
  modalState.setIsSaving(true)
  await saveData()
  modalState.closeModal() // ✅ Don't forget this
} catch (err) {
  modalState.setFormError(err.message)
} finally {
  modalState.setIsSaving(false)
}
```

### Issue: Delete confirmation doesn't close automatically

**Problem**: Confirmation dialog stays open after delete

**Solution**: Use the `handleDelete` wrapper or call `closeDeleteConfirmation()`:
```tsx
// Option 1: Convenience wrapper (automatic close)
await deleteConfirmation.handleDelete(async (item) => {
  await deleteItem(item.id)
})

// Option 2: Manual (must call close)
await deleteItem(deleteConfirmation.deleteTarget.id)
deleteConfirmation.closeDeleteConfirmation()
```

### Issue: Loading state doesn't reset after error

**Problem**: Page stays in loading state after error

**Solution**: Always use `finally` block:
```tsx
try {
  crudState.setIsLoading(true)
  await loadData()
} catch (err) {
  crudState.setError(err.message)
} finally {
  crudState.setIsLoading(false) // ✅ Always reset
}
```

### Issue: Form error doesn't clear when opening modal

**Problem**: Previous error shows in new modal

**Solution**: The hooks handle this automatically. If you see this issue, make sure you're using `openCreateModal` or `openEditModal` instead of manually setting `isModalOpen`.

---

## Examples

### Example 1: Products Page (Full CRUD)

See: `app/(dashboard)/products/page.tsx`

This is a comprehensive example showing:
- Page-level loading and error states
- Modal for create/edit with form validation
- Delete confirmation dialog
- Image upload handling
- Visibility toggle operations

### Example 2: Categories Page (Hierarchical CRUD)

See: `app/(dashboard)/categories/page.tsx`

This example demonstrates:
- Tree structure with parent-child relationships
- Hierarchical category display
- Form data with parent selection
- Auto-slug generation from name

### Example 3: Tables Page (CRUD + Custom Actions)

See: `app/(dashboard)/tables/page.tsx`

Shows:
- Standard CRUD operations
- Additional custom actions (QR code generation)
- Bulk operations
- Status toggles

### Example 4: Admin Plans Page (Multiple Entities)

See: `app/(admin)/admin/plans/page.tsx`

Demonstrates:
- Managing multiple related entities (plans, features, plan-features)
- Using multiple `useCrudOperations` instances
- Complex relationship management

### Example 5: Register Page (Auth with Steps)

See: `app/(auth)/register/page.tsx`

Shows:
- Simple `useCrudState` usage
- Multi-step form flow
- Custom form state alongside hook state

### Example 6: Settings Page (Form-Only)

See: `app/(dashboard)/settings/page.tsx`

Demonstrates:
- Form submission without modal
- Success state management
- Mixing hook state with custom state

---

## Migration Checklist

When migrating a page to use CRUD hooks, use this checklist:

- [ ] Identify page type (full CRUD, simple loading, form submission)
- [ ] Define TypeScript interfaces (`TItem`, `TFormData`)
- [ ] Import appropriate hook (`useCrudOperations`, `useCrudState`, etc.)
- [ ] Replace old `useState` declarations with hook call
- [ ] Update all state references (use find-and-replace table)
- [ ] Update modal open handlers to use `openCreateModal`/`openEditModal`
- [ ] Update modal close to use `closeModal()`
- [ ] Update delete handlers to use `deleteConfirmation` namespace
- [ ] Update error clearing to use `clearError()`
- [ ] Remove old unused `useState` declarations
- [ ] Test create operation
- [ ] Test edit operation
- [ ] Test delete operation
- [ ] Test loading states
- [ ] Test error handling
- [ ] Verify no console errors
- [ ] Verify TypeScript compiles without errors

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the hook source files for JSDoc documentation:
   - `hooks/useCrudState.ts`
   - `hooks/useModalState.ts`
   - `hooks/useDeleteConfirmation.ts`
   - `hooks/useCrudOperations.ts`

2. Review migrated pages for real-world examples:
   - `app/(dashboard)/products/page.tsx` (comprehensive example)
   - `app/(dashboard)/categories/page.tsx` (hierarchical data)
   - `app/(auth)/register/page.tsx` (simple auth example)

3. Each hook has multiple `@example` blocks in JSDoc showing different usage patterns

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintainer**: Auto-Claude
