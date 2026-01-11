# Specification: Dijital Fiyat Defteri ve QR Menu SaaS Platform

## Overview

Bu proje, Turkiye'deki restoran, kafe ve benzeri isletmeler icin **Ticaret Bakanligi regulasyonlarina uyumlu** bir Dijital Fiyat Defteri ve QR Menu platformudur. Uygulama sadece gorsel bir menu degil, yasal olarak gecerli, denetlenebilir ve degismez fiyat kaydi tutan bir SaaS cozumudur. Sistem, multi-tenant mimarisi ile her isletmenin kendi verisine guvenli erisimini saglarken, paket bazli ozellik kontrolu (Feature Flagging) ve rol bazli yetkilendirme (RBAC) ile esnek bir yapi sunar.

## Workflow Type

**Type**: feature

**Rationale**: Bu proje, surekli gelistirilmekte olan kapsamli bir SaaS uygulamasidir. Yeni ozellikler eklenmesi, mevcut ozelliklerin gelistirilmesi ve yasal uyumluluk gereksinimlerinin karsilanmasi icin feature workflow tipi uygundur. Proje halihazirda temel altyapiya sahip olup aktif gelistirme asamasindadir.

## Task Scope

### Services Involved
- **main** (primary) - Next.js 15 App Router tabanli full-stack uygulama
- **Supabase** (backend) - PostgreSQL veritabani, Auth, Row Level Security (RLS)

### This Task Will:
- [x] Multi-tenant organizasyon yonetimi
- [x] Degismez fiyat kaydi (Price Ledger) ile yasal uyumluluk
- [x] QR kod bazli menu erisimi
- [x] RBAC (Rol Bazli Erisim Kontrolu)
- [x] Feature Flagging ile paket bazli ozellik yonetimi
- [x] Garson cagirma sistemi (Waiter Call)
- [x] Denetim kayitlari (Audit Logs)
- [x] Menu snapshot'lari ile yasal denetim desteji

### Out of Scope:
- Odeme islemleri (Payment Gateway entegrasyonu)
- Mobil uygulama gelistirme
- Coklu dil destegi (i18n)
- Raporlama ve analitik dashboard

## Service Context

### Main Service (Next.js Application)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js 15 (App Router)
- Styling: Tailwind CSS 4.x
- Database Client: @supabase/supabase-js ^2.90.1
- SSR Auth: @supabase/ssr ^0.8.0
- QR Generation: qrcode ^1.5.4
- Testing: Vitest ^4.0.16

**Key Directories:**
- `app/` - Next.js App Router sayfalari
- `lib/` - Servis katmani, Supabase client, yardimci fonksiyonlar
- `components/` - React bilesenler (UI, dashboard, menu, admin)
- `contexts/` - React Context'ler (Feature flags)
- `types/` - TypeScript tip tanimlari
- `tests/` - Test dosyalari

