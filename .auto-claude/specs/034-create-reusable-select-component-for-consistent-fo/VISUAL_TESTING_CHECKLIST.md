# Visual Regression Testing Checklist

## Overview
This document provides a comprehensive checklist for manually testing the Select component implementation across all pages. The Select component has been integrated into 11 different page files, replacing inline select elements with a consistent, accessible, and styled component.

## Prerequisites
Before starting the visual testing, ensure:
1. Run `npm install` to ensure all dependencies are installed
2. Run `npm run test:run` to verify all unit tests pass
3. Run `npm run typecheck` to verify no TypeScript errors
4. Start the development server: `npm run dev`
5. Open your browser to `http://localhost:3000`

## Component Features to Verify
The Select component supports the following features:
- ✓ Label text above the select
- ✓ Helper text below the select
- ✓ Error states with error messages
- ✓ Full width and custom width options
- ✓ Dark mode support
- ✓ Disabled state
- ✓ Chevron icon indicator
- ✓ Accessibility (ARIA attributes)

---

## Testing Checklist

### 1. Products - New Product Page
**URL:** `/products/new`

**Select Components:**
- Category selector

**Checks:**
- [ ] Label "Kategori" displays correctly above the select
- [ ] Helper text shows when categories are empty
- [ ] Select has consistent border and padding
- [ ] Chevron icon appears on the right
- [ ] Dropdown opens and closes smoothly
- [ ] Options are readable and clickable
- [ ] Full width behavior (select spans container width)
- [ ] **Dark Mode:** Border, background, and text colors are appropriate
- [ ] **Dark Mode:** Dropdown options are readable
- [ ] **Disabled State:** When disabled, opacity reduces and cursor changes
- [ ] **Hover State:** Border color changes on hover
- [ ] **Focus State:** Blue ring appears on focus

---

### 2. Products - Edit Product Page
**URL:** `/products/[id]` (edit any product)

**Select Components:**
- Category selector

**Checks:**
- [ ] Label "Kategori" displays correctly
- [ ] Helper text with link shows when categories are empty
- [ ] Pre-selected category value displays correctly
- [ ] Select styling matches new product page
- [ ] Full width behavior
- [ ] **Dark Mode:** Consistent styling with new product page
- [ ] **Error State:** If validation fails, red border and error message appear
- [ ] **Focus State:** Blue ring appears on focus

---

### 3. Products - List Page
**URL:** `/products`

**Select Components:**
1. Category filter (top of page)
2. Category selector in modal

**Checks - Filter Select:**
- [ ] Label "Filtre: Kategori" displays correctly
- [ ] "Tum Kategoriler" option works
- [ ] Filter updates product list when changed
- [ ] Styling is consistent with other selects
- [ ] Full width behavior

**Checks - Modal Select:**
- [ ] Label "Kategori" displays correctly in modal
- [ ] Select renders properly inside modal
- [ ] Full width behavior within modal
- [ ] **Dark Mode:** Both selects work in dark mode
- [ ] Modal select has proper z-index (dropdown not hidden)

---

### 4. Categories Page
**URL:** `/categories`

**Select Components:**
- Parent category selector ("Ust Kategori")

**Checks:**
- [ ] Label "Ust Kategori" displays correctly
- [ ] "Yok (Ana Kategori)" option appears first
- [ ] Existing categories appear as options
- [ ] Select styling is consistent
- [ ] Full width behavior
- [ ] **Dark Mode:** Proper border and background colors
- [ ] **Error State:** Error message appears if validation fails
- [ ] **Helper Text:** Any helper text is visible and styled correctly

---

### 5. Tables Page
**URL:** `/tables`

**Select Components:**
- Status selector (inline in table rows)

**Checks:**
- [ ] Status select renders compactly in table cell
- [ ] **Custom Width:** `fullWidth={false}` makes select fit content
- [ ] Custom className preserves compact styling
- [ ] Chevron icon visible despite compact size
- [ ] Dropdown opens correctly without layout shift
- [ ] Status changes save properly
- [ ] **Dark Mode:** Text and background readable in table context
- [ ] Multiple status selects (one per row) render consistently
- [ ] **Hover State:** Border changes on hover in table cell

---

### 6. Audit Log Page
**URL:** `/audit`

**Select Components:**
1. Action filter
2. Entity type filter

**Checks - Both Selects:**
- [ ] Labels display correctly ("Aksiyon" and "Entity Turu")
- [ ] "Tum" (All) option works for filtering
- [ ] Filters update audit log when changed
- [ ] Both selects have consistent styling
- [ ] **Dark Mode:** Filters are readable and functional
- [ ] **Side by Side:** If positioned next to each other, alignment is correct
- [ ] Dropdown width accommodates longest option

---

### 7. Admin - AI Page
**URL:** `/admin/ai`

**Select Components:**
- AI provider filter

**Checks:**
- [ ] Label displays correctly
- [ ] Filter options render properly
- [ ] Filtering functionality works
- [ ] Styling matches admin panel theme
- [ ] **Dark Mode:** Admin panel dark mode styling
- [ ] **Access Control:** Only visible to admin users

---

### 8. Admin - Organizations Page
**URL:** `/admin/organizations`

**Select Components:**
- Status filter

