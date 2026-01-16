# Optimize AuthProvider to Avoid Unnecessary Re-fetches

## Overview

The AuthProvider (components/providers/auth-provider.tsx) performs 2 sequential database queries (organization_members, then organizations) on every auth state change. It also creates a new Supabase client on each render instead of memoizing it.

## Rationale

The sequential queries double the latency for auth initialization. Creating a new Supabase client on each render is wasteful and can cause issues with real-time subscriptions. These should be optimized for faster app initialization.

---
*This spec was created from ideation and is pending detailed specification.*
