# Optimize Products Page with Database JOIN Instead of Multiple Queries

## Overview

The Products page (app/(dashboard)/products/page.tsx) executes 3 separate database queries sequentially: one for products, one for current_prices, and one for categories. These should be consolidated into a single query with JOINs or a Supabase select with nested relationships.

## Rationale

The current N+1-like pattern increases latency by requiring 3 round trips to the database. With 100+ products, this becomes a significant bottleneck. A single query with proper JOINs reduces network latency and database load.

---
*This spec was created from ideation and is pending detailed specification.*
