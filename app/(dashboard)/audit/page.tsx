/**
 * Audit Page - Menu Snapshots History
 *
 * Denetim kaydi sayfasi. Isletmenin tum menu snapshot'larini gosterir.
 * Her snapshot icin:
 * - Olusturulma tarihi
 * - Urun sayisi
 * - SHA-256 hash
 * - Hash dogrulama (verify)
 * - JSON indirme
 *
 * Ozellikler:
 * - Snapshot listesi (sayfalama ile)
 * - Hash dogrulama (data integrity)
 * - JSON olarak indirme (yasal kanit)
 * - Fiyat degisikligiyle tetiklenmis snapshot'larin isaretlenmesi
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSnapshotHistory, getSnapshotCount } from '@/lib/services/snapshot';
import { AuditClient } from './audit-client';
import type { Metadata } from 'next';
import type { SnapshotSummary } from '@/lib/services/snapshot';

export const metadata: Metadata = {
  title: 'Denetim Kaydi',
  description: 'Menu snapshot gecmisi ve dogrulama',
};

const ITEMS_PER_PAGE = 20;

export default async function AuditPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/audit');
  }

  // Kullanicinin organizasyonunu bul
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  const organizationId = membership?.organization_id;

  // Organizasyon yoksa dashboard'a yonlendir
  if (!organizationId) {
    redirect('/dashboard');
  }

  // Organizasyon bilgisini al
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .single();

  // Snapshot'lari al
  const snapshots = await getSnapshotHistory(organizationId, ITEMS_PER_PAGE, 0);

  // Toplam snapshot sayisini al
  const totalCount = await getSnapshotCount(organizationId);

  // Snapshot'lari client component icin serileştir
  const serializedSnapshots: SnapshotSummary[] = snapshots.map((s) => ({
    id: s.id,
    createdAt: new Date(s.createdAt),
    productCount: s.productCount,
    hash: s.hash,
    triggeredByPriceChange: s.triggeredByPriceChange,
  }));

  return (
    <AuditClient
      initialSnapshots={serializedSnapshots}
      totalCount={totalCount}
      itemsPerPage={ITEMS_PER_PAGE}
      organizationId={organizationId}
      organizationName={organization?.name || 'Isletme'}
      organizationSlug={organization?.slug || ''}
      userRole={membership?.role || 'viewer'}
    />
  );
}
