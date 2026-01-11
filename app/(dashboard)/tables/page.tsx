/**
 * Table Management Page
 *
 * Masa yonetimi sayfasi. CRUD operasyonlari, QR kod olusturma ve
 * toplu QR kod indirme icin kullanilir.
 *
 * Ozellikler:
 * - Masa listesi goruntuleme
 * - Yeni masa ekleme (limit kontrolu ile)
 * - Masa duzenleme ve silme
 * - Her masa icin QR kod olusturma (qr_uuid ile)
 * - Toplu QR kod indirme
 * - Masa durumu yonetimi (available, occupied, reserved, needs_service)
 *
 * KRITIK: QR kodlar qr_uuid (UUID) kullanir, ardisik sayilar degil!
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canAddTable } from '@/lib/guards/limits';
import { TablesClient } from './tables-client';
import type { Metadata } from 'next';
import type { RestaurantTable, Organization } from '@/types/database';

export const metadata: Metadata = {
  title: 'Masalar',
  description: 'Masa yonetimi ve QR kod olusturma',
};

export default async function TablesPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/tables');
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

  // Masalari al
  const { data: tables, error: tablesError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('organization_id', organizationId)
    .order('table_number', { ascending: true });

  if (tablesError) {
    // Hata durumunda bos liste ile devam et
  }

  // Limit kontrolu
  const limitCheck = await canAddTable(organizationId);

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

  // Get base URL for QR codes
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <TablesClient
      initialTables={tablesData}
      organizationId={organizationId}
      organizationSlug={organization?.slug || ''}
      baseUrl={baseUrl}
      limitCheck={{
        canAdd: limitCheck.allowed,
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount,
        remaining: limitCheck.remaining,
        shouldUpgrade: limitCheck.shouldUpgrade,
        message: limitCheck.message,
      }}
      userRole={membership?.role || 'viewer'}
    />
  );
}
