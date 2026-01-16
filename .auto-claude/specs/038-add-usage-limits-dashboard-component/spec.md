# Add Usage Limits Dashboard Component

## Overview

Create a dashboard component showing organization usage limits (products, categories, tables) with progress bars. The getAllLimitStatuses() function already returns all limit data with usage percentages.

## Rationale

The lib/guards/limits.ts file has a fully implemented getAllLimitStatuses() function (lines 258-305) that returns currentCount, limit, usagePercent, and isUnlimited for each limit type. This data is ready but has no UI visualization. Similar stats card pattern exists in tables/page.tsx.

---
*This spec was created from ideation and is pending detailed specification.*
