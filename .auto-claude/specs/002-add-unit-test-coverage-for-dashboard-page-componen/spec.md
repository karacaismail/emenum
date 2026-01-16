# Add unit test coverage for dashboard page components

## Overview

While integration tests exist (19 test files), the dashboard and admin page components have no unit tests. The products, categories, tables, and plans pages contain complex business logic for CRUD operations, form validation, and state management that should be tested in isolation.

## Rationale

Unit tests provide faster feedback than integration tests and help document expected component behavior. Testing hooks and utility functions in isolation catches bugs earlier in development. Current test coverage focuses on integration flows but misses edge cases in individual components.

---
*This spec was created from ideation and is pending detailed specification.*
