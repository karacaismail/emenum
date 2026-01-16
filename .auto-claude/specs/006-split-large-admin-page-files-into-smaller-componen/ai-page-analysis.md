# AI Page Component Analysis

## File: `app/(admin)/admin/ai/page.tsx`

**Total Lines:** 920
**Complexity:** High - Multiple responsibilities, state management, API calls, and UI rendering

---

## Current Structure

### 1. Types/Interfaces (Lines 14-29)
- `OrganizationWithAI` - Extended organization type with AI data
- `PlanFeatureValue` - Plan feature configuration

### 2. Inline Components (Lines 34-124)
- `AIStatusBadge` (Lines 34-47) - Status indicator for AI access
- `PlanBadge` (Lines 52-66) - Plan name display with color coding
- `QuotaDisplay` (Lines 71-124) - Quota visualization with progress bar

### 3. Main Component (Lines 139-919)
The `AIManagementPage` component contains:
- **State Management** (Lines 140-166): 11 state variables
- **Data Fetching** (Lines 171-302): Complex `fetchData` callback
- **Filtering Logic** (Lines 311-323): Organization filtering
- **Modal Handlers** (Lines 328-451): 4 handler functions
- **Stats Calculation** (Lines 453-460): Computed statistics
- **Render Sections**: Multiple UI sections

---

## Components to Extract

### **A. UI Components**

#### 1. **AIStatusBadge** ✓ Already isolated
**Location:** Lines 34-47
**Purpose:** Display AI enabled/disabled status
**Props:** `{ enabled: boolean }`
**Complexity:** Low
**Target:** `app/(admin)/admin/ai/_components/AIStatusBadge.tsx`

#### 2. **PlanBadge** ✓ Already isolated
**Location:** Lines 52-66
**Purpose:** Display plan name with color coding
**Props:** `{ planName?: string }`
**Complexity:** Low
**Target:** `app/(admin)/admin/ai/_components/PlanBadge.tsx`

#### 3. **QuotaDisplay** ✓ Already isolated
**Location:** Lines 71-124
**Purpose:** Display quota with usage progress
**Props:** `{ quota: number | null, usage?: number }`
**Complexity:** Medium (includes calculations)
**Target:** `app/(admin)/admin/ai/_components/QuotaDisplay.tsx`

#### 4. **AIPageHeader** ⭐ New component
**Location:** Lines 464-472
**Purpose:** Page title and description
**Props:** None (static content)
**Complexity:** Low
**Target:** `app/(admin)/admin/ai/_components/AIPageHeader.tsx`

#### 5. **AIInfoCard** ⭐ New component
**Location:** Lines 474-489
**Purpose:** Information banner about AI features
**Props:** None (static content)
**Complexity:** Low
**Target:** `app/(admin)/admin/ai/_components/AIInfoCard.tsx`

#### 6. **AIStatsCards** ⭐ New component
**Location:** Lines 491-574
**Purpose:** Display 5 statistics cards in a grid
**Props:** `{ stats: { total, aiEnabled, aiDisabled, withQuota, unlimited } }`
**Complexity:** Medium (repetitive structure)
**Target:** `app/(admin)/admin/ai/_components/AIStatsCards.tsx`

#### 7. **ErrorAlert** ⭐ New component
**Location:** Lines 576-591
**Purpose:** Reusable error message display
**Props:** `{ error: string | null, onClose: () => void }`
**Complexity:** Low
**Target:** `app/(admin)/admin/ai/_components/ErrorAlert.tsx` or shared `components/ui/`

#### 8. **PlanFeaturesSection** ⭐ New component
**Location:** Lines 593-628
**Purpose:** Display plan AI features summary
**Props:** `{ planFeatures: PlanFeatureValue[] }`
**Complexity:** Medium
**Dependencies:** Card, PlanBadge, AIStatusBadge
**Target:** `app/(admin)/admin/ai/_components/PlanFeaturesSection.tsx`

