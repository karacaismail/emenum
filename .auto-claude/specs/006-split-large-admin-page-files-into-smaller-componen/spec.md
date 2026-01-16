# Split large admin page files into smaller components

## Overview

Multiple admin and dashboard pages exceed 700-1000+ lines, combining data fetching, state management, form handling, list rendering, and modal logic in single files. Files like plans/page.tsx (1086 lines), overrides/page.tsx (977 lines), ai/page.tsx (919 lines), organizations/page.tsx (811 lines), and tables/page.tsx (744 lines) are far too large for maintainability.

## Rationale

Files over 500 lines significantly increase cognitive load, make code reviews difficult, and create merge conflicts. Large monolithic components are harder to test in isolation and violate single responsibility principle. Splitting into focused components enables better code reuse and faster development.

---
*This spec was created from ideation and is pending detailed specification.*
