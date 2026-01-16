# Manual Actions Required

## Current Status

This task has reached a point where manual intervention is required due to environment restrictions.

### What's Been Completed ✅

- ✅ **Subtask 1-1**: Identified current dependency versions
- ✅ **Subtask 1-2**: Updated package.json with:
  - vitest: `^4.0.17` (was `^2.0.0`)
  - @vitejs/plugin-react: `^5.1.2` (was `^4.3.0`)

### What's Blocked ❌

- ❌ **Subtask 1-3**: Install dependencies (npm install blocked)
- ❌ **Subtask 1-4**: Run test suite (npm test blocked)
- ❌ **Subtask 1-5**: Verify production build (npm run build blocked)

## Required Actions

Please complete these steps **in order**:

### Step 1: Install Dependencies (Subtask 1-3)

```bash
cd /Users/karaca/Desktop/ozon/.worktrees/017-update-vulnerable-development-dependencies-esbuild
npm install
```

**Verify it worked:**
```bash
grep -A 2 '"node_modules/esbuild"' package-lock.json | grep '"version"'
```

**Expected result:** esbuild version should be **0.24.3 or higher** (was 0.21.5)

### Step 2: Run Tests (Subtask 1-4)

```bash
npm test -- --run
```

**OR alternatively:**
```bash
npm run test:run
```

**Expected result:** All tests should pass ✅

Test files that will be executed:
- `lib/__tests__/price-ledger-immutability.test.ts`
- `lib/__tests__/snapshot-hash.test.ts`
- `lib/guards/__tests__/permission.test.ts`
- `tests/__tests__/integration/auth-flow.test.ts`
- `tests/__tests__/integration/rls-isolation.test.ts`
- `tests/__tests__/integration/waiter-call-flow.test.ts`
- `tests/example.test.ts`

### Step 3: Verify Production Build (Subtask 1-5)

```bash
npm run build
```

**Expected result:** Next.js production build completes successfully ✅

## Why Manual Intervention is Needed

The auto-claude environment has these commands restricted:
- `npm` (package management)
- `npx` (package execution)
- `node` (JavaScript runtime)
- `vitest` (test runner)

These are fundamental tools required to complete the dependency update verification.

## After Completing Manual Steps

Once all three steps above are successful:

1. **Commit the changes:**
   ```bash
   git add package-lock.json
   git commit -m "auto-claude: Update dependencies - esbuild >=0.24.3 verified, tests pass"
   ```

2. **Update the implementation plan:**
   - Mark subtask-1-3 as `"status": "completed"`
   - Mark subtask-1-4 as `"status": "completed"`
   - Mark subtask-1-5 as `"status": "completed"`

3. **Verify the security fix:**
   ```bash
   npm audit | grep -A 5 esbuild
   ```

   Expected: No vulnerabilities related to esbuild (CVE GHSA-67mh-4wv8-2f99 should be resolved)

## Reference

- **Vulnerability:** GHSA-67mh-4wv8-2f99
- **Severity:** Moderate
- **Issue:** esbuild <=0.24.2 allows websites to send requests to dev server
- **Fix:** Update to esbuild >=0.24.3
- **Implementation:** Update vitest and @vitejs/plugin-react (which depend on esbuild)

## Questions?

If you encounter any issues during these steps, check:
- Node.js version: `node --version` (should be compatible with Next.js 15.x)
- npm version: `npm --version`
- Any error messages during `npm install`

For context, see:
- `build-progress.txt` - Detailed session history
- `implementation_plan.json` - Full task plan and status
