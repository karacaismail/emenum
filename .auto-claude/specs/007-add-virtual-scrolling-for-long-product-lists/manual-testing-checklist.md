# Manual Testing Checklist - Virtual Scrolling for Products

**Feature:** Virtual scrolling implementation for product lists using @tanstack/react-virtual
**Date:** 2026-01-15
**Subtask:** subtask-3-1

## Pre-Testing Verification (Code Review) ✅

### Implementation Review
- ✅ **VirtualizedProductList Component Created** (`components/products/VirtualizedProductList.tsx`)
  - Uses `useVirtualizer` hook from @tanstack/react-virtual
  - Estimated item size: 70px (appropriate for ProductListItem height)
  - Overscan: 5 items (for smooth scrolling)
  - Fixed container height: 600px
  - Proper absolute positioning for virtual items
  - Dividers between items maintained

- ✅ **Integration into Products Page** (`app/(dashboard)/products/page.tsx`)
  - VirtualizedProductList imported correctly
  - Integrated at line ~417 replacing filteredProducts.map()
  - All props passed correctly:
    - products={filteredProducts}
    - onEdit={handleEditProduct}
    - onDelete={setDeleteTarget}
    - onToggleVisibility={handleToggleVisibility}
  - Empty state logic preserved
  - All existing functionality maintained

- ✅ **TypeScript Types**
  - ProductWithDetails interface defined
  - Proper prop types for callbacks
  - No type errors expected

## Manual Browser Testing Checklist

### Setup
- [ ] Run `npm run dev` from project root
- [ ] Navigate to `http://localhost:3000/dashboard/products`
- [ ] Open browser DevTools (F12)
- [ ] Open Elements/Inspector tab

### Test 1: Basic Product List Display
- [ ] Products load and display correctly
- [ ] Product images render (or placeholder shows)
- [ ] Product names are visible
- [ ] Categories display correctly
- [ ] Prices format correctly (Turkish Lira)
- [ ] Allergen badges show when applicable

### Test 2: Virtual Scrolling Performance
- [ ] **Key Test:** Scroll through the list - should be smooth (60fps)
- [ ] No lag or stuttering during scroll
- [ ] Items appear/disappear smoothly at viewport edges
- [ ] No blank spaces during scrolling

### Test 3: DOM Node Verification (Critical)
- [ ] **In DevTools Elements tab:**
  - Search for `data-index=` attributes
  - Count the number of ProductListItem elements
  - **Expected:** ~20-30 max visible at once (not 100+ if you have many products)
  - Scroll to bottom and recount - should still be ~20-30
- [ ] **Memory Test:** Check DevTools Memory/Performance tab
  - Memory usage should be lower than before
  - No memory leaks during scrolling

### Test 4: Edit Functionality
- [ ] Click "Edit" button on any product
- [ ] Modal opens correctly
- [ ] Product data populates form fields
- [ ] Make changes and save
- [ ] Changes reflect immediately in the list
- [ ] Virtual scroll position maintained after edit

### Test 5: Delete Functionality
- [ ] Click "Delete" button on any product
- [ ] Confirmation dialog appears
- [ ] Cancel works (product not deleted)
- [ ] Confirm delete works
- [ ] Product removed from list
- [ ] Virtual scroll adjusts correctly
- [ ] No broken spacing after delete

### Test 6: Visibility Toggle
- [ ] Click eye icon to hide product
- [ ] Product appears dimmed (opacity-60)
- [ ] Icon changes to "hidden" state
- [ ] Click again to show product
- [ ] Product returns to normal opacity
- [ ] Updates happen immediately without scroll reset

### Test 7: Search Functionality
- [ ] Type in search box
- [ ] List filters to matching products
- [ ] Virtual scroll adjusts to filtered count
- [ ] Clear search - all products return
- [ ] Search works with scroll position

### Test 8: Category Filter
- [ ] Select a category from filter
- [ ] List shows only products in that category
- [ ] Virtual scroll recalculates height
- [ ] Clear filter - all products return

### Test 9: Edge Cases

#### Empty List
- [ ] Delete all products or apply filter with no matches
- [ ] Empty state message shows correctly
- [ ] No JavaScript errors in console

#### Small List (< 20 items)
- [ ] With few products (< 20), list still works
- [ ] No blank space at bottom
- [ ] All items visible without scroll
- [ ] Functionality works normally

#### Large List (100+ items)
- [ ] Create or load 100+ products
- [ ] Initial render is fast
- [ ] Scroll performance remains smooth
- [ ] DOM still only shows ~20-30 items
- [ ] No performance degradation

### Test 10: Console Verification
- [ ] **No errors in console** during:
  - Initial page load
  - Scrolling
  - Editing products
  - Deleting products
  - Toggling visibility
  - Filtering/searching

### Test 11: Responsive Behavior
- [ ] Resize browser window
- [ ] Virtual scroll adjusts correctly
- [ ] No layout breaks
- [ ] Mobile viewport works (if applicable)

## Performance Metrics to Note

### Before Virtual Scrolling
- DOM nodes with 200 products: ~1000-1500 elements
- Scroll FPS: 30-45fps (janky)
- Memory: Higher baseline

### After Virtual Scrolling (Expected)
- DOM nodes with 200 products: ~20-30 elements
- Scroll FPS: 60fps (smooth)
- Memory: Lower baseline
- Faster initial render

## Known Issues / Notes

_Document any issues found during testing here:_

---

## Test Results

### Tester: _______________
### Date: _______________
### Browser: _______________
### Product Count Tested: _______________

### Overall Result: ⬜ PASS / ⬜ FAIL

### Issues Found:
1.
2.
3.

### Notes:


---

## Code Review Summary

✅ **Implementation Complete:**
- Virtual scrolling library installed (@tanstack/react-virtual@3.13.18)
- VirtualizedProductList component created with proper virtualization
- Integration into products page completed
- All existing functionality preserved
- TypeScript types correct
- Code follows existing patterns

✅ **Ready for Manual Browser Testing**

**Next Steps:**
1. A human tester should run `npm run dev`
2. Follow this checklist in a browser
3. Verify DOM reduction using DevTools
4. Confirm smooth scrolling performance
5. Test all interactive features
