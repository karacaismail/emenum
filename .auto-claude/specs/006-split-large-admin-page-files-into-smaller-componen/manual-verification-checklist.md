# Manual Verification Checklist

## Overview
This checklist is for verifying that all refactored admin pages render correctly after extracting components. Each page has been significantly reduced in size while preserving all functionality.

## Development Server

Start the development server:
```bash
npm run dev
```

Then open: http://localhost:3000

## Pages to Verify

### 1. Plans Page - `/admin/plans`

**File:** `app/(admin)/admin/plans/page.tsx`
**Before:** 1086 lines → **After:** 577 lines (46.8% reduction)
**Components:** 11 components in `components/admin/plans/`

**Verification Steps:**

#### Page Rendering
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools
- [ ] All sections render:
  - [ ] Plans list/table
  - [ ] Features list/table
  - [ ] Statistics cards (if present)

#### Plans CRUD Operations
- [ ] **Create Plan**
  - [ ] Click "Create Plan" button opens modal
  - [ ] Modal form has all fields (name, description, price, etc.)
  - [ ] Form validation works
  - [ ] Can create new plan successfully
  - [ ] New plan appears in list
  - [ ] Modal closes after creation

- [ ] **Edit Plan**
  - [ ] Click edit button on plan row
  - [ ] Modal opens with plan data pre-filled
  - [ ] Can modify plan details
  - [ ] Changes save correctly
  - [ ] Updated plan reflects changes in list

- [ ] **Toggle Plan Active/Inactive**
  - [ ] Toggle button changes plan active status
  - [ ] Status badge updates correctly
  - [ ] No errors during toggle

- [ ] **Manage Plan Features**
  - [ ] Click "Manage Features" button
  - [ ] Plan Features Modal opens
  - [ ] Can toggle boolean features on/off
  - [ ] Can set limit values for limit-type features
  - [ ] Changes save correctly

#### Features CRUD Operations
- [ ] **Create Feature**
  - [ ] Click "Create Feature" button opens modal
  - [ ] Form has fields: key, name, description, type
  - [ ] Can create boolean and limit type features
  - [ ] New feature appears in list

- [ ] **Edit Feature**
  - [ ] Click edit button on feature row
  - [ ] Modal opens with feature data
  - [ ] Can modify feature details
  - [ ] Changes save correctly

#### UI Components
- [ ] StatusBadge renders correctly (green=active, red=inactive)
- [ ] FeatureTypeBadge renders correctly (blue=boolean, purple=limit)
- [ ] Loading spinners show during data fetch
- [ ] Empty states show when no data

---

### 2. Overrides Page - `/admin/overrides`

**File:** `app/(admin)/admin/overrides/page.tsx`
**Before:** 991 lines → **After:** 358 lines (64% reduction)
**Components:** 10 components in `components/admin/overrides/`

**Verification Steps:**

#### Page Rendering
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools
- [ ] All sections render:
  - [ ] Statistics cards (total, active, expired, enabled, disabled)
  - [ ] Filter controls (search, org filter, status filter)
  - [ ] Overrides table

#### Overrides CRUD Operations
- [ ] **Create Override**
  - [ ] Click "Create Override" button
  - [ ] Modal opens with form
  - [ ] Organization dropdown populated
  - [ ] Feature dropdown populated
  - [ ] Can set value (enabled/disabled)
  - [ ] Can set expiration date (optional)
  - [ ] Can create override successfully
  - [ ] New override appears in table

- [ ] **Edit Override**
  - [ ] Click edit button on override row
  - [ ] Modal opens with override data
  - [ ] Can modify value and expiration
  - [ ] Changes save correctly

- [ ] **Delete Override**
  - [ ] Click delete button
  - [ ] Confirmation modal appears
  - [ ] Shows override details
  - [ ] Can confirm deletion
  - [ ] Override removed from table

- [ ] **Toggle Override**
  - [ ] Can toggle override enabled/disabled
  - [ ] Value badge updates correctly

#### Filtering
- [ ] Search by organization name works
- [ ] Filter by organization works
- [ ] Filter by status (all/active/expired) works
- [ ] Refresh button refetches data

#### UI Components
- [ ] OverrideValueBadge shows correct status
- [ ] ExpirationBadge shows expiration status with correct colors
- [ ] PlanBadge shows plan with correct color coding
- [ ] Statistics cards display correct counts

---

### 3. AI Management Page - `/admin/ai`

**File:** `app/(admin)/admin/ai/page.tsx`
**Before:** 828 lines → **After:** 474 lines (42.8% reduction)
**Components:** 9 components in `components/admin/ai/`

**Verification Steps:**

#### Page Rendering
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools
- [ ] All sections render:
  - [ ] AI statistics cards (5 stats)
  - [ ] Plan AI features summary
  - [ ] Organizations table with AI data
  - [ ] Filter controls

#### AI Management Operations
- [ ] **View Organizations**
  - [ ] Organizations table shows all orgs
  - [ ] AI status badge correct (enabled/disabled)
  - [ ] Quota display shows correctly
  - [ ] Usage statistics display
  - [ ] Plan information shows

- [ ] **Adjust Quota**
  - [ ] Click quota button opens modal
  - [ ] Modal shows current quota
  - [ ] Can adjust quota value
  - [ ] Changes save correctly
  - [ ] Updated quota reflects in table