**Checks:**
- [ ] Label "Durum" displays correctly
- [ ] Status options render properly
- [ ] Filter updates organization list
- [ ] Consistent styling with admin theme
- [ ] **Dark Mode:** Proper admin dark mode colors

---

### 9. Admin - Overrides Page
**URL:** `/admin/overrides`

**Select Components:**
1. Organization filter
2. Status filter
3. Organization selector (in modal)
4. Feature selector (in modal)

**Checks - Filter Selects:**
- [ ] Both filter labels display correctly
- [ ] Filters work independently
- [ ] Options populate from backend data
- [ ] Consistent styling

**Checks - Modal Selects:**
- [ ] Organization select in modal works correctly
- [ ] Feature select in modal works correctly
- [ ] Labels are visible in modal context
- [ ] Full width behavior within modal
- [ ] **Dark Mode:** All four selects work in dark mode
- [ ] **Error State:** Validation errors show red border and message
- [ ] Modal doesn't clip dropdown options

---

### 10. Admin - Plans Page
**URL:** `/admin/plans`

**Select Components:**
- Feature type selector (in modal)

**Checks:**
- [ ] Label displays in modal
- [ ] Feature type options render correctly
- [ ] Selection updates form state
- [ ] Full width behavior in modal
- [ ] **Dark Mode:** Proper styling in admin dark mode
- [ ] **Error State:** Required field validation works
- [ ] Dropdown opens without z-index issues

---

## Cross-Browser Testing

Test in the following browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

### Browser-Specific Checks:
- [ ] Select arrow/chevron renders consistently
- [ ] Dropdown opens and closes properly
- [ ] Focus states work correctly
- [ ] Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- [ ] Screen reader announces label and error messages

---

## Responsive Testing

Test at the following breakpoints:
- [ ] Mobile (375px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1024px+ width)

**Checks at Each Breakpoint:**
- [ ] Labels remain readable
- [ ] Full width selects span container appropriately
- [ ] Compact selects maintain proper sizing
- [ ] Dropdowns don't overflow screen edges
- [ ] Touch targets are adequate (44px minimum on mobile)

---

## Accessibility Testing

### Keyboard Navigation:
- [ ] Tab key moves focus to select
- [ ] Arrow keys navigate options when focused
- [ ] Enter/Space opens dropdown
- [ ] Escape closes dropdown
- [ ] Selected option announced by screen reader

### Screen Reader Testing:
- [ ] Label is announced before select
- [ ] Helper text is announced (aria-describedby)
- [ ] Error messages are announced (aria-invalid + aria-describedby)
- [ ] Selected option is announced
- [ ] Disabled state is announced

### Visual Accessibility:
- [ ] Focus indicator has sufficient contrast (4.5:1)
- [ ] Error state text has sufficient contrast
- [ ] Color is not the only indicator of error state
- [ ] Text is readable at 200% zoom

---

## Error State Testing

For each page with Select components, test error states:

1. **Trigger Validation Errors:**
   - [ ] Leave required select empty and submit form
   - [ ] Error message appears below select
   - [ ] Select border turns red
   - [ ] Select background changes to light red (light mode)
   - [ ] Error message is red and readable
   - [ ] Helper text is replaced by error message

2. **Clear Validation Errors:**
   - [ ] Select a valid option
   - [ ] Error state clears
   - [ ] Border returns to normal color
   - [ ] Helper text reappears (if applicable)

3. **Dark Mode Error States:**
   - [ ] Error border is visible in dark mode
   - [ ] Error background is appropriate
   - [ ] Error text is readable

---

## Dark Mode Testing

Toggle dark mode and verify for each page:

**Light Mode:**
- [ ] White/light background
- [ ] Dark text
- [ ] Gray borders
- [ ] Blue focus ring
- [ ] Red error states

**Dark Mode:**
- [ ] Dark background
- [ ] Light text
- [ ] Lighter borders
- [ ] Blue focus ring (still visible)
- [ ] Red error states (still visible)

**Transition:**
- [ ] Smooth transition between modes
- [ ] No flash of unstyled content
- [ ] All selects update simultaneously

---

## Performance Testing

- [ ] Initial page load: Selects render without delay
- [ ] No layout shift when selects render
- [ ] Dropdown opens instantly on click
- [ ] Option selection updates state immediately
- [ ] No console errors in browser DevTools
- [ ] No React hydration warnings

---

## Regression Testing

Verify that existing functionality still works:

**Products:**
- [ ] Can create new product with category
- [ ] Can edit product category
- [ ] Can filter products by category
- [ ] Category changes save to database

**Categories:**
- [ ] Can create category with parent
- [ ] Can edit category parent
- [ ] Parent-child relationships work

**Tables:**
- [ ] Can change table status
- [ ] Status changes persist

**Audit:**
- [ ] Can filter audit logs
- [ ] Filters apply correctly

**Admin:**
- [ ] All admin filters work
- [ ] Modal forms submit correctly
- [ ] Data updates properly

---

## Known Issues / Notes

Document any issues found during testing:

| Page | Issue Description | Severity | Status |
|------|------------------|----------|---------|
| | | | |

---

## Sign-Off

**Tester Name:** ___________________
**Date:** ___________________
**Result:** [ ] PASS [ ] FAIL

**Notes:**
```

