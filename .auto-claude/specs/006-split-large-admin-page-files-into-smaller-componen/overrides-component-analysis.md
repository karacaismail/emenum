# Overrides Page Component Analysis

## File Overview
- **File**: `app/(admin)/admin/overrides/page.tsx`
- **Total Lines**: 978
- **Current Structure**: Single large file with inline components
- **Purpose**: Feature Overrides Management Page for Super Admin (ABAC layer)

## Current Component Structure

### 1. Type Definitions (Lines 11-24)
```typescript
- OverrideWithDetails (extends OrganizationFeatureOverride)
- OrganizationWithPlan (extends Organization)
```
**Recommendation**: Move to `types/overrides.ts`

### 2. Badge Components (Lines 26-101)
These are already modular and self-contained:

#### a. OverrideValueBadge (Lines 29-42)
- **Purpose**: Status badge for override value (enabled/disabled)
- **Props**: `{ value: boolean }`
- **Extract to**: `components/admin/overrides/OverrideValueBadge.tsx`

#### b. ExpirationBadge (Lines 47-82)
- **Purpose**: Expiration status badge with smart date formatting
- **Props**: `{ expiresAt: string | null }`
- **Logic**: Calculates expiration status, days left, color coding
- **Extract to**: `components/admin/overrides/ExpirationBadge.tsx`

#### c. PlanBadge (Lines 87-101)
- **Purpose**: Plan badge component with color mapping
- **Props**: `{ planName?: string }`
- **Extract to**: `components/admin/overrides/PlanBadge.tsx`
- **Note**: Could be shared with other admin pages

### 3. Main Page Component: OverridesPage (Lines 119-977)

#### State Management (Lines 120-150)
```typescript
- Overrides state (data, loading, error)
- Organizations and features for dropdowns
- Filter state (search, org filter, status filter)
- Modal state (open, editing, saving, form error)
- Delete confirmation state
- Form state
```
**Recommendation**: Keep in main page, but consider custom hooks for complex state logic

#### Data Fetching Functions (Lines 152-255)

##### fetchOverrides (Lines 155-205)
- Fetches overrides with related organization and feature data
- Complex join logic
- **Recommendation**: Move to `lib/api/overrides.ts` or custom hook

##### fetchOrganizations (Lines 210-250)
- Fetches organizations with subscription info
- **Recommendation**: Move to `lib/api/overrides.ts` or custom hook

#### Filtering Logic (Lines 257-280)
- filteredOverrides calculation
- **Recommendation**: Move to utility function or custom hook

#### Event Handlers (Lines 282-441)

##### handleOpenModal (Lines 285-307)
- Opens modal for create/edit
- **Recommendation**: Can stay in main page or move to modal component

##### handleSubmit (Lines 312-382)
- Form submission with validation
- **Recommendation**: Move to modal component or custom hook

##### handleDelete (Lines 387-409)
- Delete confirmation handler
- **Recommendation**: Move to delete modal component

##### handleToggleValue (Lines 414-428)
- Quick toggle override value
- **Recommendation**: Move to table row component or custom hook

##### formatDate (Lines 433-441)
- Date formatting utility
- **Recommendation**: Move to `lib/utils/date.ts`

#### Stats Calculation (Lines 444-450)
- Calculates total, active, expired, enabled, disabled counts
- **Recommendation**: Move to utility function or custom hook

### 4. UI Sections to Extract

#### a. Page Header (Lines 454-462)
```tsx
- Title: "Ozellik Override Yonetimi"
- Subtitle/Description
```
**Extract to**: `components/admin/overrides/OverridesPageHeader.tsx`
**Pattern**: Could create generic `PageHeader` component

#### b. Info Card (Lines 464-479)
```tsx
- Blue info card explaining how overrides work
- Icon + text content
```
**Extract to**: `components/admin/overrides/OverridesInfoCard.tsx`
**Pattern**: Could create generic `InfoCard` component

#### c. Stats Cards (Lines 481-564)
```tsx
- 5 stat cards in grid layout
- Cards: Total, Active, Expired, Enabled, Disabled
- Each with icon, number, label
```
**Extract to**: `components/admin/overrides/OverridesStatsCards.tsx`
**Sub-component**: Could create `StatCard` component for individual cards
**Props**: `{ stats: { total, active, expired, enabled, disabled } }`

#### d. Error Message (Lines 567-581)
```tsx
- Error alert with dismiss button
- Conditional rendering
```
**Extract to**: `components/ui/ErrorAlert.tsx` (shared component)
**Props**: `{ error: string | null, onDismiss: () => void }`

#### e. Overrides List Card (Lines 583-784)

##### OverridesFilters (Lines 603-646)
```tsx
- Search input
- Organization dropdown filter
- Status dropdown filter
- Refresh button
```
**Extract to**: `components/admin/overrides/OverridesFilters.tsx`
**Props**:
```typescript
{
  searchQuery: string
  setSearchQuery: (value: string) => void
  orgFilter: string
  setOrgFilter: (value: string) => void
  statusFilter: 'all' | 'active' | 'expired'
  setStatusFilter: (value: 'all' | 'active' | 'expired') => void
  organizations: OrganizationWithPlan[]
  onRefresh: () => void
}
```

##### OverridesTable (Lines 648-782)
```tsx
- Loading state
- Empty state
- Table with header and rows
```
**Extract to**: `components/admin/overrides/OverridesTable.tsx`
**Props**:
```typescript
{
  overrides: OverrideWithDetails[]
  organizations: OrganizationWithPlan[]
  isLoading: boolean
  searchQuery: string
  orgFilter: string
  statusFilter: 'all' | 'active' | 'expired'
  onToggleValue: (override: OverrideWithDetails) => void
  onEdit: (override: OverrideWithDetails) => void
  onDelete: (override: OverrideWithDetails) => void
  formatDate: (dateStr: string) => string
}
```

