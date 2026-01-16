# Add Database Schema Documentation for Migrations

## Overview

The supabase/migrations/ folder contains 8 SQL migration files (001-007 + 010) but lacks documentation explaining the schema design, table relationships, RLS policy intentions, and the critical immutable price_ledger pattern.

## Rationale

The price_ledger immutability pattern is a core compliance requirement (Turkish Trade Ministry regulations) but is only documented in the spec.md and inline code comments. New developers or DBAs reviewing the schema need to understand why UPDATE/DELETE are blocked, how the current_prices view works, and the relationship between subscriptions, plans, and feature_overrides.

---
*This spec was created from ideation and is pending detailed specification.*