**Entry Point:** `app/layout.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Route Groups:**
- `(auth)` - Login, Register sayfalari
- `(dashboard)` - Korunmus isletme yonetim paneli
- `(admin)` - Super admin paneli
- `menu/[slug]` - Public QR menu sayfalari

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `lib/services/price-ledger.ts` | main | Fiyat degisikligi servisi - yeni ozellikler icin genisletme |
| `lib/services/snapshot.ts` | main | Menu snapshot servisi |
| `lib/guards/permission.ts` | main | Yetki kontrol mekanizmasi |
| `lib/guards/limits.ts` | main | Feature limit kontrolleri |
| `app/(dashboard)/` | main | Dashboard sayfalarinin gelistirilmesi |
| `components/dashboard/` | main | Dashboard bilesenlerinin iyilestirilmesi |
| `contexts/FeatureContext.tsx` | main | Feature flag context'i |
| `middleware.ts` | main | Auth ve route koruma |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `lib/supabase/server.ts` | Server-side Supabase client pattern (async cookies) |
| `lib/supabase/client.ts` | Client-side Supabase client pattern |
| `lib/services/price-ledger.ts` | Immutable data service pattern |
| `middleware.ts` | Auth middleware ve route koruma pattern |
| `types/database.ts` | TypeScript tip tanimlari pattern |
| `components/ui/Button.tsx` | UI component pattern |
| `app/(dashboard)/products/page.tsx` | Server Component data fetching pattern |

## Patterns to Follow

### 1. Server-side Supabase Client

From `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies(); // Next.js 15: async cookies!

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component'ta yazma basarisiz olabilir
          }
        },
      },
    }
  );
}
```

**Key Points:**
- Next.js 15'te `cookies()` async'tir - mutlaka await edilmeli
- Server-side'da `getUser()` kullanilmali, `getSession()` degil (guvenlik)
- Error handling try-catch ile yapilmali

### 2. Immutable Price Ledger Pattern

From `lib/services/price-ledger.ts`:

```typescript
// CRITICAL: Fiyatlar ASLA UPDATE edilmez, sadece INSERT yapilir!
// Her fiyat degisikligi yeni bir satir olarak eklenir.

export async function insertPrice(params: InsertPriceParams): Promise<InsertPriceResult> {
  // 1. Mevcut fiyatin valid_until degerini ayarla (database function ile)
  // 2. Yeni fiyati INSERT et
  // 3. Otomatik menu snapshot olustur
}
```

**Key Points:**
- Price Ledger tablosuna UPDATE ve DELETE YASAK
- Her fiyat degisikligi yeni INSERT
- valid_from/valid_until ile temporal pattern
- Database trigger ile otomatik snapshot

### 3. Authentication Middleware Pattern

From `middleware.ts`:

```typescript
// CRITICAL: getUser() kullanarak session'i dogrula
// getSession() sunucu tarafinda guvenli degildir
const { data: { user } } = await supabase.auth.getUser();

// Route matching
const PUBLIC_ROUTES = ['/', '/login', '/register', '/menu'];
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/products'];
const ADMIN_ROUTES = ['/admin'];
```

**Key Points:**
- `getUser()` JWT dogrulamasi yapar (guvenli)
- `getSession()` dogrulama yapmaz (guvenli degil)
- Super admin kontrolu icin users tablosu sorgulanir

**IMPORTANT - Edge Runtime Limitations:**
- Middleware runs on Edge Runtime with limited Node.js APIs
- Cannot use Node.js-specific modules (fs, path, crypto with certain functions)
- Must use Web Crypto API instead of Node.js crypto
- `request.cookies.set()` must be called before `NextResponse`
- Matcher config controls which routes trigger middleware

### 4. Type-Safe Database Queries

From `types/database.ts`:

```typescript
// Supabase Database schema type
export interface Database {
  public: {
    Tables: {
      price_ledger: {
        Row: PriceLedger;
        Insert: PriceLedgerInsert;
        Update: never; // UPDATE NOT ALLOWED!
      };
      // ...
    };
  };
}
```

**Key Points:**
- `Update: never` ile immutable tablolar tanimlanir
- Views ayri olarak tanimlanir
- Enum tipler Supabase enum'lariyla eslesmeli

### 5. Feature Flag Pattern

From `lib/guards/permission.ts`:

```typescript
import { hasPermission, getFeatureLimit, checkFeature, getAllFeatures } from '@/lib/guards/permission';

// Boolean feature check
const canUseHappyHour = await hasPermission(orgId, 'happy_hour');

// Numeric limit check (-1 = unlimited, 0 = no access)
const productLimit = await getFeatureLimit(orgId, 'max_products');

// Detailed check with reason
const result = await checkFeature(orgId, 'waiter_call');
// result: { allowed: boolean, reason?: string }

