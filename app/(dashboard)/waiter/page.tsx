/**
 * Waiter Panel Page
 *
 * Garson paneli sayfasi. Gercek zamanli servis isteklerini ve
 * masa durumlarini gosterir.
 *
 * Ozellikler:
 * - Gercek zamanli servis istekleri (Supabase Realtime)
 * - Masa durum tablosu
 * - Istekleri tamamlandi olarak isaretleme
 * - Bekleyen istek sayisi ve bekleme suresi
 *
 * KRITIK: module_waiter_call ozelligi kontrol edilir!
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/guards/permission';
import { WaiterClient } from './waiter-client';
import type { Metadata } from 'next';
import type { RestaurantTable, ServiceRequest, Organization } from '@/types/database';

export const metadata: Metadata = {
  title: 'Garson Paneli',
  description: 'Servis isteklerini yonetin ve masa durumlarini izleyin',
};

// Service request with table info
export interface ServiceRequestWithTable extends ServiceRequest {
  table: Pick<RestaurantTable, 'id' | 'table_number' | 'table_name' | 'section'>;
}

export default async function WaiterPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/waiter');
  }

  // Kullanicinin organizasyonunu bul
  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      role,
      organization:organizations(
        id,
        name,
        slug,
        status
      )
    `)
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  const organizationId = membership?.organization_id;

  // Organizasyon yoksa dashboard'a yonlendir
  if (!organizationId) {
    redirect('/dashboard');
  }

  // Extract organization data - handle Supabase nested query result
  type OrgQueryResult = { id: string; name: string; slug: string; status: string } | null;
  const orgData = membership?.organization as OrgQueryResult | OrgQueryResult[] | null;
  const orgRecord = Array.isArray(orgData) ? orgData[0] : orgData;
  const organization: Pick<Organization, 'id' | 'name' | 'slug' | 'status'> | null = orgRecord ? {
    id: orgRecord.id,
    name: orgRecord.name,
    slug: orgRecord.slug,
    status: orgRecord.status as Organization['status'],
  } : null;

  // Rol kontrolu - Waiter+ (owner, admin, manager, waiter)
  const allowedRoles = ['owner', 'admin', 'manager', 'waiter'];
  if (!membership?.role || !allowedRoles.includes(membership.role)) {
    redirect('/dashboard');
  }

  // Ozellik kontrolu - module_waiter_call
  const hasWaiterCall = await hasPermission(organizationId, 'module_waiter_call');

  // Bekleyen servis isteklerini al (RPC kullanarak)
  const { data: pendingRequests } = await supabase.rpc('get_pending_service_requests', {
    p_organization_id: organizationId,
  });

  // Masalari al
  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('table_number', { ascending: true });

  // Masa istatistiklerini al
  const { data: tableStats } = await supabase.rpc('get_table_statistics', {
    p_organization_id: organizationId,
  });

  // Masa verilerini type-safe olarak donustur
  const tablesData: RestaurantTable[] = (tables || []).map((table) => ({
    id: table.id,
    organization_id: table.organization_id,
    qr_uuid: table.qr_uuid,
    table_number: table.table_number,
    table_name: table.table_name,
    section: table.section,
    capacity: table.capacity,
    current_status: table.current_status,
    last_ping_at: table.last_ping_at,
    is_active: table.is_active,
    created_at: table.created_at,
    updated_at: table.updated_at,
  }));

  // Servis istekleri verilerini type-safe olarak donustur
  interface PendingRequestRPC {
    request_id: string;
    table_id: string;
    table_number: string;
    table_name: string | null;
    section: string | null;
    request_type: 'waiter_call' | 'bill_request' | 'other';
    notes: string | null;
    created_at: string;
    waiting_seconds: number;
  }

  const requestsData = (pendingRequests || []).map((req: PendingRequestRPC) => ({
    id: req.request_id,
    table_id: req.table_id,
    table_number: req.table_number,
    table_name: req.table_name,
    section: req.section,
    request_type: req.request_type,
    notes: req.notes,
    created_at: req.created_at,
    waiting_seconds: req.waiting_seconds,
  }));

  // Istatistikleri parse et
  interface TableStatsRPC {
    total_tables: number;
    available_tables: number;
    occupied_tables: number;
    reserved_tables: number;
    needs_service_tables: number;
    pending_requests: number;
  }
  const stats: TableStatsRPC = Array.isArray(tableStats) && tableStats.length > 0
    ? tableStats[0]
    : {
        total_tables: 0,
        available_tables: 0,
        occupied_tables: 0,
        reserved_tables: 0,
        needs_service_tables: 0,
        pending_requests: 0,
      };

  return (
    <WaiterClient
      initialRequests={requestsData}
      initialTables={tablesData}
      initialStats={stats}
      organizationId={organizationId}
      organizationSlug={organization?.slug || ''}
      hasWaiterCallFeature={hasWaiterCall}
      userId={authUser.id}
      userRole={membership?.role || 'viewer'}
    />
  );
}
