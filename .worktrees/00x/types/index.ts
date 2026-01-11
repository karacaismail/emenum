/**
 * TypeScript Type Definitions
 *
 * Bu dosya tüm tip tanımlamalarını dışa aktarır.
 * Import için: import { Organization, Product } from '@/types';
 */

// Re-export all database types
export * from './database';

// Re-export specific commonly used types for convenience
export type {
  // Common
  UUID,
  Timestamp,
  CurrencyCode,
  // User
  User,
  UserInsert,
  UserUpdate,
  // Organization
  Organization,
  OrganizationInsert,
  OrganizationUpdate,
  OrganizationStatus,
  OrganizationMember,
  OrganizationMemberInsert,
  OrganizationMemberUpdate,
  MemberRole,
  // Product
  Product,
  ProductInsert,
  ProductUpdate,
  Category,
  CategoryInsert,
  CategoryUpdate,
  // Price Ledger
  PriceLedger,
  PriceLedgerInsert,
  CurrentPrice,
  // Package Management
  Feature,
  FeatureInsert,
  FeatureKey,
  Plan,
  PlanInsert,
  PlanUpdate,
  PlanFeature,
  PlanFeatureInsert,
  PlanFeatureUpdate,
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  SubscriptionStatus,
  OrganizationFeatureOverride,
  OrganizationFeatureOverrideInsert,
  // Table & Service
  RestaurantTable,
  RestaurantTableInsert,
  RestaurantTableUpdate,
  TableStatus,
  ServiceRequest,
  ServiceRequestInsert,
  ServiceRequestUpdate,
  ServiceRequestType,
  ServiceRequestStatus,
  // Audit
  MenuSnapshot,
  MenuSnapshotInsert,
  MenuSnapshotData,
  MenuSnapshotProduct,
  AuditLog,
  AuditLogInsert,
  AuditAction,
  // Joined Types
  ProductWithPrice,
  ProductForMenu,
  OrganizationWithPlan,
  TableWithRequests,
  UserSession,
  // Database Views
  OrganizationWithPlanView,
  ProductWithCurrentPriceView,
  MenuView,
  TableStatusView,
  SubscriptionDetailsView,
  PriceHistoryView,
  // API Types
  ApiResponse,
  ApiError,
  PaginatedResponse,
  // Permission Types
  FeatureCheckResult,
  PermissionContext,
  // Supabase Database Type
  Database,
} from './database';
