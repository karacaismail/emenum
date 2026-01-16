# Extract duplicated CRUD state management into reusable hooks

## Overview

Nearly identical state management patterns are repeated across 19+ page components with 204 occurrences of setIsLoading/setError/setIsSaving calls. Each CRUD page duplicates: loading state, error state, saving state, modal open/close state, form data state, delete confirmation state, and their associated handlers.

## Rationale

DRY (Don't Repeat Yourself) violation leads to inconsistent behavior, more bugs, and increased maintenance burden. When a bug is found in one pattern, it must be fixed in 19 places. Extracting to custom hooks enables consistent error handling, loading states, and optimistic updates across the application.

---
*This spec was created from ideation and is pending detailed specification.*