#### 9. **OrganizationsTable** ⭐ New component
**Location:** Lines 630-776
**Purpose:** Organizations list with filters and table
**Props:**
```typescript
{
  organizations: OrganizationWithAI[]
  isLoading: boolean
  searchQuery: string
  aiFilter: 'all' | 'enabled' | 'disabled'
  onSearchChange: (value: string) => void
  onFilterChange: (value: 'all' | 'enabled' | 'disabled') => void
  onRefresh: () => void
  onToggleAccess: (org: OrganizationWithAI) => void
  onAdjustQuota: (org: OrganizationWithAI) => void
}
```
**Complexity:** High
**Dependencies:** Card, Input, Button, PlanBadge, AIStatusBadge, QuotaDisplay
**Target:** `app/(admin)/admin/ai/_components/OrganizationsTable.tsx`

#### 10. **QuotaModal** ⭐ New component
**Location:** Lines 778-849
**Purpose:** Modal for adjusting AI token quota
**Props:**
```typescript
{
  isOpen: boolean
  organization: OrganizationWithAI | null
  onClose: () => void
  onSave: (quota: string, expiresAt: string) => Promise<void>
}
```
**Complexity:** Medium
**Dependencies:** Modal, Input, Button, PlanBadge
**Target:** `app/(admin)/admin/ai/_components/QuotaModal.tsx`

#### 11. **AIAccessToggleModal** ⭐ New component
**Location:** Lines 851-916
**Purpose:** Modal for toggling AI access
**Props:**
```typescript
{
  isOpen: boolean
  organization: OrganizationWithAI | null
  onClose: () => void
  onConfirm: () => Promise<void>
}
```
**Complexity:** Medium
**Dependencies:** Modal, Button, PlanBadge, AIStatusBadge
**Target:** `app/(admin)/admin/ai/_components/AIAccessToggleModal.tsx`

---

### **B. Custom Hooks**

#### 1. **useAIManagement** ⭐ New hook
**Purpose:** Manage AI data fetching and state
**Extracts:**
- Organizations state (line 141)
- Plan features state (line 146)
- Loading/error states (lines 142-143)
- `fetchData` callback (lines 171-302)
- Effect for initial load (lines 304-306)

**Returns:**
```typescript
{
  organizations: OrganizationWithAI[]
  planFeatures: PlanFeatureValue[]
  isLoading: boolean
  error: string | null
  fetchData: () => Promise<void>
  setError: (error: string | null) => void
}
```
**Target:** `app/(admin)/admin/ai/_hooks/useAIManagement.ts`

#### 2. **useOrganizationFilters** ⭐ New hook
**Purpose:** Handle filtering logic
**Extracts:**
- Search query state (line 149)
- AI filter state (line 150)
- Filter function (lines 311-323)

**Returns:**
```typescript
{
  searchQuery: string
  aiFilter: 'all' | 'enabled' | 'disabled'
  setSearchQuery: (value: string) => void
  setAIFilter: (value: 'all' | 'enabled' | 'disabled') => void
  filteredOrganizations: OrganizationWithAI[]
}
```
**Target:** `app/(admin)/admin/ai/_hooks/useOrganizationFilters.ts`

#### 3. **useQuotaModal** ⭐ New hook
**Purpose:** Handle quota modal state and submission
**Extracts:**
- Modal state (line 153)
- Selected org (line 154)
- Form state (lines 159-162)
- Form error (line 156)
- Saving state (line 155)
- Handler functions (lines 328-389)

**Returns:**
```typescript
{
  isOpen: boolean
  selectedOrg: OrganizationWithAI | null
  isSaving: boolean
  formError: string | null
  openModal: (org: OrganizationWithAI) => void
  closeModal: () => void
  handleSubmit: (quota: string, expiresAt: string) => Promise<void>
}
```
**Target:** `app/(admin)/admin/ai/_hooks/useQuotaModal.ts`

#### 4. **useAIAccessModal** ⭐ New hook
**Purpose:** Handle AI access toggle modal
**Extracts:**
- Modal state (line 165)
- Access target (line 166)
- Handler functions (lines 394-451)

**Returns:**
```typescript
{
  isOpen: boolean
  targetOrg: OrganizationWithAI | null
  isSaving: boolean
  openModal: (org: OrganizationWithAI) => void
  closeModal: () => void
  handleToggle: () => Promise<void>
}
```
**Target:** `app/(admin)/admin/ai/_hooks/useAIAccessModal.ts`

