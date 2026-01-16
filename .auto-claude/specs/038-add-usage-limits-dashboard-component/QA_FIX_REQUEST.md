# QA Fix Request

**Status**: REJECTED ❌
**Date**: 2026-01-15T03:45:00+00:00
**QA Session**: 1

---

## Critical Issues to Fix (BLOCKING)

### 1. Build Failure - Unused Variable in Error Handler

**Problem**:
The production build fails due to an ESLint error. The variable `err` is defined in the catch block but never used.

**Location**: `components/dashboard/usage-limits.tsx:152:14`

**Current Code**:
```typescript
} catch (err) {  // ERROR: 'err' is defined but never used
  setError('Kullanım limitleri yüklenirken bir hata oluştu.')
}
```

**Required Fix**:
Log the error for better debugging:
```typescript
} catch (err) {
  console.error('Failed to fetch usage limits:', err)
  setError('Kullanım limitleri yüklenirken bir hata oluştu.')
}
```

**Verification**:
```bash
npm run build
# Must succeed with exit code 0
# No ESLint errors should appear
```

**Commit Message**:
```
fix: remove unused err variable in UsageLimits component (qa-requested)
```

---

## Major Issues to Fix (HIGH PRIORITY)

### 2. Code Duplication - Doesn't Use Existing getAllLimitStatuses()

**Problem**:
The implementation plan explicitly requires: **"Call getAllLimitStatuses() from lib/guards/limits"**, but the current implementation duplicates ~70 lines of database query logic instead.

**Location**: `components/dashboard/usage-limits.tsx` (lines 86-151)

**Root Cause**:
The existing `getAllLimitStatuses()` function uses a server-side Supabase client, while the component is a client component. The implementation worked around this by duplicating the logic with a client-side Supabase client.

**Required Fix**:
Create an API route to bridge the client/server gap and reuse the existing function.

**Step 1**: Create `app/api/limits/route.ts`
```typescript
import { NextRequest } from 'next/server'
import { getAllLimitStatuses } from '@/lib/guards/limits'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return Response.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      )
    }

    const limits = await getAllLimitStatuses(organizationId)

    return Response.json({
      success: true,
      data: limits,
    })
  } catch (error) {
    console.error('Failed to fetch limit statuses:', error)
    return Response.json(
      { error: 'Failed to fetch limit statuses' },
      { status: 500 }
    )
  }
}
```

**Step 2**: Update `components/dashboard/usage-limits.tsx`

Replace the entire `fetchLimits` function (lines 79-157) with:

```typescript
const fetchLimits = useCallback(async () => {
  if (!organization?.id) return

  setIsLoading(true)
  setError(null)

  try {
    // Call the API route which uses getAllLimitStatuses()
    const response = await fetch(
      `/api/limits?organizationId=${organization.id}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch limits')
    }

    const { data } = await response.json()

    if (!data || data.length === 0) {
      setLimits([])
      return
    }

    // Transform server data to component format
    const transformedLimits: LimitStatus[] = data
      .filter(
        (limit: any) =>
          limit.featureKey === 'limit_categories' ||
          limit.featureKey === 'limit_products'
      )
      .map((limit: any) => ({
        featureKey: limit.featureKey,
        featureName: getFeatureName(limit.featureKey),
        currentCount: limit.currentCount,
        limit: limit.limit,
        isUnlimited: limit.isUnlimited,
        usagePercent: limit.usagePercent,
      }))

    setLimits(transformedLimits)
  } catch (err) {
    console.error('Failed to fetch usage limits:', err)
    setError('Kullanım limitleri yüklenirken bir hata oluştu.')
  } finally {
    setIsLoading(false)
  }
}, [organization?.id])
```

**Benefits**:
- ✅ Reuses existing `getAllLimitStatuses()` logic
- ✅ Eliminates ~70 lines of duplicated code
- ✅ Follows DRY principle
- ✅ Easier to maintain (single source of truth for limits logic)
- ✅ Complies with spec requirements

**Verification**:
1. Component still renders correctly
2. Progress bars display properly
3. No duplication of database query logic
4. Code review shows usage of `getAllLimitStatuses()` via API route

**Commit Message**:
```
refactor: use existing getAllLimitStatuses function via API route (qa-requested)

- Create /api/limits route to expose getAllLimitStatuses()
- Refactor UsageLimits component to call API instead of duplicating logic
- Remove ~70 lines of duplicated database query code
- Follows implementation plan requirement to use existing function
```

---

## After Fixes

Once both fixes are complete:

1. **Verify Build**:
   ```bash
   npm run build
   # Must succeed
   ```

2. **Verify in Browser**:
   ```bash
   npm run dev
   # Navigate to: http://localhost:3000/settings
   # Check: Usage limits section displays correctly
   # Check: Progress bars render with proper colors
   # Check: No console errors
   ```

3. **Commit Changes**:
   - Commit each fix separately with clear messages
   - Include "(qa-requested)" in commit messages

4. **QA Will Automatically Re-run**:
   - QA will re-validate all acceptance criteria
   - Browser verification will be performed
   - If all checks pass, feature will be approved for merge

---

## Priority Order

1. **FIRST**: Fix the build error (Issue #1) - this is blocking everything
2. **SECOND**: Fix the code duplication (Issue #2) - this is a spec requirement

---

## Questions?

If you need clarification on any of these fixes, check:
- QA Report: `qa_report.md` (full details)
- Implementation Plan: `implementation_plan.json` (original requirements)
- Spec: `spec.md` (feature overview)

---

**Next Action**: Implement fixes in priority order, commit each separately, then notify QA for re-validation.
