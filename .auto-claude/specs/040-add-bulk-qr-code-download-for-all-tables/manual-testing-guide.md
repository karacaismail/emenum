# Manual Testing Guide: Bulk QR Code Download Feature

## Overview
This guide provides detailed instructions for manually testing the bulk QR code download feature for tables.

## Prerequisites
1. Ensure the development server is running: `npm run dev`
2. Navigate to `http://localhost:3000/tables` in your browser
3. You should have an active session with access to a restaurant/organization
4. You should have the JSZip dependency installed: `npm install`

## Test Cases

### Test Case 1: Normal Operation with Multiple Tables (Happy Path)
**Objective:** Verify that bulk download works correctly with multiple tables

**Steps:**
1. Navigate to `/tables` page
2. Ensure you have at least 3-5 tables in the system
   - If not, create some test tables first
3. Locate the "Download All" button near the "New Table" button in the page header
4. Click the "Download All" button
5. Verify that a dropdown menu appears with two options:
   - "Download All as ZIP"
   - "Download All as PDF"

**Test 1A: Download All as ZIP**
1. Click "Download All as ZIP"
2. Wait for the download to complete
3. Verify that a ZIP file downloads with filename pattern: `{org-slug}-tables-qr-YYYY-MM-DD.zip`
4. Extract the ZIP file
5. Verify:
   - ✅ Each table has a corresponding PNG file inside
   - ✅ PNG filenames follow pattern: `{table-number}-qr.png`
   - ✅ PNG files are high quality (2048px)
   - ✅ Each PNG contains a valid QR code
   - ✅ Number of PNG files matches number of tables

**Test 1B: Download All as PDF**
1. Click "Download All as PDF"
2. Wait for the download to complete
3. Verify that a ZIP file downloads with filename pattern: `{org-slug}-tables-qr-pdf-YYYY-MM-DD.zip`
4. Extract the ZIP file
5. Verify:
   - ✅ Each table has a corresponding PDF file inside
   - ✅ PDF filenames follow pattern: `{table-number}-qr.pdf`
   - ✅ Each PDF is A5 size with QR code
   - ✅ Each PDF includes organization name and table number
   - ✅ Number of PDF files matches number of tables

### Test Case 2: Edge Case - No Tables
**Objective:** Verify error handling when no tables exist

**Steps:**
1. Delete all tables or switch to an organization with no tables
2. Navigate to `/tables` page
3. Click "Download All" button
4. Select "Download All as ZIP"
5. Verify:
   - ✅ An error message appears (e.g., "İndirilecek masa bulunamadı")
   - ✅ No ZIP file is downloaded
   - ✅ The error is user-friendly and clear

6. Repeat with "Download All as PDF"
7. Verify same error handling behavior

### Test Case 3: Edge Case - Single Table
**Objective:** Verify that bulk download works correctly with just one table

**Steps:**
1. Ensure you have exactly 1 table in the system
2. Navigate to `/tables` page
3. Click "Download All" → "Download All as ZIP"
4. Verify:
   - ✅ ZIP file downloads successfully
   - ✅ ZIP contains exactly 1 PNG file
   - ✅ PNG is valid and contains correct QR code

### Test Case 4: Edge Case - Many Tables (10+)
**Objective:** Verify performance with many tables

**Steps:**
1. Create 10-15 test tables
2. Navigate to `/tables` page
3. Click "Download All" → "Download All as ZIP"
4. Verify:
   - ✅ Download starts within reasonable time (< 3 seconds)
   - ✅ All QR codes are generated correctly
   - ✅ ZIP contains all tables
   - ✅ No browser console errors
   - ✅ UI remains responsive during generation

### Test Case 5: Error Handling - QR Generation Failure
**Objective:** Verify graceful error handling when QR generation fails

**Steps:**
1. Open browser DevTools console
2. Navigate to `/tables` page
3. Monitor console for errors during bulk download
4. If possible, simulate a network error or invalid QR data
5. Verify:
   - ✅ Error messages are displayed to the user
   - ✅ Partial success is handled (some QRs succeed, some fail)
   - ✅ The browser doesn't crash or hang
   - ✅ Error details are logged appropriately

### Test Case 6: UI/UX Verification
**Objective:** Verify the user interface and experience

**Steps:**
1. Navigate to `/tables` page
2. Verify the "Download All" button:
   - ✅ Is visible and properly positioned near "New Table" button
   - ✅ Has appropriate styling consistent with the page design
   - ✅ Dropdown menu is styled correctly
   - ✅ Hover states work properly
   - ✅ Dark mode styling is correct (if dark mode is enabled)
   - ✅ Icons and text are aligned properly
   - ✅ Dropdown closes when clicking outside

### Test Case 7: Browser Compatibility
**Objective:** Verify feature works across different browsers

**Test in each browser:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on macOS)

**For each browser:**
1. Navigate to `/tables` page
2. Test "Download All as ZIP"
3. Test "Download All as PDF"
4. Verify:
   - ✅ Downloads work correctly
   - ✅ No console errors
   - ✅ UI renders correctly
   - ✅ Files can be extracted and opened

### Test Case 8: File Naming Validation
**Objective:** Verify filename sanitization works correctly

**Steps:**
1. Create tables with special characters in names:
   - "Masa 1" (with space)
   - "VIP!" (with exclamation)
   - "Teras #5" (with hash)
   - "BAR/Lounge" (with slash)
2. Download all as ZIP
3. Extract and verify:
   - ✅ Filenames are sanitized (e.g., "masa-1-qr.png")
   - ✅ Special characters are removed or replaced with hyphens
   - ✅ Files can be extracted without errors
   - ✅ No duplicate filenames

## Console Error Checks

Throughout all tests, monitor the browser console for:
- ❌ TypeScript errors
- ❌ Runtime errors
- ❌ Network errors
- ❌ Warning messages
- ❌ Failed QR generation attempts

All tests should complete WITHOUT console errors.

## Success Criteria

The feature is considered **PASSING** if:
- ✅ All 8 test cases pass
- ✅ No console errors appear during testing
- ✅ Files download with correct naming patterns
- ✅ QR codes are valid and scannable
- ✅ Error handling works gracefully
- ✅ UI is polished and responsive
- ✅ Feature works across major browsers

## Failure Criteria

The feature is considered **FAILING** if:
- ❌ Downloads don't work
- ❌ QR codes are invalid or don't scan
- ❌ Console errors appear
- ❌ File naming is incorrect
- ❌ Error messages are unclear or missing
- ❌ UI is broken or misaligned
- ❌ Browser crashes or hangs

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] Test Case 1A: ZIP download with multiple tables
- [ ] Test Case 1B: PDF download with multiple tables
- [ ] Test Case 2: No tables error handling
- [ ] Test Case 3: Single table download
- [ ] Test Case 4: Many tables (10+) download
- [ ] Test Case 5: Error handling verification
- [ ] Test Case 6: UI/UX verification
- [ ] Test Case 7: Browser compatibility (Chrome)
- [ ] Test Case 7: Browser compatibility (Firefox)
- [ ] Test Case 7: Browser compatibility (Safari)
- [ ] Test Case 8: File naming validation
- [ ] No console errors in any test
- [ ] All QR codes are scannable
- [ ] Dark mode styling verified

## Notes

Document any issues found during testing:

---

**Tested By:** _______________
**Date:** _______________
**Browser(s):** _______________
**Result:** ☐ PASS  ☐ FAIL

**Issues Found:**