---

### **C. Types**

#### **AI Page Types** ⭐ New file
**Extracts:**
- `OrganizationWithAI` interface
- `PlanFeatureValue` interface

**Target:** `app/(admin)/admin/ai/_types/index.ts`

---

### **D. Utilities**

#### **calculateAIStats** ⭐ New utility
**Purpose:** Calculate statistics from organizations
**Extracts:** Lines 453-460
**Signature:**
```typescript
function calculateAIStats(organizations: OrganizationWithAI[]): {
  total: number
  aiEnabled: number
  aiDisabled: number
  withQuota: number
  unlimited: number
}
```
**Target:** `app/(admin)/admin/ai/_utils/stats.ts`

---

## Extraction Priority

### Phase 1: Types and Small Components (Low Risk)
1. ✅ Extract types → `_types/index.ts`
2. ✅ Extract AIStatusBadge → `_components/AIStatusBadge.tsx`
3. ✅ Extract PlanBadge → `_components/PlanBadge.tsx`
4. ✅ Extract QuotaDisplay → `_components/QuotaDisplay.tsx`

### Phase 2: Utilities and Simple Components
5. ✅ Extract stats utility → `_utils/stats.ts`
6. ✅ Extract AIPageHeader → `_components/AIPageHeader.tsx`
7. ✅ Extract AIInfoCard → `_components/AIInfoCard.tsx`
8. ✅ Extract ErrorAlert → `_components/ErrorAlert.tsx`

### Phase 3: Custom Hooks (Core Logic)
9. ✅ Extract useAIManagement → `_hooks/useAIManagement.ts`
10. ✅ Extract useOrganizationFilters → `_hooks/useOrganizationFilters.ts`
11. ✅ Extract useQuotaModal → `_hooks/useQuotaModal.ts`
12. ✅ Extract useAIAccessModal → `_hooks/useAIAccessModal.ts`

### Phase 4: Complex Components
13. ✅ Extract AIStatsCards → `_components/AIStatsCards.tsx`
14. ✅ Extract PlanFeaturesSection → `_components/PlanFeaturesSection.tsx`
15. ✅ Extract QuotaModal → `_components/QuotaModal.tsx`
16. ✅ Extract AIAccessToggleModal → `_components/AIAccessToggleModal.tsx`
17. ✅ Extract OrganizationsTable → `_components/OrganizationsTable.tsx`

### Phase 5: Refactor Main Page
18. ✅ Refactor page.tsx to use extracted components and hooks

---

## Expected Outcome

**Before:**
- 1 file: 920 lines
- All logic in one component

**After:**
- **Types:** 1 file (~20 lines)
- **Utilities:** 1 file (~15 lines)
- **Hooks:** 4 files (~400 lines total)
- **Components:** 11 files (~450 lines total)
- **Main Page:** 1 file (~35 lines)

**Total:** 18 files, significantly improved maintainability and testability

---

## Benefits

1. **Maintainability:** Each component has a single responsibility
2. **Reusability:** Components can be used in other admin pages
3. **Testability:** Isolated components and hooks are easier to test
4. **Code Organization:** Clear separation of concerns
5. **Performance:** Potential for component-level memoization
6. **Developer Experience:** Easier to locate and modify specific functionality

---

## File Structure

```
app/(admin)/admin/ai/
├── _components/
│   ├── AIAccessToggleModal.tsx
│   ├── AIInfoCard.tsx
│   ├── AIPageHeader.tsx
│   ├── AIStatsCards.tsx
│   ├── AIStatusBadge.tsx
│   ├── ErrorAlert.tsx
│   ├── OrganizationsTable.tsx
│   ├── PlanBadge.tsx
│   ├── PlanFeaturesSection.tsx
│   ├── QuotaDisplay.tsx
│   └── QuotaModal.tsx
├── _hooks/
│   ├── useAIAccessModal.ts
│   ├── useAIManagement.ts
│   ├── useOrganizationFilters.ts
│   └── useQuotaModal.ts
├── _types/
│   └── index.ts
├── _utils/
│   └── stats.ts
└── page.tsx (refactored, ~35 lines)
```
