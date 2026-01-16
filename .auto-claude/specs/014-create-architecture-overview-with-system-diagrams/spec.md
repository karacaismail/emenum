# Create Architecture Overview with System Diagrams

## Overview

The project lacks high-level architecture documentation showing how the Next.js app, Supabase, and different modules interact. There is no visualization of the auth flow, menu publishing flow, or waiter call realtime notification system.

## Rationale

New team members need to understand the big picture before diving into code. The platform has complex flows: multi-tenant isolation via RLS, dynamic feature flags from database, menu snapshot with SHA-256 hashing for compliance, and Supabase Realtime for waiter notifications. These architectural decisions are scattered across spec.md, todos.md, and inline comments.

---
*This spec was created from ideation and is pending detailed specification.*
