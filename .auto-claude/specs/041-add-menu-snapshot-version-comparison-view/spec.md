# Add Menu Snapshot Version Comparison View

## Overview

Add UI to compare two menu snapshot versions side-by-side, showing what products/categories were added or removed between publishes.

## Rationale

The lib/services/snapshot.ts already has compareSnapshots() function (lines 611-654) that returns addedProducts, removedProducts, addedCategories, removedCategories arrays. This comparison logic exists but has no UI. Similar diff-view pattern exists in the audit detail modal showing old_data vs new_data.

---
*This spec was created from ideation and is pending detailed specification.*