##### OverridesTableRow (Lines 689-777)
```tsx
- Single table row with all columns
- Organization info + plan badge
- Feature info
- Override value badge
- Expiration badge
- Created date
- Action buttons
```
**Extract to**: `components/admin/overrides/OverridesTableRow.tsx`
**Props**:
```typescript
{
  override: OverrideWithDetails
  organizationPlan?: string
  onToggleValue: () => void
  onEdit: () => void
  onDelete: () => void
  formatDate: (dateStr: string) => string
}
```

##### OverridesTableActions (Lines 729-775)
```tsx
- Toggle value button
- Edit button
- Delete button
```
**Extract to**: `components/admin/overrides/OverridesTableActions.tsx`
**Props**:
```typescript
{
  override: OverrideWithDetails
  onToggleValue: () => void
  onEdit: () => void
  onDelete: () => void
}
```

#### f. Create/Edit Modal (Lines 786-911)
```tsx
- Modal with form
- Organization dropdown (disabled when editing)
- Feature dropdown (disabled when editing)
- Override value radio buttons
- Expiration date input
- Submit/Cancel buttons
```
**Extract to**: `components/admin/overrides/OverrideFormModal.tsx`
**Props**:
```typescript
{
  isOpen: boolean
  onClose: () => void
  editingOverride: OverrideWithDetails | null
  organizations: OrganizationWithPlan[]
  features: Feature[]
  onSubmit: (data: FormData) => Promise<void>
}
```

#### g. Delete Confirmation Modal (Lines 913-974)
```tsx
- Modal with warning
- Override details summary
- Delete/Cancel buttons
```
**Extract to**: `components/admin/overrides/OverrideDeleteModal.tsx`
**Props**:
```typescript
{
  isOpen: boolean
  onClose: () => void
  override: OverrideWithDetails | null
  onConfirm: () => Promise<void>
  isDeleting: boolean
}
```

## Recommended Extraction Plan

### Phase 1: Simple Badge Components (Low Risk)
1. Extract `OverrideValueBadge` → `components/admin/overrides/OverrideValueBadge.tsx`
2. Extract `ExpirationBadge` → `components/admin/overrides/ExpirationBadge.tsx`
3. Extract `PlanBadge` → `components/admin/overrides/PlanBadge.tsx`

### Phase 2: Utility Functions & Types
4. Move type definitions → `types/overrides.ts`
5. Extract `formatDate` → `lib/utils/date.ts`
6. Extract stats calculation → `lib/utils/overrides.ts` or custom hook

### Phase 3: UI Section Components (Medium Risk)
7. Extract `OverridesPageHeader` → `components/admin/overrides/OverridesPageHeader.tsx`
8. Extract `OverridesInfoCard` → `components/admin/overrides/OverridesInfoCard.tsx`
9. Extract `OverridesStatsCards` → `components/admin/overrides/OverridesStatsCards.tsx`
10. Extract `ErrorAlert` → `components/ui/ErrorAlert.tsx` (shared)

### Phase 4: Filters & Table Components (Medium Risk)
11. Extract `OverridesFilters` → `components/admin/overrides/OverridesFilters.tsx`
12. Extract `OverridesTableActions` → `components/admin/overrides/OverridesTableActions.tsx`
13. Extract `OverridesTableRow` → `components/admin/overrides/OverridesTableRow.tsx`
14. Extract `OverridesTable` → `components/admin/overrides/OverridesTable.tsx`

### Phase 5: Modal Components (Higher Risk)
15. Extract `OverrideFormModal` → `components/admin/overrides/OverrideFormModal.tsx`
16. Extract `OverrideDeleteModal` → `components/admin/overrides/OverrideDeleteModal.tsx`

### Phase 6: Data & State Management (Optional)
17. Create custom hooks:
    - `useOverrides` - for data fetching
    - `useOverridesFilters` - for filter state
    - `useOverrideForm` - for form state
18. Create API utilities → `lib/api/overrides.ts`

## Final File Structure

```
app/(admin)/admin/overrides/
  page.tsx (orchestrates components, ~150 lines)

components/admin/overrides/
  OverrideValueBadge.tsx
  ExpirationBadge.tsx
  PlanBadge.tsx
  OverridesPageHeader.tsx
  OverridesInfoCard.tsx
  OverridesStatsCards.tsx
  OverridesFilters.tsx
  OverridesTable.tsx
  OverridesTableRow.tsx
  OverridesTableActions.tsx
  OverrideFormModal.tsx
  OverrideDeleteModal.tsx

types/
  overrides.ts

lib/
  utils/
    overrides.ts
    date.ts
  api/
    overrides.ts (optional)

hooks/ (optional)
  useOverrides.ts
  useOverridesFilters.ts
  useOverrideForm.ts
```

## Benefits of Extraction

1. **Maintainability**: Each component has single responsibility
2. **Testability**: Easier to unit test small components
3. **Reusability**: Badges, filters, modals can be reused
4. **Readability**: Main page.tsx becomes orchestration layer
5. **Performance**: Smaller components can be optimized individually
6. **Developer Experience**: Easier to find and modify specific features

## Estimated Impact

- **Lines Reduction**: From 978 lines to ~150 lines in main page
- **Component Count**: 12-15 new components
- **Complexity Reduction**: ~85% reduction in main file complexity
- **Reusability Gain**: 3 badge components, 2 modals reusable across admin pages
