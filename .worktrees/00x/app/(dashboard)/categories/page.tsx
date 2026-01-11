/**
 * Categories Management Page
 *
 * Kategori yonetimi sayfasi. CRUD operasyonlari, limit kontrolu ve
 * surukle-birak ile siralama icin kullanilir.
 *
 * Ozellikler:
 * - Kategori listesi goruntuleme
 * - Yeni kategori ekleme (limit kontrolu ile)
 * - Kategori duzenleme ve silme
 * - Surukle-birak ile siralama
 * - Lite plan icin 3 kategori limiti
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canAddCategory } from '@/lib/guards/limits';
import { CategoriesClient } from './categories-client';
import type { Metadata } from 'next';
import type { Category } from '@/types/database';

export const metadata: Metadata = {
  title: 'Kategoriler',
  description: 'Menuye kategori ekleyin ve yonetin',
};

export default async function CategoriesPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/categories');
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

  // Kategorileri al (siralama ile)
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  if (categoriesError) {
    // Hata durumunda bos liste ile devam et
    console.error('Kategori yukleme hatasi:', categoriesError);
  }

  // Limit kontrolu
  const limitCheck = await canAddCategory(organizationId);

  // Kategori verilerini type-safe olarak donustur
  const categoriesData: Category[] = (categories || []).map((cat) => ({
    id: cat.id,
    organization_id: cat.organization_id,
    name: cat.name,
    description: cat.description,
    sort_order: cat.sort_order,
    is_active: cat.is_active,
    created_at: cat.created_at,
    updated_at: cat.updated_at,
  }));

  return (
    <CategoriesClient
      initialCategories={categoriesData}
      organizationId={organizationId}
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
