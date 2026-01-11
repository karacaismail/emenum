/**
 * New Product Page
 *
 * Yeni urun ekleme sayfasi. Urun adi, aciklama, kategori,
 * resim yukleme (feature-gated), ve is_active toggle icin form sunar.
 *
 * Ozellikler:
 * - Urun formu (temel bilgiler, ek bilgiler, resim, rozetler)
 * - Baslangic fiyati girisi (price_ledger'a INSERT)
 * - Limit kontrolu (canAddProduct)
 * - Feature-gated ozellikler (resim, sef ozel, gunun yemegi)
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canAddProduct } from '@/lib/guards/limits';
import { hasPermission } from '@/lib/guards/permission';
import { ProductForm } from '../product-form';
import type { Metadata } from 'next';
import type { Category } from '@/types/database';

export const metadata: Metadata = {
  title: 'Yeni Urun',
  description: 'Menuye yeni bir urun ekleyin',
};

export default async function NewProductPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/products/new');
  }

  // Kullanicinin organizasyonunu bul
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  const organizationId = membership?.organization_id;
  const userRole = membership?.role || 'viewer';

  // Organizasyon yoksa dashboard'a yonlendir
  if (!organizationId) {
    redirect('/dashboard');
  }

  // Rol kontrolu - sadece manager+ roller urun ekleyebilir
  if (!['owner', 'admin', 'manager'].includes(userRole)) {
    redirect('/products');
  }

  // Limit kontrolu
  const limitCheck = await canAddProduct(organizationId);

  // Limit asilmissa urunler sayfasina yonlendir
  if (!limitCheck.allowed && limitCheck.limit !== -1) {
    redirect('/products?error=limit_exceeded');
  }

  // Kategorileri al
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, is_active')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  // Feature flags kontrol et
  const [hasImages, hasChefSpecial, hasDailySpecial] = await Promise.all([
    hasPermission(organizationId, 'module_images'),
    hasPermission(organizationId, 'module_chef_special'),
    hasPermission(organizationId, 'module_daily_special'),
  ]);

  // Kategori verilerini type-safe olarak donustur
  const categoriesData: Pick<Category, 'id' | 'name' | 'is_active'>[] = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    is_active: cat.is_active,
  }));

  return (
    <ProductForm
      categories={categoriesData}
      organizationId={organizationId}
      features={{
        has_images: hasImages,
        has_chef_special: hasChefSpecial,
        has_daily_special: hasDailySpecial,
      }}
      mode="new"
    />
  );
}
