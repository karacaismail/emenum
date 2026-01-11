/**
 * Products Management Page
 *
 * Urun yonetimi sayfasi. Urun listesi, kategori filtresi, arama,
 * sayfalama ve guncel fiyat goruntuleme icin kullanilir.
 *
 * Ozellikler:
 * - Urun listesi (price_ledger'dan guncel fiyatlarla)
 * - Kategori filtresi
 * - Arama fonksiyonu
 * - Sayfalama
 * - Lite plan icin 20 urun limiti
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canAddProduct } from '@/lib/guards/limits';
import { ProductsClient } from './products-client';
import type { Metadata } from 'next';
import type { Category, ProductWithCurrentPriceView } from '@/types/database';

export const metadata: Metadata = {
  title: 'Urunler',
  description: 'Menuye urun ekleyin ve yonetin',
};

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/products');
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

  // Urunleri al (guncel fiyatlarla birlikte)
  const { data: products, error: productsError } = await supabase
    .from('products_with_current_price')
    .select('*')
    .eq('organization_id', organizationId)
    .order('category_sort_order', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true });

  if (productsError) {
    // Hata durumunda bos liste ile devam et
    // Hata loglama console.error yerine sunucu log sistemine yapilmali
  }

  // Kategorileri al (filtre icin)
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, sort_order, is_active')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  if (categoriesError) {
    // Hata durumunda bos liste ile devam et
  }

  // Limit kontrolu
  const limitCheck = await canAddProduct(organizationId);

  // Urun verilerini type-safe olarak donustur
  const productsData: ProductWithCurrentPriceView[] = (products || []).map((prod) => ({
    id: prod.id,
    organization_id: prod.organization_id,
    category_id: prod.category_id,
    name: prod.name,
    description: prod.description,
    image_url: prod.image_url,
    allergens: prod.allergens,
    calories: prod.calories,
    preparation_time_minutes: prod.preparation_time_minutes,
    is_chef_special: prod.is_chef_special,
    is_daily_special: prod.is_daily_special,
    is_active: prod.is_active,
    sort_order: prod.sort_order,
    created_at: prod.created_at,
    updated_at: prod.updated_at,
    current_price: prod.current_price,
    current_currency: prod.current_currency,
    price_valid_from: prod.price_valid_from,
    price_valid_until: prod.price_valid_until,
    last_change_reason: prod.last_change_reason,
    price_changed_by: prod.price_changed_by,
    category_name: prod.category_name,
    category_sort_order: prod.category_sort_order,
    category_is_active: prod.category_is_active,
  }));

  // Kategori verilerini type-safe olarak donustur
  const categoriesData: Pick<Category, 'id' | 'name' | 'sort_order' | 'is_active'>[] = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order,
    is_active: cat.is_active,
  }));

  return (
    <ProductsClient
      initialProducts={productsData}
      categories={categoriesData}
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
