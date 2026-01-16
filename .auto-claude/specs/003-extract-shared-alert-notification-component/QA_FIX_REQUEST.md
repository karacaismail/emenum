# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-15T14:19:07+00:00
**QA Session**: 2

## Summary

The implementation violates the spec's core objective. While the Alert component is properly created and most files use it correctly, **3 inline alert patterns remain** in files that were created during this spec's development. These must be replaced with the shared Alert component.

---

## Critical Issues to Fix

### 1. Replace formError Inline Alert in categories/page.tsx

**Problem**: Modal form error uses inline alert pattern instead of Alert component

**Location**: `app/(dashboard)/categories/page.tsx:445-451`

**Current Code**:
```tsx
{formError && (
  <div
    className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
    role="alert"
  >
    {formError}
  </div>
)}
```

**Required Fix**:
Replace with Alert component (Alert is already imported on line 8):
```tsx
{formError && (
  <Alert variant="error" size="sm">
    {formError}
  </Alert>
)}
```

**Verification**:
- Alert component already imported: `import { Alert } from '@/components/ui/alert'`
- After fix: `grep 'role="alert"' app/(dashboard)/categories/page.tsx` should return no results
- Visual check: Error alert still displays in modal

---

### 2. Replace statsError Inline Alert in dashboard-client.tsx

**Problem**: Stats error uses inline alert pattern instead of Alert component. File doesn't even import Alert component.

**Location**: `app/(dashboard)/dashboard/dashboard-client.tsx:409-423`

**Current Code**:
```tsx
{statsError && (
  <div
    className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
    role="alert"
  >
    {statsError}
    <button
      type="button"
      onClick={fetchStats}
      className="ml-2 font-medium underline hover:no-underline"
    >
      Tekrar dene
    </button>
  </div>
)}
```

**Required Fix**:

**Step 1**: Add Alert import to file (around line 6, after Button import):
```tsx
import { Alert } from '@/components/ui/alert'
```

**Step 2**: Replace inline alert with Alert component:
```tsx
{statsError && (
  <Alert variant="error" size="sm">
    <div className="flex items-center justify-between gap-2">
      <span>{statsError}</span>
      <button
        type="button"
        onClick={fetchStats}
        className="font-medium underline hover:no-underline whitespace-nowrap"
      >
        Tekrar dene
      </button>
    </div>
  </Alert>
)}
```

**Verification**:
- Check import added: `grep "import.*Alert" app/(dashboard)/dashboard/dashboard-client.tsx`
- Visual check: Stats error alert still displays with retry button

---

### 3. Replace qrError Inline Alert in dashboard-client.tsx

**Problem**: QR error uses inline alert pattern instead of Alert component

**Location**: `app/(dashboard)/dashboard/dashboard-client.tsx:465-471`

**Current Code**:
```tsx
{qrError && (
  <div
    className="w-full rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
    role="alert"
  >
    {qrError}
  </div>
)}
```

**Required Fix**:
Replace with Alert component (Alert import added in Fix #2):
```tsx
{qrError && (
  <Alert variant="error" size="sm">
    {qrError}
  </Alert>
)}
```

**Verification**:
- After fix: `grep 'role="alert"' app/(dashboard)/dashboard/dashboard-client.tsx` should return no results
- Visual check: QR error alert still displays correctly

---

## Verification Checklist

After implementing all fixes, run these commands to verify:

```bash
# 1. Check no inline alert patterns remain in app directory
grep -r 'role="alert"' ./app --include="*.tsx"
# Expected: No results (all alerts should use Alert component)

# 2. Check Alert is imported in dashboard-client.tsx
grep -n "import.*Alert.*from '@/components/ui" app/(dashboard)/dashboard/dashboard-client.tsx
# Expected: Shows import line

# 3. Count inline alert patterns
grep -r 'bg-red-50.*border-red-200' ./app --include="*.tsx" | grep -v "Alert" | wc -l
# Expected: 0 (or only non-alert uses like badges)

# 4. Verify categories page has no role="alert"
grep 'role="alert"' app/(dashboard)/categories/page.tsx
# Expected: No results

# 5. Verify dashboard-client has no role="alert"
grep 'role="alert"' app/(dashboard)/dashboard/dashboard-client.tsx
# Expected: No results
```

---

## Why This Matters

**Spec Goal**: "Extract shared alert/notification component" to eliminate duplication of alert patterns (36 instances across 19 files).

**Problem**: Leaving inline alert patterns defeats the purpose of this refactor:
1. **Inconsistency**: Some files use Alert component, others use inline patterns
2. **Maintainability**: If design changes, we have to update both Alert component AND inline patterns
3. **Developer Confusion**: Future developers might copy inline patterns instead of using Alert component
4. **Technical Debt**: The spec's goal was to eliminate this exact pattern

**Solution**: Replace ALL inline alert patterns with the shared Alert component to fully achieve the spec's objective.

---

## After Fixes

Once all fixes are complete:

1. **Commit changes**:
   ```bash
   git add app/(dashboard)/categories/page.tsx app/(dashboard)/dashboard/dashboard-client.tsx
   git commit -m "fix: replace remaining inline alert patterns with Alert component (qa-requested)"
   ```

2. **Self-verify** using the verification commands above

3. **Update build-progress.txt** noting the QA-requested fixes

4. **QA will automatically re-run** to verify all issues are resolved

---

**Expected Outcome**: All inline alert patterns replaced with Alert component, fully achieving the spec's goal of eliminating duplicated alert code.
