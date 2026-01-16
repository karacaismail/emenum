# QA Fix Request

**Status**: REJECTED ✗
**Date**: 2026-01-15T03:50:00Z
**QA Session**: 1

---

## Critical Issues to Fix

### 1. Not Using Existing exportPriceLedgerForCompliance Function

**Priority**: CRITICAL - BLOCKS SIGN-OFF
**Problem**:

The spec explicitly requires using the existing `exportPriceLedgerForCompliance()` function:
> "The exportPriceLedgerForCompliance() function already exists and formats data for regulatory submission."

Your implementation plan (subtask 1-2) explicitly stated:
> "Import exportPriceLedgerForCompliance from '@/lib/services/price-ledger'"
> "Call exportPriceLedgerForCompliance with organization.id, startDate, endDate"

However, the actual implementation:
- ❌ Does NOT import the function
- ❌ Reimplements all the database query logic in the client component
- ❌ Uses client-side Supabase client instead of server-side client

**Location**:
- `app/(dashboard)/audit/page.tsx` lines 237-335 (handleExportPriceHistory function)
- Missing import from `@/lib/services/price-ledger`

**Required Fix**:

You need to use the existing function, but since the audit page is a client component and the function uses server-side Supabase client, you must create an API route (following the project's existing pattern).

**Step 1**: Create `app/api/price-history/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { exportPriceLedgerForCompliance } from '@/lib/services/price-ledger'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Price History Export API Route
 *
 * POST /api/price-history/export
 *
 * Request body:
 * {
 *   organizationId: string
 *   startDate: string (ISO format)
 *   endDate: string (ISO format)
 * }
 *
 * Response: Result from exportPriceLedgerForCompliance
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, startDate, endDate } = await request.json()

    // Validate inputs
    if (!organizationId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Authenticate user and verify org access
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access to this organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!userOrg) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    // Call the existing exportPriceLedgerForCompliance function
    const result = await exportPriceLedgerForCompliance(
      organizationId,
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

**Step 2**: Update `app/(dashboard)/audit/page.tsx`

Replace the `handleExportPriceHistory` function (lines 237-335) with:

```typescript
/**
 * Handle export of price history for compliance
 */
const handleExportPriceHistory = async () => {
  // Clear previous messages
  setError(null)
  setSuccessMessage(null)

  // Validate organization
  if (!organization?.id) {
    setError('Disa aktarma icin bir isletme secilmis olmalidir')
    return
  }

  setIsExporting(true)

  try {
    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Validate date range
    if (start > end) {
      setError('Baslangic tarihi bitis tarihinden once olmalidir')
      setIsExporting(false)
      return
    }

    // Call API route that uses exportPriceLedgerForCompliance
    const response = await fetch('/api/price-history/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Export failed')
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Export failed')
    }

    // Create JSON blob from API response
    const jsonData = JSON.stringify(result, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const dataUrl = URL.createObjectURL(blob)

    // Generate filename with date range
    const filename = `fiyat-gecmisi-${startDate}-${endDate}.json`

    // Download file
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(dataUrl)

    // Show success message
    setSuccessMessage(`Fiyat gecmisi basariyla disa aktarildi: ${filename}`)
  } catch (err) {
    setError(`Disa aktarma hatasi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
  } finally {
    setIsExporting(false)
  }
}
```

**Verification**:
1. ✓ API route exists and calls `exportPriceLedgerForCompliance`
2. ✓ Client component calls API route via `fetch()`
3. ✓ No direct database queries in client component
4. ✓ Server-side authentication and authorization
5. ✓ Same JSON structure in downloaded file
6. ✓ No TypeScript errors
7. ✓ No console errors in browser
8. ✓ Export functionality works end-to-end

---

### 2. Error Message Inconsistency

**Priority**: MAJOR
**Problem**:

Implementation plan specified error message: "Baslangic tarihi bitis tarihinden once olmalidir"

Actual implementation uses: "Baslangic tarihi bitis tarihinden sonra olamaz"

**Location**: `app/(dashboard)/audit/page.tsx` line 257

**Required Fix**:

Change the error message to match the plan specification:

```typescript
// Line 257 - Change this:
setError('Baslangic tarihi bitis tarihinden sonra olamaz')

// To this:
setError('Baslangic tarihi bitis tarihinden once olmalidir')
```

**Verification**: Test with invalid date range and verify error message text.

---

## Why These Fixes Are Required

### Spec Compliance
The spec's entire purpose is to add a UI trigger for the existing `exportPriceLedgerForCompliance` function. Not using this function means the implementation doesn't meet the core requirement.

### Code Quality
- **DRY Principle**: Don't duplicate ~100 lines of tested code
- **Maintainability**: Changes to price export logic must be made in two places now
- **Security**: Client-side database queries are less secure than server-side operations
- **Testing**: The existing function has tests; the new implementation doesn't

### Architecture
The project has an established pattern for server-side operations (see `app/api/menu/publish/route.ts` and others). This implementation should follow the same pattern.

---

## After Fixes

Once you've implemented both fixes:

1. **Test Locally**:
   - Start dev server: `npm run dev`
   - Navigate to http://localhost:3000/audit
   - Test export with valid date range
   - Test export with invalid date range
   - Verify no console errors
   - Verify JSON downloads correctly

2. **Commit Changes**:
   ```bash
   git add app/api/price-history/export/route.ts app/(dashboard)/audit/page.tsx
   git commit -m "fix: use existing exportPriceLedgerForCompliance via API route (qa-requested)"
   ```

3. **QA Will Automatically Re-run**:
   - QA will validate the fixes
   - If fixes are correct, QA will approve
   - If issues remain, QA will provide another fix request

---

## Questions?

If you're unsure about any part of these fixes:
1. Review the existing API route pattern: `app/api/menu/publish/route.ts`
2. Review the existing function: `lib/services/price-ledger.ts` lines 517-559
3. Check how `getOrganizationPriceHistory` works (line 355+) to understand the proper data access pattern

---

**Expected Fix Time**: 30-45 minutes
**Iteration**: 1 of 50 maximum
**Next QA Run**: After commit with "(qa-requested)" in message
