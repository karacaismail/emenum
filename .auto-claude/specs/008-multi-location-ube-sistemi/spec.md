# Specification: Multi-Location Restaurant System

## Overview

Implement a multi-location restaurant management system for franchise and chain restaurants. This feature adds organization hierarchy support with a new `locations` table, enables location-based menu management, and updates the URL routing structure from single-level (`/menu/{organization-slug}`) to two-level (`/menu/{organization-slug}/{location-slug}`) to support location-specific menu access.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that extends the existing single-location restaurant system to support multi-location organizations (franchises/chains). It introduces new database tables, routing patterns, and business logic while maintaining backward compatibility with existing single-location restaurants.

## Task Scope

### Services Involved
- **main** (primary) - Next.js application handling frontend, API routes, and database integration

### This Task Will:
- [ ] Create a new `locations` database table with organization hierarchy
- [ ] Establish relationship between organizations and locations (one-to-many)
- [ ] Implement location-based menu management system
- [ ] Update URL routing to support `/menu/{organization-slug}/{location-slug}` pattern
- [ ] Create database migration for new schema
- [ ] Add TypeScript types/interfaces for locations
- [ ] Update menu queries to be location-scoped
- [ ] Implement location slug generation and validation
- [ ] Add UI components for location selection/display
- [ ] Migrate existing single-location data to new structure

### Out of Scope:
- Multi-language support for location names
- Location-based pricing variations
- Inventory management across locations
- Location-specific user permissions (beyond basic access)
- Analytics/reporting per location
- Location search and filtering in admin panel

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Database: Supabase (PostgreSQL)
- Styling: Tailwind CSS
- Testing: Vitest
- Key directories: app/, lib/, components/, hooks/, tests/

**Entry Point:** Next.js App Router (`app/` directory)

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Database Client:** Supabase (@supabase/supabase-js, @supabase/ssr)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `supabase/migrations/[timestamp]_create_locations.sql` | main | Create new locations table and relationships |
| `lib/types/database.ts` | main | Add Location type definitions |
| `lib/types/index.ts` | main | Export location-related types |
| `app/menu/[organization-slug]/[location-slug]/page.tsx` | main | New route handler for location-specific menus |
| `lib/db/locations.ts` | main | Location database queries and utilities |
| `lib/db/menus.ts` | main | Update menu queries to be location-scoped |
| `lib/utils/slugify.ts` | main | Add location slug generation/validation |
| `components/menu/LocationSelector.tsx` | main | Component for selecting locations within organization |
| `app/api/locations/route.ts` | main | API endpoints for location CRUD operations |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Existing Supabase migration files | Database migration structure and foreign key patterns |
| `lib/types/database.ts` | TypeScript type generation from database schema |
| `app/menu/[organization-slug]/page.tsx` | Dynamic routing patterns and data fetching |
| Existing database query files in `lib/db/` | Supabase client usage and query patterns |
| Existing component files in `components/` | Component structure and Tailwind CSS styling |

## Patterns to Follow

### Supabase Database Migrations

All schema changes must be done through SQL migrations in the `supabase/migrations/` directory:

```sql
-- Migration file pattern: YYYYMMDDHHMMSS_description.sql

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: slug must be unique within organization
  CONSTRAINT unique_org_location_slug UNIQUE (organization_id, slug)
);

-- Create index for faster lookups
CREATE INDEX idx_locations_organization_id ON locations(organization_id);
CREATE INDEX idx_locations_slug ON locations(slug);
```

**Key Points:**
- Use UUID for primary keys
- Always include timestamps (created_at, updated_at)
- Use CASCADE on foreign key deletes for cleanup
- Create indexes on frequently queried columns
- Use UNIQUE constraints for slug uniqueness scoped to organization

### TypeScript Database Types

Follow the existing pattern for database types in `lib/types/database.ts`:

```typescript
export interface Location {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationWithOrganization extends Location {
  organization: Organization;
}
```

**Key Points:**
- Use string type for UUIDs
- Optional fields use `?` notation
- Create extended types for joined data
- Export from main types file for reusability

### Next.js Dynamic Routing

Follow App Router patterns for nested dynamic routes:

```typescript
// app/menu/[organization-slug]/[location-slug]/page.tsx

interface PageProps {
  params: {
    'organization-slug': string;
    'location-slug': string;
  };
}

export default async function MenuPage({ params }: PageProps) {
  const orgSlug = params['organization-slug'];
  const locSlug = params['location-slug'];

  // Fetch location and menu data
  const location = await getLocationBySlug(orgSlug, locSlug);
  const menu = await getMenuForLocation(location.id);

  return (
    <div>
      {/* Menu display */}
    </div>
  );
}
```

