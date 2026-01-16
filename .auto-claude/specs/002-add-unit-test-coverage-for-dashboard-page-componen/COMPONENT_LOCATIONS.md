# Dashboard Component Locations - Unit Test Coverage

This document provides the exact paths and details of all dashboard components that require unit test coverage.

## Overview

Total Component Files: **6 files** across 4 feature areas
- Products: 3 files (HIGH complexity)
- Categories: 1 file (MEDIUM-HIGH complexity)
- Tables: 1 file (MEDIUM complexity)
- Plans: 1 file (HIGH complexity)

---

## 1. Products Page Components

### Main List Page
**Path:** `app/(dashboard)/products/page.tsx`
**Complexity:** HIGH
**Main Component:** `ProductsPage`

**Sub-Components:**
- `ProductListItem` - Renders individual product in list view

**Key Functionality:**
- List products with search and category filtering
- Create/edit/delete products with confirmation
- Toggle product visibility
- Form validation for product fields
- Allergen management (comma-separated list parsing)
- Image URL support with preview
- Category association

**Business Logic to Test:**
- **Immutable price ledger pattern** - price changes create new ledger entries
- Price change detection (only creates entry if price actually changed)
- Allergen parsing from comma-separated string to array
- Product-price-category data joining
- Currency formatting (Turkish Lira)

**State Management:**
- `fetchProducts()` - Fetches products with current prices and category details
- `handleSubmit()` - Creates/updates products and manages price ledger
- `handleToggleVisibility()` - Toggles product visibility
- `handleDeleteConfirm()` - Deletes products
- Search and filter state management

### Create Product Page
**Path:** `app/(dashboard)/products/new/page.tsx`
**Main Component:** `NewProductPage`

**Key Functionality:**
- Dedicated page for creating new products
- Form validation
- Initial price ledger entry creation
- Category selection

### Edit Product Page
**Path:** `app/(dashboard)/products/[id]/page.tsx`
**Main Component:** `EditProductPage`

**Key Functionality:**
- Edit existing product details
- Price change tracking with history
- Image preview functionality
- Delete product functionality

---

## 2. Categories Page Components

### Main Categories Page
**Path:** `app/(dashboard)/categories/page.tsx`
**Complexity:** MEDIUM-HIGH
**Main Component:** `CategoriesPage`

**Sub-Components:**
- `CategoryTreeNode` - Recursive component for hierarchical display

**Key Functionality:**
- List categories in hierarchical tree structure
- Create/edit/delete categories
- Toggle category visibility
- Auto-generate URL slugs from names
- Support parent-child relationships
- Sort by sort_order field

**Business Logic to Test:**
- `generateSlug()` - Converts Turkish text to URL-safe slugs
  - Turkish character mapping (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u)
  - Lowercase conversion and hyphenation
- Hierarchical parent-child relationship management
- **Prevent deleting categories with children**
- **Prevent circular parent-child relationships** in edit mode
- `getAvailableParents()` - Filters descendant categories from parent dropdown

**State Management:**
- `fetchCategories()` - Fetches all categories sorted by sort_order
- `handleSubmit()` - Creates/updates categories
- `handleToggleVisibility()` - Toggles visibility
- `handleDeleteConfirm()` - Deletes with child check

---

## 3. Tables Page Components

### Main Tables Page
**Path:** `app/(dashboard)/tables/page.tsx`
**Complexity:** MEDIUM
**Main Component:** `TablesPage`

**Sub-Components:**
- `TableListItem` - Renders table with QR preview and status

**Key Functionality:**
- List restaurant tables with status indicators
- Create/edit/delete tables
- Change table status (empty/occupied/service_needed)
- Generate and preview QR codes
- Download QR codes in multiple formats (SVG, PNG, PDF)
- Display table statistics by status

**Business Logic to Test:**
- QR code generation with organization slug and table UUID
- Status-based color coding (empty=green, occupied=blue, service_needed=amber)
- Table statistics calculation (counts by status)
- QR preview loading on demand
- File download handling for different formats
- QR code data URL vs. SVG blob handling

**State Management:**
- `fetchTables()` - Fetches all tables sorted by table_number
- `handleSubmit()` - Creates/updates tables
- `handleStatusChange()` - Updates table status
- `handleDeleteConfirm()` - Deletes tables
- `handleDownloadQR()` - Generates and downloads QR codes

**Dependencies:**
- QR code library functions: `generateQRCodeSVG`, `generateQRCodePNG`, `generateQRCodePDF`

---

## 4. Plans Page Components

### Admin Plans Page
**Path:** `app/(admin)/admin/plans/page.tsx`
**Complexity:** HIGH
**Main Component:** `PlansPage`

**Sub-Components:**
- `StatusBadge` - Displays plan active/inactive status
- `FeatureTypeBadge` - Displays feature type (boolean/limit)

**Key Functionality:**
- List all subscription plans with counts
- Create/edit plans with pricing and sort order
- Toggle plan active/inactive status
- Manage feature catalog (create/edit features)
- Assign features to plans with values
- Tab-based UI for plans and features
- Support boolean features (on/off) and limit features (numeric)
- Dynamic plan system (no hard-coded plan checks)

**Business Logic to Test:**
- Feature count aggregation per plan
- Active subscriber count per plan
- Plan-feature association with value types (boolean/limit)
- Limit value handling:
  - `-1` = unlimited
  - `null` = not set
  - positive number = specific limit
- **Feature key immutability** (cannot change after creation)
- Plan-feature toggle logic (add/remove/update)

**State Management:**
- `fetchPlans()` - Fetches plans with feature and subscriber counts
- `fetchFeatures()` - Fetches all features from catalog
- `fetchPlanFeatures()` - Fetches features assigned to specific plan
- `handlePlanSubmit()` - Creates/updates plans
- `handleTogglePlan()` - Toggles plan active status
- `handleFeatureSubmit()` - Creates/updates features
- `handleTogglePlanFeature()` - Toggles boolean feature for plan
- `handleUpdatePlanFeatureLimit()` - Updates limit value for plan feature

**Tab State:**
- Toggle between 'plans' and 'features' tabs
- Statistics for each tab

---

## Common Dependencies Across All Components

1. **Supabase Client** - Database operations (mock required for tests)
2. **useAuth Hook** - Organization context (products, categories, tables only)
3. **UI Components** - Card, Button, Input, Modal, etc. (from @/components/ui)
4. **Next.js** - useRouter, Link, Image (mock required for tests)

---

## Test Strategy Recommendations

### Priority Order:
1. **Phase 1:** Utility functions (formatCurrency, generateSlug)
2. **Phase 2:** Products page (highest complexity, immutable price ledger)
3. **Phase 3:** Categories page (hierarchical logic, Turkish characters)
4. **Phase 4:** Tables page (QR generation, status management)
5. **Phase 5:** Plans page (dynamic feature system, admin-only)

### Coverage Goals:
- Target: **80%+ coverage** for tested components
- Focus on business logic, form validation, state management, error handling
- Mock Supabase client and external dependencies
- Use factory functions for test data
- Follow @testing-library/react best practices

---

## Next Steps

1. Create test utilities and mocks directory structure (`subtask-1-3`)
2. Write unit tests for each component following the implementation plan
3. Verify coverage meets 80% target
4. Document testing patterns for future contributors