- [ ] **Toggle AI Access**
  - [ ] Click AI access toggle
  - [ ] Confirmation modal appears
  - [ ] Can confirm enable/disable
  - [ ] AI status updates in table
  - [ ] AI status badge updates

#### Filtering
- [ ] Search organizations works
- [ ] AI access filter (all/enabled/disabled) works
- [ ] Refresh button works

#### UI Components
- [ ] AIStatusBadge shows correct status
- [ ] PlanBadge shows plan names with colors
- [ ] QuotaDisplay shows progress bar correctly
- [ ] Statistics cards show correct data

---

### 4. Organizations Page - `/admin/organizations`

**File:** `app/(admin)/admin/organizations/page.tsx`
**Before:** 812 lines → **After:** 376 lines (53.7% reduction)
**Components:** 6 components in `components/admin/organizations/`

**Verification Steps:**

#### Page Rendering
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools
- [ ] All sections render:
  - [ ] Statistics cards (total, active, inactive, with plan)
  - [ ] Search and filter controls
  - [ ] Organizations table

#### Organization Operations
- [ ] **View Organizations**
  - [ ] Table shows all organizations
  - [ ] Shows member count
  - [ ] Shows product count
  - [ ] Shows subscription plan
  - [ ] Status badge shows active/inactive

- [ ] **Toggle Organization Status**
  - [ ] Click toggle button
  - [ ] Status changes active ↔ inactive
  - [ ] Status badge updates
  - [ ] Statistics update

- [ ] **Edit Organization**
  - [ ] Click edit button
  - [ ] Modal opens with org data
  - [ ] Can edit organization details
  - [ ] Changes save correctly
  - [ ] Table updates with new data

- [ ] **Assign Plan**
  - [ ] Click "Assign Plan" button
  - [ ] Modal opens with plan selector
  - [ ] Plan dropdown populated
  - [ ] Can select start/end dates
  - [ ] Can assign plan successfully
  - [ ] Organization shows new plan

#### Filtering
- [ ] Search by organization name works
- [ ] Status filter (all/active/inactive) works
- [ ] Refresh button works

#### UI Components
- [ ] StatusBadge shows correct status
- [ ] PlanBadge shows plan names
- [ ] Statistics cards accurate
- [ ] Loading/empty states work

---

### 5. Tables Page - `/tables`

**File:** `app/(dashboard)/tables/page.tsx`
**Before:** 744 lines → **After:** 261 lines (64.9% reduction)
**Components:** 7 components in `components/dashboard/tables/`

**Verification Steps:**

#### Page Rendering
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools
- [ ] All sections render:
  - [ ] Statistics cards (empty, occupied, service needed)
  - [ ] Tables list
  - [ ] Add table button

#### Table Operations
- [ ] **Create Table**
  - [ ] Click "Yeni Masa" (New Table) button
  - [ ] Modal opens
  - [ ] Form has table_number and table_name fields
  - [ ] Can create new table
  - [ ] Table appears in list

- [ ] **Edit Table**
  - [ ] Click edit button on table
  - [ ] Modal opens with table data
  - [ ] Can modify table details
  - [ ] Changes save correctly

- [ ] **Delete Table**
  - [ ] Click delete button
  - [ ] Confirmation modal appears
  - [ ] Can confirm deletion
  - [ ] Table removed from list

- [ ] **Change Table Status**
  - [ ] Status selector shows on each table
  - [ ] Can change status (empty/occupied/service_needed)
  - [ ] Status badge updates
  - [ ] Statistics update

#### QR Code Functionality
- [ ] **View QR Code**
  - [ ] Click QR button on table
  - [ ] QR modal opens
  - [ ] QR code displays correctly
  - [ ] QR code encodes correct URL

- [ ] **Download QR Code**
  - [ ] SVG download button works
  - [ ] PNG download button works
  - [ ] PDF download button works
  - [ ] Downloaded files are valid

#### UI Components
- [ ] TableStatusBadge shows correct colors for each status
- [ ] Statistics cards show correct counts
- [ ] Loading spinner shows during fetch
- [ ] Empty state shows when no tables

---

## Overall Quality Checks

### TypeScript
- [x] TypeScript compilation succeeds (verified in subtask-6-1)
- [x] No type errors (verified in subtask-6-1)

### Tests
- [x] All tests pass: 202/202 tests (verified in subtask-6-1)

### Code Quality
- [ ] No console.log statements left in code
- [ ] No browser console errors
- [ ] No browser console warnings
- [ ] Proper error handling throughout

### Performance
- [ ] Pages load quickly
- [ ] No noticeable performance degradation
- [ ] Smooth UI interactions

### Responsive Design
- [ ] Pages work on desktop
- [ ] Pages work on tablet (if applicable)
- [ ] Pages work on mobile (if applicable)

### Dark Mode
- [ ] Components support dark mode
- [ ] Badges readable in dark mode
- [ ] Forms readable in dark mode

---

## Summary

After completing all verification steps above, confirm:

✅ All 5 pages render correctly
✅ All CRUD operations work as expected
✅ All UI components display properly
✅ No errors in browser console
✅ TypeScript compilation successful
✅ All tests passing
✅ Component extraction successful

## Sign-off

**Verified by:** _________________
**Date:** _________________
**Notes:**
_________________
_________________
_________________
