/**
 * Core TypeScript Type Definitions
 *
 * Bu dosya veritabanı tablolarına karşılık gelen TypeScript tiplerini içerir.
 * Supabase ile tip-güvenli sorgular için kullanılır.
 *
 * NOT: Bu tipler Supabase'in otomatik tip üretimi ile değiştirilebilir
 * ancak geliştirme başlangıcında elle tanımlanmıştır.
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * UUID string type for database IDs
 */
export type UUID = string;

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Currency code (default: TRY)
 */
export type CurrencyCode = 'TRY' | 'USD' | 'EUR';

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

/**
 * User profile (extends Supabase auth.users)
 */
export interface User {
  id: UUID;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_super_admin: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * User creation payload
 */
export interface UserInsert {
  id?: UUID;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  is_super_admin?: boolean;
}

/**
 * User update payload
 */
export interface UserUpdate {
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  is_super_admin?: boolean;
  updated_at?: Timestamp;
}

// =============================================================================
// ORGANIZATION & MULTI-TENANCY
// =============================================================================

/**
 * Organization status
 */
export type OrganizationStatus = 'pending' | 'active' | 'suspended' | 'cancelled';

/**
 * Organization (Multi-tenant işletme)
 */
export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  background_color: string | null;
  status: OrganizationStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Organization creation payload
 */
export interface OrganizationInsert {
  id?: UUID;
  name: string;
  slug: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  background_color?: string | null;
  status?: OrganizationStatus;
}

/**
 * Organization update payload
 */
export interface OrganizationUpdate {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  background_color?: string | null;
  status?: OrganizationStatus;
  updated_at?: Timestamp;
}

/**
 * Organization member role
 */
export type MemberRole = 'owner' | 'admin' | 'manager' | 'waiter' | 'viewer';

/**
 * Organization member (User-Organization ilişkisi, RBAC)
 */
export interface OrganizationMember {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: MemberRole;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Organization member creation payload
 */
export interface OrganizationMemberInsert {
  id?: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: MemberRole;
  is_active?: boolean;
}

/**
 * Organization member update payload
 */
export interface OrganizationMemberUpdate {
  role?: MemberRole;
  is_active?: boolean;
  updated_at?: Timestamp;
}

// =============================================================================
// LOCATION (Multi-Location Support)
// =============================================================================

/**
 * Location (Organization'a bağlı fiziksel lokasyon/şube)
 *
 * Her organization birden fazla lokasyona sahip olabilir.
 * Slug, organization içinde benzersiz olmalıdır.
 */
export interface Location {
  id: UUID;
  organization_id: UUID;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Location creation payload
 */
export interface LocationInsert {
  id?: UUID;
  organization_id: UUID;
  name: string;
  slug: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

/**
 * Location update payload
 */
export interface LocationUpdate {
  name?: string;
  slug?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  updated_at?: Timestamp;
}

/**
 * Location with organization (joined data)
 */
export interface LocationWithOrganization extends Location {
  organization: Organization;
}

// =============================================================================
// PRODUCT & CATEGORY
// =============================================================================

/**
 * Product category
 */
export interface Category {
  id: UUID;
  organization_id: UUID;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Category creation payload
 */
export interface CategoryInsert {
  id?: UUID;
  organization_id: UUID;
  name: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Category update payload
 */
export interface CategoryUpdate {
  name?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  updated_at?: Timestamp;
}

/**
 * Product (Ürün meta verileri - fiyat buraya YAZILMAZ!)
 *
 * NOT: Fiyat bilgisi price_ledger tablosunda tutulur.
 * Bu tabloda price alanı YOK çünkü fiyatlar değişmez kayıt tutulur.
 */
export interface Product {
  id: UUID;
  organization_id: UUID;
  category_id: UUID | null;
  name: string;
  description: string | null;
  image_url: string | null;
  allergens: string | null;
  calories: number | null;
  preparation_time_minutes: number | null;
  is_chef_special: boolean;
  is_daily_special: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Product creation payload
 */
export interface ProductInsert {
  id?: UUID;
  organization_id: UUID;
  category_id?: UUID | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  allergens?: string | null;
  calories?: number | null;
  preparation_time_minutes?: number | null;
  is_chef_special?: boolean;
  is_daily_special?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Product update payload
 */
export interface ProductUpdate {
  category_id?: UUID | null;
  name?: string;
  description?: string | null;
  image_url?: string | null;
  allergens?: string | null;
  calories?: number | null;
  preparation_time_minutes?: number | null;
  is_chef_special?: boolean;
  is_daily_special?: boolean;
  is_active?: boolean;
  sort_order?: number;
  updated_at?: Timestamp;
}

// =============================================================================
// PRICE LEDGER (IMMUTABLE)
// =============================================================================

/**
 * Price Ledger Entry (Değişmez Fiyat Kaydı)
 *
 * CRITICAL: Bu tabloya UPDATE ve DELETE YAPILMAZ!
 * Her fiyat değişikliği yeni bir INSERT olarak eklenir.
 * Bu, yasal uyumluluk ve denetlenebilirlik için zorunludur.
 */
export interface PriceLedger {
  id: UUID;
  product_id: UUID;
  price: number;
  currency: CurrencyCode;
  valid_from: Timestamp;
  valid_until: Timestamp | null;
  created_by: UUID | null;
  change_reason: string | null;
  created_at: Timestamp;
}

/**
 * Price Ledger creation payload (INSERT only!)
 *
 * NOT: Update payload yok çünkü price_ledger tablosuna UPDATE YASAK!
 */
export interface PriceLedgerInsert {
  id?: UUID;
  product_id: UUID;
  price: number;
  currency?: CurrencyCode;
  valid_from?: Timestamp;
  valid_until?: Timestamp | null;
  created_by?: UUID | null;
  change_reason?: string | null;
}

/**
 * Current price (from current_prices view)
 * Enhanced with additional audit fields
 */
export interface CurrentPrice {
  product_id: UUID;
  price_ledger_id: UUID;
  price: number;
  currency: CurrencyCode;
  valid_from: Timestamp;
  valid_until: Timestamp | null;
  created_by: UUID | null;
  change_reason: string | null;
  created_at: Timestamp;
}

/**
 * Organization with plan (from organization_with_plan view)
 * Uses LATERAL join to ensure single subscription per organization
 */
export interface OrganizationWithPlanView {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  background_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  status: OrganizationStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Subscription info
  subscription_id: UUID | null;
  subscription_status: SubscriptionStatus | null;
  subscription_started_at: Timestamp | null;
  subscription_expires_at: Timestamp | null;
  subscription_cancelled_at: Timestamp | null;
  payment_method: string | null;
  last_payment_at: Timestamp | null;
  next_payment_at: Timestamp | null;
  subscription_notes: string | null;
  activated_by: UUID | null;
  // Plan info
  plan_id: UUID | null;
  plan_name: string | null;
  plan_slug: string | null;
  plan_description: string | null;
  plan_price_monthly: number | null;
  plan_price_yearly: number | null;
  plan_currency: CurrencyCode | null;
  plan_is_featured: boolean | null;
  plan_badge_text: string | null;
  // Computed fields
  has_active_subscription: boolean;
  days_until_expiry: number | null;
}

/**
 * Product with current price (from products_with_current_price view)
 */
export interface ProductWithCurrentPriceView {
  id: UUID;
  organization_id: UUID;
  category_id: UUID | null;
  name: string;
  description: string | null;
  image_url: string | null;
  allergens: string | null;
  calories: number | null;
  preparation_time_minutes: number | null;
  is_chef_special: boolean;
  is_daily_special: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Current price info
  current_price: number | null;
  current_currency: CurrencyCode | null;
  price_valid_from: Timestamp | null;
  price_valid_until: Timestamp | null;
  last_change_reason: string | null;
  price_changed_by: UUID | null;
  // Category info
  category_name: string | null;
  category_sort_order: number | null;
  category_is_active: boolean | null;
}

/**
 * Menu view (from menu_view for public menu display)
 * Optimized for public menu pages with all required data in one query
 */
export interface MenuView {
  id: UUID;
  organization_id: UUID;
  name: string;
  description: string | null;
  image_url: string | null;
  allergens: string | null;
  calories: number | null;
  preparation_time_minutes: number | null;
  is_chef_special: boolean;
  is_daily_special: boolean;
  sort_order: number;
  // Price
  price: number | null;
  currency: CurrencyCode | null;
  price_valid_from: Timestamp | null;
  price_valid_until: Timestamp | null;
  // Category
  category_id: UUID | null;
  category_name: string | null;
  category_description: string | null;
  category_sort_order: number | null;
  // Organization
  organization_name: string;
  organization_slug: string;
  organization_logo_url: string | null;
  organization_cover_image_url: string | null;
  organization_background_color: string | null;
  organization_phone: string | null;
  organization_address: string | null;
}

/**
 * Table status view (from table_status_view for waiter panel)
 */
export interface TableStatusView {
  id: UUID;
  organization_id: UUID;
  qr_uuid: UUID;
  table_number: string;
  table_name: string | null;
  section: string | null;
  capacity: number | null;
  current_status: TableStatus;
  last_ping_at: Timestamp | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  pending_requests_count: number;
  last_request_at: Timestamp | null;
  // Organization info
  organization_name: string | null;
  organization_slug: string | null;
}

/**
 * Subscription details view (from subscription_details_view for admin panel)
 */
export interface SubscriptionDetailsView {
  id: UUID;
  organization_id: UUID;
  plan_id: UUID;
  status: SubscriptionStatus;
  started_at: Timestamp | null;
  expires_at: Timestamp | null;
  cancelled_at: Timestamp | null;
  payment_method: string | null;
  last_payment_at: Timestamp | null;
  next_payment_at: Timestamp | null;
  notes: string | null;
  activated_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Organization info
  organization_name: string;
  organization_slug: string;
  organization_status: OrganizationStatus;
  organization_email: string | null;
  organization_phone: string | null;
  // Plan info
  plan_name: string;
  plan_slug: string;
  price_monthly: number;
  price_yearly: number | null;
  currency: CurrencyCode;
  // Activated by user info
  activated_by_email: string | null;
  activated_by_name: string | null;
  // Computed fields
  days_until_expiry: number | null;
  is_currently_active: boolean;
}

/**
 * Price history view (from price_history_view for audit)
 */
export interface PriceHistoryView {
  id: UUID;
  product_id: UUID;
  price: number;
  currency: CurrencyCode;
  valid_from: Timestamp;
  valid_until: Timestamp | null;
  change_reason: string | null;
  created_at: Timestamp;
  created_by: UUID | null;
  // Product info
  product_name: string;
  organization_id: UUID;
  // Category info
  category_name: string | null;
  // User who changed
  changed_by_email: string | null;
  changed_by_name: string | null;
  // Organization info
  organization_name: string | null;
  organization_slug: string | null;
  // Computed fields
  is_current_price: boolean;
  days_since_change: number;
}

/**
 * Organization stats view (from organization_stats for dashboard)
 */
export interface OrganizationStatsView {
  organization_id: UUID;
  organization_name: string;
  organization_slug: string;
  organization_status: OrganizationStatus;
  total_products: number;
  active_products: number;
  total_categories: number;
  active_categories: number;
  price_changes_last_30_days: number;
  total_tables: number;
  active_tables: number;
  service_requests_last_24h: number;
  last_product_update: Timestamp | null;
  last_price_change: Timestamp | null;
  total_snapshots: number;
}

/**
 * Pending activations view (from pending_activations for super admin)
 */
export interface PendingActivationsView {
  organization_id: UUID;
  organization_name: string;
  organization_slug: string;
  organization_email: string | null;
  organization_phone: string | null;
  organization_created_at: Timestamp;
  organization_status: OrganizationStatus;
  subscription_id: UUID | null;
  subscription_status: SubscriptionStatus | null;
  subscription_created_at: Timestamp | null;
  payment_method: string | null;
  subscription_notes: string | null;
  plan_id: UUID | null;
  plan_name: string | null;
  plan_slug: string | null;
  price_monthly: number | null;
  // Owner info
  owner_user_id: UUID | null;
  owner_email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  days_waiting: number;
}

// =============================================================================
// PACKAGE MANAGEMENT (DYNAMIC FEATURE FLAGGING)
// =============================================================================

/**
 * Feature key identifiers
 * NOT: Bu liste veritabanından dinamik olarak yönetilir
 */
export type FeatureKey =
  | 'module_waiter_call'
  | 'module_happy_hour'
  | 'module_cross_sell'
  | 'module_nutrition_info'
  | 'module_social_share'
  | 'has_images'
  | 'has_logo'
  | 'has_chef_special'
  | 'has_daily_special'
  | 'has_background_color'
  | 'limit_menu_items'
  | 'limit_categories'
  | 'limit_price_changes'
  | string; // Extensible for future features

/**
 * Feature definition
 */
export interface Feature {
  id: UUID;
  key: FeatureKey;
  name: string;
  description: string | null;
  feature_type: 'boolean' | 'limit';
  category: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
}

/**
 * Feature creation payload
 */
export interface FeatureInsert {
  id?: UUID;
  key: FeatureKey;
  name: string;
  description?: string | null;
  feature_type: 'boolean' | 'limit';
  category?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Plan definition
 */
export interface Plan {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  currency: CurrencyCode;
  is_featured: boolean;
  badge_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Plan creation payload
 */
export interface PlanInsert {
  id?: UUID;
  name: string;
  slug: string;
  description?: string | null;
  price_monthly: number;
  price_yearly?: number | null;
  currency?: CurrencyCode;
  is_featured?: boolean;
  badge_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Plan update payload
 */
export interface PlanUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  price_monthly?: number;
  price_yearly?: number | null;
  currency?: CurrencyCode;
  is_featured?: boolean;
  badge_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
  updated_at?: Timestamp;
}

/**
 * Plan-Feature mapping
 */
export interface PlanFeature {
  id: UUID;
  plan_id: UUID;
  feature_id: UUID;
  value_boolean: boolean | null;
  value_limit: number | null;
  created_at: Timestamp;
}

/**
 * Plan-Feature creation payload
 */
export interface PlanFeatureInsert {
  id?: UUID;
  plan_id: UUID;
  feature_id: UUID;
  value_boolean?: boolean | null;
  value_limit?: number | null;
}

/**
 * Plan-Feature update payload
 */
export interface PlanFeatureUpdate {
  value_boolean?: boolean | null;
  value_limit?: number | null;
}

/**
 * Subscription status
 */
export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired';

/**
 * Subscription (İşletme aboneliği)
 */
export interface Subscription {
  id: UUID;
  organization_id: UUID;
  plan_id: UUID;
  status: SubscriptionStatus;
  started_at: Timestamp | null;
  expires_at: Timestamp | null;
  cancelled_at: Timestamp | null;
  payment_method: string | null;
  last_payment_at: Timestamp | null;
  next_payment_at: Timestamp | null;
  notes: string | null;
  activated_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Subscription creation payload
 */
export interface SubscriptionInsert {
  id?: UUID;
  organization_id: UUID;
  plan_id: UUID;
  status?: SubscriptionStatus;
  started_at?: Timestamp | null;
  expires_at?: Timestamp | null;
  cancelled_at?: Timestamp | null;
  payment_method?: string | null;
  last_payment_at?: Timestamp | null;
  next_payment_at?: Timestamp | null;
  notes?: string | null;
  activated_by?: UUID | null;
}

/**
 * Subscription update payload
 */
export interface SubscriptionUpdate {
  plan_id?: UUID;
  status?: SubscriptionStatus;
  started_at?: Timestamp | null;
  expires_at?: Timestamp | null;
  cancelled_at?: Timestamp | null;
  payment_method?: string | null;
  last_payment_at?: Timestamp | null;
  next_payment_at?: Timestamp | null;
  notes?: string | null;
  activated_by?: UUID | null;
  updated_at?: Timestamp;
}

/**
 * Organization feature override (Özel izin/yasak)
 * Override tablosu plan özelliklerini ezebilir.
 */
export interface OrganizationFeatureOverride {
  id: UUID;
  organization_id: UUID;
  feature_key: FeatureKey;
  override_value: boolean;
  override_limit: number | null;
  reason: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  expires_at: Timestamp | null;
}

/**
 * Organization feature override creation payload
 */
export interface OrganizationFeatureOverrideInsert {
  id?: UUID;
  organization_id: UUID;
  feature_key: FeatureKey;
  override_value: boolean;
  override_limit?: number | null;
  reason?: string | null;
  created_by?: UUID | null;
  expires_at?: Timestamp | null;
}

// =============================================================================
// TABLE & SERVICE REQUEST
// =============================================================================

/**
 * Table status
 */
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needs_service';

/**
 * Restaurant table (Masa yönetimi)
 */
export interface RestaurantTable {
  id: UUID;
  organization_id: UUID;
  qr_uuid: UUID;
  table_number: string;
  table_name: string | null;
  section: string | null;
  capacity: number | null;
  current_status: TableStatus;
  last_ping_at: Timestamp | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Restaurant table creation payload
 */
export interface RestaurantTableInsert {
  id?: UUID;
  organization_id: UUID;
  qr_uuid?: UUID;
  table_number: string;
  table_name?: string | null;
  section?: string | null;
  capacity?: number | null;
  current_status?: TableStatus;
  is_active?: boolean;
}

/**
 * Restaurant table update payload
 */
export interface RestaurantTableUpdate {
  table_number?: string;
  table_name?: string | null;
  section?: string | null;
  capacity?: number | null;
  current_status?: TableStatus;
  last_ping_at?: Timestamp | null;
  is_active?: boolean;
  updated_at?: Timestamp;
}

/**
 * Service request type
 */
export type ServiceRequestType = 'waiter_call' | 'bill_request' | 'other';

/**
 * Service request status
 */
export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'completed' | 'cancelled';

/**
 * Service request (Garson çağırma)
 */
export interface ServiceRequest {
  id: UUID;
  organization_id: UUID;
  table_id: UUID;
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  notes: string | null;
  handled_by: UUID | null;
  handled_at: Timestamp | null;
  created_at: Timestamp;
}

/**
 * Service request creation payload
 */
export interface ServiceRequestInsert {
  id?: UUID;
  organization_id: UUID;
  table_id: UUID;
  request_type?: ServiceRequestType;
  status?: ServiceRequestStatus;
  notes?: string | null;
}

/**
 * Service request update payload
 */
export interface ServiceRequestUpdate {
  status?: ServiceRequestStatus;
  notes?: string | null;
  handled_by?: UUID | null;
  handled_at?: Timestamp | null;
}

// =============================================================================
// AUDIT & COMPLIANCE
// =============================================================================

/**
 * Menu snapshot (Menü anlık görüntüsü)
 * Her fiyat değişikliğinde menünün durumu saklanır.
 */
export interface MenuSnapshot {
  id: UUID;
  organization_id: UUID;
  snapshot_json: MenuSnapshotData;
  sha256_hash: string;
  triggered_by_price_ledger_id: UUID | null;
  created_at: Timestamp;
}

/**
 * Menu snapshot data structure
 */
export interface MenuSnapshotData {
  organization_id: UUID;
  created_at: Timestamp;
  products: MenuSnapshotProduct[];
}

/**
 * Product entry in menu snapshot
 */
export interface MenuSnapshotProduct {
  id: UUID;
  name: string;
  category: string;
  price: number;
  currency: CurrencyCode;
}

/**
 * Menu snapshot creation payload
 */
export interface MenuSnapshotInsert {
  id?: UUID;
  organization_id: UUID;
  snapshot_json: MenuSnapshotData;
  sha256_hash: string;
  triggered_by_price_ledger_id?: UUID | null;
}

/**
 * Audit log action types
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'price_change'
  | 'activation'
  | 'suspension';

/**
 * Audit log entry
 */
export interface AuditLog {
  id: UUID;
  organization_id: UUID | null;
  user_id: UUID | null;
  action: AuditAction;
  entity_type: string;
  entity_id: UUID | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Timestamp;
}

/**
 * Audit log creation payload
 */
export interface AuditLogInsert {
  id?: UUID;
  organization_id?: UUID | null;
  user_id?: UUID | null;
  action: AuditAction;
  entity_type: string;
  entity_id?: UUID | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// =============================================================================
// JOINED/COMPUTED TYPES
// =============================================================================

/**
 * Product with current price (joined data)
 */
export interface ProductWithPrice extends Product {
  current_price: CurrentPrice | null;
}

/**
 * Product with category and price (for menu display)
 */
export interface ProductForMenu {
  id: UUID;
  name: string;
  description: string | null;
  image_url: string | null;
  allergens: string | null;
  calories: number | null;
  is_chef_special: boolean;
  is_daily_special: boolean;
  sort_order: number;
  category: Pick<Category, 'id' | 'name' | 'sort_order'> | null;
  price: number;
  currency: CurrencyCode;
}

/**
 * Organization with subscription and plan (for dashboard)
 */
export interface OrganizationWithPlan extends Organization {
  subscription: Subscription | null;
  plan: Plan | null;
}

/**
 * Table with pending service requests count
 */
export interface TableWithRequests extends RestaurantTable {
  pending_requests_count: number;
}

/**
 * User session data (cached in frontend)
 */
export interface UserSession {
  user: User;
  organization: Organization | null;
  membership: OrganizationMember | null;
  subscription: Subscription | null;
  plan: Plan | null;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * API error structure
 */
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// =============================================================================
// PERMISSION TYPES
// =============================================================================

/**
 * Feature check result
 */
export interface FeatureCheckResult {
  allowed: boolean;
  reason?: 'plan_feature' | 'override' | 'no_subscription' | 'expired';
  limit?: number;
  current_usage?: number;
}

/**
 * Permission context for components
 */
export interface PermissionContext {
  organizationId: UUID;
  planSlug: string | null;
  features: Record<FeatureKey, boolean | number>;
  overrides: Record<FeatureKey, boolean | number>;
}

// =============================================================================
// SUPABASE DATABASE TYPE
// =============================================================================

/**
 * Supabase Database schema type definition
 *
 * Bu tip createClient<Database>() ile kullanılarak type-safe sorgular sağlar.
 *
 * @example
 * ```ts
 * import { createClient } from '@supabase/supabase-js';
 * import type { Database } from '@/types';
 *
 * const supabase = createClient<Database>(url, key);
 * const { data } = await supabase.from('products').select(); // type-safe!
 * ```
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: OrganizationMemberInsert;
        Update: OrganizationMemberUpdate;
      };
      locations: {
        Row: Location;
        Insert: LocationInsert;
        Update: LocationUpdate;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      price_ledger: {
        Row: PriceLedger;
        Insert: PriceLedgerInsert;
        /** UPDATE NOT ALLOWED - Price ledger is immutable! */
        Update: never;
      };
      features: {
        Row: Feature;
        Insert: FeatureInsert;
        Update: Partial<FeatureInsert>;
      };
      plans: {
        Row: Plan;
        Insert: PlanInsert;
        Update: PlanUpdate;
      };
      plan_features: {
        Row: PlanFeature;
        Insert: PlanFeatureInsert;
        Update: PlanFeatureUpdate;
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
      };
      organization_feature_overrides: {
        Row: OrganizationFeatureOverride;
        Insert: OrganizationFeatureOverrideInsert;
        Update: Partial<OrganizationFeatureOverrideInsert>;
      };
      restaurant_tables: {
        Row: RestaurantTable;
        Insert: RestaurantTableInsert;
        Update: RestaurantTableUpdate;
      };
      service_requests: {
        Row: ServiceRequest;
        Insert: ServiceRequestInsert;
        Update: ServiceRequestUpdate;
      };
      menu_snapshots: {
        Row: MenuSnapshot;
        Insert: MenuSnapshotInsert;
        /** UPDATE NOT ALLOWED - Menu snapshots are immutable for legal compliance! */
        Update: never;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        /** UPDATE NOT ALLOWED - Audit logs are immutable! */
        Update: never;
      };
    };
    Views: {
      current_prices: {
        Row: CurrentPrice;
      };
      organization_with_plan: {
        Row: OrganizationWithPlanView;
      };
      products_with_current_price: {
        Row: ProductWithCurrentPriceView;
      };
      menu_view: {
        Row: MenuView;
      };
      table_status_view: {
        Row: TableStatusView;
      };
      subscription_details_view: {
        Row: SubscriptionDetailsView;
      };
      price_history_view: {
        Row: PriceHistoryView;
      };
      organization_stats: {
        Row: OrganizationStatsView;
      };
      pending_activations: {
        Row: PendingActivationsView;
      };
    };
    Functions: Record<string, unknown>;
    Enums: {
      organization_status: OrganizationStatus;
      member_role: MemberRole;
      subscription_status: SubscriptionStatus;
      table_status: TableStatus;
      service_request_type: ServiceRequestType;
      service_request_status: ServiceRequestStatus;
      audit_action: AuditAction;
      feature_type: 'boolean' | 'limit';
      currency_code: CurrencyCode;
    };
  };
}