**Key Points:**
- Use bracket notation for params with special characters (hyphens)
- Server components for data fetching by default
- Handle 404 cases when location not found
- Use async/await for database queries

### Supabase Query Patterns

Follow existing patterns for database queries:

```typescript
// lib/db/locations.ts

import { createClient } from '@/lib/supabase/server';

export async function getLocationBySlug(
  organizationSlug: string,
  locationSlug: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('locations')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('slug', locationSlug)
    .eq('organizations.slug', organizationSlug)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return data;
}
```

**Key Points:**
- Use server-side Supabase client
- Join related tables with nested select
- Filter by active status
- Use `.single()` for one result
- Handle errors appropriately

## Requirements

### Functional Requirements

1. **Location Table Creation**
   - Description: Create a PostgreSQL table to store location data with proper relationships to organizations
   - Acceptance: Migration runs successfully, table created with all columns and constraints, foreign key relationship to organizations table established

2. **Organization Hierarchy**
   - Description: Establish one-to-many relationship where one organization can have multiple locations
   - Acceptance: Organizations can have 0-N locations, locations must belong to exactly one organization, cascade delete works correctly

3. **Location-Based Menu Management**
   - Description: Menus must be assignable and queryable at the location level
   - Acceptance: Each location can have its own menu configuration, menu queries are scoped to specific locations, menu items can be shared or location-specific

4. **URL Routing Update**
   - Description: Implement new URL pattern `/menu/{organization-slug}/{location-slug}` for accessing location-specific menus
   - Acceptance: New route responds correctly, both slugs are validated, 404 returned for invalid combinations, existing single-location URLs still work or redirect appropriately

5. **Slug Generation**
   - Description: Generate URL-safe slugs for locations that are unique within their organization
   - Acceptance: Slugs are URL-safe (lowercase, no special chars except hyphens), uniqueness validated at organization scope, collision handling implemented

6. **Data Migration**
   - Description: Migrate existing single-location organizations to the new schema without data loss
   - Acceptance: All existing organizations have at least one default location, existing menu associations transferred to location level, no data loss or corruption

### Edge Cases

1. **Single-Location Organizations** - Organizations with only one location should still work seamlessly; consider providing a default location or redirect logic from `/menu/{org-slug}` to `/menu/{org-slug}/{default-location-slug}`

2. **Slug Collisions** - When generating location slugs, handle cases where the desired slug already exists within the organization (e.g., "downtown-2", "downtown-3")

3. **Deleted Locations** - Implement soft delete (is_active flag) rather than hard delete to preserve historical data and prevent broken links

4. **Empty Organizations** - Handle organizations that have no active locations (should show appropriate message, not crash)

5. **Menu Inheritance** - Decide whether new locations inherit the organization's menu by default or start empty

6. **Invalid URL Combinations** - Handle cases where organization slug exists but location slug doesn't belong to that organization (return 404, not 500)

## Implementation Notes

### DO
- Follow the existing Supabase migration pattern for database changes
- Use TypeScript strict mode and define all types explicitly
- Implement proper error handling for database queries
- Add server-side validation for slug uniqueness
- Create indexes on frequently queried columns (organization_id, slug)
- Use soft deletes (is_active flag) instead of hard deletes
- Implement data migration script for existing organizations
- Write unit tests for slug generation and validation logic
- Write integration tests for location CRUD operations
- Add proper 404 handling for invalid organization-location combinations
- Use Tailwind CSS for component styling to match existing design
- Leverage Next.js Server Components for data fetching to reduce client bundle
- Use Supabase Row Level Security (RLS) policies if authentication is involved

### DON'T
- Don't hard delete locations (use soft delete flag)
- Don't allow duplicate slugs within the same organization
- Don't make location slug globally unique (only within organization)
- Don't break existing single-location functionality
- Don't skip database migration - all schema changes must be versioned
- Don't forget to update existing menu queries to be location-aware
- Don't expose database errors directly to users (wrap in friendly messages)
- Don't create API routes if Server Actions would be more appropriate
- Don't skip indexes on foreign keys and commonly filtered columns

## Development Environment

### Start Services

```bash
# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Run Supabase locally (if using local dev environment)
supabase start

# Apply migrations
supabase db push

# Run tests
npm test
```