// Get all features for caching
const allFeatures = await getAllFeatures(orgId);
```

**Key Points:**
- NEVER hard-code package checks (e.g., `if plan === 'Pro'` is FORBIDDEN)
- Override priority: organization_feature_overrides > plan_features
- Check override expiry before applying
- Return -1 for unlimited, 0 for no access in limit functions

## Requirements

### Functional Requirements

1. **Multi-tenant Organizasyon Yonetimi**
   - Description: Her isletme kendi izole verisine sahip olmali
   - Acceptance: Tenant A'nin verisi Tenant B tarafindan gorulemez (RLS ile)

2. **Degismez Fiyat Kaydi (Price Ledger)**
   - Description: Fiyat degisiklikleri immutable sekilde kaydedilmeli
   - Acceptance: price_ledger tablosunda UPDATE/DELETE calismamali

3. **QR Menu Erisimi**
   - Description: Musteriler QR kod ile menuye erismeli
   - Acceptance: /menu/[slug] sayfasi public erisilebilir ve guncel fiyatlari gosterir

4. **RBAC Yetkilendirme**
   - Description: Database ENUM roller: owner, admin, manager, waiter (member_role type)
   - Note: "viewer" is implemented as a permission level, not a database ENUM role
   - Acceptance: Her rol sadece yetkili oldugu islemleri yapabilir

5. **Feature Flagging**
   - Description: Paket bazli ozellik kontrolu
   - Acceptance: Premium ozellikler (Happy Hour, Waiter Call) paket kontrolu ile korunur

6. **Audit Trail**
   - Description: Tum fiyat degisiklikleri ve kritik islemler loglanmali
   - Acceptance: audit_logs ve menu_snapshots tablolarinda kayit olusur

### Edge Cases

1. **Concurrent Price Changes** - Database lock veya SERIALIZABLE transaction
2. **Expired Subscription** - Feature flag kontrolu ile UI'da engel
3. **Invalid QR Code** - 404 not-found sayfasi gosterilir
4. **Super Admin Override** - organization_feature_overrides tablosu
5. **Database Connection Failure** - Error boundaries ile kullanici bilgilendirilir
6. **Auth Token Expiry** - Middleware redirects to login, client-side handles refresh

## Implementation Notes

### DO
- Supabase RLS policies kullan - her tabloda tenant_id kontrolu
- `maybeSingle()` kullan - kayit olmayabilecek sorgularda
- Price ledger icin `insertPrice()` kullan (automatically creates snapshot via database trigger)
- Feature kontrolu icin `lib/guards/permission.ts` fonksiyonlarini kullan (hasPermission, getFeatureLimit, checkFeature)
- Server Component'larda `async/await` kullan
- Error boundary'ler ekle
- Consider rate limiting for public QR-triggered endpoints (service_requests, menu views)
- Use SECURITY DEFINER functions sparingly - only for specific operations like `close_current_price()`

### DON'T
- `getSession()` server-side'da kullanma (guvenlik riski)
- Price ledger'a UPDATE yapma
- Supabase'i client component'tan dogrudan cagirma (server action kullan)
- Tailwind 4.x'te eski `tailwind.config.js` format kullanma - use `@theme` directive in CSS for customization
- Hard-code package checks (e.g., `if plan === 'Pro'`) - use feature flag functions instead
- Use Node.js-specific modules in middleware (Edge Runtime limitation)

## Development Environment

### Start Services

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Service URLs
- **Application**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Admin Panel**: http://localhost:3000/admin
- **Public Menu**: http://localhost:3000/menu/[slug]

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-only, admin ops)

## Success Criteria

The task is complete when:

1. [x] Multi-tenant veri izolasyonu calisir (RLS aktif)
2. [x] Fiyat degisiklikleri immutable olarak kaydedilir
3. [x] QR menu sayfalari public olarak erisilebilir
4. [x] RBAC yetkilendirmesi tum dashboard rotalarinda aktif
5. [x] Feature flag sistemi paket bazli calisiyor
6. [x] No console errors
7. [x] Existing tests still pass
8. [x] New functionality verified via browser/API

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Price Ledger Immutability | `lib/__tests__/price-ledger-immutability.test.ts` | UPDATE/DELETE blocked |
| Price Ledger Service | `lib/__tests__/price-ledger.test.ts` | insertPrice, getCurrentPrice work |
| Permission Guard | `lib/guards/__tests__/permission.test.ts` | RBAC checks work correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Auth Flow | `tests/__tests__/integration/auth-flow.test.ts` | Login/logout, session |
| Price Change Flow | `tests/__tests__/integration/price-change-flow.test.ts` | Price update creates snapshot |
| RLS Isolation | `tests/__tests__/integration/rls-isolation.test.ts` | Tenant data isolation |
| Waiter Call Flow | `tests/__tests__/integration/waiter-call-flow.test.ts` | Service request lifecycle |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Login Flow | 1. Go to /login 2. Enter credentials 3. Submit | Redirect to /dashboard |
| Price Change | 1. Go to /products 2. Edit product 3. Change price | New price appears, history updated |
| QR Menu View | 1. Scan QR code 2. View menu | Current prices displayed |
| Waiter Call | 1. View menu 2. Click call waiter | Notification sent to waiter panel |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Dashboard | `http://localhost:3000/dashboard` | Stats displayed, sidebar works |
| Products | `http://localhost:3000/products` | Product list, price shown |
| Categories | `http://localhost:3000/categories` | Category CRUD works |
| Tables | `http://localhost:3000/tables` | Table management, QR generation |
| Audit | `http://localhost:3000/audit` | Price history, hash verification |
| Public Menu | `http://localhost:3000/menu/[slug]` | Menu displays, responsive |
| Admin Panel | `http://localhost:3000/admin` | Super admin only access |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| RLS Active | `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'` | rowsecurity = true |
| Immutability Trigger | `SELECT * FROM pg_trigger WHERE tgname LIKE '%price_ledger%'` | Trigger exists |
| Views Created | `SELECT * FROM information_schema.views WHERE table_schema = 'public'` | All views present |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (if applicable)
- [ ] Database state verified (if applicable)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced

## Architecture Overview

```
+-------------------+     +------------------+     +------------------+
|   Next.js App     |     |    Supabase     |     |   PostgreSQL     |
|   (Frontend +     |---->|    Auth         |---->|   Database       |
|    API Routes)    |     |    RLS          |     |   + RLS Policies |
+-------------------+     +------------------+     +------------------+
        |                                                  |
        v                                                  v
+-------------------+                           +------------------+
|   Middleware      |                           |   Audit Logs     |
|   - Auth Check    |                           |   Menu Snapshots |
|   - Route Guard   |                           |   Price Ledger   |
+-------------------+                           +------------------+
```

## Database Schema Summary

### Core Tables
- `users` - User profiles (extends auth.users)
- `organizations` - Tenant/business entities
- `organization_members` - User-org relationship with roles
- `categories` - Menu categories per org
- `products` - Menu items (NO price column!)
- `price_ledger` - Immutable price history (INSERT only)

### Subscription & Features
- `plans` - Subscription plans (Basic, Pro, Enterprise)
- `features` - Available features
- `plan_features` - Plan-feature mapping
- `subscriptions` - Org subscription status
- `organization_feature_overrides` - Per-org feature overrides

### Operations
- `restaurant_tables` - Table management with QR
- `service_requests` - Waiter call requests

### Audit & Compliance
- `menu_snapshots` - Full menu state at each price change
- `audit_logs` - All critical actions logged

### Key Views
- `current_prices` - Active prices for all products
- `products_with_current_price` - Products joined with prices
- `menu_view` - Optimized for public menu display
- `organization_with_plan` - Org with subscription details
- `price_history_view` - Audit-ready price history
