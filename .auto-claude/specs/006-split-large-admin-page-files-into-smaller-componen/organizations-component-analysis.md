# Organizations Page Component Analysis

## File: app/(admin)/admin/organizations/page.tsx

**Total Lines:** 812
**Component Type:** Client Component ('use client')
**Main Export:** `OrganizationsPage` (default export)

## Current Structure

### 1. Types & Interfaces
- `OrganizationWithDetails` (lines 16-20): Extended organization type with subscription and stats

### 2. Small UI Components (Currently Inline)

#### StatusBadge (lines 25-38)
- **Purpose:** Displays active/inactive status with colored badge
- **Props:** `{ isActive: boolean }`
- **Dependencies:** None (pure UI)
- **Extract to:** `app/(admin)/admin/organizations/components/StatusBadge.tsx`

#### PlanBadge (lines 43-57)
- **Purpose:** Displays plan name with color-coded badge
- **Props:** `{ planName?: string }`
- **Dependencies:** None (pure UI)
- **Extract to:** `app/(admin)/admin/organizations/components/PlanBadge.tsx`

### 3. Major Page Sections (Can be Extracted)

#### OrganizationsStats (lines 375-441)
- **Purpose:** Displays 4 statistics cards (total, active, inactive, with plan)
- **Props:** `{ stats: { total: number, active: number, inactive: number, withPlan: number } }`
- **Dependencies:** None (pure UI)
- **Size:** ~66 lines
- **Extract to:** `app/(admin)/admin/organizations/components/OrganizationsStats.tsx`

#### OrganizationsFilters (lines 465-495)
- **Purpose:** Search input, status filter dropdown, and refresh button
- **Props:**
  - `searchQuery: string`
  - `setSearchQuery: (value: string) => void`
  - `statusFilter: 'all' | 'active' | 'inactive'`
  - `setStatusFilter: (value: 'all' | 'active' | 'inactive') => void`
  - `onRefresh: () => void`
  - `resultCount: number`
- **Dependencies:** Input, Button components
- **Size:** ~30 lines
- **Extract to:** `app/(admin)/admin/organizations/components/OrganizationsFilters.tsx`

#### OrganizationsTable (lines 497-667)
- **Purpose:** Main data table displaying organizations with actions
- **Props:**
  - `organizations: OrganizationWithDetails[]`
  - `isLoading: boolean`
  - `searchQuery: string`
  - `statusFilter: 'all' | 'active' | 'inactive'`
  - `onToggleActive: (org: OrganizationWithDetails) => void`
  - `onEditOrg: (org: OrganizationWithDetails) => void`
  - `onOpenPlanModal: (org: OrganizationWithDetails) => void`
  - `formatDate: (dateStr: string) => string`
- **Dependencies:** StatusBadge, PlanBadge, Link, Image
- **Size:** ~170 lines
- **Extract to:** `app/(admin)/admin/organizations/components/OrganizationsTable.tsx`

#### OrganizationRow (lines 537-663)
- **Purpose:** Single table row with organization data and action buttons
- **Props:**
  - `organization: OrganizationWithDetails`
  - `onToggleActive: (org: OrganizationWithDetails) => void`
  - `onEdit: (org: OrganizationWithDetails) => void`
  - `onOpenPlanModal: (org: OrganizationWithDetails) => void`
  - `formatDate: (dateStr: string) => string`
- **Dependencies:** StatusBadge, PlanBadge, Link, Image
- **Size:** ~126 lines
- **Extract to:** `app/(admin)/admin/organizations/components/OrganizationRow.tsx`
- **Note:** This is nested within OrganizationsTable

#### EditOrganizationModal (lines 672-733)
- **Purpose:** Modal for editing organization details
- **Props:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `organization: OrganizationWithDetails | null`
  - `onSave: (data: { name: string, is_active: boolean }) => Promise<void>`
- **Dependencies:** Modal, Input, Button
- **Size:** ~61 lines
- **Extract to:** `app/(admin)/admin/organizations/components/EditOrganizationModal.tsx`

#### PlanAssignmentModal (lines 735-808)
- **Purpose:** Modal for assigning/changing organization plan
- **Props:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `organization: OrganizationWithDetails | null`
  - `plans: Plan[]`
  - `currentPlanId?: string`
  - `onAssignPlan: (planId: string) => Promise<void>`
- **Dependencies:** Modal, Button, PlanBadge
- **Size:** ~73 lines
- **Extract to:** `app/(admin)/admin/organizations/components/PlanAssignmentModal.tsx`

### 4. State Management (Remains in Page)
- Organizations data (line 71)
- Plans data (line 72)
- Loading/error states (lines 73-74)
- Search/filter state (lines 77-78)
- Modal states (lines 81-97)

### 5. Data Fetching Logic (Remains in Page)
- `fetchOrganizations` (lines 102-181): Complex data fetching with joins
- `fetchPlans` (lines 186-200): Fetch available plans
- `filteredOrganizations` (lines 210-222): Computed filtered data

### 6. Event Handlers (Remains in Page)
- `handleToggleActive` (lines 227-240)
- `handleEditOrg` (lines 245-255)
- `handleEditSubmit` (lines 260-288)
- `handleOpenPlanModal` (lines 293-297)
- `handleAssignPlan` (lines 302-341)

### 7. Utility Functions

#### formatDate (lines 346-352)
- **Purpose:** Format date string to Turkish locale
- **Props:** `dateStr: string`
- **Dependencies:** None
- **Extract to:** `lib/utils/date.ts` or keep inline (simple function)

## Extraction Strategy

### Phase 1: Extract Simple UI Components
1. StatusBadge → `components/StatusBadge.tsx`
2. PlanBadge → `components/PlanBadge.tsx`

### Phase 2: Extract Complex Sections
3. OrganizationsStats → `components/OrganizationsStats.tsx`
4. OrganizationsFilters → `components/OrganizationsFilters.tsx`

### Phase 3: Extract Table Components
5. OrganizationRow → `components/OrganizationRow.tsx`
6. OrganizationsTable → `components/OrganizationsTable.tsx` (uses OrganizationRow)

### Phase 4: Extract Modals
7. EditOrganizationModal → `components/EditOrganizationModal.tsx`
8. PlanAssignmentModal → `components/PlanAssignmentModal.tsx`

### Phase 5: Refactor Main Page
9. Update page.tsx to import and use all extracted components
10. Keep data fetching, state management, and event handlers in page

## Benefits

1. **Reduced File Size:** Main page will go from ~812 lines to ~200-250 lines
2. **Better Maintainability:** Each component has single responsibility
3. **Improved Testability:** Components can be tested independently
4. **Code Reusability:** StatusBadge and PlanBadge can be reused elsewhere
5. **Better Developer Experience:** Easier to navigate and understand codebase

## Dependencies to Export

### Shared Types
- `OrganizationWithDetails` → Can be moved to types file or kept in page and exported

### Shared Utilities
- `formatDate` → Can be extracted to utils or passed as prop

## Estimated Line Distribution After Extraction

- **StatusBadge.tsx:** ~20 lines
- **PlanBadge.tsx:** ~25 lines
- **OrganizationsStats.tsx:** ~70 lines
- **OrganizationsFilters.tsx:** ~40 lines
- **OrganizationRow.tsx:** ~130 lines
- **OrganizationsTable.tsx:** ~100 lines
- **EditOrganizationModal.tsx:** ~80 lines
- **PlanAssignmentModal.tsx:** ~90 lines
- **page.tsx (refactored):** ~200-250 lines

**Total:** Similar line count but distributed across 9 files instead of 1 monolithic file.