### Service URLs
- Main Application: http://localhost:3000
- Supabase Studio (if local): http://localhost:54323

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Check `.env.example` or `.env.local` for the complete list.

## Success Criteria

The task is complete when:

1. [ ] `locations` table created with proper schema and relationships
2. [ ] TypeScript types defined for Location entity
3. [ ] New route `/menu/{organization-slug}/{location-slug}` works correctly
4. [ ] Location queries and CRUD operations implemented
5. [ ] Menu queries updated to be location-scoped
6. [ ] Slug generation and validation utilities created
7. [ ] Data migration completed for existing organizations
8. [ ] UI components for location selection implemented
9. [ ] No console errors when accessing location-specific menus
10. [ ] Existing tests still pass
11. [ ] New functionality verified via browser at http://localhost:3000
12. [ ] Database constraints properly enforce data integrity
13. [ ] 404 pages show for invalid organization-location combinations

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Slug generation | `tests/utils/slugify.test.ts` | Generates valid URL-safe slugs, handles special characters, converts to lowercase |
| Slug uniqueness validation | `tests/utils/slugify.test.ts` | Detects collisions, suggests alternatives (e.g., slug-2) |
| Location type validation | `tests/types/location.test.ts` | TypeScript types match database schema |
| Location query functions | `tests/lib/db/locations.test.ts` | getLocationBySlug returns correct data, handles not found cases |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Organization-Location relationship | main ↔ database | Foreign key constraints work, cascade delete functions correctly |
| Location-Menu association | main ↔ database | Menus correctly scoped to locations, queries return location-specific data |
| Location CRUD operations | main ↔ database | Create, read, update, delete operations work correctly with proper validation |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View location menu | 1. Navigate to `/menu/{org}/{loc}` 2. Verify menu loads | Menu displays for correct location, shows location name, returns 404 for invalid combinations |
| Create new location | 1. Access location creation form 2. Submit valid data 3. Check database | Location created with unique slug, visible in location list, accessible via URL |
| Switch between locations | 1. View menu for location A 2. Navigate to location B menu | Each location shows its own menu, no data bleeding between locations |
| Handle deleted organization | 1. Soft delete organization 2. Try to access location menu | Returns appropriate 404 or "Organization not found" message |

### Browser Verification
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Location-specific menu | `http://localhost:3000/menu/test-org/downtown` | ✓ Menu loads correctly, ✓ Location name displayed, ✓ Correct menu items shown, ✓ No console errors |
| Invalid location | `http://localhost:3000/menu/test-org/nonexistent` | ✓ Returns 404 page, ✓ Appropriate error message shown |
| Invalid organization | `http://localhost:3000/menu/fake-org/downtown` | ✓ Returns 404 page, ✓ No server errors |
| Location selector | `http://localhost:3000/menu/test-org/downtown` | ✓ Shows list of all locations for organization, ✓ Allows switching between locations |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Locations table exists | `SELECT * FROM locations LIMIT 1;` | Table exists with correct schema |
| Foreign key constraint | `SELECT * FROM pg_constraint WHERE conname LIKE '%locations%';` | Foreign key to organizations table exists |
| Unique constraint | `INSERT INTO locations (organization_id, slug, name) VALUES (existing_org_id, existing_slug, 'Test');` | Fails with unique constraint violation |
| Index exists | `SELECT * FROM pg_indexes WHERE tablename = 'locations';` | Indexes on organization_id and slug exist |
| Migration applied | `SELECT * FROM schema_migrations;` (or equivalent) | Migration for locations table is recorded |
| Data migration | `SELECT COUNT(*) FROM locations;` | All existing organizations have at least one location |

### QA Sign-off Requirements
- [ ] All unit tests pass (run `npm test`)
- [ ] All integration tests pass
- [ ] All E2E tests pass (manual or automated)
- [ ] Browser verification complete - all URLs tested
- [ ] Database state verified - schema and constraints correct
- [ ] No regressions in existing functionality (existing menus still work)
- [ ] Code follows established patterns (Supabase queries, TypeScript types, component structure)
- [ ] No security vulnerabilities introduced (SQL injection prevented, RLS policies if needed)
- [ ] Data migration successful (no data loss, all orgs have locations)
- [ ] Performance acceptable (queries optimized, indexes in place)
- [ ] Error handling implemented (404s, validation errors, database errors)
- [ ] Documentation updated (README, API docs if applicable)
