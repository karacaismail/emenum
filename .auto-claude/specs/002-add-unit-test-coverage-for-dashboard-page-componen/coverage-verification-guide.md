# Test Coverage Verification Guide

## Overview

This document provides instructions for verifying test coverage for the dashboard page components unit tests.

**Target Coverage**: 80%+ for tested components

## Environment Limitation

⚠️ **Important**: This git worktree environment does not have npm/node available due to security restrictions in `.auto-claude-security.json`. Coverage verification must be performed in the main repository.

## Test Files Created

### Products Page Tests
- `app/(dashboard)/products/__tests__/ProductList.test.tsx` - Product list rendering, filtering, states
- `app/(dashboard)/products/__tests__/ProductForm.test.tsx` - Form validation, CRUD operations

### Categories Page Tests
- `app/(dashboard)/categories/__tests__/CategoryList.test.tsx` - Category list, hierarchy display
- `app/(dashboard)/categories/__tests__/CategoryForm.test.tsx` - Form validation, slug generation

### Tables Page Tests
- `app/(dashboard)/tables/__tests__/TableList.test.tsx` - Table list, status, QR display
- `app/(dashboard)/tables/__tests__/TableForm.test.tsx` - Form validation, QR generation

### Plans Page Tests
- `app/(admin)/admin/plans/__tests__/PlansList.test.tsx` - Plans/features list, pricing display

### Test Infrastructure
- `__tests__/utils/test-utils.tsx` - Custom render utilities, auth context mocks
- `__tests__/mocks/supabase.ts` - Mock Supabase client factory
- `__tests__/fixtures/test-data.ts` - Factory functions for test data

## Verification Commands

### Step 1: Run All Tests

```bash
cd /Users/karaca/Desktop/ozon
npm test
```

**Expected Output**: All tests should pass (40-50 test cases)

### Step 2: Generate Coverage Report

```bash
cd /Users/karaca/Desktop/ozon
npm test -- --coverage
```

**Expected Output**: Coverage report with 80%+ for the following components:

#### Products Components
- `app/(dashboard)/products/page.tsx` (ProductsPage, ProductListItem)
- `app/(dashboard)/products/new/page.tsx` (NewProductPage)
- `app/(dashboard)/products/[id]/page.tsx` (EditProductPage)

#### Categories Components
- `app/(dashboard)/categories/page.tsx` (CategoriesPage, CategoryTreeNode)

#### Tables Components
- `app/(dashboard)/tables/page.tsx` (TablesPage, TableListItem)

#### Plans Components
- `app/(admin)/admin/plans/page.tsx` (PlansPage, StatusBadge, FeatureTypeBadge)

### Step 3: Run Only New Unit Tests

```bash
cd /Users/karaca/Desktop/ozon
npm test -- app/
```

Or for a specific component:

```bash
npm test -- ProductList.test.tsx
npm test -- CategoryForm.test.tsx
npm test -- TableList.test.tsx
```

### Step 4: Verify Integration Tests Still Pass

```bash
cd /Users/karaca/Desktop/ozon
npm test -- integration
```

**Expected**: All existing integration tests should still pass without modification.

## Coverage Report Interpretation

### Coverage Metrics

The coverage report will show four key metrics for each file:

1. **Statement Coverage** - Percentage of statements executed
2. **Branch Coverage** - Percentage of conditional branches taken
3. **Function Coverage** - Percentage of functions called
4. **Line Coverage** - Percentage of lines executed

### Target: 80%+ Coverage

Focus on these metrics for the tested components:
- **Minimum**: 80% for all four metrics
- **Goal**: 85%+ for comprehensive testing

### Coverage Report Locations

After running `npm test -- --coverage`:

- **Terminal Output**: Text summary showing coverage percentages
- **HTML Report**: `coverage/index.html` - Interactive coverage report
- **JSON Report**: `coverage/coverage-final.json` - Detailed coverage data

### Viewing HTML Coverage Report

```bash
cd /Users/karaca/Desktop/ozon
open coverage/index.html
```

The HTML report provides:
- Color-coded source files (green = covered, red = not covered)
- Line-by-line coverage visualization
- Drill-down into specific files and functions

## Expected Test Results

### Test Counts

Approximately **40-50 test cases** covering:

#### Products Tests (~12 tests)
- Product list rendering with details, prices, categories
- Empty/loading/error states
- Search and category filtering
- Form validation (required fields)
- CRUD operations (create, update, delete)

#### Categories Tests (~10 tests)
- Category list rendering with hierarchy
- Multi-level category trees
- Empty/loading/error states
- Form validation (required name)
- Slug generation from Turkish characters
- Parent category selection

#### Tables Tests (~10 tests)
- Table list rendering with status badges
- Empty/loading/error states
- Statistics display (empty/occupied/service needed)
- Form validation (required table number)
- QR code generation (SVG/PNG/PDF)
- Status management

#### Plans Tests (~8 tests)
- Plans and features list rendering
- Tab switching (Plans/Features)
- Empty/loading/error states
- Pricing display (Turkish locale)
- Plan CRUD operations

## Troubleshooting

### If Coverage is Below 80%

1. **Check Uncovered Lines**: Review the HTML coverage report to identify uncovered code
2. **Add Missing Tests**: Focus on edge cases and error paths
3. **Review Branches**: Ensure both true/false branches of conditionals are tested
4. **Check Async Code**: Verify async operations are properly awaited in tests

### If Tests Fail

1. **Check Dependencies**: Ensure all test dependencies are installed
   ```bash
   npm install
   ```

2. **Verify Setup**: Ensure `tests/setup.ts` is properly configured
3. **Check Mocks**: Verify mock Supabase client is working correctly
4. **Review Test Output**: Read error messages and stack traces carefully

### Common Issues

- **Missing Auth Context**: Tests should use `renderWithAuth()` from test-utils
- **Async Timing**: Use `waitFor()` for async operations
- **Mock Data**: Use factory functions from `__tests__/fixtures/test-data.ts`
- **Supabase Client**: Use `createMockSupabaseClient()` from `__tests__/mocks/supabase.ts`

## Vitest Configuration

Coverage is configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    '.next/',
    'tests/',
    '**/*.d.ts',
    '**/*.config.{js,ts}',
  ],
}
```

## Success Criteria

✅ **Coverage Verification Complete When**:

1. All unit tests pass (40-50 test cases)
2. Coverage report shows 80%+ for:
   - Statement coverage
   - Branch coverage
   - Function coverage
   - Line coverage
3. Coverage applies to all tested components:
   - Products page components
   - Categories page components
   - Tables page components
   - Plans page components
4. Existing integration tests still pass
5. No console errors or warnings during test execution

## Next Steps After Verification

Once coverage is verified at 80%+:

1. Update `subtask-6-2` status to "completed" in `implementation_plan.json`
2. Document any coverage gaps or areas for improvement
3. Proceed to `subtask-6-3` to document testing patterns
4. Create final commit with coverage verification results

## Notes

- Coverage excludes test files themselves (`tests/`, `__tests__/`)
- Coverage excludes configuration files (`*.config.{js,ts}`)
- Focus is on component testing, not integration flows
- All tests follow established patterns from existing integration tests
